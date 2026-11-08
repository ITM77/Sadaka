package handlers

import (
	"encoding/csv"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"sadaka.tj/backend/middleware"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

// Журнал действий: кто, когда и с какой причиной принял решение.
// Запись создаётся в той же транзакции, что и само действие, — без записи
// в журнале решение не сохраняется.

// Коды действий.
const (
	ActMosqueApprove   = "mosque.approve"
	ActMosqueReject    = "mosque.reject"
	ActMosqueBlock     = "mosque.block"
	ActMosqueUnblock   = "mosque.unblock"
	ActCampaignApprove = "campaign.approve"
	ActCampaignReject  = "campaign.reject"
	ActReportApprove   = "report.approve"
	ActReportReject    = "report.reject"

	ActStaffInvite        = "admin.invite"
	ActStaffReinvite      = "admin.reinvite"
	ActStaffPasswordReset = "admin.password_reset"
	ActStaffRoleChange    = "admin.role_change"
	ActStaffDisable       = "admin.disable"
	ActStaffEnable        = "admin.enable"
	ActStaffInviteAccept  = "admin.invite_accept"

	// События со стороны мечети — для истории мечети.
	ActMosqueSubmit   = "mosque.submit"
	ActMosqueResubmit = "mosque.resubmit"
	ActCampaignSubmit = "campaign.submit"
	ActCampaignFinish = "campaign.complete"
	ActReportSubmit   = "report.submit"
)

const ctxAdmin = "admin_account"

// adminSession проверяет сотрудника по БД на каждом запросе: отключённый
// доступ, сброшенный пароль и смена роли действуют сразу, а не через 7 дней,
// когда истечёт токен.
func (h *Handler) adminSession(c *gin.Context) {
	var admin models.Admin
	if err := h.DB.First(&admin, "id = ?", middleware.AccountID(c)).Error; err != nil {
		if isNotFound(err) {
			utils.Unauthorized(c, "сотрудник не найден")
			return
		}
		utils.InternalError(c, err)
		return
	}
	if !admin.IsActive {
		utils.Unauthorized(c, "доступ к панели отключён")
		return
	}
	if !admin.HasPassword() {
		utils.Unauthorized(c, "пароль сброшен — задайте новый по ссылке от суперадмина")
		return
	}
	if admin.SessionsValidFrom != nil && middleware.IssuedAt(c).Before(*admin.SessionsValidFrom) {
		utils.Unauthorized(c, "сессия завершена — войдите снова")
		return
	}
	middleware.SetAdminRole(c, admin.Role)
	c.Set(ctxAdmin, &admin)
	c.Next()
}

// currentAdmin — сотрудник текущего запроса (после adminSession).
func currentAdmin(c *gin.Context) *models.Admin {
	v, _ := c.Get(ctxAdmin)
	a, _ := v.(*models.Admin)
	return a
}

// logAdmin пишет решение сотрудника текущего запроса.
func logAdmin(tx *gorm.DB, c *gin.Context, e models.AuditLog) error {
	if a := currentAdmin(c); a != nil {
		e.AdminID = &a.ID
		e.ActorName = a.FullName
		e.ActorRole = a.Role
	}
	e.ActorType = models.ActorAdmin
	return writeLog(tx, c, e)
}

// logMosque пишет событие со стороны мечети; автор — её представитель.
func logMosque(tx *gorm.DB, c *gin.Context, e models.AuditLog) error {
	var user models.User
	if err := tx.Select("full_name").First(&user, "id = ?", middleware.AccountID(c)).Error; err != nil {
		return err
	}
	e.ActorType = models.ActorMosque
	e.ActorName = user.FullName
	return writeLog(tx, c, e)
}

func writeLog(tx *gorm.DB, c *gin.Context, e models.AuditLog) error {
	e.IP = c.ClientIP()
	e.UserAgent = cut(c.Request.UserAgent(), 500)
	return tx.Create(&e).Error
}

func cut(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// Описание объектов для журнала.

func mosqueLog(m *models.Mosque) models.AuditLog {
	return models.AuditLog{
		ObjectType: models.ObjectMosque, ObjectID: m.ID, ObjectTitle: m.Name,
		ObjectSubtitle: m.City, MosqueID: &m.ID,
	}
}

func campaignLog(cmp *models.Campaign, m *models.Mosque) models.AuditLog {
	return models.AuditLog{
		ObjectType: models.ObjectCampaign, ObjectID: cmp.ID, ObjectTitle: cmp.Title,
		ObjectSubtitle: m.Name, MosqueID: &m.ID,
	}
}

func reportLog(r *models.Report, cmp *models.Campaign, m *models.Mosque) models.AuditLog {
	return models.AuditLog{
		ObjectType: models.ObjectReport, ObjectID: r.ID, ObjectTitle: cmp.Title,
		ObjectSubtitle: m.Name, MosqueID: &m.ID,
	}
}

func staffLog(a *models.Admin) models.AuditLog {
	return models.AuditLog{
		ObjectType: models.ObjectAdmin, ObjectID: a.ID, ObjectTitle: a.FullName, ObjectSubtitle: a.Email,
	}
}

// som — «30 000 с.» для поля Details.
func som(d decimal.Decimal) string {
	s := d.StringFixed(0)
	neg := strings.HasPrefix(s, "-")
	s = strings.TrimPrefix(s, "-")
	var b strings.Builder
	for i, r := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteRune(' ')
		}
		b.WriteRune(r)
	}
	if neg {
		return "-" + b.String() + " с."
	}
	return b.String() + " с."
}

