// Package services — бизнес-правила платформы без зависимости от HTTP и БД,
// чтобы их можно было проверять обычными юнит-тестами.
package services

import (
	"errors"
	"time"

	"github.com/shopspring/decimal"
	"sadaka.tj/backend/models"
)

// TJSPerSavobPoint — сколько сомони даёт 1 балл Савоб (без множителя).
var TJSPerSavobPoint = decimal.NewFromInt(10)

// SavobPoints считает баллы за пожертвование: 1 балл за каждые 10 TJS,
// умноженные на праздничный множитель (Рамадан ×2, Курбан ×3), минимум 1 балл.
func SavobPoints(amount decimal.Decimal, multiplier float64) int {
	if !amount.IsPositive() {
		return 0
	}
	if multiplier < 1 {
		multiplier = 1
	}
	points := amount.Div(TJSPerSavobPoint).Mul(decimal.NewFromFloat(multiplier)).Floor().IntPart()
	if points < 1 {
		return 1
	}
	return int(points)
}

var (
	ErrMosqueNotApproved  = errors.New("мечеть ещё не одобрена Комитетом улемов или заблокирована")
	ErrReportMissing      = errors.New("сначала опубликуйте отчёт по завершённым кампаниям — без отчёта новая кампания не запускается")
	ErrWrongCampaignState = errors.New("действие недоступно в текущем статусе кампании")
	ErrCampaignNotOpen    = errors.New("кампания сейчас не принимает пожертвования")
)

// CanSubmitCampaign — можно ли отправить кампанию на одобрение.
// unreportedCompleted — сколько у мечети завершённых кампаний без отчёта
// (отчёт считается опубликованным в статусе submitted или approved).
func CanSubmitCampaign(campaignStatus, mosqueStatus string, unreportedCompleted int64) error {
	if mosqueStatus != models.MosqueStatusApproved {
		return ErrMosqueNotApproved
	}
	if campaignStatus != models.CampaignStatusDraft {
		return ErrWrongCampaignState
	}
	if unreportedCompleted > 0 {
		return ErrReportMissing
	}
	return nil
}

// CanDonate — принимает ли кампания пожертвования в момент now.
func CanDonate(c *models.Campaign, mosqueStatus string, now time.Time) error {
	if mosqueStatus != models.MosqueStatusApproved {
		return ErrMosqueNotApproved
	}
	if c.Status != models.CampaignStatusActive || now.Before(c.StartDate) || !now.Before(c.EndDate) {
		return ErrCampaignNotOpen
	}
	return nil
}

// ValidateCampaignDates: конец позже начала, срок не больше года.
func ValidateCampaignDates(start, end time.Time) error {
	if !end.After(start) {
		return errors.New("дата окончания должна быть позже даты начала")
	}
	if end.Sub(start) > 366*24*time.Hour {
		return errors.New("кампания не может длиться больше года")
	}
	return nil
}
