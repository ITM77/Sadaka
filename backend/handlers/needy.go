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
	"sadaka.tj/backend/middleware"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

// Учёт нуждающихся: мечеть ведёт свой список семей и журнал выдачи помощи.
// Деньги приходят в сбор мечети «Помощь нуждающимся» (категория welfare),
// мечеть распределяет их по семьям; выдать из сбора больше собранного нельзя.
// Комитет видит общий список всех мечетей. Публично — только обезличенные итоги.

const welfareCategory = "welfare"

// waitDays — сколько дней без помощи считается «давно не получали».
const waitDays = 60

type needyRequest struct {
	FullName      string   `json:"full_name"`
	Phone         string   `json:"phone"`
	Address       string   `json:"address"`
	HouseholdSize int      `json:"household_size"`
	Situation     []string `json:"situation"`
	Needs         []string `json:"needs"`
	Note          string   `json:"note"`
	Status        string   `json:"status"`
	ClosedReason  string   `json:"closed_reason"`
}

func (r *needyRequest) apply(b *models.Beneficiary) error {
	var err error
	if b.FullName, err = trimmed(r.FullName, "ФИО", true, 255); err != nil {
		return err
	}
	b.Phone = ""
	if strings.TrimSpace(r.Phone) != "" {
		if b.Phone, err = utils.NormalizePhone(r.Phone); err != nil {
			return err
		}
	}
	if b.Address, err = trimmed(r.Address, "Адрес", false, 500); err != nil {
		return err
	}
	if r.HouseholdSize < 1 || r.HouseholdSize > 30 {
		return errors.New("в семье — от 1 до 30 человек")
	}
	b.HouseholdSize = r.HouseholdSize
	if b.Situation, err = tags(r.Situation, models.NeedySituations, "положение"); err != nil {
		return err
	}
	if b.Needs, err = tags(r.Needs, models.AidKinds, "нужды"); err != nil {
		return err
	}
	if b.Note, err = trimmed(r.Note, "Заметка", false, 2000); err != nil {
		return err
	}
	switch r.Status {
	case "", models.NeedyStatusActive:
		b.Status, b.ClosedReason = models.NeedyStatusActive, ""
	case models.NeedyStatusClosed:
		b.Status = models.NeedyStatusClosed
		if b.ClosedReason, err = trimmed(r.ClosedReason, "Почему помощь больше не нужна", false, 500); err != nil {
			return err
		}
	default:
		return errors.New("неизвестный статус")
	}
	return nil
}

// tags оставляет только допустимые метки, без повторов.
func tags(in []string, allowed map[string]bool, field string) ([]string, error) {
	out := []string{}
	for _, t := range in {
		if !allowed[t] {
			return nil, errors.New("неизвестное значение в поле «" + field + "»")
		}
		if !slices.Contains(out, t) {
			out = append(out, t)
		}
	}
	return out, nil
}

type needyView struct {
	models.Beneficiary
	AidTotal     decimal.Decimal `json:"aid_total"`
	AidCount     int64           `json:"aid_count"`
	LastAidOn    *time.Time      `json:"last_aid_on"`
	OtherMosques int64           `json:"other_mosques"` // на учёте ещё в стольких мечетях (тот же телефон)
	MosqueName   string          `json:"mosque_name,omitempty"`
	MosqueCity   string          `json:"mosque_city,omitempty"`
}

// withNeedyStats добавляет к карточкам итоги помощи и метку «есть в другой мечети».
func (h *Handler) withNeedyStats(list []models.Beneficiary) ([]needyView, error) {
	out := make([]needyView, len(list))
	if len(list) == 0 {
		return out, nil
	}
	ids := make([]uuid.UUID, len(list))
	for i, b := range list {
		ids[i] = b.ID
		out[i] = needyView{Beneficiary: b}
	}
	var stats []struct {
		BeneficiaryID uuid.UUID
		Total         decimal.Decimal
		Cnt           int64
		Last          *time.Time
	}
	if err := h.DB.Raw(`SELECT beneficiary_id, SUM(amount) AS total, COUNT(*) AS cnt, MAX(given_on) AS last
		FROM aid_records WHERE beneficiary_id IN ? GROUP BY beneficiary_id`, ids).Scan(&stats).Error; err != nil {
		return nil, err
	}
	var dups []struct {
		ID uuid.UUID
		N  int64
	}
	if err := h.DB.Raw(`SELECT b.id, COUNT(DISTINCT b2.mosque_id) AS n
		FROM beneficiaries b JOIN beneficiaries b2
		  ON b2.phone = b.phone AND b2.mosque_id <> b.mosque_id AND b2.status = ?
		WHERE b.id IN ? AND b.phone <> '' GROUP BY b.id`, models.NeedyStatusActive, ids).Scan(&dups).Error; err != nil {
		return nil, err
	}
	idx := make(map[uuid.UUID]int, len(list))
	for i, b := range list {
		idx[b.ID] = i
	}
	for _, s := range stats {
		v := &out[idx[s.BeneficiaryID]]
		v.AidTotal, v.AidCount, v.LastAidOn = s.Total, s.Cnt, s.Last
	}
	for _, d := range dups {
		out[idx[d.ID]].OtherMosques = d.N
	}
	return out, nil
}

