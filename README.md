# 🕌 Садака — Цифровая платформа пожертвований

Веб-платформа (адаптивная под телефон) для прозрачного сбора пожертвований в мечетях Таджикистана: кампании одобряет Комитет улемов, мечети обязаны отчитываться, жертвователи получают баллы Савоб.

## 📁 Структура

```
sadaka/
├── backend/     # Go API: Gin + GORM + PostgreSQL
├── website/     # Next.js: публичный сайт, кабинет мечети, панель Комитета (/admin)
├── docs/        # API.md — актуальное описание API
├── database/    # schema.sql — устарел, схему создаёт бэкенд (GORM AutoMigrate)
└── mobile/      # заготовка React Native — не используется (решено делать только веб)
```

## 🧩 Части сайта

| Адрес | Для кого | Что там |
|---|---|---|
| `/`, `/campaigns`, `/mosques` | все | лендинг, сборы и мечети из базы, отчёты мечетей |
| `/login`, `/register`, `/profile` | жертвователь | вход по телефону, пожертвование, «Мои добрые дела» и Савоб |
| `/cabinet` | представитель мечети | заявка на мечеть, сборы, отправка на одобрение, отчёты |
| `/admin` | Комитет улемов | сводка, модерация мечетей, кампаний и отчётов, блокировка |

## 🛠️ Стек

- **Backend**: Go 1.26, Gin, GORM, PostgreSQL 18, JWT (golang-jwt v5), decimal для денег
- **Website**: Next.js 14 (App Router), TypeScript, Tailwind CSS, next-themes

## 🚀 Запуск для разработки (Windows)

Нужны: Go 1.26+, Node.js 20+, PostgreSQL с базой `sadaka` в UTF-8.

```bash
# 1. Бэкенд: скопируйте backend/.env.example в backend/.env и заполните
cd backend
go run .
# → http://localhost:8080/api/v1 (проверка: http://localhost:8080/health)

# 2. Сайт: в другом терминале
cd website
npm install
npm run dev
# → http://localhost:3000
```

Первый суперадмин Комитета создаётся при старте бэкенда из `ADMIN_BOOTSTRAP_EMAIL` и `ADMIN_BOOTSTRAP_PASSWORD`, вход — на `/admin/login`.

База должна быть в UTF-8 — в кодировке Windows-1251 нет таджикских букв (ҳ, ӯ, ҷ, қ, ғ, ӣ):

```sql
CREATE DATABASE sadaka ENCODING 'UTF8' LOCALE_PROVIDER icu ICU_LOCALE 'ru-RU' LOCALE 'C' TEMPLATE template0;
```

## ✅ Проверки

```bash
cd backend && go vet ./... && go test ./...
cd website && npx tsc --noEmit && npm run build
```

## 📚 Документация

- [docs/API.md](docs/API.md) — маршруты, роли, коды ошибок, правило «нет отчёта — нет новой кампании»
- `claude.md` / `Instruction` — продуктовое описание и ТЗ

`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `SETUP.md` и `PROJECT-OVERVIEW.md` описывают первоначальный замысел (мобильное приложение, отдельная админка) и частично устарели.

## 🚧 Ещё не сделано

- Реальные платёжные шлюзы (Alif, IMON, эквайринг) — сейчас тестовый режим `PAYMENT_PROVIDER=mock`
- SMS-подтверждение телефона, загрузка фото (сейчас ссылками), QR-коды, карта мечетей, уведомления
- Таджикский язык интерфейса (сейчас русский)
- Управление сотрудниками Комитета из панели
- Токены входа в защищённых cookie вместо localStorage
