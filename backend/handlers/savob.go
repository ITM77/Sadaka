package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

// Режим Савоб: праздничный множитель (Рамадан ×2, Курбан ×3), который
// включает суперадмин. Пока строки в БД нет, действуют SAVOB_MULTIPLIER и
// SAVOB_EVENT из окружения — как раньше.

const ActSavobMode = "settings.savob_mode"

// savobMode читает режим из БД (или из окружения, если его ещё не задавали).
func (h *Handler) savobMode(db *gorm.DB) (*models.SavobMode, error) {
	var m models.SavobMode
	err := db.First(&m, "id = ?", models.SavobModeID).Error
	if isNotFound(err) {
		return &models.SavobMode{ID: models.SavobModeID, Event: h.Cfg.SavobEvent, Multiplier: h.Cfg.SavobMultiplier}, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// currentSavob — множитель и событие, которые действуют прямо сейчас.
func (h *Handler) currentSavob(db *gorm.DB, now time.Time) (float64, string, error) {
	m, err := h.savobMode(db)
	if err != nil {
		return 1, models.SavobEventRegular, err
	}
	if !m.Active(now) {
		return 1, models.SavobEventRegular, nil
	}
	return m.Multiplier, m.Event, nil
}

type savobModeView struct {
	*models.SavobMode
	Active    bool    `json:"active"`
	Effective float64 `json:"effective_multiplier"` // множитель прямо сейчас
}

func (h *Handler) savobView(c *gin.Context) (*savobModeView, bool) {
	m, err := h.savobMode(h.DB)
	if err != nil {
		utils.InternalError(c, err)
		return nil, false
	}
	v := &savobModeView{SavobMode: m, Effective: 1}
	if m.Active(h.Now()) {
		v.Active, v.Effective = true, m.Multiplier
	}
	return v, true
}

// GET /savob/mode — публично: баннер «Рамадан: Савоб ×2» на сайте.
func (h *Handler) GetSavobMode(c *gin.Context) {
	if v, ok := h.savobView(c); ok {
		c.JSON(http.StatusOK, gin.H{"mode": v})
	}
}

type savobModeRequest struct {
	Event      string  `json:"event"`
	Title      string  `json:"title"`
	Multiplier float64 `json:"multiplier"`
	StartsOn   string  `json:"starts_on"` // ГГГГ-ММ-ДД, пусто — с сегодняшнего дня
	EndsOn     string  `json:"ends_on"`   // ГГГГ-ММ-ДД включительно, пусто — до выключения
	Notify     bool    `json:"notify"`    // разослать уведомление всем пользователям
}

// PUT /admin/savob-mode — только суперадмин.
func (h *Handler) AdminSetSavobMode(c *gin.Context) {
	var req savobModeRequest
	if !bind(c, &req) {
		return
	}
	next := models.SavobMode{ID: models.SavobModeID, Event: req.Event, Multiplier: req.Multiplier}
	if !models.SavobEvents[req.Event] {
		utils.BadRequest(c, "неизвестное событие")
		return
	}
	if req.Event == models.SavobEventRegular {
		next.Multiplier = 1
	} else {
		if req.Multiplier < 1.5 || req.Multiplier > 5 {
			utils.BadRequest(c, "множитель должен быть от 1,5 до 5")
			return
		}
		title, err := trimmed(req.Title, "Название", req.Event == models.SavobEventSpecial, 100)
		if err != nil {
			utils.BadRequest(c, err.Error())
			return
		}
		next.Title = title
		if req.StartsOn != "" {
			t, err := parseDate(req.StartsOn)
			if err != nil {
				utils.BadRequest(c, err.Error())
				return
			}
			next.StartsAt = &t
		}
		if req.EndsOn != "" {
			t, err := parseDate(req.EndsOn)
			if err != nil {
				utils.BadRequest(c, err.Error())
				return
			}
			t = t.AddDate(0, 0, 1) // конец дня включительно
			if !t.After(h.Now()) {
				utils.BadRequest(c, "дата окончания уже прошла")
				return
			}
			next.EndsAt = &t
		}
		if next.StartsAt != nil && next.EndsAt != nil && !next.EndsAt.After(*next.StartsAt) {
			utils.BadRequest(c, "дата окончания раньше даты начала")
			return
		}
	}
	admin := currentAdmin(c)
	if admin != nil {
		next.UpdatedByID = &admin.ID
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		prev, err := h.savobMode(tx)
		if err != nil {
			return err
		}
		if err := tx.Clauses(clause.OnConflict{UpdateAll: true}).Create(&next).Error; err != nil {
			return err
		}
		entry := models.AuditLog{
			Action: ActSavobMode, ObjectType: models.ObjectSettings, ObjectID: models.SettingsObjectID,
			ObjectTitle: "Режим Савоб", FromStatus: prev.Event, ToStatus: next.Event,
			Details: cut(savobSummary(&next), 500),
		}
		if err := logAdmin(tx, c, entry); err != nil {
			return err
		}
		if req.Notify && next.Event != models.SavobEventRegular {
			return notifyEveryone(tx, models.NotifySavobEvent, savobEventTitle(&next), next.Multiplier)
		}
		return nil
	})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	if v, ok := h.savobView(c); ok {
		c.JSON(http.StatusOK, gin.H{"mode": v})
	}
}

// savobEventTitle — «Рамадан», «Курбан-байрам» или своё название.
func savobEventTitle(m *models.SavobMode) string {
	switch m.Event {
	case models.SavobEventRamadan:
		return "Рамадан"
	case models.SavobEventKurban:
		return "Курбан-байрам"
	case models.SavobEventSpecial:
		return m.Title
	}
	return "Обычный режим"
}

// savobSummary — «Рамадан ×2, 1.03.2027 – 30.03.2027» для журнала.
func savobSummary(m *models.SavobMode) string {
	if m.Event == models.SavobEventRegular {
		return "Обычный режим, ×1"
	}
	mult := strings.Replace(strconv.FormatFloat(m.Multiplier, 'f', -1, 64), ".", ",", 1)
	s := fmt.Sprintf("%s ×%s", savobEventTitle(m), mult)
	from, to := "сегодня", "до выключения"
	if m.StartsAt != nil {
		from = m.StartsAt.In(Dushanbe).Format("02.01.2006")
	}
	if m.EndsAt != nil {
		to = m.EndsAt.Add(-time.Second).In(Dushanbe).Format("02.01.2006")
	}
	return s + ", " + from + " – " + to
}
