# 🏗️ Архитектура Садака

## Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│                    Пользователи & Интерфейсы                    │
└─────────────────────────────────────────────────────────────────┘
     │                           │                      │
     ▼                           ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Мобильное       │  │  Admin Panel     │  │  QR-сканер       │
│  (React Native)  │  │  (React Web)     │  │  (на мечети)     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
     │                           │                      │
     └───────────────┬───────────┴──────────────────────┘
                     ▼
        ┌────────────────────────────────┐
        │   Backend API (Go + Gin)       │
        │   - Authentication (JWT)       │
        │   - Business Logic             │
        │   - Payment Processing         │
        │   - Notifications              │
        │   - Analytics                  │
        └────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │   Redis     │ │ File Storage│
│   (Main DB) │ │  (Cache)    │ │    (AWS S3) │
└─────────────┘ └─────────────┘ └─────────────┘
     │
     └─ Transactions
     └─ Mosques
     └─ Campaigns
     └─ Reports
     └─ Users
     └─ Savob Points
```

---

## 📱 Клиентская архитектура (React Native)

### Структура проекта

```
mobile/
├── src/
│   ├── screens/              # Экраны приложения
│   │   ├── AuthScreens/      # Регистрация, вход
│   │   ├── HomeScreen/       # Главная
│   │   ├── MosqueScreen/     # Список мечетей
│   │   ├── CampaignScreen/   # Кампании
│   │   ├── DonationScreen/   # Пожертвование
│   │   ├── ProfileScreen/    # Профиль + Савоб
│   │   └── QRScannerScreen/  # QR-сканер
│   ├── navigation/           # React Navigation
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── AppNavigator.tsx
│   ├── components/           # Переиспользуемые компоненты
│   │   ├── MosqueCard/
│   │   ├── CampaignCard/
│   │   ├── DonationForm/
│   │   ├── SavobDisplay/
│   │   └── LoadingSpinner/
│   ├── redux/                # State Management
│   │   ├── store.ts
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── mosquesSlice.ts
│   │   │   ├── campaignsSlice.ts
│   │   │   ├── transactionsSlice.ts
│   │   │   └── savobSlice.ts
│   │   └── hooks.ts
│   ├── services/             # API + Business Logic
│   │   ├── apiClient.ts      # Axios instance
│   │   ├── authService.ts
│   │   ├── mosquesService.ts
│   │   ├── campaignsService.ts
│   │   ├── paymentsService.ts
│   │   └── savobService.ts
│   ├── types/                # TypeScript interfaces
│   ├── utils/                # Утилиты
│   ├── assets/               # Изображения, шрифты
│   └── App.tsx               # Главный компонент
├── package.json
├── tsconfig.json
└── app.json
```

### Data Flow

```
User Interaction
    ↓
Component
    ↓
Redux Action (dispatch)
    ↓
Async Thunk / Service Call
    ↓
API Request (axios)
    ↓
Backend Response
    ↓
Redux Reducer (update state)
    ↓
Component Re-render
    ↓
User sees updated UI
```

---

## 🖥️ Backend архитектура (Go)

### Структура проекта

```
backend/
├── main.go                   # Entry point
├── go.mod                    # Dependencies
├── .env.example              # Config template
├── config/                   # Configuration
│   └── config.go
├── handlers/                 # HTTP handlers
│   ├── auth.go
│   ├── mosques.go
│   ├── campaigns.go
│   ├── transactions.go
│   ├── reports.go
│   ├── savob.go
│   └── admin.go
├── models/                   # Data models
│   ├── user.go
│   ├── mosque.go
│   ├── campaign.go
│   ├── transaction.go
│   ├── report.go
│   └── savob.go
├── services/                 # Business logic
│   ├── authService.go
│   ├── campaignService.go
│   ├── paymentService.go
│   ├── reportService.go
│   └── notificationService.go
├── repositories/             # Database layer
│   ├── userRepository.go
│   ├── mosqueRepository.go
│   ├── campaignRepository.go
│   ├── transactionRepository.go
│   └── reportRepository.go
├── middleware/               # Auth, logging, CORS
│   ├── authMiddleware.go
│   ├── loggingMiddleware.go
│   └── corsMiddleware.go
├── utils/                    # Utilities
│   ├── jwt.go
│   ├── validators.go
│   ├── errors.go
│   └── helpers.go
├── database/                 # DB initialization
│   ├── postgres.go
│   └── migrations.sql
├── cache/                    # Redis cache
│   └── cache.go
├── payment/                  # Payment integrations
│   ├── stripe.go
│   ├── alif.go
│   └── imon.go
└── Dockerfile                # Docker configuration
```

### Request Flow

```
HTTP Request
    ↓
