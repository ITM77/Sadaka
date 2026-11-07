# 📡 API — Садака (v1)

**Base URL**: `http://localhost:8080/api/v1` (разработка)
Все тела запросов и ответов — JSON в UTF-8. Деньги — в TJS, числом с не более чем 2 знаками после запятой.

Источник правды — код в `backend/handlers/routes.go`. Последнее обновление: 2026-11-07.

---

## Авторизация

Два вида токенов (JWT, 7 дней), передаются в заголовке `Authorization: Bearer <token>`:

| Токен | Кто | Как получить |
|---|---|---|
| пользователь | жертвователь; он же представитель мечети, если подал заявку | `POST /auth/register`, `POST /auth/login` |
| админ | сотрудник Комитета улемов | `POST /admin/auth/login` |

Токен пользователя не открывает `/admin/*`, токен админа — пользовательские маршруты.

Роли Комитета: `superadmin` (всё, включая блокировку), `moderator` (одобрение/отклонение), `analyst` (только чтение).
Первый суперадмин создаётся при старте сервера из `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`, если админов ещё нет.

---

## Ошибки

```json
{ "error": "текст для пользователя", "code": "VALIDATION_ERROR", "status": 400 }
```

| code | status | когда |
|---|---|---|
| `VALIDATION_ERROR` | 400 | неверные данные |
| `AUTH_ERROR` | 401 | нет токена, неверный логин/пароль |
| `FORBIDDEN` | 403 | не хватает прав, мечеть не одобрена/заблокирована |
| `NOT_FOUND` | 404 | нет объекта (или он чужой/скрыт) |
| `CONFLICT` | 409 | действие недоступно в текущем статусе, дубликат |
| `CAMPAIGN_RULE` | 409 | «нет отчёта — нет новой кампании» |
| `CAMPAIGN_CLOSED` | 409 | кампания не принимает пожертвования |
| `PAYMENT_ERROR` | 402 | платёж не прошёл |
| `SERVER_ERROR` | 500 | внутренняя ошибка |

Списки поддерживают `?limit=` (по умолчанию 20, максимум 100) и `?offset=`.

---

## Публичные маршруты (без токена)

### `POST /auth/register`
```json
{ "phone_number": "+992901234567", "full_name": "Фарзона Раҳимова", "password": "Salom2026", "language": "tg" }
```
Телефон принимается как `+992 90 123 45 67`, `992901234567` или `901234567` и сохраняется как `+992901234567`.
Пароль: 8–72 символа, буквы и цифры. `language`: `tg` (по умолчанию) или `ru`.
→ `201 { "token": "...", "user": {...} }`, `409` если номер занят.

### `POST /auth/login`
```json
{ "phone_number": "901234567", "password": "Salom2026" }
```
→ `200 { "token": "...", "user": {...} }`

### `GET /mosques?city=Душанбе&q=ҷомеъ`
Только одобренные мечети. `q` — поиск по названию без учёта регистра. → `{ "mosques": [...], "total": 1 }`

### `GET /mosques/:id`
Одобренная мечеть, её активные и завершённые кампании, опубликованные отчёты.
→ `{ "mosque": {...}, "campaigns": [...], "reports": [...] }`

### `GET /campaigns?status=active&mosque_id=&category=`
`status`: `active` (по умолчанию) или `completed`. Только кампании одобренных мечетей. → `{ "campaigns": [...], "total": N }`

### `GET /campaigns/:id`
→ `{ "campaign": {...}, "recent_donations": [{ "amount": 500, "created_at": "..." }], "report": {...} | null }`
Имена жертвователей не публикуются.

### `GET /reports/:id`
Опубликованный (`submitted`) или одобренный отчёт.

---

## Пользователь (токен пользователя)

### `GET /me` · `GET /me/donations` · `GET /me/savob`
`/me/savob` → `{ "total_points": 72, "current_multiplier": 1, "current_event": "regular", "history": [...] }`

### `POST /donations`
```json
{ "campaign_id": "uuid", "amount": 500, "payment_method": "card" }
```
`payment_method`: `card` (Visa/Mastercard/Корти Милли), `alif`, `imon`, `qr`. Сумма 1–100 000 TJS.
→ `201 { "transaction": {...}, "savob_earned": 50 }`. Кампания должна быть `active`, в пределах дат, мечеть — одобрена.

**Савоб**: 1 балл за каждые 10 TJS × множитель (`SAVOB_MULTIPLIER`: Рамадан 2, Курбан 3), минимум 1 балл.

### Мечеть

