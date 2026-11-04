package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port string
	Env  string

	// Database
	DatabaseURL string

	// JWT
	JWTSecret string

	// Redis
	RedisURL string

	// Payment Gateway
	PaymentGatewayKey    string
	PaymentGatewaySecret string

	// Email
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string

	// URLs
	MobileAppURL  string
	AdminPanelURL string
}

var config *Config

func Load() *Config {
	// Загрузить .env файл (не критично если его нет)
	_ = godotenv.Load(".env")

	return &Config{
		Port:                 getEnv("PORT", "8080"),
		Env:                  getEnv("ENV", "development"),
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/sadaka"),
		JWTSecret:            getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		RedisURL:             getEnv("REDIS_URL", "redis://localhost:6379"),
		PaymentGatewayKey:    getEnv("PAYMENT_GATEWAY_KEY", ""),
		PaymentGatewaySecret: getEnv("PAYMENT_GATEWAY_SECRET", ""),
		SMTPHost:             getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:             getEnv("SMTP_PORT", "587"),
		SMTPUser:             getEnv("SMTP_USER", ""),
		SMTPPassword:         getEnv("SMTP_PASSWORD", ""),
		MobileAppURL:         getEnv("MOBILE_APP_URL", "http://localhost:8081"),
		AdminPanelURL:        getEnv("ADMIN_PANEL_URL", "http://localhost:3000"),
	}
}

func Get() *Config {
	if config == nil {
		config = Load()
	}
	return config
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
