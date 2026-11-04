# 🕌 Садака — Цифровая платформа пожертвований

Мобильная платформа для прозрачного сбора и управления пожертвованиями в мечетях Таджикистана.

## 📁 Структура проекта

```
sadaka/
├── mobile/          # React Native мобильное приложение (iOS + Android)
├── backend/         # Go API сервер
├── admin-panel/     # React веб-интерфейс Комитета улемов
├── website/         # Next.js лендинг сайт (публичный)
├── database/        # SQL миграции
├── docs/            # Документация, схемы БД, API
└── README.md        # Этот файл
```

## 🛠️ Технологический стек

### Мобильное приложение
- **Framework**: React Native
- **Language**: JavaScript/TypeScript
- **State Management**: Redux/Context API
- **API Client**: Axios
- **Payment**: Integracia with local payment gateways

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin / Echo
- **Database**: PostgreSQL
- **ORM**: GORM
- **Authentication**: JWT

### Admin-панель (для Комитета улемов)
- **Framework**: React 18+
- **Language**: TypeScript
- **UI**: Material-UI / Ant Design
- **State**: Redux Toolkit

### Лендинг сайт (публичный)
- **Framework**: Next.js 14+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State**: Zustand

## 🚀 MVP — Основной функционал (Фаза 1)

### Для жертвователей (мобильное приложение):
- ✅ Регистрация и верификация номера
- ✅ Просмотр списка мечетей
- ✅ Просмотр активных кампаний
- ✅ Пожертвование (онлайн платёж)
- ✅ Система Савоб (баллы за пожертвования)
- ✅ История пожертвований
- ✅ QR-сканирование для быстрого пожертвования

### Для мечетей:
- ✅ Регистрация мечети
- ✅ Создание кампаний (отправка на одобрение)
- ✅ Просмотр статуса кампаний
- ✅ Публикация отчётов об использовании средств
- ✅ Управление QR-кодом

### Для Комитета улемов (admin-панель):
- ✅ Одобрение/отклонение кампаний
- ✅ Просмотр статистики по стране
- ✅ Блокировка мечетей при нарушениях
- ✅ Аналитика по пожертвованиям

## 📋 Основные сущности БД

### Пользователи
- `users` — жертвователи
- `mosque` — мечети
- `admins` — Комитет улемов

### Кампании
- `campaigns` — кампании сборов
- `campaign_status` — статусы (Черновик, На одобрении, Активна, Завершена)

### Финансы
- `transactions` — все транзакции
- `reports` — отчёты мечетей об использовании средств

### Система Савоб
- `savob_points` — баллы за пожертвования
- `savob_history` — история начисления баллов

## 🔧 Начало разработки

### Требования
- Node.js 18+ (для мобильного и admin-панели)
- Go 1.21+ (для backend)
- PostgreSQL 14+ (база данных)
- React Native CLI или Expo CLI

### Установка и запуск

```bash
# 1. Клонировать репо
git clone <repo-url>
cd sadaka

# 2. Backend (Go)
cd backend
go mod download
go run main.go

# 3. Мобильное приложение (React Native)
cd ../mobile
npm install
npx react-native run-android  # или run-ios

# 4. Admin-панель (React)
cd ../admin-panel
npm install
npm start
```

## 📚 Документация

- [API Documentation](docs/API.md) — полный справочник API endpoints
- [Database Schema](docs/DATABASE.md) — схема PostgreSQL
- [Architecture](docs/ARCHITECTURE.md) — архитектура системы
- [Setup Guide](SETUP.md) — установка и запуск проекта
- [Backend README](backend/README.md) — документация Backend
- [Mobile README](mobile/README.md) — документация Mobile
- [Admin Panel README](admin-panel/README.md) — документация Admin
- [Website README](website/README.md) — документация Website

## 👥 Команда

- Product Owner: ---
- Backend Lead: ---
- Mobile Lead: ---
- Design Lead: ---

## 📝 Лицензия

Проект социально значимый, разработан для платформы пожертвований в мечетях Таджикистана.

---

**Финальная цель (год 1)**:
- 200+ мечетей
- 10,000+ активных пользователей
- 5 млн TJS в пожертвованиях
