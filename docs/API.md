# 📡 API — Садака (v1)

**Base URL**: `http://localhost:8080/api/v1` (разработка)
Все тела запросов и ответов — JSON в UTF-8. Деньги — в TJS, числом с не более чем 2 знаками после запятой.

Источник правды — код в `backend/handlers/routes.go`. Последнее обновление: 2026-11-07.

---

## Авторизация

Два вида сессий (JWT):

| Сессия | Кто | Как получить | Как передаётся |
|---|---|---|---|
| пользователь (7 дней) | жертвователь; он же представитель мечети, если подал заявку | `POST /auth/register`, `POST /auth/login` → `token` в ответе | заголовок `Authorization: Bearer <token>` |
| админ (12 часов) | сотрудник Комитета улемов | `POST /admin/auth/login` | httpOnly-cookie `sadaka_admin` (`Path=/api/v1/admin`, `SameSite=Strict`, `Secure` в production) + заголовок `X-Sadaka-Admin: 1` |

Токен сотрудника в ответ не попадает и скриптам страницы не виден — его не украдёт внедрённый на сайт код. Без заголовка `X-Sadaka-Admin: 1` запрос с cookie отклоняется `403`: чужой сайт не может поставить нестандартный заголовок (защита от подделки запроса). `POST /admin/auth/logout` стирает cookie.

Сессия пользователя не открывает `/admin/*`, сессия админа — пользовательские маршруты.

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

### `GET /savob/mode`
Праздничный режим Савоб для баннера на сайте → `{ "mode": { "event": "ramadan", "title": "", "multiplier": 2, "starts_at": null, "ends_at": "2027-03-31T00:00:00+05:00", "active": true, "effective_multiplier": 2 } }`. `effective_multiplier` — множитель прямо сейчас (вне дат режима — 1).

### `GET /reports/:id`
Опубликованный (`submitted`) или одобренный отчёт.

---

## Пользователь (токен пользователя)

### `GET /me` · `GET /me/donations` · `GET /me/savob`
`/me/savob` → `{ "total_points": 72, "current_multiplier": 1, "current_event": "regular", "history": [...] }`

### Уведомления
| Метод | Путь | Что делает |
|---|---|---|
| `GET` | `/me/notifications?limit=20&offset=0` | `{ notifications: [...], unread: 3 }`, новые сверху |
| `GET` | `/me/notifications/unread` | `{ unread: 3 }` — для колокольчика |
| `POST` | `/me/notifications/read` | `{ "ids": ["uuid"] }` — отметить прочитанными; без тела — все → `204` |

Уведомление: `{ id, created_at, kind, mosque_id?, campaign_id?, object_title, reason?, multiplier?, read_at }`. Текст собирает сайт по `kind` (так он переводится):
- представителю мечети — `mosque_approved`, `mosque_rejected`, `mosque_blocked`, `mosque_unblocked`, `campaign_approved`, `campaign_rejected`, `report_approved`, `report_rejected` (с причиной Комитета в `reason`);
- жертвователям сбора — `campaign_finished` (мечеть закрыла сбор) и `report_published` (Комитет принял отчёт);
- всем — `savob_event` (суперадмин включил праздничный множитель с рассылкой).

Уведомления создаются в той же транзакции, что и событие.

### `POST /donations`
```json
{ "campaign_id": "uuid", "amount": 500, "payment_method": "card" }
```
`payment_method`: `card` (Visa/Mastercard/Корти Милли), `alif`, `imon`, `qr`. Сумма 1–100 000 TJS.
→ `201 { "transaction": {...}, "savob_earned": 50 }`. Кампания должна быть `active`, в пределах дат, мечеть — одобрена.

**Савоб**: 1 балл за каждые 10 TJS × текущий множитель (режим Савоб: Рамадан 2, Курбан 3 — включает суперадмин), минимум 1 балл. Пока режим ни разу не задавали, действуют `SAVOB_MULTIPLIER` и `SAVOB_EVENT` из окружения.

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

## Комитет улемов (сессия админа)

### `POST /admin/auth/login`
```json
{ "email": "admin@sadaka.tj", "password": "..." }
```
→ `{ "admin": {...} }` + `Set-Cookie: sadaka_admin=…; HttpOnly; SameSite=Strict`. Все запросы ниже — с этой cookie и заголовком `X-Sadaka-Admin: 1`.

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

Каждый запрос с токеном админа сверяется с БД: если доступ отключён, пароль сброшен или токен выдан до этого — `401`. Роль берётся из БД, а не из токена, поэтому смена роли действует сразу.

### Сотрудники и журнал действий

| Метод | Путь | Роль | Тело |
|---|---|---|---|
| `GET` | `/admin/me` | любая | — |
| `GET` | `/admin/mosques/:id/history` | любая | — |
| `GET` | `/admin/staff` | superadmin | — |
| `POST` | `/admin/staff` | superadmin | `{ "full_name", "email", "role" }` |
| `GET` | `/admin/staff/:id` | superadmin | — |
| `POST` | `/admin/staff/:id/link` | superadmin | — |
| `PUT` | `/admin/staff/:id/role` | superadmin | `{ "role": "moderator" }` |
| `POST` | `/admin/staff/:id/disable` | superadmin | `{ "reason": "..." }` обязательно |
| `POST` | `/admin/staff/:id/enable` | superadmin | — |
| `GET` | `/admin/audit?admin_id=&action=&object_type=&from=&to=&q=` | superadmin | — |
| `GET` | `/admin/audit/:id` | superadmin | — |
| `GET` | `/admin/audit/export?…` | superadmin | — (CSV, UTF-8 с BOM, разделитель `;`) |
| `POST` | `/admin/invite/lookup` | без входа | `{ "token": "..." }` |
| `POST` | `/admin/invite/accept` | без входа | `{ "token": "...", "password": "..." }` → `{ admin }` + cookie сессии |

