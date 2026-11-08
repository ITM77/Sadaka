package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

// Сотрудники Комитета: приглашение, роли, отключение доступа. Только суперадмин.
// Писем платформа пока не отправляет: ссылку-приглашение суперадмин копирует
// из панели и передаёт сотруднику сам.

const inviteTTL = 72 * time.Hour

// Статусы сотрудника в панели.
const (
	staffActive   = "active"
	staffInvited  = "invited"  // ещё не задал пароль (приглашение или сброс)
	staffDisabled = "disabled" // доступ отключён
)

type staffView struct {
	models.Admin
	Status        string `json:"status"`
	InvitedByName string `json:"invited_by_name,omitempty"`
	InviteExpired bool   `json:"invite_expired,omitempty"`
}

func (h *Handler) staffViews(admins []models.Admin) ([]staffView, error) {
	ids := []uuid.UUID{}
	for _, a := range admins {
		if a.InvitedByID != nil {
			ids = append(ids, *a.InvitedByID)
		}
	}
	names := map[uuid.UUID]string{}
	if len(ids) > 0 {
		var inviters []models.Admin
		if err := h.DB.Select("id", "full_name").Where("id IN ?", ids).Find(&inviters).Error; err != nil {
			return nil, err
		}
		for _, a := range inviters {
			names[a.ID] = a.FullName
		}
	}
	now := h.Now()
	out := make([]staffView, len(admins))
	for i, a := range admins {
		v := staffView{Admin: a, Status: staffActive}
		switch {
		case !a.IsActive:
			v.Status = staffDisabled
		case !a.HasPassword():
			v.Status = staffInvited
			v.InviteExpired = a.InviteExpiresAt == nil || now.After(*a.InviteExpiresAt)
		}
		if a.InvitedByID != nil {
			v.InvitedByName = names[*a.InvitedByID]
		}
		out[i] = v
	}
	return out, nil
}

// GET /admin/me — актуальные данные сотрудника (роль могла смениться).
func (h *Handler) AdminMe(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"admin": currentAdmin(c)})
}

// GET /admin/staff
func (h *Handler) AdminListStaff(c *gin.Context) {
	var admins []models.Admin
	// Сначала работающие, потом приглашённые, отключённые — в конце.
	if err := h.DB.Order("is_active DESC").Order("(password_hash = '') ASC").Order("full_name").
		Find(&admins).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	views, err := h.staffViews(admins)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"staff": views, "total": len(views)})
}

// GET /admin/staff/:id — карточка и последние пять решений сотрудника.
func (h *Handler) AdminGetStaff(c *gin.Context) {
	admin, ok := h.loadStaff(c)
	if !ok {
		return
	}
	views, err := h.staffViews([]models.Admin{*admin})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	recent := []models.AuditLog{}
	if err := h.DB.Where("admin_id = ? AND actor_type = ?", admin.ID, models.ActorAdmin).
		Order("created_at DESC").Limit(5).Find(&recent).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	var total int64
	if err := h.DB.Model(&models.AuditLog{}).Where("admin_id = ? AND actor_type = ?", admin.ID, models.ActorAdmin).
		Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"staff": views[0], "recent": recent, "actions_total": total})
}

type inviteRequest struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

// POST /admin/staff — пригласить сотрудника.
func (h *Handler) AdminInviteStaff(c *gin.Context) {
	var req inviteRequest
	if !bind(c, &req) {
		return
	}
	name, err := trimmed(req.FullName, "ФИО", true, 255)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if err := utils.ValidateEmail(email); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if !models.AdminRoles[req.Role] {
		utils.BadRequest(c, "выберите роль")
		return
	}
	token, hash, err := newInviteToken()
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	expires := h.Now().Add(inviteTTL)
	inviter := currentAdmin(c)
	admin := models.Admin{
		Email: email, FullName: name, Role: req.Role, IsActive: true,
		InvitedByID: &inviter.ID, InviteTokenHash: hash, InviteExpiresAt: &expires,
	}
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&admin).Error; err != nil {
			return err
		}
		entry := staffLog(&admin)
		entry.Action, entry.ToStatus = ActStaffInvite, admin.Role
		return logAdmin(tx, c, entry)
	})
	if err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			utils.Conflict(c, "сотрудник с таким email уже есть")
			return
		}
		utils.InternalError(c, err)
		return
	}
	views, err := h.staffViews([]models.Admin{admin})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"staff": views[0], "invite_token": token, "invite_expires_at": expires})
}

