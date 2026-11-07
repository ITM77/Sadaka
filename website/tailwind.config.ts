import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * Стиль «Лазурит и латунь» (холст дизайна).
 * primary — лазурит, brass — латунь (только Савоб и акценты), dark — тёплые нейтральные для текста и линий.
 */
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
        // Лазурит
        primary: {
          50: '#EEF5F3',
          100: '#E3EFEB',
          200: '#C3DCD5',
          300: '#93BFB4',
          400: '#4F9387',
          500: '#1F7268',
          600: '#0F5C55',
          700: '#0B4741',
          800: '#0A3733',
          900: '#0B2725',
        },
        // Латунь
        brass: {
          50: '#FBF5EA',
          100: '#F7ECD7',
          200: '#F1D9A6',
          300: '#E2BE7A',
          400: '#C9A25A',
          500: '#B0853A',
          600: '#9A6B1F',
          700: '#7A5418',
          800: '#5C4313',
          900: '#3D2A0B',
        },
        // Старое имя accent тоже указывает на латунь
        accent: {
          50: '#FBF5EA',
          100: '#F7ECD7',
          200: '#F1D9A6',
          300: '#E2BE7A',
          400: '#C9A25A',
          500: '#B0853A',
          600: '#9A6B1F',
          700: '#7A5418',
          800: '#5C4313',
          900: '#3D2A0B',
        },
        // Тёплые нейтральные: 50 — фон страницы, 200 — линии, 600 — приглушённый текст, 900 — основной текст
        dark: {
          50: '#F5F3EE',
          100: '#EEEBE4',
          200: '#E4DFD5',
          300: '#CFC9BD',
          400: '#8E9894',
          500: '#6B7774',
          600: '#55625F',
          700: '#3B4846',
          800: '#24312F',
          900: '#142422',
        },
        paper: '#F5F3EE',
        line: '#E4DFD5',
        track: '#E8E4DA',
        ink: '#142422',
        muted: '#55625F',
        night: '#0B2725',
        mint: '#E3EFEB',
        sand: '#F7ECD7',
        gold: '#F1D9A6',
        mist: '#C8D3D0',
      },
      fontFamily: {
        sans: ['Onest', ...defaultTheme.fontFamily.sans],
        display: ['Onest', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        card: '20px',
        panel: '28px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(20 36 34 / 0.06)',
        sm: '0 1px 3px 0 rgb(20 36 34 / 0.08), 0 1px 2px -1px rgb(20 36 34 / 0.06)',
        md: '0 12px 32px -16px rgb(20 36 34 / 0.25)',
        lg: '0 24px 64px -24px rgb(0 0 0 / 0.55)',
        brass: '0 16px 40px -24px rgb(61 42 11 / 0.5)',
        glow: '0 12px 32px -16px rgb(15 92 85 / 0.45)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.25s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};

export default config;
