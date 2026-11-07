package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"sadaka.tj/backend/middleware"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/payments"
	"sadaka.tj/backend/services"
	"sadaka.tj/backend/utils"
)

type donationRequest struct {
	CampaignID    uuid.UUID       `json:"campaign_id"`
	Amount        decimal.Decimal `json:"amount"`
	PaymentMethod string          `json:"payment_method"`
}

// POST /donations — пожертвование в активную кампанию.
func (h *Handler) CreateDonation(c *gin.Context) {
	var req donationRequest
	if !bind(c, &req) {
		return
	}
	if err := utils.ValidateDonationAmount(req.Amount); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if !models.PaymentMethods[req.PaymentMethod] {
		utils.BadRequest(c, "неизвестный способ оплаты")
		return
	}
	userID := middleware.AccountID(c)

	// 1. Проверяем, что кампания открыта, и создаём платёж в статусе pending.
	var campaign models.Campaign
	if err := h.DB.Preload("Mosque").First(&campaign, "id = ?", req.CampaignID).Error; err != nil || campaign.Mosque == nil {
		if err == nil || isNotFound(err) {
			utils.NotFound(c, "кампания не найдена")
			return
		}
		utils.InternalError(c, err)
		return
	}
	if err := services.CanDonate(&campaign, campaign.Mosque.Status, h.Now()); err != nil {
		utils.Fail(c, http.StatusConflict, "CAMPAIGN_CLOSED", err.Error())
		return
	}
	txn := models.Transaction{
		UserID:          userID,
		CampaignID:      campaign.ID,
		MosqueID:        campaign.MosqueID,
		Amount:          req.Amount.Round(2),
		Currency:        "TJS",
		PaymentMethod:   req.PaymentMethod,
		PaymentProvider: h.Payments.Name(),
		Status:          models.TransactionStatusPending,
	}
	if err := h.DB.Create(&txn).Error; err != nil {
		utils.InternalError(c, err)
		return
	}

	// 2. Списываем деньги через провайдера.
	res, err := h.Payments.Charge(c.Request.Context(), payments.ChargeRequest{
		TransactionID: txn.ID, Amount: txn.Amount, Currency: txn.Currency, Method: txn.PaymentMethod,
	})
	if err != nil {
		h.DB.Model(&txn).Update("status", models.TransactionStatusFailed)
		utils.Fail(c, http.StatusPaymentRequired, "PAYMENT_ERROR", "платёж не прошёл, попробуйте ещё раз")
		return
	}
	txn.PaymentReference = res.Reference
	if !res.Completed {
		// Асинхронные провайдеры подтвердят платёж позже (webhook).
		h.DB.Model(&txn).Update("payment_reference", res.Reference)
		c.JSON(http.StatusAccepted, gin.H{"transaction": txn})
		return
	}

	// 3. Фиксируем пожертвование: сумма кампании и Савоб — атомарно.
	if err := h.completeDonation(&txn); err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"transaction": txn, "savob_earned": txn.SavobEarned})
}

// completeDonation переводит платёж в completed, увеличивает сумму кампании
// и начисляет Савоб в одной транзакции БД.
func (h *Handler) completeDonation(txn *models.Transaction) error {
	return h.DB.Transaction(func(tx *gorm.DB) error {
		campaign, err := lockCampaign(tx, txn.CampaignID)
		if err != nil {
			return err
		}
		if err := tx.Model(campaign).Updates(map[string]any{
			"current_amount": gorm.Expr("current_amount + ?", txn.Amount),
			"donation_count": gorm.Expr("donation_count + 1"),
		}).Error; err != nil {
			return err
		}

		points := services.SavobPoints(txn.Amount, h.Cfg.SavobMultiplier)
		txn.Status = models.TransactionStatusCompleted
		txn.SavobEarned = points
		if err := tx.Model(txn).Updates(map[string]any{
			"status": txn.Status, "savob_earned": points, "payment_reference": txn.PaymentReference,
		}).Error; err != nil {
			return err
		}

		entry := models.SavobEntry{
			UserID: txn.UserID, TransactionID: txn.ID, Points: points,
			Multiplier: h.Cfg.SavobMultiplier, EventType: h.Cfg.SavobEvent,
		}
		if err := tx.Create(&entry).Error; err != nil {
			return err
		}
		return tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]any{
				"total_points": gorm.Expr("savob_balances.total_points + EXCLUDED.total_points"),
				"updated_at":   gorm.Expr("EXCLUDED.updated_at"),
			}),
		}).Create(&models.SavobBalance{UserID: txn.UserID, TotalPoints: points}).Error
	})
}

// GET /me/donations — история пожертвований пользователя.
func (h *Handler) MyDonations(c *gin.Context) {
	p := pagination(c)
	q := h.DB.Model(&models.Transaction{}).Where("user_id = ?", middleware.AccountID(c))
	var total int64
	if err := q.Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	txns := []models.Transaction{}
	if err := p.apply(q.Preload("Campaign").Order("created_at DESC")).Find(&txns).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"transactions": txns, "total": total})
}

// GET /me/savob — баллы Савоб и история начислений («Мои добрые дела»).
func (h *Handler) MySavob(c *gin.Context) {
	userID := middleware.AccountID(c)
	var balance models.SavobBalance
	err := h.DB.First(&balance, "user_id = ?", userID).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		utils.InternalError(c, err)
		return
	}
	balance.UserID = userID

	history := []models.SavobEntry{}
	if err := pagination(c).apply(h.DB.Where("user_id = ?", userID).Order("created_at DESC")).Find(&history).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"total_points":       balance.TotalPoints,
		"current_multiplier": h.Cfg.SavobMultiplier,
		"current_event":      h.Cfg.SavobEvent,
		"history":            history,
	})
}
