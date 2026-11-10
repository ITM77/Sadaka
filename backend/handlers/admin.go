package handlers

import (
	"errors"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/services"
	"sadaka.tj/backend/utils"
)

// Панель Комитета улемов: модерация мечетей, кампаний, отчётов и статистика.

type moderationRequest struct {
	Reason string `json:"reason"`
}

// readReason: для отказа и блокировки причина обязательна.
func readReason(c *gin.Context, required bool) (string, bool) {
	var req moderationRequest
	if c.Request.ContentLength > 0 && !bind(c, &req) {
		return "", false
	}
	reason, err := trimmed(req.Reason, "Причина", required, 2000)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return "", false
	}
	return reason, true
}

// GET /admin/dashboard
func (h *Handler) AdminDashboard(c *gin.Context) {
	var s struct {
		MosquesApproved  int64           `json:"mosques_approved"`
		MosquesPending   int64           `json:"mosques_pending"`
		MosquesBlocked   int64           `json:"mosques_blocked"`
		CampaignsActive  int64           `json:"campaigns_active"`
		CampaignsPending int64           `json:"campaigns_pending"`
		ReportsPending   int64           `json:"reports_pending"`
		UnreportedTotal  int64           `json:"campaigns_without_report"`
		Users            int64           `json:"users"`
		Donations        int64           `json:"donations"`
		DonationsTotal   decimal.Decimal `json:"donations_total"`
		SavobDistributed int64           `json:"savob_distributed"`
	}
	countWhere := func(model any, dst *int64, query string, args ...any) error {
		return h.DB.Model(model).Where(query, args...).Count(dst).Error
	}
	err := firstErr(
		countWhere(&models.Mosque{}, &s.MosquesApproved, "status = ?", models.MosqueStatusApproved),
		countWhere(&models.Mosque{}, &s.MosquesPending, "status = ?", models.MosqueStatusPending),
		countWhere(&models.Mosque{}, &s.MosquesBlocked, "status = ?", models.MosqueStatusBlocked),
		countWhere(&models.Campaign{}, &s.CampaignsActive, "status = ?", models.CampaignStatusActive),
		countWhere(&models.Campaign{}, &s.CampaignsPending, "status = ?", models.CampaignStatusPendingApproval),
		countWhere(&models.Report{}, &s.ReportsPending, "status = ?", models.ReportStatusSubmitted),
		countWhere(&models.Campaign{}, &s.UnreportedTotal,
			"status = ? AND NOT EXISTS (SELECT 1 FROM reports r WHERE r.campaign_id = campaigns.id AND r.status IN ?)",
			models.CampaignStatusCompleted, []string{models.ReportStatusSubmitted, models.ReportStatusApproved}),
		h.DB.Model(&models.User{}).Count(&s.Users).Error,
		countWhere(&models.Transaction{}, &s.Donations, "status = ?", models.TransactionStatusCompleted),
		h.DB.Model(&models.Transaction{}).Where("status = ?", models.TransactionStatusCompleted).
			Select("COALESCE(SUM(amount), 0)").Scan(&s.DonationsTotal).Error,
		h.DB.Model(&models.SavobEntry{}).Select("COALESCE(SUM(points), 0)").Scan(&s.SavobDistributed).Error,
	)
	if err != nil {
		utils.InternalError(c, err)
		return
	}

	// Возраст самой старой заявки в каждой очереди — с неё начинают день.
	oldest := func(model any, col, status string) *time.Time {
		var t *time.Time
		if h.DB.Model(model).Where("status = ?", status).Select("MIN("+col+")").Scan(&t).Error != nil {
			return nil
		}
		return t
	}
	unreported, err := h.unreportedList(20)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"mosques_approved": s.MosquesApproved, "mosques_pending": s.MosquesPending, "mosques_blocked": s.MosquesBlocked,
		"campaigns_active": s.CampaignsActive, "campaigns_pending": s.CampaignsPending, "reports_pending": s.ReportsPending,
		"campaigns_without_report": s.UnreportedTotal, "users": s.Users, "donations": s.Donations,
		"donations_total": s.DonationsTotal, "savob_distributed": s.SavobDistributed,
		"oldest_mosque_pending":   oldest(&models.Mosque{}, "created_at", models.MosqueStatusPending),
		"oldest_campaign_pending": oldest(&models.Campaign{}, "updated_at", models.CampaignStatusPendingApproval),
		"oldest_report_pending":   oldest(&models.Report{}, "submitted_at", models.ReportStatusSubmitted),
		"unreported":              unreported,
	})
}

