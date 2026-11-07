package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"sadaka.tj/backend/middleware"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

type mosqueRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Address     string   `json:"address"`
	City        string   `json:"city"`
	Latitude    *float64 `json:"latitude"`
	Longitude   *float64 `json:"longitude"`
	Phone       string   `json:"phone"`
	ImamName    string   `json:"imam_name"`
	ImamPhone   string   `json:"imam_phone"`
	LogoURL     string   `json:"logo_url"`
	PhotoURLs   []string `json:"photo_urls"`
}

// apply проверяет поля и переносит их в модель.
func (r *mosqueRequest) apply(m *models.Mosque) error {
	var err error
	if m.Name, err = trimmed(r.Name, "Название", true, 255); err != nil {
		return err
	}
	if m.Address, err = trimmed(r.Address, "Адрес", true, 500); err != nil {
		return err
	}
	if m.City, err = trimmed(r.City, "Город", true, 100); err != nil {
		return err
	}
	if m.Description, err = trimmed(r.Description, "Описание", false, 5000); err != nil {
		return err
	}
	if m.ImamName, err = trimmed(r.ImamName, "Имам", false, 255); err != nil {
		return err
	}
	if m.LogoURL, err = trimmed(r.LogoURL, "Логотип", false, 500); err != nil {
		return err
	}
	if (r.Latitude == nil) != (r.Longitude == nil) {
		return errors.New("укажите и широту, и долготу")
	}
	if r.Latitude != nil && (*r.Latitude < -90 || *r.Latitude > 90 || *r.Longitude < -180 || *r.Longitude > 180) {
		return errors.New("некорректные координаты")
	}
	m.Latitude, m.Longitude = r.Latitude, r.Longitude

	m.Phone, m.ImamPhone = "", ""
	if strings.TrimSpace(r.Phone) != "" {
		if m.Phone, err = utils.NormalizePhone(r.Phone); err != nil {
			return errors.New("телефон мечети: " + err.Error())
		}
	}
	if strings.TrimSpace(r.ImamPhone) != "" {
		if m.ImamPhone, err = utils.NormalizePhone(r.ImamPhone); err != nil {
			return errors.New("телефон имама: " + err.Error())
		}
	}
	if len(r.PhotoURLs) > 20 {
		return errors.New("не больше 20 фотографий")
	}
	m.PhotoURLs = r.PhotoURLs
	if m.PhotoURLs == nil {
		m.PhotoURLs = []string{}
	}
	return nil
}

// GET /mosques — одобренные мечети. Фильтры: city, q (поиск по названию).
func (h *Handler) ListMosques(c *gin.Context) {
	p := pagination(c)
	q := h.DB.Model(&models.Mosque{}).Where("status = ?", models.MosqueStatusApproved)
	if city := strings.TrimSpace(c.Query("city")); city != "" {
		q = q.Where("LOWER(city) = LOWER(?)", city)
	}
	if search := strings.TrimSpace(c.Query("q")); search != "" {
		q = q.Where("name ILIKE ?", "%"+escapeLike(search)+"%")
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	mosques := []models.Mosque{}
	if err := p.apply(q.Order("name")).Find(&mosques).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	for i := range mosques {
		mosques[i].ImamPhone = "" // личный номер имама не публикуем в списке
	}
	c.JSON(http.StatusOK, gin.H{"mosques": mosques, "total": total})
}

// GET /mosques/:id — публичная карточка одобренной мечети с кампаниями и отчётами.
func (h *Handler) GetMosque(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}
	var mosque models.Mosque
	if err := h.DB.First(&mosque, "id = ? AND status = ?", id, models.MosqueStatusApproved).Error; err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "мечеть не найдена")
			return
		}
		utils.InternalError(c, err)
		return
	}
	mosque.ImamPhone = ""

	campaigns := []models.Campaign{}
	if err := h.DB.Where("mosque_id = ? AND status IN ?", id,
		[]string{models.CampaignStatusActive, models.CampaignStatusCompleted}).
		Order("created_at DESC").Find(&campaigns).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	reports := []models.Report{}
	if err := h.DB.Where("mosque_id = ? AND status IN ?", id,
		[]string{models.ReportStatusSubmitted, models.ReportStatusApproved}).
		Order("submitted_at DESC").Find(&reports).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"mosque": mosque, "campaigns": campaigns, "reports": reports})
}

// POST /mosques — заявка на регистрацию мечети (статус pending до решения Комитета).
func (h *Handler) CreateMosque(c *gin.Context) {
	var req mosqueRequest
	if !bind(c, &req) {
		return
	}
	mosque := models.Mosque{OwnerID: middleware.AccountID(c), Status: models.MosqueStatusPending}
	if err := req.apply(&mosque); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if err := h.DB.Create(&mosque).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"mosque": mosque})
}

// PUT /mosques/:id — владелец правит данные. Отклонённая заявка после правки
// снова уходит на рассмотрение; заблокированную мечеть править нельзя.
func (h *Handler) UpdateMosque(c *gin.Context) {
	mosque, ok := h.ownedMosque(c, "id")
	if !ok {
		return
	}
	if mosque.Status == models.MosqueStatusBlocked {
		utils.Forbidden(c, "мечеть заблокирована Комитетом улемов")
		return
	}
	var req mosqueRequest
	if !bind(c, &req) {
		return
	}
	if err := req.apply(mosque); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if mosque.Status == models.MosqueStatusRejected {
		mosque.Status = models.MosqueStatusPending
		mosque.ModerationNote = ""
	}
	if err := h.DB.Save(mosque).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"mosque": mosque})
}

// GET /me/mosques — мечети текущего пользователя в любом статусе.
func (h *Handler) MyMosques(c *gin.Context) {
	mosques := []models.Mosque{}
	if err := h.DB.Where("owner_id = ?", middleware.AccountID(c)).Order("created_at DESC").Find(&mosques).Error; err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"mosques": mosques})
}

// ownedMosque загружает мечеть по параметру пути и проверяет, что она
// принадлежит текущему пользователю. Чужая мечеть выглядит как «не найдена».
func (h *Handler) ownedMosque(c *gin.Context, param string) (*models.Mosque, bool) {
	id, ok := pathID(c, param)
	if !ok {
		return nil, false
	}
	return h.loadOwnedMosque(c, id)
}

func (h *Handler) loadOwnedMosque(c *gin.Context, id uuid.UUID) (*models.Mosque, bool) {
	var mosque models.Mosque
	err := h.DB.First(&mosque, "id = ? AND owner_id = ?", id, middleware.AccountID(c)).Error
	if err != nil {
		if isNotFound(err) {
			utils.NotFound(c, "мечеть не найдена")
			return nil, false
		}
		utils.InternalError(c, err)
		return nil, false
	}
	return &mosque, true
}

// escapeLike экранирует спецсимволы шаблона LIKE.
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}
