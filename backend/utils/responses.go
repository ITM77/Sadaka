package utils

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Error  string `json:"error"`
	Code   string `json:"code"`
	Status int    `json:"status"`
}

type SuccessResponse struct {
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message"`
}

func ErrorResponse(c *gin.Context, statusCode int, errorCode string, message string) {
	c.JSON(statusCode, ErrorResponse{
		Error:  message,
		Code:   errorCode,
		Status: statusCode,
	})
}

func SuccessResponse(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, SuccessResponse{
		Message: message,
		Data:    data,
	})
}

func BadRequest(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", message)
}

func Unauthorized(c *gin.Context) {
	ErrorResponse(c, http.StatusUnauthorized, "AUTH_ERROR", "Unauthorized")
}

func Forbidden(c *gin.Context) {
	ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Forbidden")
}

func NotFound(c *gin.Context, resource string) {
	ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", fmt.Sprintf("%s not found", resource))
}

func InternalError(c *gin.Context, err error) {
	ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Internal server error")
}

func Conflict(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusConflict, "CONFLICT", message)
}

func UnprocessableEntity(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusUnprocessableEntity, "UNPROCESSABLE_ENTITY", message)
}
