import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { getI18n } from '@/lib/i18n/server';

export function generateMetadata(): Metadata {
  const { t } = getI18n();
  return {
    title: t('Садака — пожертвования мечетям Таджикистана'),
    description: t(
      'Садака — прозрачные пожертвования мечетям Таджикистана: каждый сбор одобрен Комитетом улемов, мечеть отчитывается о расходах, а за добрые дела начисляется Савоб.',
    ),
    keywords: 'садака, садақа, пожертвование, хайрия, мечеть, масҷид, таджикистан, савоб, комитет улемов',
    openGraph: {
      title: t('Садака — садақа, которой можно доверять'),
      description: t('Жертвуйте мечетям Таджикистана онлайн с отчётом о каждом сомони.'),
      type: 'website',
    },
    robots: 'index, follow',
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B2725',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = getI18n();
  return (
    <html lang={lang}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
