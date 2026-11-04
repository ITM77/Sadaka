package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"sadaka.tj/backend/config"
	"sadaka.tj/backend/models"
)

func InitDB(cfg *config.Config) *gorm.DB {
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Ошибка подключения к БД: %v", err)
	}

	// Auto migrate models
	err = db.AutoMigrate(
		&models.User{},
		&models.Mosque{},
		&models.Campaign{},
		&models.Transaction{},
		&models.Report{},
		&models.SavobPoints{},
		&models.SavobHistory{},
		&models.Admin{},
		&models.Notification{},
	)
	if err != nil {
		log.Fatalf("Ошибка миграции: %v", err)
	}

	log.Println("✅ База данных инициализирована")
	return db
}

func MigrateSQL(db *gorm.DB) error {
	// Создание индексов
	db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
		CREATE INDEX IF NOT EXISTS idx_mosques_city ON mosques(city);
		CREATE INDEX IF NOT EXISTS idx_campaigns_mosque ON campaigns(mosque_id);
		CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
		CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
		CREATE INDEX IF NOT EXISTS idx_transactions_campaign ON transactions(campaign_id);
		CREATE INDEX IF NOT EXISTS idx_savob_user ON savob_points(user_id);
		CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
	`)

	fmt.Println("✅ Индексы созданы")
	return nil
}

func CloseDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
