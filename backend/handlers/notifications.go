package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"sadaka.tj/backend/middleware"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

// Уведомления на сайте: колокольчик в шапке и страница «Уведомления».
// Создаются в той же транзакции, что и событие: решение Комитета без
// уведомления мечети не сохраняется.

// notifyOwner — уведомление представителю мечети о решении Комитета.
func notifyOwner(tx *gorm.DB, m *models.Mosque, kind string, cmp *models.Campaign, reason string) error {
	n := models.Notification{UserID: m.OwnerID, Kind: kind, MosqueID: &m.ID, ObjectTitle: m.Name, Reason: reason}
	if cmp != nil {
		n.CampaignID, n.ObjectTitle = &cmp.ID, cmp.Title
	}
	return tx.Create(&n).Error
}

// notifyDonors — уведомление всем, кто пожертвовал в сбор (по одному на человека).
func notifyDonors(tx *gorm.DB, cmp *models.Campaign, kind string) error {
	return tx.Exec(`
		INSERT INTO notifications (id, created_at, user_id, kind, mosque_id, campaign_id, object_title)
		SELECT gen_random_uuid(), now(), user_id, ?, ?, ?, ?
		FROM transactions
		WHERE campaign_id = ? AND status = ?
		GROUP BY user_id`,
		kind, cmp.MosqueID, cmp.ID, cut(cmp.Title, 255), cmp.ID, models.TransactionStatusCompleted,
	).Error
}

// notifyEveryone — всем пользователям (начало праздничного множителя Савоб).
func notifyEveryone(tx *gorm.DB, kind, title string, multiplier float64) error {
	return tx.Exec(`
		INSERT INTO notifications (id, created_at, user_id, kind, object_title, multiplier)
		SELECT gen_random_uuid(), now(), id, ?, ?, ? FROM users`,
		kind, cut(title, 255), multiplier,
	).Error
}

// GET /me/notifications — последние уведомления и число непрочитанных.
func (h *Handler) MyNotifications(c *gin.Context) {
	userID := middleware.AccountID(c)
	list := []models.Notification{}
	if err := pagination(c).apply(h.DB.Where("user_id = ?", userID).Order("created_at DESC")).Find(&list).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	unread, err := h.unreadCount(userID)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"notifications": list, "unread": unread})
}

// GET /me/notifications/unread — только счётчик, для колокольчика.
func (h *Handler) MyUnreadCount(c *gin.Context) {
	unread, err := h.unreadCount(middleware.AccountID(c))
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"unread": unread})
}

func (h *Handler) unreadCount(userID uuid.UUID) (int64, error) {
	var n int64
	err := h.DB.Model(&models.Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Count(&n).Error
	return n, err
}

type readRequest struct {
	IDs []uuid.UUID `json:"ids"` // пусто — отметить все
}

// POST /me/notifications/read {ids?} — отметить прочитанными.
func (h *Handler) ReadNotifications(c *gin.Context) {
	var req readRequest
	if c.Request.ContentLength > 0 && !bind(c, &req) {
		return
	}
	if len(req.IDs) > 100 {
		utils.BadRequest(c, "слишком много уведомлений за раз")
		return
	}
	q := h.DB.Model(&models.Notification{}).Where("user_id = ? AND read_at IS NULL", middleware.AccountID(c))
	if len(req.IDs) > 0 {
		q = q.Where("id IN ?", req.IDs)
	}
	if err := q.Update("read_at", h.Now()).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
