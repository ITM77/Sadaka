package database

import (
	"errors"
	"fmt"
	"log"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"sadaka.tj/backend/config"
	"sadaka.tj/backend/models"
	"sadaka.tj/backend/utils"
)

// Connect подключается к PostgreSQL и приводит схему в соответствие моделям.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Warn
	if !cfg.IsProduction() {
		logLevel = logger.Info
	}
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger:         logger.Default.LogMode(logLevel),
		TranslateError: true, // нарушение уникальности → gorm.ErrDuplicatedKey
	})
	if err != nil {
		return nil, fmt.Errorf("подключение к БД: %w", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		return nil, fmt.Errorf("миграция: %w", err)
	}
	if err := db.Exec(auditImmutableSQL).Error; err != nil {
		return nil, fmt.Errorf("защита журнала: %w", err)
	}
	return db, nil
}

// auditImmutableSQL запрещает менять и удалять записи журнала действий
// на уровне БД — даже при прямом доступе к базе или ошибке в коде.
// Обслуживание (например, очистка тестовых данных) — только осознанно:
// ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_immutable.
const auditImmutableSQL = `
CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'журнал действий нельзя изменять или удалять';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON audit_logs
	FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();`

// BootstrapAdmin создаёт первого суперадмина Комитета, если админов ещё нет
// и заданы ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD.
func BootstrapAdmin(db *gorm.DB, cfg *config.Config) error {
	var count int64
	if err := db.Model(&models.Admin{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	if cfg.AdminBootstrapEmail == "" || cfg.AdminBootstrapPassword == "" {
		log.Println("⚠ В базе нет ни одного админа Комитета. Задайте ADMIN_BOOTSTRAP_EMAIL и ADMIN_BOOTSTRAP_PASSWORD и перезапустите сервер.")
		return nil
	}
	email := strings.ToLower(strings.TrimSpace(cfg.AdminBootstrapEmail))
	if err := utils.ValidateEmail(email); err != nil {
		return errors.New("ADMIN_BOOTSTRAP_EMAIL: " + err.Error())
	}
	if err := utils.ValidatePassword(cfg.AdminBootstrapPassword); err != nil {
		return errors.New("ADMIN_BOOTSTRAP_PASSWORD: " + err.Error())
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminBootstrapPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	admin := models.Admin{
		Email:        email,
		FullName:     cfg.AdminBootstrapName,
		PasswordHash: string(hash),
		Role:         models.AdminRoleSuperadmin,
		IsActive:     true,
	}
	if err := db.Create(&admin).Error; err != nil {
		return err
	}
	log.Printf("✅ Создан суперадмин Комитета: %s", email)
	return nil
}