// needySearch — поиск по ФИО, телефону, адресу и заметке.
func needySearch(q *gorm.DB, s string) *gorm.DB {
	s = strings.TrimSpace(s)
	if s == "" {
		return q
	}
	like := "%" + escapeLike(s) + "%"
	return q.Where("(beneficiaries.full_name ILIKE ? OR beneficiaries.phone ILIKE ? OR beneficiaries.address ILIKE ? OR beneficiaries.note ILIKE ?)", like, like, like, like)
}

type fundRow struct {
	CampaignID uuid.UUID       `json:"campaign_id"`
	Title      string          `json:"title"`
	Status     string          `json:"status"`
	Collected  decimal.Decimal `json:"collected"`
	Given      decimal.Decimal `json:"given"`
	Available  decimal.Decimal `json:"available"`
	Reported   bool            `json:"reported"` // отчёт уже подан — выдачи из сбора закрыты
}

// welfareFunds — сборы «Помощь нуждающимся» мечети и сколько в них осталось.
func (h *Handler) welfareFunds(db *gorm.DB, mosqueID uuid.UUID) ([]fundRow, error) {
	rows := []fundRow{}
	err := db.Raw(`
		SELECT c.id AS campaign_id, c.title, c.status, c.current_amount AS collected,
		       COALESCE((SELECT SUM(a.amount) FROM aid_records a WHERE a.campaign_id = c.id), 0) AS given,
		       EXISTS (SELECT 1 FROM reports r WHERE r.campaign_id = c.id AND r.status IN ?) AS reported
		FROM campaigns c
		WHERE c.mosque_id = ? AND c.category = ? AND c.status IN ?
		ORDER BY c.created_at DESC`,
		[]string{models.ReportStatusSubmitted, models.ReportStatusApproved},
		mosqueID, welfareCategory, []string{models.CampaignStatusActive, models.CampaignStatusCompleted},
	).Scan(&rows).Error
	for i := range rows {
		rows[i].Available = rows[i].Collected.Sub(rows[i].Given)
	}
	return rows, err
}

// ---------- Кабинет мечети ----------

// GET /me/mosques/:id/needy?status=active|closed|all&q=
func (h *Handler) MyNeedy(c *gin.Context) {
	mosque, ok := h.ownedMosque(c, "id")
	if !ok {
		return
	}
	q := needySearch(h.DB.Where("mosque_id = ?", mosque.ID), c.Query("q"))
	switch st := c.DefaultQuery("status", models.NeedyStatusActive); st {
	case models.NeedyStatusActive, models.NeedyStatusClosed:
		q = q.Where("status = ?", st)
	case "all":
	default:
		utils.BadRequest(c, "status: active, closed или all")
		return
	}
	list := []models.Beneficiary{}
	if err := q.Order("created_at DESC").Limit(500).Find(&list).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	views, err := h.withNeedyStats(list)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	funds, err := h.welfareFunds(h.DB, mosque.ID)
	if err != nil {
		utils.InternalError(c, err)
		return
	}

	now := h.Now().In(Dushanbe)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	waitSince := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -waitDays)
	var summary struct {
		Active      int64           `json:"active"`
		Closed      int64           `json:"closed"`
		People      int64           `json:"people"` // человек в активных семьях
		MonthAmount decimal.Decimal `json:"month_amount"`
		MonthCount  int64           `json:"month_count"`
		Waiting     int64           `json:"waiting"` // активные без помощи 60+ дней
	}
	if err := h.DB.Raw(`
		SELECT COUNT(*) FILTER (WHERE status = 'active') AS active,
		       COUNT(*) FILTER (WHERE status = 'closed') AS closed,
		       COALESCE(SUM(household_size) FILTER (WHERE status = 'active'), 0) AS people,
		       COUNT(*) FILTER (WHERE status = 'active' AND NOT EXISTS (
		           SELECT 1 FROM aid_records a WHERE a.beneficiary_id = beneficiaries.id AND a.given_on >= ?)) AS waiting
		FROM beneficiaries WHERE mosque_id = ?`, waitSince, mosque.ID).Scan(&summary).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	if err := h.DB.Raw(`SELECT COALESCE(SUM(amount), 0) AS month_amount, COUNT(*) AS month_count
		FROM aid_records WHERE mosque_id = ? AND given_on >= ?`, mosque.ID, monthStart).
		Row().Scan(&summary.MonthAmount, &summary.MonthCount); err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"beneficiaries": views, "summary": summary, "funds": funds})
}