// ---------- API журнала ----------

// auditQuery собирает фильтры журнала из query-параметров:
// admin_id (через запятую), action (через запятую), object_type, from, to (ГГГГ-ММ-ДД), q.
func auditQuery(c *gin.Context, db *gorm.DB) (*gorm.DB, bool) {
	q := db.Model(&models.AuditLog{}).Where("actor_type = ?", models.ActorAdmin)
	if v := c.Query("admin_id"); v != "" {
		ids := []uuid.UUID{}
		for _, s := range strings.Split(v, ",") {
			id, err := uuid.Parse(strings.TrimSpace(s))
			if err != nil {
				utils.BadRequest(c, "некорректный сотрудник в фильтре")
				return nil, false
			}
			ids = append(ids, id)
		}
		q = q.Where("admin_id IN ?", ids)
	}
	if v := c.Query("action"); v != "" {
		q = q.Where("action IN ?", strings.Split(v, ","))
	}
	if v := c.Query("object_type"); v != "" {
		q = q.Where("object_type IN ?", strings.Split(v, ","))
	}
	if v := c.Query("from"); v != "" {
		from, err := parseDate(v)
		if err != nil {
			utils.BadRequest(c, "период «с»: "+err.Error())
			return nil, false
		}
		q = q.Where("created_at >= ?", from)
	}
	if v := c.Query("to"); v != "" {
		to, err := parseDate(v)
		if err != nil {
			utils.BadRequest(c, "период «по»: "+err.Error())
			return nil, false
		}
		q = q.Where("created_at < ?", to.AddDate(0, 0, 1))
	}
	if s := strings.TrimSpace(c.Query("q")); s != "" {
		like := "%" + escapeLike(s) + "%"
		q = q.Where("(object_title ILIKE ? OR object_subtitle ILIKE ? OR reason ILIKE ? OR actor_name ILIKE ?)",
			like, like, like, like)
	}
	return q, true
}

// GET /admin/audit — только суперадмин.
func (h *Handler) AdminListAudit(c *gin.Context) {
	q, ok := auditQuery(c, h.DB)
	if !ok {
		return
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	entries := []models.AuditLog{}
	if err := pagination(c).apply(q.Order("created_at DESC")).Find(&entries).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"entries": entries, "total": total})
}

