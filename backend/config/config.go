package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port string
	Env  string

	DatabaseURL string
	JWTSecret   string

	// CORS: список разрешённых origin через запятую ("*" — любые, только для разработки).
	CORSOrigins []string

	// Прокси, которым можно верить в X-Forwarded-For (IP/CIDR через запятую).
	// Пусто — заголовок игнорируется, IP берётся из соединения: иначе любой
	// клиент подставит в журнал действий чужой адрес.
	TrustedProxies []string

	// Платёжный провайдер: "mock" (разработка) — пока единственный.
	// Alif / IMON подключаются отдельно.
	PaymentProvider string

	// Савоб: множитель и тип события (regular, ramadan, kurban, special_event).
	SavobMultiplier float64
	SavobEvent      string

	// Первый суперадмин Комитета создаётся при старте, если админов ещё нет.
	AdminBootstrapEmail    string
	AdminBootstrapPassword string
	AdminBootstrapName     string
}

func (c *Config) IsProduction() bool { return c.Env == "production" }

// Load читает конфигурацию из окружения (и .env, если он есть).
func Load() (*Config, error) {
	_ = godotenv.Load(".env")

	cfg := &Config{
		Port:                   getEnv("PORT", "8080"),
		Env:                    getEnv("ENV", "development"),
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/sadaka?sslmode=disable"),
		JWTSecret:              os.Getenv("JWT_SECRET"),
		PaymentProvider:        getEnv("PAYMENT_PROVIDER", "mock"),
		SavobEvent:             getEnv("SAVOB_EVENT", "regular"),
		AdminBootstrapEmail:    os.Getenv("ADMIN_BOOTSTRAP_EMAIL"),
		AdminBootstrapPassword: os.Getenv("ADMIN_BOOTSTRAP_PASSWORD"),
		AdminBootstrapName:     getEnv("ADMIN_BOOTSTRAP_NAME", "Администратор Комитета"),
	}

	for _, o := range strings.Split(getEnv("CORS_ORIGINS", "*"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			cfg.CORSOrigins = append(cfg.CORSOrigins, o)
		}
	}

	for _, p := range strings.Split(os.Getenv("TRUSTED_PROXIES"), ",") {
		if p = strings.TrimSpace(p); p != "" {
			cfg.TrustedProxies = append(cfg.TrustedProxies, p)
		}
	}

	mult, err := strconv.ParseFloat(getEnv("SAVOB_MULTIPLIER", "1"), 64)
	if err != nil || mult < 1 || mult > 10 {
		return nil, fmt.Errorf("SAVOB_MULTIPLIER должен быть числом от 1 до 10")
	}
	cfg.SavobMultiplier = mult

	if cfg.JWTSecret == "" {
		if cfg.IsProduction() {
			return nil, fmt.Errorf("JWT_SECRET обязателен в production")
		}
		cfg.JWTSecret = "dev-only-insecure-secret"
	}
	if cfg.IsProduction() && len(cfg.JWTSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET должен быть не короче 32 символов")
	}
	if cfg.IsProduction() && cfg.PaymentProvider == "mock" {
		return nil, fmt.Errorf("PAYMENT_PROVIDER=mock запрещён в production")
	}
	if cfg.IsProduction() && len(cfg.CORSOrigins) == 1 && cfg.CORSOrigins[0] == "*" {
		return nil, fmt.Errorf("в production задайте CORS_ORIGINS явно")
	}

	return cfg, nil
}

func getEnv(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}