// POST /me/mosques/:id/needy
func (h *Handler) CreateNeedy(c *gin.Context) {
	mosque, ok := h.ownedMosque(c, "id")
	if !ok {
		return
	}
	var req needyRequest
	if !bind(c, &req) {
		return
	}
	b := models.Beneficiary{MosqueID: mosque.ID}
	if err := req.apply(&b); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if err := h.DB.Create(&b).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	views, err := h.withNeedyStats([]models.Beneficiary{b})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"beneficiary": views[0]})
}

// ownedNeedy — карточка своей мечети; чужая выглядит как «не найдена».
func (h *Handler) ownedNeedy(c *gin.Context) (*models.Beneficiary, bool) {
	id, ok := pathID(c, "id")
	if !ok {
		return nil, false
	}
	var b models.Beneficiary
	err := h.DB.Joins("JOIN mosques ON mosques.id = beneficiaries.mosque_id AND mosques.owner_id = ?", middleware.AccountID(c)).
		First(&b, "beneficiaries.id = ?", id).Error
	if err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "карточка не найдена")
			return nil, false
		}
		utils.InternalError(c, err)
		return nil, false
	}
	return &b, true
}

type aidView struct {
	models.AidRecord
	CampaignTitle string `json:"campaign_title,omitempty"`
}

func (h *Handler) aidHistory(beneficiaryID uuid.UUID) ([]aidView, error) {
	out := []aidView{}
	err := h.DB.Raw(`SELECT a.*, COALESCE(c.title, '') AS campaign_title
		FROM aid_records a LEFT JOIN campaigns c ON c.id = a.campaign_id
		WHERE a.beneficiary_id = ? ORDER BY a.given_on DESC, a.created_at DESC`, beneficiaryID).Scan(&out).Error
	return out, err
}

// GET /me/needy/:id — карточка с историей помощи и остатками сборов.
func (h *Handler) GetMyNeedy(c *gin.Context) {
	b, ok := h.ownedNeedy(c)
	if !ok {
		return
	}
	views, err := h.withNeedyStats([]models.Beneficiary{*b})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	aid, err := h.aidHistory(b.ID)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	funds, err := h.welfareFunds(h.DB, b.MosqueID)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"beneficiary": views[0], "aid": aid, "funds": funds})
}

// PUT /me/needy/:id
func (h *Handler) UpdateMyNeedy(c *gin.Context) {
	b, ok := h.ownedNeedy(c)
	if !ok {
		return
	}
	var req needyRequest
	if !bind(c, &req) {
		return
	}
	if err := req.apply(b); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if err := h.DB.Save(b).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	views, err := h.withNeedyStats([]models.Beneficiary{*b})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"beneficiary": views[0]})
}

type aidRequest struct {
	Kind        string          `json:"kind"`
	Description string          `json:"description"`
	Amount      decimal.Decimal `json:"amount"`
	GivenOn     string          `json:"given_on"` // ГГГГ-ММ-ДД
	CampaignID  *uuid.UUID      `json:"campaign_id"`
}

