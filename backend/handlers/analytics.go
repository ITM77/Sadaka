package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

// Аналитика для Комитета: сколько собрано, где, как платят и отчитываются ли мечети.
// Считаются только завершённые платежи. Даты — по Душанбе.

type analyticsPeriod struct {
	Days  int    // 0 — за всё время
	Unit  string // шаг графика: day | week | month
	Step  string // interval для generate_series
}

var analyticsPeriods = map[string]analyticsPeriod{
	"30d": {Days: 30, Unit: "day", Step: "1 day"},
	"90d": {Days: 90, Unit: "week", Step: "1 week"},
	"12m": {Days: 365, Unit: "month", Step: "1 month"},
	"all": {Days: 0, Unit: "month", Step: "1 month"},
}

type seriesPoint struct {
	Bucket string          `json:"bucket"` // ГГГГ-ММ-ДД — начало дня, недели или месяца
	Amount decimal.Decimal `json:"amount"`
	Count  int64           `json:"count"`
}

type cityRow struct {
	City    string          `json:"city"`
	Amount  decimal.Decimal `json:"amount"`
	Count   int64           `json:"count"`
	Mosques int64           `json:"mosques"`
}

type methodRow struct {
	Method string          `json:"method"`
	Amount decimal.Decimal `json:"amount"`
	Count  int64           `json:"count"`
}

type topMosqueRow struct {
	ID     uuid.UUID       `json:"id"`
	Name   string          `json:"name"`
	City   string          `json:"city"`
	Amount decimal.Decimal `json:"amount"`
	Count  int64           `json:"count"`
	Donors int64           `json:"donors"`
}

