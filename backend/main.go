package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Загрузить .env
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file, using environment variables")
	}

	// Инициализация БД
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@localhost:5432/sadaka"
	}

	// Инициализация Gin
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Маршруты (будут добавлены позже)
	// API v1
	api := router.Group("/api/v1")
	{
		// Auth endpoints
		auth := api.Group("/auth")
		{
			auth.POST("/register", registerUser)
			auth.POST("/login", loginUser)
		}

		// Mosque endpoints
		mosque := api.Group("/mosques")
		{
			mosque.GET("", getMosques)
			mosque.GET("/:id", getMosqueByID)
			mosque.POST("", createMosque)
		}

		// Campaign endpoints
		campaign := api.Group("/campaigns")
		{
			campaign.GET("", getCampaigns)
			campaign.GET("/:id", getCampaignByID)
			campaign.POST("", createCampaign)
			campaign.PUT("/:id", updateCampaign)
		}

		// Transaction endpoints
		transaction := api.Group("/transactions")
		{
			transaction.POST("", createTransaction)
			transaction.GET("/:id", getTransaction)
		}

		// Savob endpoints
		savob := api.Group("/savob")
		{
			savob.GET("/user/:userID", getUserSavob)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("🚀 Садака Backend запущен на :%s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Ошибка запуска сервера: %v", err)
	}
}

// Временные заглушки для endpoints
func registerUser(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Регистрация (TODO)"})
}

func loginUser(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Вход (TODO)"})
}

func getMosques(c *gin.Context) {
	c.JSON(200, gin.H{"mosques": []gin.H{}})
}

func getMosqueByID(c *gin.Context) {
	c.JSON(200, gin.H{"mosque": gin.H{}})
}

func createMosque(c *gin.Context) {
	c.JSON(201, gin.H{"message": "Мечеть создана"})
}

func getCampaigns(c *gin.Context) {
	c.JSON(200, gin.H{"campaigns": []gin.H{}})
}

func getCampaignByID(c *gin.Context) {
	c.JSON(200, gin.H{"campaign": gin.H{}})
}

func createCampaign(c *gin.Context) {
	c.JSON(201, gin.H{"message": "Кампания создана"})
}

func updateCampaign(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Кампания обновлена"})
}

func createTransaction(c *gin.Context) {
	c.JSON(201, gin.H{"message": "Транзакция создана"})
}

func getTransaction(c *gin.Context) {
	c.JSON(200, gin.H{"transaction": gin.H{}})
}

func getUserSavob(c *gin.Context) {
	c.JSON(200, gin.H{"savob": 0})
}
