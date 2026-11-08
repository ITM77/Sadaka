package handlers

import (
	"errors"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
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
	c.JSON(http.StatusOK, s)
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

// GET /admin/mosques?status=pending
func (h *Handler) AdminListMosques(c *gin.Context) {
	p := pagination(c)
	q := h.DB.Model(&models.Mosque{})
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	mosques := []models.Mosque{}
	if err := p.apply(q.Order("created_at DESC")).Find(&mosques).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"mosques": mosques, "total": total})
}

// moderateMosque меняет статус мечети, если текущий статус в списке from.
func (h *Handler) moderateMosque(c *gin.Context, from []string, to string, reasonRequired bool) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	reason, ok := readReason(c, reasonRequired)
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
	if !slices.Contains(from, mosque.Status) {
		utils.Conflict(c, "действие недоступно для мечети в статусе "+mosque.Status)
		return
	}
	mosque.Status = to
	mosque.ModerationNote = reason
	if err := h.DB.Save(&mosque).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"mosque": mosque})
}

// POST /admin/mosques/:id/approve
func (h *Handler) AdminApproveMosque(c *gin.Context) {
	h.moderateMosque(c, []string{models.MosqueStatusPending}, models.MosqueStatusApproved, false)
}

// POST /admin/mosques/:id/reject {reason}
func (h *Handler) AdminRejectMosque(c *gin.Context) {
	h.moderateMosque(c, []string{models.MosqueStatusPending}, models.MosqueStatusRejected, true)
}

// POST /admin/mosques/:id/block {reason} — только суперадмин.
// Пожертвования в кампании заблокированной мечети сразу перестают приниматься.
func (h *Handler) AdminBlockMosque(c *gin.Context) {
	h.moderateMosque(c, []string{models.MosqueStatusApproved, models.MosqueStatusPending}, models.MosqueStatusBlocked, true)
}

// POST /admin/mosques/:id/unblock — только суперадмин.
func (h *Handler) AdminUnblockMosque(c *gin.Context) {
	h.moderateMosque(c, []string{models.MosqueStatusBlocked}, models.MosqueStatusApproved, false)
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
	c.JSON(http.StatusOK, gin.H{"campaigns": campaigns, "total": total})
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
		if approve {
			var mosque models.Mosque
			if err := tx.First(&mosque, "id = ?", campaign.MosqueID).Error; err != nil {
				return err
			}
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
		} else {
			campaign.Status = models.CampaignStatusRejected
		}
		campaign.ModerationNote = reason
		result = *campaign
		return tx.Save(campaign).Error
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
	if err := h.DB.First(&report, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "отчёт не найден")
			return
		}
		utils.InternalError(c, err)
		return
	}
	if report.Status != models.ReportStatusSubmitted {
		utils.Conflict(c, "отчёт не ожидает проверки")
		return
	}
	report.Status = models.ReportStatusApproved
	if !approve {
		report.Status = models.ReportStatusRejected
	}
	report.ModerationNote = reason
	if err := h.DB.Save(&report).Error; err != nil {
		utils.InternalError(c, err)
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
	case isNotFound(err):
		utils.NotFound(c, notFoundMsg)
	case errors.As(err, &ce):
		utils.Conflict(c, ce.Error())
	default:
		utils.InternalError(c, err)
	}
	return false
}