// GET /admin/analytics?period=30d|90d|12m|all
func (h *Handler) AdminAnalytics(c *gin.Context) {
	key := c.DefaultQuery("period", "12m")
	p, ok := analyticsPeriods[key]
	if !ok {
		utils.BadRequest(c, "period: 30d, 90d, 12m или all")
		return
	}
	now := h.Now()
	since := time.Date(2000, 1, 1, 0, 0, 0, 0, Dushanbe) // «за всё время»
	if p.Days > 0 {
		// С начала первого дня периода по Душанбе.
		d := now.In(Dushanbe).AddDate(0, 0, -(p.Days - 1))
		since = time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, Dushanbe)
	}
	done := models.TransactionStatusCompleted

	var totals struct {
		Amount decimal.Decimal `json:"amount"`
		Count  int64           `json:"count"`
		Donors int64           `json:"donors"`
		Avg    decimal.Decimal `json:"avg"`
		Savob  int64           `json:"savob"`
	}
	if err := h.DB.Raw(`
		SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count, COUNT(DISTINCT user_id) AS donors,
		       COALESCE(SUM(savob_earned), 0) AS savob
		FROM transactions WHERE status = ? AND created_at >= ?`, done, since).Scan(&totals).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	if totals.Count > 0 {
		totals.Avg = totals.Amount.Div(decimal.NewFromInt(totals.Count)).Round(0)
	}

	// Тот же период до этого — чтобы показать рост или падение.
	var prev struct {
		Amount decimal.Decimal `json:"amount"`
		Count  int64           `json:"count"`
	}
	if p.Days > 0 {
		prevSince := since.AddDate(0, 0, -p.Days)
		if err := h.DB.Raw(`
			SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
			FROM transactions WHERE status = ? AND created_at >= ? AND created_at < ?`,
			done, prevSince, since).Scan(&prev).Error; err != nil {
			utils.InternalError(c, err)
			return
		}
	}

	// График: каждый шаг периода, пустые — с нулём.
	start := since
	if p.Days == 0 {
		var first *time.Time
		if err := h.DB.Raw(`SELECT MIN(created_at) FROM transactions WHERE status = ?`, done).Scan(&first).Error; err != nil {
			utils.InternalError(c, err)
			return
		}
		start = now
		if first != nil {
			start = *first
		}
	}
	series := []seriesPoint{}
	if err := h.DB.Raw(`
		WITH b AS (
			SELECT g::date AS bucket FROM generate_series(
				date_trunc(@unit, CAST(@start AS timestamptz) AT TIME ZONE 'Asia/Dushanbe'),
				date_trunc(@unit, CAST(@now AS timestamptz) AT TIME ZONE 'Asia/Dushanbe'),
				CAST(@step AS interval)) g
		)
		SELECT to_char(b.bucket, 'YYYY-MM-DD') AS bucket,
		       COALESCE(SUM(t.amount), 0) AS amount, COUNT(t.id) AS count
		FROM b LEFT JOIN transactions t
		  ON t.status = @done AND t.created_at >= @since
		 AND date_trunc(@unit, t.created_at AT TIME ZONE 'Asia/Dushanbe')::date = b.bucket
		GROUP BY b.bucket ORDER BY b.bucket`,
		map[string]any{"unit": p.Unit, "start": start, "now": now, "step": p.Step, "done": done, "since": since},
	).Scan(&series).Error; err != nil {
		utils.InternalError(c, err)
		return
	}

	cities := []cityRow{}
	if err := h.DB.Raw(`
		SELECT m.city, SUM(t.amount) AS amount, COUNT(*) AS count, COUNT(DISTINCT t.mosque_id) AS mosques
		FROM transactions t JOIN mosques m ON m.id = t.mosque_id
		WHERE t.status = ? AND t.created_at >= ?
		GROUP BY m.city ORDER BY amount DESC`, done, since).Scan(&cities).Error; err != nil {
		utils.InternalError(c, err)
		return
	}

	methods := []methodRow{}
	if err := h.DB.Raw(`
		SELECT payment_method AS method, SUM(amount) AS amount, COUNT(*) AS count
		FROM transactions WHERE status = ? AND created_at >= ?
		GROUP BY payment_method ORDER BY amount DESC`, done, since).Scan(&methods).Error; err != nil {
		utils.InternalError(c, err)
		return
	}

	top := []topMosqueRow{}
	if err := h.DB.Raw(`
		SELECT m.id, m.name, m.city, SUM(t.amount) AS amount, COUNT(*) AS count, COUNT(DISTINCT t.user_id) AS donors
		FROM transactions t JOIN mosques m ON m.id = t.mosque_id
		WHERE t.status = ? AND t.created_at >= ?
		GROUP BY m.id, m.name, m.city ORDER BY amount DESC LIMIT 10`, done, since).Scan(&top).Error; err != nil {
		utils.InternalError(c, err)
		return
	}

	// Отчётность — за всё время: обязанность отчитаться не зависит от периода.
	var reporting struct {
		Completed int64 `json:"completed"` // завершённых сборов
		Approved  int64 `json:"approved"`  // отчёт принят
		Review    int64 `json:"review"`    // отчёт на проверке
		Rejected  int64 `json:"rejected"`  // отчёт отклонён, ждём новый
		Missing   int64 `json:"missing"`   // отчёта нет
	}
	if err := h.DB.Raw(`
		SELECT COUNT(*) AS completed,
		       COUNT(*) FILTER (WHERE r.status = ?) AS approved,
		       COUNT(*) FILTER (WHERE r.status = ?) AS review,
		       COUNT(*) FILTER (WHERE r.status = ?) AS rejected,
		       COUNT(*) FILTER (WHERE r.id IS NULL) AS missing
		FROM campaigns c LEFT JOIN reports r ON r.campaign_id = c.id
		WHERE c.status = ?`,
		models.ReportStatusApproved, models.ReportStatusSubmitted, models.ReportStatusRejected,
		models.CampaignStatusCompleted).Scan(&reporting).Error; err != nil {
		utils.InternalError(c, err)
		return
	}

	type statusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	campaigns := []statusCount{}
	mosques := []statusCount{}
	if err := firstErr(
		h.DB.Raw(`SELECT status, COUNT(*) AS count FROM campaigns GROUP BY status`).Scan(&campaigns).Error,
		h.DB.Raw(`SELECT status, COUNT(*) AS count FROM mosques GROUP BY status`).Scan(&mosques).Error,
	); err != nil {
		utils.InternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"period": key, "unit": p.Unit,
		"totals": totals, "previous": prev, "has_previous": p.Days > 0,
		"series": series, "cities": cities, "methods": methods, "top_mosques": top,
		"reporting": reporting, "campaigns_by_status": campaigns, "mosques_by_status": mosques,
	})
}