- Приглашение и `/link` возвращают `invite_token` (действует 72 часа, одноразовый). Писем платформа не отправляет: ссылку `/admin/invite#<token>` суперадмин передаёт сотруднику сам. Код стоит после `#` и уходит на API только в теле запроса — поэтому не попадает в логи сервера, прокси и в Referer. `/link` у работающего сотрудника — сброс пароля: старый пароль и все сессии сразу перестают действовать.
- Свою учётную запись суперадмин менять не может (`409`) — так в системе всегда остаётся хотя бы один суперадмин.
- Попытки входа (`/auth/login`, `/admin/auth/login`) ограничены: 10 за 15 минут с одного IP, регистрация — 20 в час, приглашения — 20 за 15 минут. Сверх лимита — `429` с `Retry-After`.
- IP берётся из соединения. `X-Forwarded-For` учитывается только от прокси из `TRUSTED_PROXIES` (IP/CIDR через запятую) — иначе IP в журнале можно подделать.
- В истории мечети IP и браузер сотрудников не отдаются — они видны только в журнале (суперадмин). В CSV значения, начинающиеся с `= + - @`, экранируются, чтобы Excel не выполнил их как формулу.
- Записи журнала нельзя изменить или удалить и на уровне БД: триггер `audit_logs_immutable`.
- Журнал (`audit_logs`) пишется в той же транзакции, что и решение: одобрение/отказ мечети, сбора, отчёта, блокировка, снятие блокировки и все действия с сотрудниками. Хранятся автор, роль, статус до и после, причина, IP и User-Agent. События мечети (подача заявки, сбора, отчёта, завершение сбора) попадают только в историю мечети, а не в журнал сотрудников.

`GET /admin/mosques` принимает ещё `city`, `q` (название, адрес, город, имам, телефон), `order=asc`; каждая мечеть приходит со счётчиками `active_campaigns`, `unreported_campaigns`, `active_collected`, а в ответе есть `cities` — список городов для фильтра реестра. `GET /admin/campaigns` добавляет к сбору `mosque_unreported` — сколько у мечети завершённых сборов без отчёта. `GET /admin/mosques/:id/campaigns` (любая роль) → `{ mosque, campaigns, reports }` — «Контекст мечети» в очереди сборов.

### Аналитика и режим Савоб

| Метод | Путь | Роль | Тело |
|---|---|---|---|
| `GET` | `/admin/analytics?period=30d\|90d\|12m\|all` | любая | — |
| `GET` | `/admin/savob-mode` | любая | — |
| `PUT` | `/admin/savob-mode` | superadmin | `{ "event": "ramadan", "multiplier": 2, "starts_on": "2027-03-01", "ends_on": "2027-03-30", "notify": true }` |

`/admin/analytics` (только завершённые платежи, даты по Душанбе) → `{ period, unit, totals: { amount, count, donors, avg, savob }, previous: { amount, count }, has_previous, series: [{ bucket: "2026-11-01", amount, count }], cities: [{ city, amount, count, mosques }], methods: [{ method, amount, count }], top_mosques: [{ id, name, city, amount, count, donors }], reporting: { completed, approved, review, rejected, missing }, campaigns_by_status, mosques_by_status }`. Шаг графика: 30 дней — по дням, 90 дней — по неделям, 12 месяцев и всё время — по месяцам; пустые шаги приходят с нулём. Отчётность считается за всё время.

`PUT /admin/savob-mode`: `event` — `regular` (множитель 1, даты сбрасываются), `ramadan`, `kurban`, `special_event` (тогда обязателен `title`). `multiplier` — от 1,5 до 5. `starts_on` пусто — с сегодня, `ends_on` (включительно) пусто — до выключения. `notify: true` создаёт всем пользователям уведомление `savob_event`. Изменение пишется в журнал (`settings.savob_mode`, объект `settings`). Множитель действует только на новые пожертвования.

`GET /admin/dashboard` →
```json
{ "mosques_approved": 1, "mosques_pending": 0, "mosques_blocked": 0,
  "campaigns_active": 1, "campaigns_pending": 0, "reports_pending": 0,
  "campaigns_without_report": 0, "users": 2, "donations": 22,
  "donations_total": 725.5, "savob_distributed": 72,
  "oldest_mosque_pending": "2026-11-01T10:14:00+05:00", "oldest_campaign_pending": null, "oldest_report_pending": null,
  "unreported": [{ "mosque_name": "...", "city": "...", "campaign_title": "...", "completed_at": "...",
                   "report_status": "" | "rejected", "pending_new": true }] }
```

---

## Служебное

`GET /health` (вне `/api/v1`) → `{ "status": "ok" }` или `503`, если нет связи с БД.

## Пока не реализовано

- Реальные платёжные шлюзы (Alif, IMON, эквайринг) — сейчас только `PAYMENT_PROVIDER=mock`.
- SMS-подтверждение телефона, загрузка фото (сейчас принимаются готовые URL), QR-коды мечетей.
- Push-уведомления на телефон (Web Push) и SMS — сейчас уведомления только на сайте (колокольчик).
- Карта (на сайте) берёт тайлы с tile.openstreetmap.org — для production по правилам OSM нужен свой или платный тайл-сервер.
