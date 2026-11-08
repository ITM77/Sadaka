package handlers

import (
	"errors"
	"net/http"
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

var campaignCategories = map[string]bool{
	"repairs": true, "construction": true, "education": true,
	"welfare": true, "utilities": true, "other": true,
}

type campaignRequest struct {
	MosqueID    uuid.UUID       `json:"mosque_id"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	Category    string          `json:"category"`
	GoalAmount  decimal.Decimal `json:"goal_amount"`
	StartDate   string          `json:"start_date"` // ГГГГ-ММ-ДД
	EndDate     string          `json:"end_date"`   // ГГГГ-ММ-ДД, включительно
}

func (r *campaignRequest) apply(c *models.Campaign) error {
	var err error
	if c.Title, err = trimmed(r.Title, "Название", true, 255); err != nil {
		return err
	}
	if c.Description, err = trimmed(r.Description, "Описание", true, 10000); err != nil {
		return err
	}
	c.Category = strings.TrimSpace(r.Category)
	if c.Category == "" {
		c.Category = "other"
	}
	if !campaignCategories[c.Category] {
		return errors.New("неизвестная категория кампании")
	}
	if err := utils.ValidateGoalAmount(r.GoalAmount); err != nil {
		return err
	}
	c.GoalAmount = r.GoalAmount
	start, err := parseDate(r.StartDate)
	if err != nil {
		return errors.New("дата начала: " + err.Error())
	}
	endDay, err := parseDate(r.EndDate)
	if err != nil {
		return errors.New("дата окончания: " + err.Error())
	}
	end := endDay.AddDate(0, 0, 1) // включительно: до конца дня окончания
	if err := services.ValidateCampaignDates(start, end); err != nil {
		return err
	}
	c.StartDate, c.EndDate = start, end
	return nil
}

// GET /campaigns — публичный список. По умолчанию активные;
// status=completed — завершённые. Фильтры: mosque_id, category.
func (h *Handler) ListCampaigns(c *gin.Context) {
	p := pagination(c)
	status := c.DefaultQuery("status", models.CampaignStatusActive)
	if status != models.CampaignStatusActive && status != models.CampaignStatusCompleted {
		utils.BadRequest(c, "status может быть active или completed")
		return
	}
	q := h.DB.Model(&models.Campaign{}).
		Joins("JOIN mosques ON mosques.id = campaigns.mosque_id AND mosques.status = ?", models.MosqueStatusApproved).
		Where("campaigns.status = ?", status)
	if mid := c.Query("mosque_id"); mid != "" {
		id, err := uuid.Parse(mid)
		if err != nil {
			utils.BadRequest(c, "некорректный mosque_id")
			return
		}
		q = q.Where("campaigns.mosque_id = ?", id)
	}
	if cat := c.Query("category"); cat != "" {
		q = q.Where("campaigns.category = ?", cat)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	campaigns := []models.Campaign{}
	if err := p.apply(q.Preload("Mosque").Order("campaigns.created_at DESC")).Find(&campaigns).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	for i := range campaigns {
		hidePrivateMosqueFields(campaigns[i].Mosque)
	}
	c.JSON(http.StatusOK, gin.H{"campaigns": campaigns, "total": total})
}

type publicDonation struct {
	Amount    decimal.Decimal `json:"amount"`
	CreatedAt time.Time       `json:"created_at"`
}

// GET /campaigns/:id — карточка активной или завершённой кампании,
// последние пожертвования (без имён жертвователей) и отчёт.
func (h *Handler) GetCampaign(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	var campaign models.Campaign
	err := h.DB.Preload("Mosque").
		Joins("JOIN mosques ON mosques.id = campaigns.mosque_id AND mosques.status = ?", models.MosqueStatusApproved).
		Where("campaigns.id = ? AND campaigns.status IN ?", id,
			[]string{models.CampaignStatusActive, models.CampaignStatusCompleted}).
		First(&campaign).Error
	if err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "кампания не найдена")
			return
		}
		utils.InternalError(c, err)
		return
	}
	hidePrivateMosqueFields(campaign.Mosque)

	recent := []publicDonation{}
	if err := h.DB.Model(&models.Transaction{}).Select("amount, created_at").
		Where("campaign_id = ? AND status = ?", id, models.TransactionStatusCompleted).
		Order("created_at DESC").Limit(10).Scan(&recent).Error; err != nil {
		utils.InternalError(c, err)
		return
	}

	var report *models.Report
	var r models.Report
	err = h.DB.Where("campaign_id = ? AND status IN ?", id,
		[]string{models.ReportStatusSubmitted, models.ReportStatusApproved}).First(&r).Error
	switch {
	case err == nil:
		report = &r
	case !isNotFound(err):
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaign": campaign, "recent_donations": recent, "report": report})
}

// POST /campaigns — мечеть создаёт черновик.
func (h *Handler) CreateCampaign(c *gin.Context) {
	var req campaignRequest
	if !bind(c, &req) {
		return
	}
	mosque, ok := h.loadOwnedMosque(c, req.MosqueID)
	if !ok {
		return
	}
	if mosque.Status != models.MosqueStatusApproved {
		utils.Forbidden(c, services.ErrMosqueNotApproved.Error())
		return
	}
	campaign := models.Campaign{MosqueID: mosque.ID, Status: models.CampaignStatusDraft, CurrentAmount: decimal.Zero}
	if err := req.apply(&campaign); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if err := h.DB.Create(&campaign).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"campaign": campaign})
}

// PUT /campaigns/:id — правка черновика или отклонённой кампании.
// Отклонённая после правки снова становится черновиком.
func (h *Handler) UpdateCampaign(c *gin.Context) {
	campaign, _, ok := h.ownedCampaign(c)
	if !ok {
		return
	}
	if campaign.Status != models.CampaignStatusDraft && campaign.Status != models.CampaignStatusRejected {
		utils.Conflict(c, "править можно только черновик или отклонённую кампанию")
		return
	}
	var req campaignRequest
	if !bind(c, &req) {
		return
	}
	if err := req.apply(campaign); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	campaign.Status = models.CampaignStatusDraft
	if err := h.DB.Save(campaign).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaign": campaign})
}

// POST /campaigns/:id/submit — отправка на одобрение Комитету.
// Блокируется, если по прошлым кампаниям мечети нет отчёта.
func (h *Handler) SubmitCampaign(c *gin.Context) {
	campaign, mosque, ok := h.ownedCampaign(c)
	if !ok {
		return
	}
	unreported, err := h.countUnreportedCampaigns(h.DB, mosque.ID)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	if err := services.CanSubmitCampaign(campaign.Status, mosque.Status, unreported); err != nil {
		utils.Fail(c, http.StatusConflict, "CAMPAIGN_RULE", err.Error())
		return
	}
	campaign.Status = models.CampaignStatusPendingApproval
	campaign.ModerationNote = ""
	if err := h.DB.Save(campaign).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaign": campaign})
}

// POST /campaigns/:id/complete — мечеть закрывает активную кампанию.
func (h *Handler) CompleteCampaign(c *gin.Context) {
	campaign, _, ok := h.ownedCampaign(c)
	if !ok {
		return
	}
	if campaign.Status != models.CampaignStatusActive {
		utils.Conflict(c, services.ErrWrongCampaignState.Error())
		return
	}
	now := h.Now()
	campaign.Status = models.CampaignStatusCompleted
	campaign.CompletedAt = &now
	if err := h.DB.Save(campaign).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaign": campaign})
}

// GET /me/mosques/:id/campaigns — все кампании своей мечети в любом статусе
// и отчёты по ним (включая отклонённые — с причиной от Комитета).
func (h *Handler) MyMosqueCampaigns(c *gin.Context) {
	mosque, ok := h.ownedMosque(c, "id")
	if !ok {
		return
	}
	campaigns := []models.Campaign{}
	if err := h.DB.Where("mosque_id = ?", mosque.ID).Order("created_at DESC").Find(&campaigns).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	reports := []models.Report{}
	if err := h.DB.Where("mosque_id = ?", mosque.ID).Find(&reports).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"mosque": mosque, "campaigns": campaigns, "reports": reports})
}

// countUnreportedCampaigns — завершённые (или активные, но уже истёкшие)
// кампании мечети без опубликованного отчёта. db — h.DB или открытая транзакция.
func (h *Handler) countUnreportedCampaigns(db *gorm.DB, mosqueID uuid.UUID) (int64, error) {
	var n int64
	err := db.Model(&models.Campaign{}).
		Where("mosque_id = ?", mosqueID).
		Where("status = ? OR (status = ? AND end_date <= ?)",
			models.CampaignStatusCompleted, models.CampaignStatusActive, h.Now()).
		Where("NOT EXISTS (SELECT 1 FROM reports r WHERE r.campaign_id = campaigns.id AND r.status IN ?)",
			[]string{models.ReportStatusSubmitted, models.ReportStatusApproved}).
		Count(&n).Error
	return n, err
}

// ownedCampaign загружает кампанию и её мечеть, проверяя владельца.
func (h *Handler) ownedCampaign(c *gin.Context) (*models.Campaign, *models.Mosque, bool) {
	id, ok := pathID(c, "id")
	if !ok {
		return nil, nil, false
	}
	var campaign models.Campaign
	if err := h.DB.First(&campaign, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "кампания не найдена")
			return nil, nil, false
		}
		utils.InternalError(c, err)
		return nil, nil, false
	}
	mosque, ok := h.loadOwnedMosque(c, campaign.MosqueID)
	if !ok {
		return nil, nil, false
	}
	return &campaign, mosque, true
}

func hidePrivateMosqueFields(m *models.Mosque) {
	if m != nil {
		m.ImamPhone = ""
	}
}

// lockCampaign — SELECT … FOR UPDATE внутри транзакции.
func lockCampaign(tx *gorm.DB, id uuid.UUID) (*models.Campaign, error) {
	var campaign models.Campaign
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&campaign, "id = ?", id).Error
	return &campaign, err
}