// POST /admin/staff/:id/link — новая ссылка для пароля. Приглашённому —
// повторное приглашение; работающему — сброс пароля: старый пароль и все
// сессии сразу перестают действовать.
func (h *Handler) AdminStaffLink(c *gin.Context) {
	var token string
	var expires time.Time
	var result models.Admin
	err := h.mutateStaff(c, func(tx *gorm.DB, a *models.Admin, entry *models.AuditLog) error {
		if !a.IsActive {
			return errConflict("сначала включите доступ сотруднику")
		}
		var hash string
		var err error
		if token, hash, err = newInviteToken(); err != nil {
			return err
		}
		now := h.Now()
		expires = now.Add(inviteTTL)
		entry.Action = ActStaffReinvite
		if a.HasPassword() {
			entry.Action = ActStaffPasswordReset
			a.PasswordHash = ""
			validFrom := now.Truncate(time.Second)
			a.SessionsValidFrom = &validFrom
		}
		a.InviteTokenHash, a.InviteExpiresAt = hash, &expires
		result = *a
		return nil
	})
	if !h.handleTxError(c, err, "сотрудник не найден") {
		return
	}
	views, err := h.staffViews([]models.Admin{result})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"staff": views[0], "invite_token": token, "invite_expires_at": expires})
}

type roleRequest struct {
	Role string `json:"role"`
}

// PUT /admin/staff/:id/role {role}
func (h *Handler) AdminStaffRole(c *gin.Context) {
	var req roleRequest
	if !bind(c, &req) {
		return
	}
	if !models.AdminRoles[req.Role] {
		utils.BadRequest(c, "неизвестная роль")
		return
	}
	var result models.Admin
	err := h.mutateStaff(c, func(tx *gorm.DB, a *models.Admin, entry *models.AuditLog) error {
		if a.Role == req.Role {
			return errConflict("у сотрудника уже эта роль")
		}
		entry.Action, entry.FromStatus, entry.ToStatus = ActStaffRoleChange, a.Role, req.Role
		a.Role = req.Role
		result = *a
		return nil
	})
	h.respondStaff(c, err, result)
}

// POST /admin/staff/:id/disable {reason} — причина обязательна.
func (h *Handler) AdminStaffDisable(c *gin.Context) {
	reason, ok := readReason(c, true)
	if !ok {
		return
	}
	var result models.Admin
	err := h.mutateStaff(c, func(tx *gorm.DB, a *models.Admin, entry *models.AuditLog) error {
		if !a.IsActive {
			return errConflict("доступ уже отключён")
		}
		now := h.Now()
		validFrom := now.Truncate(time.Second)
		entry.Action, entry.FromStatus, entry.ToStatus, entry.Reason = ActStaffDisable, staffActive, staffDisabled, reason
		a.IsActive, a.DisabledAt, a.DisabledReason, a.SessionsValidFrom = false, &now, reason, &validFrom
		result = *a
		return nil
	})
	h.respondStaff(c, err, result)
}

// POST /admin/staff/:id/enable
func (h *Handler) AdminStaffEnable(c *gin.Context) {
	var result models.Admin
	err := h.mutateStaff(c, func(tx *gorm.DB, a *models.Admin, entry *models.AuditLog) error {
		if a.IsActive {
			return errConflict("доступ уже включён")
		}
		entry.Action, entry.FromStatus, entry.ToStatus = ActStaffEnable, staffDisabled, staffActive
		a.IsActive, a.DisabledAt, a.DisabledReason = true, nil, ""
		result = *a
		return nil
	})
	h.respondStaff(c, err, result)
}

// mutateStaff блокирует строку сотрудника, применяет change и пишет журнал.
// Свою учётную запись менять нельзя — так в системе всегда остаётся хотя бы
// один суперадмин (тот, кто сейчас работает).
func (h *Handler) mutateStaff(c *gin.Context, change func(*gorm.DB, *models.Admin, *models.AuditLog) error) error {
	id, ok := pathID(c, "id")
	if !ok {
		return errHandled
	}
	if me := currentAdmin(c); me != nil && me.ID == id {
		return errConflict("свою учётную запись менять нельзя — попросите другого суперадмина")
	}
	return h.DB.Transaction(func(tx *gorm.DB) error {
		var a models.Admin
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&a, "id = ?", id).Error; err != nil {
			return err
		}
		entry := staffLog(&a)
		if err := change(tx, &a, &entry); err != nil {
			return err
		}
		if err := tx.Save(&a).Error; err != nil {
			return err
		}
		return logAdmin(tx, c, entry)
	})
}

