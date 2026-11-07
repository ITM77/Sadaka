package utils

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIError — единый формат ошибки API.
type APIError struct {
	Error  string `json:"error"`
	Code   string `json:"code"`
	Status int    `json:"status"`
}

func Fail(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, APIError{Error: message, Code: code, Status: status})
}

func BadRequest(c *gin.Context, message string) {
	Fail(c, http.StatusBadRequest, "VALIDATION_ERROR", message)
}

func Unauthorized(c *gin.Context, message string) {
	Fail(c, http.StatusUnauthorized, "AUTH_ERROR", message)
}

func Forbidden(c *gin.Context, message string) {
	Fail(c, http.StatusForbidden, "FORBIDDEN", message)
}

func NotFound(c *gin.Context, message string) {
	Fail(c, http.StatusNotFound, "NOT_FOUND", message)
}

func Conflict(c *gin.Context, message string) {
	Fail(c, http.StatusConflict, "CONFLICT", message)
}

// InternalError логирует причину, но наружу отдаёт общий текст.
func InternalError(c *gin.Context, err error) {
	log.Printf("internal error %s %s: %v", c.Request.Method, c.Request.URL.Path, err)
	Fail(c, http.StatusInternalServerError, "SERVER_ERROR", "Внутренняя ошибка сервера")
}
