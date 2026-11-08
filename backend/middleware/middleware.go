package middleware

import (
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"sadaka.tj/backend/utils"
)

const (
	ctxAccountID = "account_id"
	ctxKind      = "account_kind"
	ctxAdminRole = "admin_role"
	ctxIssuedAt  = "issued_at"
)

// Auth требует валидный JWT нужного типа (utils.SubjectUser / utils.SubjectAdmin).
func Auth(secret, kind string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			utils.Unauthorized(c, "Требуется авторизация")
			return
		}
		claims, err := utils.ParseToken(secret, token)
		if err != nil {
			utils.Unauthorized(c, "Недействительный или просроченный токен")
			return
		}
		if claims.Kind != kind {
			utils.Forbidden(c, "Недостаточно прав")
			return
		}
		id, err := claims.AccountID()
		if err != nil {
			utils.Unauthorized(c, "Недействительный токен")
			return
		}
		c.Set(ctxAccountID, id)
		c.Set(ctxKind, claims.Kind)
		c.Set(ctxAdminRole, claims.AdminRole)
		if claims.IssuedAt != nil {
			c.Set(ctxIssuedAt, claims.IssuedAt.Time)
		}
		c.Next()
	}
}

// SetAdminRole заменяет роль из токена актуальной ролью из БД:
// смена роли действует сразу, без повторного входа.
func SetAdminRole(c *gin.Context, role string) { c.Set(ctxAdminRole, role) }

// IssuedAt — время выдачи токена (нулевое, если в токене его нет).
func IssuedAt(c *gin.Context) time.Time {
	v, _ := c.Get(ctxIssuedAt)
	t, _ := v.(time.Time)
	return t
}

// RequireAdminRole пропускает только админов с одной из перечисленных ролей.
// Ставится после Auth(secret, utils.SubjectAdmin).
func RequireAdminRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString(ctxAdminRole)
		for _, r := range roles {
			if r == role {
				c.Next()
				return
			}
		}
		utils.Forbidden(c, "Недостаточно прав для этого действия")
	}
}

// AccountID — ID пользователя или админа из токена.
func AccountID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(ctxAccountID)
	id, _ := v.(uuid.UUID)
	return id
}

// CORS: в разработке "*" разрешает любой origin; в production — только список.
func CORS(origins []string) gin.HandlerFunc {
	allowAll := len(origins) == 1 && origins[0] == "*"
	allowed := make(map[string]bool, len(origins))
	for _, o := range origins {
		allowed[o] = true
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if allowAll {
			c.Header("Access-Control-Allow-Origin", "*")
		} else if allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "86400")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