// POST /me/needy/:id/aid — записать выдачу помощи.
func (h *Handler) AddAid(c *gin.Context) {
	b, ok := h.ownedNeedy(c)
	if !ok {
		return
	}
	var req aidRequest
	if !bind(c, &req) {
		return
	}
	if !models.AidKinds[req.Kind] {
		utils.BadRequest(c, "выберите вид помощи")
		return
	}
	if err := utils.ValidateMoney(req.Amount); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	desc, err := trimmed(req.Description, "Что выдали", false, 500)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	given, err := parseDate(req.GivenOn)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if given.After(h.Now()) {
		utils.BadRequest(c, "дата выдачи не может быть в будущем")
		return
	}
	if b.Status != models.NeedyStatusActive {
		utils.Conflict(c, "семья снята с учёта — сначала верните её в список нуждающихся")
		return
	}
	rec := models.AidRecord{
		MosqueID: b.MosqueID, BeneficiaryID: b.ID, Kind: req.Kind, Description: desc,
		Amount: req.Amount.Round(2), GivenOn: time.Date(given.Year(), given.Month(), given.Day(), 0, 0, 0, 0, time.UTC),
	}
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		if req.CampaignID != nil {
			// Блокируем сбор: две выдачи одновременно не превысят остаток.
			cmp, err := lockCampaign(tx, *req.CampaignID)
			if err != nil {
				if isNotFound(err) {
					return errConflict("сбор не найден")
				}
				return err
			}
			if cmp.MosqueID != b.MosqueID || cmp.Category != welfareCategory ||
				(cmp.Status != models.CampaignStatusActive && cmp.Status != models.CampaignStatusCompleted) {
				return errConflict("помощь можно выдавать только из идущего или завершённого сбора «Помощь нуждающимся» своей мечети")
			}
			var reported int64
			if err := tx.Model(&models.Report{}).Where("campaign_id = ? AND status IN ?", cmp.ID,
				[]string{models.ReportStatusSubmitted, models.ReportStatusApproved}).Count(&reported).Error; err != nil {
				return err
			}
			if reported > 0 {
				return errConflict("по этому сбору уже подан отчёт — новые выдачи из него не записываются")
			}
			var spent decimal.Decimal
			if err := tx.Raw(`SELECT COALESCE(SUM(amount), 0) FROM aid_records WHERE campaign_id = ?`, cmp.ID).Row().Scan(&spent); err != nil {
				return err
			}
			left := cmp.CurrentAmount.Sub(spent)
			if rec.Amount.GreaterThan(left) {
				return errConflict("в сборе осталось " + som(left) + " — больше выдать нельзя")
			}
			rec.CampaignID = &cmp.ID
		}
		return tx.Create(&rec).Error
	})
	if !h.handleTxError(c, err, "карточка не найдена") {
		return
	}
	c.JSON(http.StatusCreated, gin.H{"aid": rec})
}

// DELETE /me/aid/:id — удалить ошибочную запись (пока по сбору нет отчёта).
func (h *Handler) DeleteAid(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	var rec models.AidRecord
	err := h.DB.Joins("JOIN mosques ON mosques.id = aid_records.mosque_id AND mosques.owner_id = ?", middleware.AccountID(c)).
		First(&rec, "aid_records.id = ?", id).Error
	if err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "запись не найдена")
			return
		}
		utils.InternalError(c, err)
		return
	}
	if rec.CampaignID != nil {
		var reported int64
		if err := h.DB.Model(&models.Report{}).Where("campaign_id = ? AND status IN ?", *rec.CampaignID,
			[]string{models.ReportStatusSubmitted, models.ReportStatusApproved}).Count(&reported).Error; err != nil {
			utils.InternalError(c, err)
			return
		}
		if reported > 0 {
			utils.Conflict(c, "запись вошла в поданный отчёт — удалить её нельзя")
			return
		}
	}
	if err := h.DB.Delete(&rec).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

type aidKindRow struct {
	Kind     string          `json:"kind"`
	Amount   decimal.Decimal `json:"amount"`
	Families int64           `json:"families"`
	Count    int64           `json:"count"`
}

type aidSummary struct {
	Families int64           `json:"families"`
	Amount   decimal.Decimal `json:"amount"`
	Count    int64           `json:"count"`
	ByKind   []aidKindRow    `json:"by_kind"`
}

// campaignAid — обезличенные итоги выдач из сбора: для отчёта и публичной страницы.
func (h *Handler) campaignAid(campaignID uuid.UUID) (*aidSummary, error) {
	s := &aidSummary{ByKind: []aidKindRow{}}
	if err := h.DB.Raw(`SELECT kind, SUM(amount) AS amount, COUNT(DISTINCT beneficiary_id) AS families, COUNT(*) AS count
		FROM aid_records WHERE campaign_id = ? GROUP BY kind ORDER BY amount DESC`, campaignID).Scan(&s.ByKind).Error; err != nil {
		return nil, err
	}
	if err := h.DB.Raw(`SELECT COUNT(DISTINCT beneficiary_id), COALESCE(SUM(amount), 0), COUNT(*)
		FROM aid_records WHERE campaign_id = ?`, campaignID).Row().Scan(&s.Families, &s.Amount, &s.Count); err != nil {
		return nil, err
	}
	return s, nil
}

// GET /me/campaigns/:id/aid — итоги выдач из своего сбора (подставить в отчёт).
func (h *Handler) MyCampaignAid(c *gin.Context) {
	campaign, _, ok := h.ownedCampaign(c)
	if !ok {
		return
	}
	s, err := h.campaignAid(campaign.ID)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"aid": s})
}

// ---------- Комитет ----------