// unreportedItem — завершённый сбор без поданного или принятого отчёта («Нужен контроль»).
type unreportedItem struct {
	MosqueID      string     `json:"mosque_id"`
	MosqueName    string     `json:"mosque_name"`
	City          string     `json:"city"`
	CampaignID    string     `json:"campaign_id"`
	CampaignTitle string     `json:"campaign_title"`
	CompletedAt   *time.Time `json:"completed_at"`
	ReportStatus  string     `json:"report_status"`  // "" — отчёта нет, rejected — отклонён
	ReportUpdated *time.Time `json:"report_updated"` // когда отклонили
	PendingNew    bool       `json:"pending_new"`    // у мечети новый сбор ждёт решения
}

func (h *Handler) unreportedList(limit int) ([]unreportedItem, error) {
	items := []unreportedItem{}
	err := h.DB.Raw(`
SELECT m.id AS mosque_id, m.name AS mosque_name, m.city, c.id AS campaign_id, c.title AS campaign_title,
       COALESCE(c.completed_at, c.end_date) AS completed_at,
       COALESCE(r.status, '') AS report_status, r.updated_at AS report_updated,
       EXISTS (SELECT 1 FROM campaigns p WHERE p.mosque_id = m.id AND p.status = ?) AS pending_new
FROM campaigns c
JOIN mosques m ON m.id = c.mosque_id
LEFT JOIN reports r ON r.campaign_id = c.id
WHERE c.status = ? AND (r.id IS NULL OR r.status = ?)
ORDER BY COALESCE(c.completed_at, c.end_date) ASC
LIMIT ?`, models.CampaignStatusPendingApproval, models.CampaignStatusCompleted, models.ReportStatusRejected, limit).
		Scan(&items).Error
	return items, err
}

func firstErr(errs ...error) error {
	for _, e := range errs {
		if e != nil {
			return e
		}
	}
	return nil
}

// ---------- Мечети ----------

// adminMosque — мечеть со счётчиками для реестра.
type adminMosque struct {
	models.Mosque
	ActiveCampaigns int64           `json:"active_campaigns"`
	Unreported      int64           `json:"unreported_campaigns"`
	ActiveCollected decimal.Decimal `json:"active_collected"`
}

// GET /admin/mosques?status=pending&city=&q=&order=asc — реестр и очередь заявок.
func (h *Handler) AdminListMosques(c *gin.Context) {
	p := pagination(c)
	q := h.DB.Model(&models.Mosque{})
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	if city := strings.TrimSpace(c.Query("city")); city != "" {
		q = q.Where("city = ?", city)
	}
	if s := strings.TrimSpace(c.Query("q")); s != "" {
		like := "%" + escapeLike(s) + "%"
		q = q.Where("(name ILIKE ? OR address ILIKE ? OR city ILIKE ? OR imam_name ILIKE ? OR phone ILIKE ?)",
			like, like, like, like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	order := "created_at DESC"
	if c.Query("order") == "asc" {
		order = "created_at ASC"
	}
	mosques := []models.Mosque{}
	if err := p.apply(q.Order(order)).Find(&mosques).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	out, err := h.withMosqueStats(mosques)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	var cities []string
	if err := h.DB.Model(&models.Mosque{}).Distinct("city").Order("city").Pluck("city", &cities).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"mosques": out, "total": total, "cities": cities})
}

