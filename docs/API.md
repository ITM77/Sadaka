# 📡 API Documentation — Садака

**Base URL**: `https://api.sadaka.tj/api/v1`

---

## 🔐 Authentication

All endpoints require JWT token in `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

---

## 👤 Auth Endpoints

### Register User
```
POST /auth/register
Content-Type: application/json

{
  "phone_number": "+992901234567",
  "full_name": "Иброхим Касимов",
  "password": "SecurePassword123",
  "language": "tj"
}

Response:
{
  "id": "uuid",
  "phone_number": "+992901234567",
  "token": "jwt_token",
  "user": { ... }
}
```

### Login
```
POST /auth/login
Content-Type: application/json

{
  "phone_number": "+992901234567",
  "password": "SecurePassword123"
}

Response:
{
  "token": "jwt_token",
  "user": { ... }
}
```

### Verify Phone (SMS)
```
POST /auth/verify-phone
Content-Type: application/json

{
  "user_id": "uuid",
  "sms_code": "123456"
}
```

---

## 🕌 Mosque Endpoints

### Get All Mosques
```
GET /mosques?city=Dushanbe&limit=20&offset=0
Authorization: Bearer <token>

Response:
{
  "mosques": [
    {
      "id": "uuid",
      "name": "Мечеть Момина",
      "address": "ул. Айни 123",
      "city": "Душанбе",
      "latitude": 37.5407,
      "longitude": 68.7738,
      "rating": 4.8,
      "status": "approved",
      "photo_urls": ["..."],
      "imam_name": "Мухаммад Абдухалимов"
    }
  ],
  "total": 150
}
```

### Get Mosque by ID
```
GET /mosques/:id
Authorization: Bearer <token>

Response:
{
  "mosque": { ... },
  "active_campaigns": [ ... ],
  "completed_campaigns": [ ... ]
}
```

### Create Mosque (для администратора мечети)
```
POST /mosques
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Мечеть Момина",
  "description": "...",
  "address": "ул. Айни 123",
  "city": "Душанбе",
  "latitude": 37.5407,
  "longitude": 68.7738,
  "phone": "+992371234567",
  "imam_name": "Мухаммад Абдухалимов",
  "imam_phone": "+992901234567"
}

Response:
{
  "mosque": { ... },
  "qr_code_url": "https://..."
}
```

---

## 💰 Campaign Endpoints

### Get All Campaigns
```
GET /campaigns?status=active&mosque_id=uuid&sort=created_at
Authorization: Bearer <token>

Response:
{
  "campaigns": [
    {
      "id": "uuid",
      "title": "Ремонт крыши мечети",
      "mosque_id": "uuid",
      "mosque_name": "Мечеть Момина",
      "goal_amount": 50000,
      "current_amount": 25000,
      "progress_percentage": 50,
      "start_date": "2026-06-13",
      "end_date": "2026-07-13",
      "status": "active",
      "donation_count": 145
    }
  ],
  "total": 23
}
```

### Get Campaign by ID
```
GET /campaigns/:id
Authorization: Bearer <token>

Response:
{
  "campaign": { ... },
  "recent_donations": [
    {
      "donor_name": "Обеспокоенный благодетель",
      "amount": 500,
      "created_at": "2026-06-13T10:30:00Z"
    }
  ],
  "mosque_report": { ... }
}
```

### Create Campaign (для мечети)
```
POST /campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "mosque_id": "uuid",
  "title": "Ремонт крыши мечети",
  "description": "Срочный ремонт крыши после дождей",
  "goal_amount": 50000,
  "start_date": "2026-06-13",
  "end_date": "2026-07-13",
  "category": "repairs"
}

Response:
{
  "campaign": { ... },
  "status": "draft"
}
```

### Submit Campaign for Approval (мечеть отправляет на одобрение)
```
PUT /campaigns/:id/submit-approval
Authorization: Bearer <token>
Content-Type: application/json

{
  "mosque_id": "uuid"
}

Response:
{
  "campaign": { ... },
  "status": "pending_approval"
}
```

### Approve/Reject Campaign (для Комитета улемов)
```
PUT /campaigns/:id/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "approved": true,
  "reason": "Одобрено" // или причина отклонения
}

Response:
{
  "campaign": { ... },
  "status": "approved"
}
```

---

## 💳 Transaction Endpoints

### Create Transaction (пожертвование)
```
POST /transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaign_id": "uuid",
  "mosque_id": "uuid",
  "amount": 500,
  "payment_method": "card",
  "card_token": "stripe_token_or_local_payment_id"
}

