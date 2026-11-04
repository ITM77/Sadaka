package models

import (
	"time"

	"github.com/google/uuid"
)

// User — Жертвователь
type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"`
	PhoneNumber  string    `gorm:"uniqueIndex"`
	FullName     string
	Email        string
	PasswordHash string
	IsVerified   bool      `gorm:"default:false"`
	AvatarURL    string
	Language     string    `gorm:"default:'tj'"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
	DeletedAt    *time.Time

	// Relations
	Transactions []Transaction `gorm:"foreignKey:UserID"`
	SavobPoints  *SavobPoints  `gorm:"foreignKey:UserID"`
}

// Mosque — Мечеть
type Mosque struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name         string
	Description  string
	Address      string
	City         string
	Latitude     float64
	Longitude    float64
	Phone        string
	ImamName     string
	ImamPhone    string
	LogoURL      string
	PhotoURLs    string // JSON array
	QRCodeURL    string
	Status       string    `gorm:"default:'pending'"` // pending, approved, rejected, blocked
	Rating       float32   `gorm:"default:5.0"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
	DeletedAt    *time.Time

	// Relations
	Campaigns    []Campaign    `gorm:"foreignKey:MosqueID"`
	Transactions []Transaction `gorm:"foreignKey:MosqueID"`
	Reports      []Report      `gorm:"foreignKey:MosqueID"`
}

// Campaign — Кампания сбора
type Campaign struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	MosqueID      uuid.UUID
	Title         string
	Description   string
	GoalAmount    float64
	CurrentAmount float64 `gorm:"default:0"`
	StartDate     time.Time
	EndDate       time.Time
	Status        string    `gorm:"default:'draft'"` // draft, pending_approval, approved, active, completed, cancelled
	Category      string    // repairs, education, welfare
	CreatedAt     time.Time `gorm:"autoCreateTime"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime"`
	DeletedAt     *time.Time

	// Relations
	Mosque       *Mosque        `gorm:"foreignKey:MosqueID"`
	Transactions []Transaction  `gorm:"foreignKey:CampaignID"`
	Report       *Report        `gorm:"foreignKey:CampaignID"`
}

// Transaction — Транзакция / Пожертвование
type Transaction struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID            uuid.UUID
	CampaignID        uuid.UUID
	MosqueID          uuid.UUID
	Amount            float64
	PaymentMethod     string `gorm:"default:'card'"` // card, mobile_wallet, qr, bank_transfer
	PaymentGatewayID  string // stripe_id, alif_id, imon_id
	Status            string `gorm:"default:'pending'"` // pending, completed, failed, refunded
	TransactionHash   string `gorm:"uniqueIndex"`
	Currency          string `gorm:"default:'TJS'"`
	CreatedAt         time.Time `gorm:"autoCreateTime"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime"`

	// Relations
	User      *User     `gorm:"foreignKey:UserID"`
	Campaign  *Campaign `gorm:"foreignKey:CampaignID"`
	Mosque    *Mosque   `gorm:"foreignKey:MosqueID"`
	SavobLog  *SavobHistory `gorm:"foreignKey:TransactionID"`
}

// Report — Отчёт об использовании средств
type Report struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	CampaignID    uuid.UUID `gorm:"uniqueIndex"`
	MosqueID      uuid.UUID
	Title         string
	Description   string
	TotalCollected float64
	Expenses      string // JSON: [{item: "...", cost: 100}]
	PhotoURLs     string // JSON array
	Status        string `gorm:"default:'draft'"` // draft, submitted, approved, rejected
	SubmittedAt   *time.Time
	CreatedAt     time.Time `gorm:"autoCreateTime"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime"`

	// Relations
	Campaign *Campaign `gorm:"foreignKey:CampaignID"`
	Mosque   *Mosque   `gorm:"foreignKey:MosqueID"`
}

// SavobPoints — Баллы Савоб пользователя
type SavobPoints struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID      uuid.UUID `gorm:"uniqueIndex"`
	Points      int       `gorm:"default:0"` // текущие баллы
	TotalPoints int       `gorm:"default:0"` // всего накоплено
	LastUpdated time.Time `gorm:"autoUpdateTime"`

	// Relations
	User    *User            `gorm:"foreignKey:UserID"`
	History []SavobHistory   `gorm:"foreignKey:UserID"`
}

// SavobHistory — История начисления Савоб
type SavobHistory struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID        uuid.UUID
	TransactionID *uuid.UUID
	PointsEarned  int
	Multiplier    float32 `gorm:"default:1.0"` // 1.0, 2.0 (Рамадан), 3.0 (Курбан)
	EventType     string  // regular, ramadan, kurban, special_event
	CreatedAt     time.Time `gorm:"autoCreateTime"`

	// Relations
	Transaction *Transaction `gorm:"foreignKey:TransactionID"`
}

// Admin — Администратор (Комитет улемов)
type Admin struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	Email     string    `gorm:"uniqueIndex"`
	FullName  string
	PasswordHash string
	Role      string    `gorm:"default:'moderator'"` // superadmin, moderator, analyst
	IsActive  bool      `gorm:"default:true"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	LastLogin *time.Time
}

// Notification — Уведомление
type Notification struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID    *uuid.UUID
	AdminID   *uuid.UUID
	Type      string // campaign_approved, payment_received, report_submitted
	Title     string
	Message   string
	IsRead    bool      `gorm:"default:false"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	ReadAt    *time.Time

	// Relations
	User  *User  `gorm:"foreignKey:UserID"`
	Admin *Admin `gorm:"foreignKey:AdminID"`
}
