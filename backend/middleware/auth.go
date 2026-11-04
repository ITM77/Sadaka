package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"sadaka.tj/backend/utils"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.Unauthorized(c)
			c.Abort()
			return
		}

		// Формат: "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.Unauthorized(c)
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := utils.VerifyJWT(token)
		if err != nil {
			utils.Unauthorized(c)
			c.Abort()
			return
		}

		// Сохранить claims в контексте
		c.Set("user_id", claims.UserID)
		c.Set("user_phone", claims.Phone)
		c.Set("user_role", claims.Role)

		c.Next()
	}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists || role != "admin" {
			utils.Forbidden(c)
			c.Abort()
			return
		}
		c.Next()
	}
}

func MosqueMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists || role != "mosque" {
			utils.Forbidden(c)
			c.Abort()
			return
		}
		c.Next()
	}
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		// Логирование будет добавлено позже
	}
}