Router (Gin)
    ↓
Middleware (Auth, Logging)
    ↓
Handler (Request validation)
    ↓
Service (Business logic)
    ↓
Repository (DB queries)
    ↓
Database (PostgreSQL)
    ↓
Response JSON
    ↓
Client receives data
```

### Service Layer Design

```
Handler
  ↓
Service (Business Logic)
  ├─ Campaign Service
  │   ├─ Create Campaign
  │   ├─ Approve Campaign
  │   └─ Complete Campaign
  ├─ Payment Service
  │   ├─ Process Payment
  │   ├─ Verify Transaction
  │   └─ Handle Refund
  ├─ Savob Service
  │   ├─ Calculate Points
  │   ├─ Apply Multiplier
  │   └─ Update User Points
  └─ Report Service
      ├─ Create Report
      ├─ Approve Report
      └─ Validate Expenses
  ↓
Repository (Data Access)
```

---

## 🗄️ Database Layer

### Connection Pool
```
Clients (50-100 connections)
    ↓
Connection Pool (max 20 connections)
    ↓
PostgreSQL Database
```

### Query Caching with Redis
```
Request
  ↓
Check Redis Cache
  ├─ HIT: Return cached data
  └─ MISS:
      ↓
      Query Database
      ↓
      Cache result (TTL: 5-30 min)
      ↓
      Return to client
```

---

## 🌐 Admin Panel архитектура (React)

### Структура

```
admin-panel/
├── src/
│   ├── pages/                # Page components
│   │   ├── Dashboard/
│   │   ├── Campaigns/
│   │   ├── Mosques/
│   │   ├── Reports/
│   │   ├── Users/
│   │   └── Analytics/
│   ├── components/           # Reusable components
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   ├── Tables/
│   │   ├── Forms/
│   │   └── Charts/
│   ├── services/
│   │   ├── adminApi.ts
│   │   └── authService.ts
│   ├── types/
│   ├── redux/                # State management
│   └── App.tsx
├── vite.config.ts            # Build config
└── tsconfig.json
```

### Key Features
- Campaign moderation (approve/reject)
- Mosque management (block/unblock)
- Statistics & Analytics
- Report review
- User management
- Export data

---

## 🔐 Security Architecture

### Authentication Flow
```
User Login (phone + password)
    ↓
Backend validates credentials
    ↓
Generate JWT token
    └─ Header: { alg: "HS256" }
    └─ Payload: { userId, role, exp }
    └─ Signature: HMAC-SHA256
    ↓
Return token to client
    ↓
Client stores in secure storage
    ↓
Include in Authorization header for future requests
    ↓
Backend validates token on each request
    └─ Check signature
    └─ Check expiration
    └─ Check user permissions
```

### Password Security
```
User password
    ↓
bcrypt hash (cost: 12)
    ↓
Store in database
    ↓
Never store plain text passwords
```

---

## 💳 Payment Processing

### Payment Flow
```
User selects amount
    ↓
Choose payment method (card/wallet)
    ↓
Request payment token from provider
    ↓
Create transaction record (pending)
    ↓
Send to payment gateway
    ├─ Stripe (international)
    ├─ Alif (Tajikistan)
    └─ IMON (Tajikistan)
    ↓
Payment gateway processes
    ├─ SUCCESS: Webhook → Update transaction to completed
    └─ FAILURE: Webhook → Update transaction to failed
    ↓
Update campaign amount
    ↓
Calculate Savob points
    ↓
Send confirmation to user
```

---

## 📊 Real-time Features

### WebSocket (future)
```
Client → WebSocket Server
    ↓
Subscribe to updates
    ├─ Campaign progress
    ├─ Donation notifications
    └─ Campaign status changes
    ↓
Server broadcasts updates
    ↓
All connected clients receive notification
```

---

## 📈 Scalability Considerations

1. **Database**: Sharding by region (Dushanbe, Khujand, etc.)
2. **Cache**: Redis cluster for high traffic
3. **Storage**: AWS S3 for photos/documents
4. **API**: Load balancing with Nginx
5. **Monitoring**: Prometheus + Grafana
6. **Logging**: Centralized logging with ELK stack

---

## 🚀 Deployment Strategy

```
Development
    ↓
Staging (Full testing)
    ↓
Production (Blue-Green deployment)
    ├─ Blue (current)
    └─ Green (new version)
    ↓
Switch traffic
    ↓
Monitor health
```

---

**Architecture Version**: 1.0  
**Last Updated**: 2026-06-13
