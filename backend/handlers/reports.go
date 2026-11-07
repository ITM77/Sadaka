package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

type reportRequest struct {
	Title       string               `json:"title"`
	Description string               `json:"description"`
	Expenses    []models.ExpenseItem `json:"expenses"`
	PhotoURLs   []string             `json:"photo_urls"`
}

// POST /campaigns/:id/report — мечеть публикует (или переподаёт после
// отклонения) отчёт по завершённой либо истёкшей кампании. Истёкшая
// активная кампания при этом автоматически закрывается.
func (h *Handler) SubmitReport(c *gin.Context) {
	campaign, mosque, ok := h.ownedCampaign(c)
	if !ok {
		return
	}
	now := h.Now()
	ended := campaign.Status == models.CampaignStatusActive && !now.Before(campaign.EndDate)
	if campaign.Status != models.CampaignStatusCompleted && !ended {
		utils.Conflict(c, "отчёт можно опубликовать только после завершения кампании")
		return
	}

	var req reportRequest
	if !bind(c, &req) {
		return
	}
	title, err := trimmed(req.Title, "Заголовок", true, 255)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	desc, err := trimmed(req.Description, "Описание", true, 10000)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	spent, err := validateExpenses(req.Expenses)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if len(req.PhotoURLs) == 0 {
		utils.BadRequest(c, "приложите хотя бы одно фото подтверждения")
		return
	}
	if len(req.PhotoURLs) > 30 {
		utils.BadRequest(c, "не больше 30 фотографий")
		return
	}

	var report models.Report
	err = h.DB.Where("campaign_id = ?", campaign.ID).First(&report).Error
	switch {
	case err == nil:
		if report.Status != models.ReportStatusRejected {
			utils.Conflict(c, "отчёт уже опубликован")
			return
		}
	case isNotFound(err):
		report = models.Report{CampaignID: campaign.ID, MosqueID: mosque.ID}
	default:
		utils.InternalError(c, err)
		return
	}

	report.Title, report.Description = title, desc
	report.TotalCollected = campaign.CurrentAmount
	report.TotalSpent = spent
	report.Expenses = req.Expenses
	report.PhotoURLs = req.PhotoURLs
	report.Status = models.ReportStatusSubmitted
	report.ModerationNote = ""
	report.SubmittedAt = now

	if ended {
		campaign.Status = models.CampaignStatusCompleted
		campaign.CompletedAt = &now
		if err := h.DB.Save(campaign).Error; err != nil {
			utils.InternalError(c, err)
			return
		}
	}
	if err := h.DB.Save(&report).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"report": report})
}

// GET /reports/:id — опубликованный отчёт (submitted или approved).
func (h *Handler) GetReport(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	var report models.Report
	if err := h.DB.First(&report, "id = ? AND status IN ?", id,
		[]string{models.ReportStatusSubmitted, models.ReportStatusApproved}).Error; err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "отчёт не найден")
			return
		}
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"report": report})
}

func validateExpenses(items []models.ExpenseItem) (decimal.Decimal, error) {
	if len(items) == 0 {
		return decimal.Zero, errors.New("укажите хотя бы одну статью расходов")
	}
	if len(items) > 200 {
		return decimal.Zero, errors.New("слишком много статей расходов")
	}
	total := decimal.Zero
	for i := range items {
		name, err := trimmed(items[i].Item, "Статья расходов", true, 255)
		if err != nil {
			return decimal.Zero, err
		}
		items[i].Item = name
		if err := utils.ValidateMoney(items[i].Cost); err != nil {
			return decimal.Zero, errors.New("«" + name + "»: " + err.Error())
		}
		total = total.Add(items[i].Cost)
	}
	return total, nil
}