// GET /admin/audit/:id
func (h *Handler) AdminGetAudit(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	var e models.AuditLog
	if err := h.DB.First(&e, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "запись журнала не найдена")
			return
		}
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"entry": e})
}

const exportLimit = 10000

// GET /admin/audit/export — CSV (UTF-8 с BOM, разделитель «;» — так файл
// сразу открывается в Excel с русской локалью) с текущими фильтрами.
func (h *Handler) AdminExportAudit(c *gin.Context) {
	q, ok := auditQuery(c, h.DB)
	if !ok {
		return
	}
	entries := []models.AuditLog{}
	if err := q.Order("created_at DESC").Limit(exportLimit).Find(&entries).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	name := "sadaka-journal-" + h.Now().In(Dushanbe).Format("2006-01-02") + ".csv"
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="`+name+`"`)
	c.Status(http.StatusOK)
	_, _ = c.Writer.Write([]byte{0xEF, 0xBB, 0xBF}) // BOM: Excel узнаёт UTF-8
	w := csv.NewWriter(c.Writer)
	w.Comma = ';'
	_ = w.Write([]string{"Время (Душанбе)", "Сотрудник", "Роль", "Действие", "Объект", "Тип объекта",
		"Подробности", "Статус до", "Статус после", "Причина", "IP"})
	for _, e := range entries {
		_ = w.Write([]string{
			e.CreatedAt.In(Dushanbe).Format("02.01.2006 15:04:05"), e.ActorName, roleLabel(e.ActorRole),
			actionLabel(e.Action), e.ObjectTitle, objectLabel(e.ObjectType), e.ObjectSubtitle,
			e.FromStatus, e.ToStatus, e.Reason, e.IP,
		})
	}
	w.Flush()
}

// GET /admin/mosques/:id/history — все события мечети, сначала старые.
// Доступна всем сотрудникам: это история решений по объекту, а не журнал целиком.
func (h *Handler) AdminMosqueHistory(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	var n int64
	if err := h.DB.Model(&models.Mosque{}).Where("id = ?", id).Count(&n).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	if n == 0 {
		utils.NotFound(c, "мечеть не найдена")
		return
	}
	entries := []models.AuditLog{}
	if err := h.DB.Where("mosque_id = ?", id).Order("created_at ASC").Limit(500).Find(&entries).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"entries": entries})
}

// Подписи для CSV (в интерфейсе — свои, в lib/audit.ts).

func roleLabel(r string) string {
	switch r {
	case models.AdminRoleSuperadmin:
		return "Суперадмин"
	case models.AdminRoleModerator:
		return "Модератор"
	case models.AdminRoleAnalyst:
		return "Аналитик"
	}
	return r
}

func objectLabel(t string) string {
	switch t {
	case models.ObjectMosque:
		return "мечеть"
	case models.ObjectCampaign:
		return "сбор"
	case models.ObjectReport:
		return "отчёт"
	case models.ObjectAdmin:
		return "сотрудник"
	}
	return t
}

var actionLabels = map[string]string{
	ActMosqueApprove:      "Заявка одобрена",
	ActMosqueReject:       "Заявка отклонена",
	ActMosqueBlock:        "Блокировка мечети",
	ActMosqueUnblock:      "Блокировка снята",
	ActCampaignApprove:    "Сбор одобрен",
	ActCampaignReject:     "Сбор отклонён",
	ActReportApprove:      "Отчёт принят",
	ActReportReject:       "Отчёт отклонён",
	ActStaffInvite:        "Сотрудник приглашён",
	ActStaffReinvite:      "Приглашение отправлено заново",
	ActStaffPasswordReset: "Пароль сброшен",
	ActStaffRoleChange:    "Роль изменена",
	ActStaffDisable:       "Доступ отключён",
	ActStaffEnable:        "Доступ включён",
	ActStaffInviteAccept:  "Приглашение принято",
}

func actionLabel(a string) string {
	if l, ok := actionLabels[a]; ok {
		return l
	}
	return a
}