// withMosqueStats добавляет к мечетям число идущих сборов, собранное в них
// и число завершённых сборов без отчёта — двумя групповыми запросами.
func (h *Handler) withMosqueStats(mosques []models.Mosque) ([]adminMosque, error) {
	out := make([]adminMosque, len(mosques))
	if len(mosques) == 0 {
		return out, nil
	}
	ids := make([]uuid.UUID, len(mosques))
	for i, m := range mosques {
		ids[i] = m.ID
		out[i] = adminMosque{Mosque: m}
	}
	var active []struct {
		MosqueID  uuid.UUID
		N         int64
		Collected decimal.Decimal
	}
	if err := h.DB.Model(&models.Campaign{}).Select("mosque_id, COUNT(*) AS n, COALESCE(SUM(current_amount),0) AS collected").
		Where("mosque_id IN ? AND status = ?", ids, models.CampaignStatusActive).Group("mosque_id").Scan(&active).Error; err != nil {
		return nil, err
	}
	var unrep []struct {
		MosqueID uuid.UUID
		N        int64
	}
	if err := h.DB.Model(&models.Campaign{}).Select("mosque_id, COUNT(*) AS n").
		Where("mosque_id IN ?", ids).
		Where("status = ? OR (status = ? AND end_date <= ?)", models.CampaignStatusCompleted, models.CampaignStatusActive, h.Now()).
		Where("NOT EXISTS (SELECT 1 FROM reports r WHERE r.campaign_id = campaigns.id AND r.status IN ?)",
			[]string{models.ReportStatusSubmitted, models.ReportStatusApproved}).
		Group("mosque_id").Scan(&unrep).Error; err != nil {
		return nil, err
	}
	idx := map[uuid.UUID]int{}
	for i, m := range mosques {
		idx[m.ID] = i
	}
	for _, a := range active {
		out[idx[a.MosqueID]].ActiveCampaigns, out[idx[a.MosqueID]].ActiveCollected = a.N, a.Collected
	}
	for _, u := range unrep {
		out[idx[u.MosqueID]].Unreported = u.N
	}
	return out, nil
}

// GET /admin/mosques/:id/campaigns — все сборы мечети и отчёты по ним
// («Контекст мечети» в очереди сборов, блок блокировки в реестре).
func (h *Handler) AdminMosqueCampaigns(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	var mosque models.Mosque
	if err := h.DB.First(&mosque, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "мечеть не найдена")
			return
		}
		utils.InternalError(c, err)
		return
	}
	campaigns := []models.Campaign{}
	if err := h.DB.Where("mosque_id = ?", id).Order("created_at DESC").Find(&campaigns).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	reports := []models.Report{}
	if err := h.DB.Select("id", "campaign_id", "status", "submitted_at", "updated_at").
		Where("mosque_id = ?", id).Find(&reports).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"mosque": mosque, "campaigns": campaigns, "reports": reports})
}

// moderateMosque меняет статус мечети, если текущий статус в списке from.
func (h *Handler) moderateMosque(c *gin.Context, from []string, to string, reasonRequired bool, action string) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	reason, ok := readReason(c, reasonRequired)
	if !ok {
		return
	}
	var mosque models.Mosque
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&mosque, "id = ?", id).Error; err != nil {
			return err
		}
		if !slices.Contains(from, mosque.Status) {
			return errConflict("действие недоступно для мечети в статусе " + mosque.Status)
		}
		entry := mosqueLog(&mosque)
		entry.Action, entry.FromStatus, entry.ToStatus, entry.Reason = action, mosque.Status, to, reason
		mosque.Status = to
		mosque.ModerationNote = reason
		if err := tx.Save(&mosque).Error; err != nil {
			return err
		}
		if err := notifyOwner(tx, &mosque, mosqueNotifyKind[action], nil, reason); err != nil {
			return err
		}
		return logAdmin(tx, c, entry)
	})
	if !h.handleTxError(c, err, "мечеть не найдена") {
		return
	}
	c.JSON(http.StatusOK, gin.H{"mosque": mosque})
}

// Какое уведомление получает мечеть после решения.
var mosqueNotifyKind = map[string]string{
	ActMosqueApprove: models.NotifyMosqueApproved,
	ActMosqueReject:  models.NotifyMosqueRejected,
	ActMosqueBlock:   models.NotifyMosqueBlocked,
	ActMosqueUnblock: models.NotifyMosqueUnblocked,
}

