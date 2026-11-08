import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * Дизайн-система «Стиль 2» (файл «Мобильное приложение для пожертвований – Sadaka Style 2.html»).
 * Фон приложения #E9F1F0, белые панели 28px без рамок и теней, кнопки-пилюли,
 * accent #FF7733 с тёмным текстом (не больше двух на экране), sec #03676C — overline и инфоблоки.
 *
 * primary — sec (бирюзовый), accent/brass — оранжевый акцент, dark — нейтральные.
 */
const orange = {
  50: '#FFF6F0',
  100: '#FFEEE4', // мягкий фон выбранного чипа
  200: '#FFD5BD',
  300: '#FFB08A',
  400: '#FF9259',
  500: '#FF7733', // accent: фон главной кнопки
  600: '#E8621F', // accent hover/active
  700: '#B34A12', // ссылки, активный пункт меню, выбранное значение
  800: '#8F3A0D',
  900: '#5E2608',
};

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // sec
        primary: {
          50: '#F1F8F8',
          100: '#E3F0F0', // мягкий фон инфоблока / иконки
          200: '#C2DFDF',
          300: '#8EC3C4',
          400: '#4C9A9D',
          500: '#1A7C80',
          600: '#03676C', // sec
          700: '#025256',
          800: '#023F42',
          900: '#012C2E',
        },
        accent: orange,
        brass: orange,
        // Нейтральные: 50 — фон приложения, 200 — линии, 600 — второстепенный текст, 900 — основной
        dark: {
          50: '#E9F1F0',
          100: '#EFF1F5',
          200: '#C6D6D5',
          300: '#A9B6C2',
          400: '#8F99AB',
          500: '#667286',
          600: '#515B6B',
          700: '#3A4250',
          800: '#252B35',
          900: '#14181E',
        },
        app: '#E9F1F0', // фон приложения и плитки на белых панелях
        paper: '#E9F1F0',
        line: '#EFF1F5', // разделители внутри панелей
        track: '#E9F1F0',
        ink: '#14181E',
        body: '#515B6B', // второстепенный текст
        muted: '#667286',
        hint: '#8F99AB', // плейсхолдеры, шевроны
        sec: '#03676C',
        'sec-soft': '#E3F0F0',
        mint: '#E3F0F0',
        sand: '#FFEEE4',
        gold: '#FF7733',
        mist: '#C6D6D5',
        night: '#14181E',
        ok: '#0E7A45',
        'ok-soft': '#E6F4EC',
      },
      fontFamily: {
        sans: ['Onest', 'IBM Plex Sans', ...defaultTheme.fontFamily.sans],
        display: ['Onest', 'IBM Plex Sans', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        tile: '20px',
        card: '28px',
        panel: '28px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(20, 24, 30, 0.08)',
        sm: '0 1px 2px rgba(20, 24, 30, 0.08)',
        md: '0 8px 24px -12px rgba(20, 24, 30, 0.18)',
        lg: '0 -8px 24px -12px rgba(20, 24, 30, 0.18)',
        brass: 'none',
        glow: 'none',
      },
      animation: {
        'fade-in': 's2Fade 0.2s ease-out',
        'fade-in-up': 's2Fade 0.25s ease-out',
        'fade-in-down': 's2Fade 0.2s ease-out',
        'scale-in': 's2Fade 0.2s ease-out',
        sheet: 's2Sheet 0.25s ease-out',
        shimmer: 's2Shim 1.2s linear infinite',
      },
      keyframes: {
        s2Fade: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        s2Sheet: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        s2Shim: {
          '0%': { backgroundPosition: '-160px 0' },
          '100%': { backgroundPosition: '200px 0' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};

export default config;
