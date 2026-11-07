package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"sadaka.tj/backend/middleware"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

type registerRequest struct {
	PhoneNumber string `json:"phone_number"`
	FullName    string `json:"full_name"`
	Password    string `json:"password"`
	Language    string `json:"language"`
}

type authResponse struct {
	Token string `json:"token"`
	User  any    `json:"user"`
}

// POST /auth/register
func (h *Handler) Register(c *gin.Context) {
	var req registerRequest
	if !bind(c, &req) {
		return
	}
	phone, err := utils.NormalizePhone(req.PhoneNumber)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	name, err := trimmed(req.FullName, "Имя", true, 255)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if err := utils.ValidatePassword(req.Password); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	lang := req.Language
	if lang != "ru" {
		lang = "tg"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	user := models.User{PhoneNumber: phone, FullName: name, PasswordHash: string(hash), Language: lang}

	if err := h.DB.Create(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			utils.Conflict(c, "пользователь с таким номером уже зарегистрирован")
			return
		}
		utils.InternalError(c, err)
		return
	}
	h.respondWithUserToken(c, http.StatusCreated, &user)
}

type loginRequest struct {
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password"`
}

// POST /auth/login
func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if !bind(c, &req) {
		return
	}
	phone, err := utils.NormalizePhone(req.PhoneNumber)
	if err != nil {
		utils.Unauthorized(c, "неверный номер телефона или пароль")
		return
	}
	var user models.User
	if err := h.DB.Where("phone_number = ?", phone).First(&user).Error; err != nil {
		if isNotFound(err) {
			utils.Unauthorized(c, "неверный номер телефона или пароль")
			return
		}
		utils.InternalError(c, err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		utils.Unauthorized(c, "неверный номер телефона или пароль")
		return
	}
	h.respondWithUserToken(c, http.StatusOK, &user)
}

func (h *Handler) respondWithUserToken(c *gin.Context, status int, user *models.User) {
	token, err := utils.IssueToken(h.Cfg.JWTSecret, user.ID, utils.SubjectUser, "")
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(status, authResponse{Token: token, User: user})
}

// GET /me
func (h *Handler) Me(c *gin.Context) {
	var user models.User
	if err := h.DB.First(&user, "id = ?", middleware.AccountID(c)).Error; err != nil {
		if isNotFound(err) {
			utils.Unauthorized(c, "пользователь не найден")
			return
		}
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

type adminLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// POST /admin/auth/login
func (h *Handler) AdminLogin(c *gin.Context) {
	var req adminLoginRequest
	if !bind(c, &req) {
		return
	}
	var admin models.Admin
	err := h.DB.Where("email = ? AND is_active = ?", strings.ToLower(strings.TrimSpace(req.Email)), true).First(&admin).Error
	if err != nil {
		if isNotFound(err) {
			utils.Unauthorized(c, "неверный email или пароль")
			return
		}
		utils.InternalError(c, err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)) != nil {
		utils.Unauthorized(c, "неверный email или пароль")
		return
	}
	now := h.Now()
	h.DB.Model(&admin).Update("last_login_at", now)

	token, err := utils.IssueToken(h.Cfg.JWTSecret, admin.ID, utils.SubjectAdmin, admin.Role)
	if err != nil {
		utils.InternalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "admin": admin})
}