// errHandled — ответ уже отправлен (например, 400 на кривой id).
var errHandled = errors.New("handled")

func (h *Handler) respondStaff(c *gin.Context, err error, a models.Admin) {
	if !h.handleTxError(c, err, "сотрудник не найден") {
		return
	}
	views, err := h.staffViews([]models.Admin{a})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"staff": views[0]})
}

func (h *Handler) loadStaff(c *gin.Context) (*models.Admin, bool) {
	id, ok := pathID(c, "id")
	if !ok {
		return nil, false
	}
	var a models.Admin
	if err := h.DB.First(&a, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "сотрудник не найден")
			return nil, false
		}
		utils.InternalError(c, err)
		return nil, false
	}
	return &a, true
}

// ---------- Приглашение (без входа) ----------

func newInviteToken() (token, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	token = hex.EncodeToString(b)
	return token, hashToken(token), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// inviteByToken находит сотрудника по действующей ссылке.
func (h *Handler) inviteByToken(c *gin.Context, db *gorm.DB) (*models.Admin, bool) {
	token := c.Param("token")
	if len(token) != 64 {
		utils.NotFound(c, "ссылка недействительна")
		return nil, false
	}
	var a models.Admin
	if err := db.First(&a, "invite_token_hash = ?", hashToken(token)).Error; err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "ссылка недействительна — возможно, ею уже воспользовались")
			return nil, false
		}
		utils.InternalError(c, err)
		return nil, false
	}
	if !a.IsActive {
		utils.Fail(c, http.StatusGone, "INVITE_DISABLED", "доступ этому сотруднику отключён")
		return nil, false
	}
	if a.InviteExpiresAt == nil || h.Now().After(*a.InviteExpiresAt) {
		utils.Fail(c, http.StatusGone, "INVITE_EXPIRED", "срок ссылки истёк — попросите суперадмина отправить новую")
		return nil, false
	}
	return &a, true
}

// GET /admin/invite/:token — кто пригласил и на какую роль.
func (h *Handler) GetInvite(c *gin.Context) {
	a, ok := h.inviteByToken(c, h.DB)
	if !ok {
		return
	}
	views, err := h.staffViews([]models.Admin{*a})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	v := views[0]
	c.JSON(http.StatusOK, gin.H{"invite": gin.H{
		"full_name": v.FullName, "email": v.Email, "role": v.Role,
		"invited_by_name": v.InvitedByName, "expires_at": v.InviteExpiresAt,
		"reset": v.LastLoginAt != nil, // сброс пароля, а не первое приглашение
	}})
}

type acceptInviteRequest struct {
	Password string `json:"password"`
}

// POST /admin/invite/:token {password} — задать пароль и сразу войти.
func (h *Handler) AcceptInvite(c *gin.Context) {
	var req acceptInviteRequest
	if !bind(c, &req) {
		return
	}
	if err := utils.ValidatePassword(req.Password); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	var admin models.Admin
	failed := false
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		a, ok := h.inviteByToken(c, tx.Clauses(clause.Locking{Strength: "UPDATE"}))
		if !ok {
			failed = true
			return errHandled
		}
		now := h.Now()
		a.PasswordHash = string(hash)
		a.InviteTokenHash, a.InviteExpiresAt = "", nil
		a.LastLoginAt = &now
		if err := tx.Save(a).Error; err != nil {
			return err
		}
		admin = *a
		c.Set(ctxAdmin, a) // автор записи — сам сотрудник
		entry := staffLog(a)
		entry.Action, entry.ToStatus = ActStaffInviteAccept, staffActive
		return logAdmin(tx, c, entry)
	})
	if failed {
		return
	}
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	token, err := utils.IssueToken(h.Cfg.JWTSecret, admin.ID, utils.SubjectAdmin, admin.Role)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "admin": admin})
}