// GET /admin/needy?mosque_id=&city=&status=&q=&duplicates=1 — общий список всех мечетей.
func (h *Handler) AdminListNeedy(c *gin.Context) {
	p := pagination(c)
	q := needySearch(h.DB.Model(&models.Beneficiary{}).
		Joins("JOIN mosques ON mosques.id = beneficiaries.mosque_id"), c.Query("q"))
	if v := c.Query("mosque_id"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			utils.BadRequest(c, "некорректный mosque_id")
			return
		}
		q = q.Where("beneficiaries.mosque_id = ?", id)
	}
	if v := c.Query("city"); v != "" {
		q = q.Where("mosques.city = ?", v)
	}
	switch st := c.DefaultQuery("status", models.NeedyStatusActive); st {
	case models.NeedyStatusActive, models.NeedyStatusClosed:
		q = q.Where("beneficiaries.status = ?", st)
	case "all":
	default:
		utils.BadRequest(c, "status: active, closed или all")
		return
	}
	if c.Query("duplicates") == "1" {
		q = q.Where(`beneficiaries.phone <> '' AND EXISTS (SELECT 1 FROM beneficiaries b2
			WHERE b2.phone = beneficiaries.phone AND b2.mosque_id <> beneficiaries.mosque_id AND b2.status = 'active')`)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	list := []models.Beneficiary{}
	if err := p.apply(q.Select("beneficiaries.*").Order("beneficiaries.created_at DESC")).Find(&list).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	views, err := h.withNeedyStats(list)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	if err := h.addMosqueNames(views); err != nil {
		utils.InternalError(c, err)
		return
	}

	var summary struct {
		Active     int64           `json:"active"`
		People     int64           `json:"people"`
		Mosques    int64           `json:"mosques"`
		AidTotal   decimal.Decimal `json:"aid_total"`
		Duplicates int64           `json:"duplicates"`
	}
	if err := h.DB.Raw(`
		SELECT COUNT(*) FILTER (WHERE status = 'active') AS active,
		       COALESCE(SUM(household_size) FILTER (WHERE status = 'active'), 0) AS people,
		       COUNT(DISTINCT mosque_id) AS mosques,
		       (SELECT COALESCE(SUM(amount), 0) FROM aid_records) AS aid_total,
		       COUNT(*) FILTER (WHERE status = 'active' AND phone <> '' AND EXISTS (SELECT 1 FROM beneficiaries b2
		           WHERE b2.phone = beneficiaries.phone AND b2.mosque_id <> beneficiaries.mosque_id AND b2.status = 'active')) AS duplicates
		FROM beneficiaries`).Scan(&summary).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	cities := []string{}
	if err := h.DB.Raw(`SELECT DISTINCT m.city FROM beneficiaries b JOIN mosques m ON m.id = b.mosque_id ORDER BY m.city`).Scan(&cities).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"beneficiaries": views, "total": total, "summary": summary, "cities": cities})
}

func (h *Handler) addMosqueNames(views []needyView) error {
	if len(views) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, 0, len(views))
	for _, v := range views {
		ids = append(ids, v.MosqueID)
	}
	var mosques []models.Mosque
	if err := h.DB.Select("id, name, city").Find(&mosques, "id IN ?", ids).Error; err != nil {
		return err
	}
	byID := map[uuid.UUID]models.Mosque{}
	for _, m := range mosques {
		byID[m.ID] = m
	}
	for i := range views {
		m := byID[views[i].MosqueID]
		views[i].MosqueName, views[i].MosqueCity = m.Name, m.City
	}
	return nil
}

// GET /admin/needy/:id — карточка с историей и тем, в каких ещё мечетях семья на учёте.
func (h *Handler) AdminGetNeedy(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	var b models.Beneficiary
	if err := h.DB.First(&b, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "карточка не найдена")
			return
		}
		utils.InternalError(c, err)
		return
	}
	views, err := h.withNeedyStats([]models.Beneficiary{b})
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	if err := h.addMosqueNames(views); err != nil {
		utils.InternalError(c, err)
		return
	}
	aid, err := h.aidHistory(b.ID)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	// Та же семья в других мечетях (по телефону).
	others := []models.Beneficiary{}
	if b.Phone != "" {
		if err := h.DB.Where("phone = ? AND id <> ?", b.Phone, b.ID).Find(&others).Error; err != nil {
			utils.InternalError(c, err)
			return
		}
	}
	otherViews, err := h.withNeedyStats(others)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	if err := h.addMosqueNames(otherViews); err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"beneficiary": views[0], "aid": aid, "same_phone": otherViews})
}