Response:
{
  "transaction": {
    "id": "uuid",
    "status": "completed",
    "amount": 500,
    "savob_earned": 50
  }
}
```

### Get Transaction
```
GET /transactions/:id
Authorization: Bearer <token>

Response:
{
  "transaction": { ... },
  "receipt": "PDF URL or HTML"
}
```

### Get User Transactions
```
GET /transactions/user/:userId?limit=20&offset=0
Authorization: Bearer <token>

Response:
{
  "transactions": [ ... ],
  "total": 145
}
```

---

## 🌟 Savob Endpoints

### Get User Savob
```
GET /savob/user/:userId
Authorization: Bearer <token>

Response:
{
  "user_id": "uuid",
  "current_points": 2450,
  "total_points": 5200,
  "rank": "Достойный жертвователь",
  "history": [
    {
      "transaction_id": "uuid",
      "points_earned": 50,
      "multiplier": 1.0,
      "event_type": "regular",
      "created_at": "2026-06-13T10:30:00Z"
    }
  ]
}
```

---

## 📋 Report Endpoints

### Create Report (для мечети после кампании)
```
POST /reports
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "campaign_id": "uuid",
  "title": "Отчёт о расходовании средств",
  "description": "Описание использования пожертвований",
  "total_collected": 50000,
  "expenses": [
    { "item": "Материалы", "cost": 30000 },
    { "item": "Работа мастеров", "cost": 20000 }
  ],
  "photos": [files]
}

Response:
{
  "report": { ... },
  "status": "submitted"
}
```

### Get Report
```
GET /reports/:id
Authorization: Bearer <token>

Response:
{
  "report": { ... }
}
```

### Approve Report (для Комитета)
```
PUT /reports/:id/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "approved": true
}

Response:
{
  "report": { ... },
  "status": "approved"
}
```

---

## 🗺️ Map Endpoints

### Get Mosques on Map
```
GET /map/mosques?latitude=37.5&longitude=68.7&radius=5
Authorization: Bearer <token>

Response:
{
  "mosques": [
    {
      "id": "uuid",
      "name": "...",
      "latitude": 37.5407,
      "longitude": 68.7738,
      "active_campaigns": 2,
      "rating": 4.8
    }
  ]
}
```

---

## 📊 Admin Endpoints (для Комитета улемов)

### Get Dashboard Statistics
```
GET /admin/dashboard
Authorization: Bearer <admin_token>

Response:
{
  "total_mosques": 156,
  "active_campaigns": 23,
  "total_donations": 2500000,
  "total_users": 8500,
  "pending_campaigns": 5,
  "total_savob_distributed": 425000
}
```

### Get All Campaigns (для модерации)
```
GET /admin/campaigns?status=pending_approval
Authorization: Bearer <admin_token>

Response:
{
  "campaigns": [ ... ]
}
```

### Block Mosque
```
PUT /admin/mosques/:id/block
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "reason": "Нарушение правил"
}

Response:
{
  "mosque": { ... },
  "status": "blocked"
}
```

---

## ❌ Error Responses

```json
{
  "error": "Unauthorized",
  "code": "AUTH_ERROR",
  "status": 401
}
```

Common error codes:
- `AUTH_ERROR` (401) — Ошибка аутентификации
- `FORBIDDEN` (403) — Доступ запрещён
- `NOT_FOUND` (404) — Ресурс не найден
- `VALIDATION_ERROR` (400) — Ошибка валидации данных
- `PAYMENT_ERROR` (400) — Ошибка платежа
- `SERVER_ERROR` (500) — Ошибка сервера

---

## 📱 Webhook Events

Backend отправляет webhooks:

### Payment Completed
```
POST <client_webhook_url>
{
  "event": "payment.completed",
  "transaction_id": "uuid",
  "campaign_id": "uuid",
  "amount": 500,
  "savob_earned": 50
}
```

### Campaign Status Changed
```
POST <client_webhook_url>
{
  "event": "campaign.status_changed",
  "campaign_id": "uuid",
  "status": "approved",
  "mosque_id": "uuid"
}
```

### Report Submitted
```
POST <client_webhook_url>
{
  "event": "report.submitted",
  "report_id": "uuid",
  "campaign_id": "uuid",
  "mosque_id": "uuid"
}
```

---

**Last Updated**: 2026-06-13
**API Version**: 1.0
