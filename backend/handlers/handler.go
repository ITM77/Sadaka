// Package handlers — HTTP-обработчики API v1.
package handlers

import (
	"errors"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata" // часовой пояс Душанбе доступен и на Windows/alpine

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"sadaka.tj/backend/config"
	"sadaka.tj/backend/payments"
	"sadaka.tj/backend/utils"
)

type Handler struct {
	DB       *gorm.DB
	Cfg      *config.Config
	Payments payments.Provider
	Now      func() time.Time
}

func New(db *gorm.DB, cfg *config.Config, p payments.Provider) *Handler {
	return &Handler{DB: db, Cfg: cfg, Payments: p, Now: time.Now}
}

// Dushanbe — часовой пояс, в котором трактуются даты кампаний.
var Dushanbe = mustLoadLocation("Asia/Dushanbe")

func mustLoadLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic(err)
	}
	return loc
}

// parseDate разбирает "2026-06-13" как начало дня по Душанбе.
func parseDate(s string) (time.Time, error) {
	t, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(s), Dushanbe)
	if err != nil {
		return time.Time{}, errors.New("дата должна быть в формате ГГГГ-ММ-ДД")
	}
	return t, nil
}

// pathID читает UUID из параметра пути; при ошибке сам отвечает 400.
func pathID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		utils.BadRequest(c, "некорректный идентификатор")
		return uuid.Nil, false
	}
	return id, true
}

// bind разбирает JSON-тело; при ошибке сам отвечает 400.
func bind(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		utils.BadRequest(c, "некорректные данные запроса: "+err.Error())
		return false
	}
	return true
}

type page struct{ Limit, Offset int }

func pagination(c *gin.Context) page {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return page{Limit: limit, Offset: offset}
}

func (p page) apply(q *gorm.DB) *gorm.DB { return q.Limit(p.Limit).Offset(p.Offset) }

func isNotFound(err error) bool { return errors.Is(err, gorm.ErrRecordNotFound) }

// trimmed обрезает пробелы и проверяет обязательность/длину поля.
func trimmed(value, field string, required bool, max int) (string, error) {
	v := strings.TrimSpace(value)
	if required && v == "" {
		return "", errors.New("поле «" + field + "» обязательно")
	}
	if len([]rune(v)) > max {
		return "", errors.New("поле «" + field + "» слишком длинное")
	}
	return v, nil
}
