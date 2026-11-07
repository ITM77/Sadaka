import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Садака — пожертвования мечетям Таджикистана',
  description:
    'Садака — прозрачные пожертвования мечетям Таджикистана: каждый сбор одобрен Комитетом улемов, мечеть отчитывается о расходах, а за добрые дела начисляется Савоб.',
  keywords: 'садака, пожертвование, мечеть, таджикистан, савоб, комитет улемов',
  openGraph: {
    title: 'Садака — садақа, которой можно доверять',
    description: 'Жертвуйте мечетям Таджикистана онлайн с отчётом о каждом сомони.',
    type: 'website',
  },
  robots: 'index, follow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B2725',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