// POST /admin/mosques/:id/approve
func (h *Handler) AdminApproveMosque(c *gin.Context) {
	h.moderateMosque(c, []string{models.MosqueStatusPending}, models.MosqueStatusApproved, false, ActMosqueApprove)
}

// POST /admin/mosques/:id/reject {reason}
func (h *Handler) AdminRejectMosque(c *gin.Context) {
	h.moderateMosque(c, []string{models.MosqueStatusPending}, models.MosqueStatusRejected, true, ActMosqueReject)
}

// POST /admin/mosques/:id/block {reason} — только суперадмин.
// Пожертвования в кампании заблокированной мечети сразу перестают приниматься.
func (h *Handler) AdminBlockMosque(c *gin.Context) {
	h.moderateMosque(c, []string{models.MosqueStatusApproved, models.MosqueStatusPending}, models.MosqueStatusBlocked, true, ActMosqueBlock)
}

// POST /admin/mosques/:id/unblock — только суперадмин.
func (h *Handler) AdminUnblockMosque(c *gin.Context) {
	h.moderateMosque(c, []string{models.MosqueStatusBlocked}, models.MosqueStatusApproved, false, ActMosqueUnblock)
}

// ---------- Кампании ----------

// GET /admin/campaigns?status=pending_approval
func (h *Handler) AdminListCampaigns(c *gin.Context) {
	p := pagination(c)
	q := h.DB.Model(&models.Campaign{})
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	campaigns := []models.Campaign{}
	if err := p.apply(q.Preload("Mosque").Order("created_at DESC")).Find(&campaigns).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	// «Отчёты мечети» в очереди: сколько у мечети завершённых сборов без отчёта.
	type row struct {
		models.Campaign
		MosqueUnreported int64 `json:"mosque_unreported"`
	}
	out := make([]row, len(campaigns))
	cache := map[uuid.UUID]int64{}
	for i, cmp := range campaigns {
		n, seen := cache[cmp.MosqueID]
		if !seen {
			var err error
			if n, err = h.countUnreportedCampaigns(h.DB, cmp.MosqueID); err != nil {
				utils.InternalError(c, err)
				return
			}
			cache[cmp.MosqueID] = n
		}
		out[i] = row{Campaign: cmp, MosqueUnreported: n}
	}
	c.JSON(http.StatusOK, gin.H{"campaigns": out, "total": total})
}

func (h *Handler) moderateCampaign(c *gin.Context, approve bool) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	reason, ok := readReason(c, !approve)
	if !ok {
		return
	}
	var result models.Campaign
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		campaign, err := lockCampaign(tx, id)
		if err != nil {
			return err
		}
		if campaign.Status != models.CampaignStatusPendingApproval {
			return errConflict("кампания не ожидает одобрения")
		}
		var mosque models.Mosque
		if err := tx.First(&mosque, "id = ?", campaign.MosqueID).Error; err != nil {
			return err
		}
		entry := campaignLog(campaign, &mosque)
		entry.FromStatus, entry.Reason = campaign.Status, reason
		entry.Details = "цель " + som(campaign.GoalAmount)
		if approve {
			if mosque.Status != models.MosqueStatusApproved {
				return errConflict("мечеть не одобрена или заблокирована")
			}
			// Пока сбор ждал решения, у мечети мог завершиться другой сбор без отчёта.
			unreported, err := h.countUnreportedCampaigns(tx, mosque.ID)
			if err != nil {
				return err
			}
			if err := services.CanApproveCampaign(mosque.Status, unreported); err != nil {
				return errConflict(err.Error())
			}
			now := h.Now()
			campaign.Status = models.CampaignStatusActive
			campaign.ApprovedAt = &now
			entry.Action = ActCampaignApprove
		} else {
			campaign.Status = models.CampaignStatusRejected
			entry.Action = ActCampaignReject
		}
		campaign.ModerationNote = reason
		entry.ToStatus = campaign.Status
		result = *campaign
		if err := tx.Save(campaign).Error; err != nil {
			return err
		}
		kind := models.NotifyCampaignApproved
		if !approve {
			kind = models.NotifyCampaignRejected
		}
		if err := notifyOwner(tx, &mosque, kind, campaign, reason); err != nil {
			return err
		}
		return logAdmin(tx, c, entry)
	})
	if !h.handleTxError(c, err, "кампания не найдена") {
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaign": result})
}

