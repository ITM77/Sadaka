import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Садака — Цифровая платформа пожертвований для мечетей Таджикистана',
  description: 'Садака — прозрачная платформа для сбора пожертвований в мечетях Таджикистана с системой Савоб и обязательной отчётностью.',
  keywords: 'садака, пожертвование, мечеть, таджикистан, платформа, благотворительность',
  openGraph: {
    title: 'Садака — Цифровая платформа пожертвований',
    description: 'Прозрачные и доверенные пожертвования через мобильное приложение',
    type: 'website',
  },
  robots: 'index, follow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#22c55e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tg" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white dark:bg-dark-900 text-dark-900 dark:text-dark-50 transition-colors">
        <Providers>
          <Header />
          <main className="overflow-x-hidden">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