| Метод | Путь | Что делает |
|---|---|---|
| `POST` | `/mosques` | заявка на регистрацию → `pending` |
| `PUT` | `/mosques/:id` | правка своей мечети; отклонённая снова уходит в `pending` |
| `GET` | `/me/mosques` | свои мечети в любом статусе |
| `GET` | `/me/mosques/:id/campaigns` | своя мечеть, все её кампании и отчёты (включая отклонённые) → `{ mosque, campaigns, reports }` |

Тело мечети:
```json
{ "name": "Масҷиди Ҷомеъ", "address": "кӯчаи Айнӣ 12", "city": "Душанбе",
  "latitude": 38.5598, "longitude": 68.787, "phone": "+992...", "imam_name": "...",
  "imam_phone": "+992...", "description": "...", "logo_url": "...", "photo_urls": ["..."] }
```

### Кампании мечети

Жизненный цикл: `draft` → `pending_approval` → `active` → `completed`; Комитет может перевести в `rejected`, после правки — снова `draft`.

| Метод | Путь | Что делает |
|---|---|---|
| `POST` | `/campaigns` | черновик (мечеть должна быть одобрена) |
| `PUT` | `/campaigns/:id` | правка черновика или отклонённой |
| `POST` | `/campaigns/:id/submit` | на одобрение Комитету |
| `POST` | `/campaigns/:id/complete` | закрыть активную кампанию |
| `POST` | `/campaigns/:id/report` | опубликовать отчёт (или переподать отклонённый) |

Тело кампании:
```json
{ "mosque_id": "uuid", "title": "Таъмири бом", "description": "...", "category": "repairs",
  "goal_amount": 50000, "start_date": "2026-11-06", "end_date": "2026-12-06" }
```
Категории: `repairs`, `construction`, `education`, `welfare`, `utilities`, `other`. Даты — по времени Душанбе, `end_date` включительно, срок не больше года.

**Правило отчётности**: `submit` вернёт `409 CAMPAIGN_RULE`, если у мечети есть завершённая (или истёкшая) кампания без отчёта в статусе `submitted`/`approved`. Отклонённый отчёт не считается.

Тело отчёта (только для завершённой или истёкшей кампании):
```json
{ "title": "Ҳисобот", "description": "...",
  "expenses": [{ "item": "Шифер", "cost": 400 }, { "item": "Кор", "cost": 125.5 }],
  "photo_urls": ["https://..."] }
```
`total_collected` берётся из кампании, `total_spent` считается по расходам. Нужно хотя бы одно фото.

---

## Комитет улемов (токен админа)

### `POST /admin/auth/login`
```json
{ "email": "admin@sadaka.tj", "password": "..." }
```
→ `{ "token": "...", "admin": {...} }`

| Метод | Путь | Роль | Тело |
|---|---|---|---|
| `GET` | `/admin/dashboard` | любая | — |
| `GET` | `/admin/mosques?status=pending` | любая | — |
| `GET` | `/admin/campaigns?status=pending_approval` | любая | — |
| `GET` | `/admin/reports?status=submitted` | любая | — |
| `POST` | `/admin/mosques/:id/approve` | moderator+ | — |
| `POST` | `/admin/mosques/:id/reject` | moderator+ | `{ "reason": "..." }` обязательно |
| `POST` | `/admin/mosques/:id/block` | superadmin | `{ "reason": "..." }` обязательно |
| `POST` | `/admin/mosques/:id/unblock` | superadmin | — |
| `POST` | `/admin/campaigns/:id/approve` | moderator+ | — |
| `POST` | `/admin/campaigns/:id/reject` | moderator+ | `{ "reason": "..." }` обязательно |
| `POST` | `/admin/reports/:id/approve` | moderator+ | — |
| `POST` | `/admin/reports/:id/reject` | moderator+ | `{ "reason": "..." }` обязательно |

Причина сохраняется в `moderation_note` и видна мечети. Блокировка мечети сразу останавливает приём пожертвований во все её кампании.

`GET /admin/dashboard` →
```json
{ "mosques_approved": 1, "mosques_pending": 0, "mosques_blocked": 0,
  "campaigns_active": 1, "campaigns_pending": 0, "reports_pending": 0,
  "campaigns_without_report": 0, "users": 2, "donations": 22,
  "donations_total": 725.5, "savob_distributed": 72 }
```

---

## Служебное

`GET /health` (вне `/api/v1`) → `{ "status": "ok" }` или `503`, если нет связи с БД.

## Пока не реализовано

- Реальные платёжные шлюзы (Alif, IMON, эквайринг) — сейчас только `PAYMENT_PROVIDER=mock`.
- SMS-подтверждение телефона, загрузка фото (сейчас принимаются готовые URL), QR-коды мечетей, карта/ближайшие мечети, уведомления.
