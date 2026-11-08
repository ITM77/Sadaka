package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"sadaka.tj/backend/middleware"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

// Router собирает все маршруты API v1.
func (h *Handler) Router() *gin.Engine {
	if h.Cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), middleware.CORS(h.Cfg.CORSOrigins))
	r.NoRoute(func(c *gin.Context) { utils.NotFound(c, "маршрут не найден") })

	r.GET("/health", func(c *gin.Context) {
		sqlDB, err := h.DB.DB()
		if err != nil || sqlDB.PingContext(c.Request.Context()) != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db_unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")

	// Публичные
	api.POST("/auth/register", h.Register)
	api.POST("/auth/login", h.Login)
	api.GET("/mosques", h.ListMosques)
	api.GET("/mosques/:id", h.GetMosque)
	api.GET("/campaigns", h.ListCampaigns)
	api.GET("/campaigns/:id", h.GetCampaign)
	api.GET("/reports/:id", h.GetReport)

	// Пользователь (жертвователь / представитель мечети)
	user := api.Group("", middleware.Auth(h.Cfg.JWTSecret, utils.SubjectUser))
	user.GET("/me", h.Me)
	user.GET("/me/donations", h.MyDonations)
	user.GET("/me/savob", h.MySavob)
	user.GET("/me/mosques", h.MyMosques)
	user.GET("/me/mosques/:id/campaigns", h.MyMosqueCampaigns)
	user.POST("/mosques", h.CreateMosque)
	user.PUT("/mosques/:id", h.UpdateMosque)
	user.POST("/campaigns", h.CreateCampaign)
	user.PUT("/campaigns/:id", h.UpdateCampaign)
	user.POST("/campaigns/:id/submit", h.SubmitCampaign)
	user.POST("/campaigns/:id/complete", h.CompleteCampaign)
	user.POST("/campaigns/:id/report", h.SubmitReport)
	user.POST("/donations", h.CreateDonation)

	// Комитет улемов
	api.POST("/admin/auth/login", h.AdminLogin)
	api.GET("/admin/invite/:token", h.GetInvite)
	api.POST("/admin/invite/:token", h.AcceptInvite)
	// adminSession сверяет сотрудника с БД: отключённый доступ и смена роли действуют сразу.
	admin := api.Group("/admin", middleware.Auth(h.Cfg.JWTSecret, utils.SubjectAdmin), h.adminSession)
	anyAdmin := middleware.RequireAdminRole(models.AdminRoleSuperadmin, models.AdminRoleModerator, models.AdminRoleAnalyst)
	moderator := middleware.RequireAdminRole(models.AdminRoleSuperadmin, models.AdminRoleModerator)
	superadmin := middleware.RequireAdminRole(models.AdminRoleSuperadmin)

	admin.GET("/me", anyAdmin, h.AdminMe)
	admin.GET("/dashboard", anyAdmin, h.AdminDashboard)
	admin.GET("/mosques", anyAdmin, h.AdminListMosques)
	admin.GET("/mosques/:id/history", anyAdmin, h.AdminMosqueHistory)
	admin.GET("/campaigns", anyAdmin, h.AdminListCampaigns)
	admin.GET("/reports", anyAdmin, h.AdminListReports)

	// Сотрудники и журнал — только суперадмин.
	admin.GET("/staff", superadmin, h.AdminListStaff)
	admin.POST("/staff", superadmin, h.AdminInviteStaff)
	admin.GET("/staff/:id", superadmin, h.AdminGetStaff)
	admin.POST("/staff/:id/link", superadmin, h.AdminStaffLink)
	admin.PUT("/staff/:id/role", superadmin, h.AdminStaffRole)
	admin.POST("/staff/:id/disable", superadmin, h.AdminStaffDisable)
	admin.POST("/staff/:id/enable", superadmin, h.AdminStaffEnable)
	admin.GET("/audit", superadmin, h.AdminListAudit)
	admin.GET("/audit/export", superadmin, h.AdminExportAudit)
	admin.GET("/audit/:id", superadmin, h.AdminGetAudit)

	admin.POST("/mosques/:id/approve", moderator, h.AdminApproveMosque)
	admin.POST("/mosques/:id/reject", moderator, h.AdminRejectMosque)
	admin.POST("/mosques/:id/block", superadmin, h.AdminBlockMosque)
	admin.POST("/mosques/:id/unblock", superadmin, h.AdminUnblockMosque)
	admin.POST("/campaigns/:id/approve", moderator, h.AdminApproveCampaign)
	admin.POST("/campaigns/:id/reject", moderator, h.AdminRejectCampaign)
	admin.POST("/reports/:id/approve", moderator, h.AdminApproveReport)
	admin.POST("/reports/:id/reject", moderator, h.AdminRejectReport)

	return r
}
