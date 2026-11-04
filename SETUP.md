# 🚀 Садака — Development Setup Guide

## Быстрый старт (5 минут)

### Требования
- Docker & Docker Compose (рекомендуется)
- или
- Go 1.21+
- Node.js 18+
- PostgreSQL 14+

---

## 📦 Вариант 1: Docker Compose (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Запуск всей системы

```bash
cd sadaka
docker-compose up -d
```

Это запустит:
- PostgreSQL (порт 5432)
- Redis (порт 6379)
- Backend API (порт 8080)
- Admin Panel (порт 3000)
- Nginx (порт 80, 443)

### Шаг 2: Проверка здоровья

```bash
# Проверить статус контейнеров
docker-compose ps

# Просмотреть логи
docker-compose logs -f backend
```

### Шаг 3: Инициализация БД

```bash
# Подключиться к PostgreSQL и запустить миграции
docker exec sadaka_postgres psql -U postgres -d sadaka -f /docker-entrypoint-initdb.d/schema.sql
```

### Доступ к приложениям

- Backend API: `http://localhost:8080`
- Admin Panel: `http://localhost:3000`
- PostgreSQL: `localhost:5432` (user: postgres, pass: postgres)
- Redis: `localhost:6379`

---

## 🛠️ Вариант 2: Локальная разработка

### Backend (Go)

```bash
cd backend

# 1. Установить зависимости
go mod download

# 2. Настроить .env
cp .env.example .env

# 3. Запустить локально
go run main.go
# Backend запустится на http://localhost:8080
```

### Мобильное приложение (React Native)

```bash
cd mobile

# 1. Установить зависимости
npm install

# 2. Запустить на Android
npx react-native run-android

# или на iOS
npx react-native run-ios

# или через Expo
npx expo start
```

### Admin Panel (React)

```bash
cd admin-panel

# 1. Установить зависимости
npm install

# 2. Запустить dev сервер
npm run dev
# Откроется на http://localhost:5173
```

---

## 🗄️ Database Setup

### Инициализация PostgreSQL

```bash
# Создать БД
createdb sadaka

# Запустить миграции
psql -U postgres -d sadaka -f database/schema.sql

# Проверить создание таблиц
psql -U postgres -d sadaka -c "\dt"
```

### Backup & Restore

```bash
# Backup
pg_dump -U postgres sadaka > backup.sql

# Restore
psql -U postgres sadaka < backup.sql
```

---

## 📱 React Native — Первые шаги

### 1. Metro Bundler

```bash
cd mobile
npm start
```

Это запустит metro bundler на отдельном терминале.

### 2. Запуск на устройстве

```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios

# Expo (веб-версия)
npx expo start --web
```

### 3. Debug

```bash
# Открыть меню разработчика
Cmd+D (iOS) или Ctrl+M (Android)

# Включить fast refresh
Enable Hot Reloading
```

---

## 🧪 Тестирование

### Backend (Go)

```bash
cd backend

# Запустить тесты
go test ./...

# С покрытием
go test -cover ./...
```

### Frontend (React Native + Admin)

```bash
# Мобильное
cd mobile
npm test

# Admin Panel
cd ../admin-panel
npm test
```

---

## 📝 Структура проекта

```
sadaka/
├── backend/              # Go API (порт 8080)
├── mobile/               # React Native App
├── admin-panel/          # React Web UI (порт 3000)
├── docs/                 # Документация
│   ├── API.md
│   ├── DATABASE.md
│   └── ARCHITECTURE.md
├── database/             # SQL миграции
├── docker-compose.yml    # Вся система в контейнерах
├── nginx.conf            # Reverse proxy
└── README.md
```

---

## 🔐 Environment Variables

### Backend (.env)

```env
PORT=8080
ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/sadaka
JWT_SECRET=your-secret-key-change-in-production
PAYMENT_GATEWAY_KEY=xxx
```

### Admin Panel (.env.local)

```env
VITE_API_URL=http://localhost:8080/api/v1
```

### Mobile

Конфиг в `mobile/src/config.ts`:

```typescript
export const API_URL = __DEV__ 
  ? 'http://localhost:8080/api/v1'
  : 'https://api.sadaka.tj/api/v1';
```

---

## 🐛 Troubleshooting

### Backend не запускается

```bash
# Проверить, занят ли порт 8080
lsof -i :8080

# Убить процесс
kill -9 <PID>
```

### PostgreSQL не подключается

```bash
# Проверить статус
psql -U postgres -c "SELECT version();"

# Сбросить пароль postgres
ALTER USER postgres WITH PASSWORD 'postgres';
```

### React Native: "Metro Bundler not found"

```bash
# Переустановить зависимости
rm -rf node_modules package-lock.json
npm install
```

### Docker контейнер не запускается

```bash
# Просмотреть логи
docker logs <container-name>

# Пересобрать
docker-compose build --no-cache
```

---

## 📚 Полезные команды

```bash
# Просмотреть все сервисы
docker-compose ps

# Остановить все
docker-compose down

# Очистить все (volumes)
docker-compose down -v

# Пересобрать образы
docker-compose build

# Запустить с логами
docker-compose up

# Выполнить команду в контейнере
docker exec -it sadaka_backend sh

# Просмотреть логи в реальном времени
docker-compose logs -f <service-name>
```

---

## 🚀 Production Deployment

```bash
# Собрать production образы
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Запустить на production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📞 Поддержка

- Документация: `/docs`
- Backend API: `/docs/API.md`
- БД Schema: `/docs/DATABASE.md`
- Архитектура: `/docs/ARCHITECTURE.md`

---

**Last Updated**: 2026-06-13
