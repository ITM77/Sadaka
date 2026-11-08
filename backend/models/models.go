// Package models — сущности БД. Модели GORM — единственный источник правды
// для схемы: таблицы создаются через AutoMigrate (см. database.Connect).
package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

func init() {
	// Деньги отдаются в JSON числом (500.5), а не строкой ("500.5").
	decimal.MarshalJSONWithoutQuotes = true
}

// Base — общий первичный ключ и метки времени.
type Base struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (b *Base) BeforeCreate(*gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// ---------- Пользователи ----------

// User — жертвователь. Он же может быть представителем мечети:
// мечеть привязывается к пользователю через Mosque.OwnerID.
type User struct {
	Base
	PhoneNumber  string `gorm:"size:20;uniqueIndex;not null" json:"phone_number"`
	FullName     string `gorm:"size:255;not null" json:"full_name"`
	Email        string `gorm:"size:255" json:"email,omitempty"`
	PasswordHash string `gorm:"size:255;not null" json:"-"`
	IsVerified   bool   `gorm:"not null;default:false" json:"is_verified"`
	Language     string `gorm:"size:5;not null;default:tg" json:"language"`
}

// Роли Комитета улемов.
const (
	AdminRoleSuperadmin = "superadmin" // всё, включая блокировку мечетей
	AdminRoleModerator  = "moderator"  // одобрение мечетей, кампаний, отчётов
	AdminRoleAnalyst    = "analyst"    // только просмотр
)

// AdminRoles — допустимые значения Admin.Role.
var AdminRoles = map[string]bool{AdminRoleSuperadmin: true, AdminRoleModerator: true, AdminRoleAnalyst: true}

// Admin — сотрудник Комитета улемов.
// Приглашённый сотрудник живёт без пароля (PasswordHash = ""), пока не задаст
// его по ссылке; тот же путь — при сбросе пароля суперадмином.
type Admin struct {
	Base
	Email        string     `gorm:"size:255;uniqueIndex;not null" json:"email"`
	FullName     string     `gorm:"size:255;not null" json:"full_name"`
	PasswordHash string     `gorm:"size:255;not null;default:''" json:"-"`
	Role         string     `gorm:"size:20;not null;default:moderator" json:"role"`
	IsActive     bool       `gorm:"not null;default:true" json:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`

	InvitedByID     *uuid.UUID `gorm:"type:uuid" json:"invited_by_id,omitempty"`
	InviteTokenHash string     `gorm:"size:64;index" json:"-"` // sha256 ссылки-приглашения
	InviteExpiresAt *time.Time `json:"invite_expires_at,omitempty"`
	// Токены, выданные раньше этого момента, не принимаются: так отключение
	// доступа и сброс пароля сразу закрывают панель на всех устройствах.
	SessionsValidFrom *time.Time `json:"-"`
	DisabledAt        *time.Time `json:"disabled_at,omitempty"`
	DisabledReason    string     `gorm:"type:text" json:"disabled_reason,omitempty"`
}

// HasPassword — сотрудник уже задал пароль и может входить.
func (a *Admin) HasPassword() bool { return a.PasswordHash != "" }

// ---------- Мечети ----------

const (
	MosqueStatusPending  = "pending"
	MosqueStatusApproved = "approved"
	MosqueStatusRejected = "rejected"
	MosqueStatusBlocked  = "blocked"
)

type Mosque struct {
	Base
	OwnerID        uuid.UUID `gorm:"type:uuid;not null;index" json:"owner_id"`
	Name           string    `gorm:"size:255;not null" json:"name"`
	Description    string    `gorm:"type:text" json:"description"`
	Address        string    `gorm:"size:500;not null" json:"address"`
	City           string    `gorm:"size:100;not null;index" json:"city"`
	Latitude       *float64  `json:"latitude"`
	Longitude      *float64  `json:"longitude"`
	Phone          string    `gorm:"size:20" json:"phone"`
	ImamName       string    `gorm:"size:255" json:"imam_name"`
	ImamPhone      string    `gorm:"size:20" json:"imam_phone,omitempty"`
	LogoURL        string    `gorm:"size:500" json:"logo_url,omitempty"`
	PhotoURLs      []string  `gorm:"serializer:json;type:text" json:"photo_urls"`
	Status         string    `gorm:"size:20;not null;default:pending;index" json:"status"`
	ModerationNote string    `gorm:"type:text" json:"moderation_note,omitempty"`
}

// ---------- Кампании ----------

// Жизненный цикл: draft → pending_approval → active → completed.
// Комитет может отклонить (rejected); отклонённую кампанию можно
// исправить — она снова станет черновиком.
const (
	CampaignStatusDraft           = "draft"
	CampaignStatusPendingApproval = "pending_approval"
	CampaignStatusActive          = "active"
	CampaignStatusRejected        = "rejected"
	CampaignStatusCompleted       = "completed"
)

type Campaign struct {
	Base
	MosqueID       uuid.UUID       `gorm:"type:uuid;not null;index" json:"mosque_id"`
	Mosque         *Mosque         `json:"mosque,omitempty"`
	Title          string          `gorm:"size:255;not null" json:"title"`
	Description    string          `gorm:"type:text" json:"description"`
	Category       string          `gorm:"size:50" json:"category"`
	GoalAmount     decimal.Decimal `gorm:"type:numeric(15,2);not null" json:"goal_amount"`
	CurrentAmount  decimal.Decimal `gorm:"type:numeric(15,2);not null;default:0" json:"current_amount"`
	DonationCount  int             `gorm:"not null;default:0" json:"donation_count"`
	StartDate      time.Time       `gorm:"not null" json:"start_date"`
	EndDate        time.Time       `gorm:"not null" json:"end_date"`
	Status         string          `gorm:"size:25;not null;default:draft;index" json:"status"`
	ModerationNote string          `gorm:"type:text" json:"moderation_note,omitempty"`
	ApprovedAt     *time.Time      `json:"approved_at,omitempty"`
	CompletedAt    *time.Time      `json:"completed_at,omitempty"`
}

// ---------- Пожертвования ----------

const (
	TransactionStatusPending   = "pending"
	TransactionStatusCompleted = "completed"
	TransactionStatusFailed    = "failed"
)

// Способы оплаты.
var PaymentMethods = map[string]bool{
	"card": true, // Visa / Mastercard / Корти Милли
	"alif": true,
	"imon": true,
	"qr":   true,
}

type Transaction struct {
	Base
	UserID           uuid.UUID       `gorm:"type:uuid;not null;index" json:"user_id"`
	CampaignID       uuid.UUID       `gorm:"type:uuid;not null;index" json:"campaign_id"`
	Campaign         *Campaign       `json:"campaign,omitempty"`
	MosqueID         uuid.UUID       `gorm:"type:uuid;not null;index" json:"mosque_id"`
	Amount           decimal.Decimal `gorm:"type:numeric(15,2);not null" json:"amount"`
	Currency         string          `gorm:"size:3;not null;default:TJS" json:"currency"`
	PaymentMethod    string          `gorm:"size:20;not null" json:"payment_method"`
	PaymentProvider  string          `gorm:"size:20;not null" json:"-"`
	PaymentReference string          `gorm:"size:255;index" json:"-"`
	Status           string          `gorm:"size:20;not null;default:pending;index" json:"status"`
	SavobEarned      int             `gorm:"not null;default:0" json:"savob_earned"`
}

// ---------- Отчёты ----------

const (
	ReportStatusSubmitted = "submitted"
	ReportStatusApproved  = "approved"
	ReportStatusRejected  = "rejected"
)

type ExpenseItem struct {
	Item string          `json:"item"`
	Cost decimal.Decimal `json:"cost"`
}

// Report — отчёт мечети об использовании средств завершённой кампании.
type Report struct {
	Base
	CampaignID     uuid.UUID       `gorm:"type:uuid;not null;uniqueIndex" json:"campaign_id"`
	Campaign       *Campaign       `json:"campaign,omitempty"`
	MosqueID       uuid.UUID       `gorm:"type:uuid;not null;index" json:"mosque_id"`
	Title          string          `gorm:"size:255;not null" json:"title"`
	Description    string          `gorm:"type:text" json:"description"`
	TotalCollected decimal.Decimal `gorm:"type:numeric(15,2);not null" json:"total_collected"`
	TotalSpent     decimal.Decimal `gorm:"type:numeric(15,2);not null" json:"total_spent"`
	Expenses       []ExpenseItem   `gorm:"serializer:json;type:text" json:"expenses"`
	PhotoURLs      []string        `gorm:"serializer:json;type:text" json:"photo_urls"`
	Status         string          `gorm:"size:20;not null;default:submitted;index" json:"status"`
	ModerationNote string          `gorm:"type:text" json:"moderation_note,omitempty"`
	SubmittedAt    time.Time       `json:"submitted_at"`
}

// ---------- Савоб ----------

// SavobBalance — накопленные баллы пользователя.
type SavobBalance struct {
	UserID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	TotalPoints int       `gorm:"not null;default:0" json:"total_points"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// SavobEntry — одно начисление баллов за пожертвование.
type SavobEntry struct {
	Base
	UserID        uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	TransactionID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"transaction_id"`
	Points        int       `gorm:"not null" json:"points"`
	Multiplier    float64   `gorm:"not null;default:1" json:"multiplier"`
	EventType     string    `gorm:"size:30;not null;default:regular" json:"event_type"`
}

// ---------- Журнал действий ----------

// Кто совершил действие.
const (
	ActorAdmin  = "admin"  // сотрудник Комитета
	ActorMosque = "mosque" // представитель мечети
)

// Типы объектов журнала.
const (
	ObjectMosque   = "mosque"
	ObjectCampaign = "campaign"
	ObjectReport   = "report"
	ObjectAdmin    = "admin"
)

// AuditLog — неизменяемая запись о решении или событии. Имя и роль автора,
// название объекта копируются на момент действия: запись не меняется,
// даже если потом переименуют мечеть или сменят роль сотрудника.
type AuditLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`

	ActorType string     `gorm:"size:10;not null;index" json:"actor_type"`
	AdminID   *uuid.UUID `gorm:"type:uuid;index" json:"admin_id,omitempty"`
	ActorName string     `gorm:"size:255;not null" json:"actor_name"`
	ActorRole string     `gorm:"size:20" json:"actor_role,omitempty"`

	Action         string     `gorm:"size:40;not null;index" json:"action"`
	ObjectType     string     `gorm:"size:20;not null;index" json:"object_type"`
	ObjectID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"object_id"`
	ObjectTitle    string     `gorm:"size:255;not null" json:"object_title"`
	ObjectSubtitle string     `gorm:"size:500" json:"object_subtitle,omitempty"`
	MosqueID       *uuid.UUID `gorm:"type:uuid;index" json:"mosque_id,omitempty"`

	FromStatus string `gorm:"size:25" json:"from_status,omitempty"`
	ToStatus   string `gorm:"size:25" json:"to_status,omitempty"`
	Reason     string `gorm:"type:text" json:"reason,omitempty"`
	Details    string `gorm:"size:500" json:"details,omitempty"`

	IP        string `gorm:"size:64" json:"ip,omitempty"`
	UserAgent string `gorm:"size:500" json:"user_agent,omitempty"`
}

func (a *AuditLog) BeforeCreate(*gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// All — список моделей для AutoMigrate.
func All() []any {
	return []any{
		&User{}, &Admin{}, &Mosque{}, &Campaign{}, &Transaction{},
		&Report{}, &SavobBalance{}, &SavobEntry{}, &AuditLog{},
	}
}