// POST /admin/campaigns/:id/approve
func (h *Handler) AdminApproveCampaign(c *gin.Context) { h.moderateCampaign(c, true) }

// POST /admin/campaigns/:id/reject {reason}
func (h *Handler) AdminRejectCampaign(c *gin.Context) { h.moderateCampaign(c, false) }

// ---------- Отчёты ----------

// GET /admin/reports?status=submitted
func (h *Handler) AdminListReports(c *gin.Context) {
	p := pagination(c)
	q := h.DB.Model(&models.Report{})
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	reports := []models.Report{}
	if err := p.apply(q.Preload("Campaign.Mosque").Order("submitted_at DESC")).Find(&reports).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"reports": reports, "total": total})
}

func (h *Handler) moderateReport(c *gin.Context, approve bool) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	reason, ok := readReason(c, !approve)
	if !ok {
		return
	}
	var report models.Report
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&report, "id = ?", id).Error; err != nil {
			return err
		}
		if report.Status != models.ReportStatusSubmitted {
			return errConflict("отчёт не ожидает проверки")
		}
		var campaign models.Campaign
		if err := tx.First(&campaign, "id = ?", report.CampaignID).Error; err != nil {
			return err
		}
		var mosque models.Mosque
		if err := tx.First(&mosque, "id = ?", report.MosqueID).Error; err != nil {
			return err
		}
		entry := reportLog(&report, &campaign, &mosque)
		entry.FromStatus, entry.Reason = report.Status, reason
		entry.Details = "собрано " + som(report.TotalCollected) + ", потрачено " + som(report.TotalSpent)
		report.Status, entry.Action = models.ReportStatusApproved, ActReportApprove
		if !approve {
			report.Status, entry.Action = models.ReportStatusRejected, ActReportReject
		}
		entry.ToStatus = report.Status
		report.ModerationNote = reason
		if err := tx.Save(&report).Error; err != nil {
			return err
		}
		kind := models.NotifyReportApproved
		if !approve {
			kind = models.NotifyReportRejected
		}
		if err := notifyOwner(tx, &mosque, kind, &campaign, reason); err != nil {
			return err
		}
		// Жертвователи узнают, на что ушли их деньги, только после проверки Комитетом.
		if approve {
			if err := notifyDonors(tx, &campaign, models.NotifyReportPublished); err != nil {
				return err
			}
		}
		return logAdmin(tx, c, entry)
	})
	if !h.handleTxError(c, err, "отчёт не найден") {
		return
	}
	c.JSON(http.StatusOK, gin.H{"report": report})
}

// POST /admin/reports/:id/approve
func (h *Handler) AdminApproveReport(c *gin.Context) { h.moderateReport(c, true) }

// POST /admin/reports/:id/reject {reason} — мечеть должна будет переподать отчёт.
func (h *Handler) AdminRejectReport(c *gin.Context) { h.moderateReport(c, false) }

// ---------- helpers ----------

type conflictError string

func (e conflictError) Error() string { return string(e) }

func errConflict(msg string) error { return conflictError(msg) }

// handleTxError отвечает на ошибку транзакции; true — ошибки не было.
func (h *Handler) handleTxError(c *gin.Context, err error, notFoundMsg string) bool {
	if err == nil {
		return true
	}
	var ce conflictError
	switch {
	case errors.Is(err, errHandled):
		// ответ уже отправлен
	case isNotFound(err):
		utils.NotFound(c, notFoundMsg)
	case errors.As(err, &ce):
		utils.Conflict(c, ce.Error())
	default:
		utils.InternalError(c, err)
	}
	return false
}
