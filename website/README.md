# 🌐 Садака Website — Премиум лендинг сайт

## ✨ Новый редизайн (Premium Design v2.0)

Полностью переделанный дизайн с современными практиками:

### 🎨 Улучшения дизайна

- **Премиум цветовая палитра** — расширенная система цветов с градиентами
- **Улучшенная типография** — семейства шрифтов Sora (display) + Inter (body)
- **Dark Mode** — полная поддержка тёмного режима (`next-themes`)
- **Гладкие анимации** — Fade-in, Slide-up, Scale-in, Float, Pulse и другие
- **Glass эффекты** — полупрозрачные карточки с backdrop blur
- **Микровзаимодействия** — hover эффекты, transitions, гладкие переходы
- **Семантические компоненты** — utilities для button, card, badge, section
- **Responsive дизайн** — оптимизирован для всех устройств

## 📁 Структура проекта

```
website/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout с providers
│   │   ├── page.tsx            # Главная страница
│   │   ├── globals.css         # Глобальные стили (переделаны!)
│   │   ├── providers.tsx       # Theme provider (новое!)
│   │   └── (pages)/
│   │       ├── about/
│   │       ├── mosques/
│   │       └── contact/
│   ├── components/             # Все компоненты переделаны!
│   │   ├── Header.tsx          # С поддержкой dark mode
│   │   ├── Hero.tsx            # С анимациями и градиентами
│   │   ├── Features.tsx        # Красивая сетка (6 фич)
│   │   ├── HowItWorks.tsx      # С номерами и соединителями
│   │   ├── Statistics.tsx      # Glass-эффект статистика
│   │   ├── FAQ.tsx             # Аккордеон с анимацией
│   │   ├── CallToAction.tsx    # С float анимацией
│   │   └── Footer.tsx          # Переделан с множеством ссылок
│   └── lib/
│       ├── config.ts
│       ├── apiClient.ts
│       └── theme-context.tsx   (новое!)
├── public/
├── tailwind.config.ts          # Переделан! Новые colors, animations
├── globals.css                 # Переделан! Новые utilities и эффекты
├── package.json                # Добавлена next-themes
└── README.md
```

## 🎯 Ключевые особенности v2.0

### 1️⃣ **Премиум цветовая система**
```css
Основной: primary (50-900 градации)
Акцент: accent (фиолетовый)
Тёмный: dark (для dark mode)
```

### 2️⃣ **Типография**
- **Display**: Sora (для заголовков и брендов)
- **Body**: Inter (для текста)
- **Responsive размеры** с правильным line-height

### 3️⃣ **Компоненты**
- `.card` / `.card-hover` / `.card-interactive` — карточки
- `.btn` / `.btn-primary` / `.btn-ghost` / `.btn-outline` — кнопки
- `.badge` — значки
- `.glass` / `.glass-sm` — glass-effect контейнеры
- `.section` — стандартный размер секции

### 4️⃣ **Анимации (8 встроенных)**
- `fade-in` — плавное появление
- `fade-in-up` — появление снизу вверх
- `fade-in-down` — появление сверху вниз
- `slide-in-right` / `slide-in-left` — боковые скольжения
- `scale-in` — масштабирование
- `bounce-gentle` — мягкий прыжок
- `pulse-glow` — пульсирование
- `float` — плавающее движение

### 5️⃣ **Dark Mode**
Включение: добавьте `dark` класс на `<html>` элемент или используйте `useTheme()` хук.

### 6️⃣ **Shadows & Glow**
- `.shadow-glow` — зелёный glow эффект
- `.shadow-glow-lg` — большой glow
- Премиум shadow система

## 🚀 Установка и запуск

```bash
cd website

# Установить зависимости
npm install

# Запустить dev сервер
npm run dev

# Собрать для production
npm run build
npm run start
```

Доступно на: http://localhost:3000

## 📦 Что изменилось

### Tailwind Config
```diff
+ Добавлены новые цвета (50-900 градации)
+ Расширенные fontSize с letterSpacing
+ Новые shadows (glow эффекты)
+ 8 новых animations
+ Улучшенные keyframes
```

### Globals.css
```diff
+ Новые шрифты (Sora, Inter)
+ Utility классы (.btn, .card, .glass, .badge)
+ Glass-effect стили
+ Gradients (.text-gradient, .bg-gradient-*)
+ Анимации на scroll
```

### Header Component
```diff
+ Dark mode toggle (🌙/☀️)
+ Sticky header с glass effect
+ Плавные transitions
+ Улучшенное мобильное меню
```

### Все компоненты
```diff
+ Intersection Observer для анимаций при скролле
+ Gradient backgrounds
+ Glass effects
+ Плавные hover эффекты
+ Правильная типография и spacing
+ Dark mode поддержка
```

## 🎨 Цветовые переменные

```css
Primary (зелень):
  50: #f0fdf4    100: #dcfce7   200: #bbf7d0   300: #86efac
  400: #4ade80   500: #22c55e   600: #16a34a   700: #15803d
  800: #166534   900: #14532d

Secondary/Accent (фиолетовый):
  50: #faf5ff    500: #a855f7   600: #9333ea

Dark (для тёмного режима):
  50-900: полная шкала серых
```

## 📱 Responsive Breakpoints

- **Mobile**: 320px+
- **Tablet**: 768px (md)
- **Desktop**: 1024px (lg)

## 🌍 SEO Оптимизация

- ✅ Meta tags (title, description, keywords)
- ✅ Open Graph для соцсетей
- ✅ Семантический HTML
- ✅ Google Fonts предзагрузка
- ✅ Viewport метаданные

## 🔒 Security

- ✅ next-themes для безопасного управления темой
- ✅ Нет hardcoded URLs
- ✅ Защита от XSS

## 📈 Performance

- Next.js встроенная оптимизация
- Lazy loading компонентов
- Intersection Observer для анимаций
- Оптимизированные шрифты

## 🛠️ Доступные скрипты

- `npm run dev` — Development сервер
- `npm run build` — Build для production
- `npm start` — Production сервер
- `npm run lint` — ESLint проверка
- `npm run type-check` — TypeScript проверка

## 📚 Стек технологий

- **Next.js 14** — React framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **next-themes** — Dark mode
- **Framer Motion** — Advanced animations (опционально)
- **Axios** — HTTP клиент
- **React Hook Form** — Forms (опционально)

## 🚢 Deployment

### Vercel (рекомендуется)
```bash
npm install -g vercel
vercel
```

### Docker
```bash
docker build -t sadaka-website .
docker run -p 3000:3000 sadaka-website
```

### Nginx
```nginx
upstream website {
  server localhost:3000;
}

server {
  listen 80;
  server_name sadaka.tj;
  
  location / {
    proxy_pass http://website;
  }
}
```

## 🎯 Что дальше?

- [ ] Интеграция с Backend API
- [ ] Analytics (Google Analytics)
- [ ] Оптимизация SEO (Sitemap, robots.txt)
- [ ] Email рассылка (Newsletter)
- [ ] Blog / Новости
- [ ] Поддержка множества языков (i18n)

## 📞 Support

Документация: [docs/](../docs/)

---

**Last Updated**: 2026-07-24  
**Status**: ✅ Production Ready  
**Version**: 2.0.0 (Premium Redesign)

