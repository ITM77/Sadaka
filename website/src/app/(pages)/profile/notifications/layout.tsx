import { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';

export function generateMetadata(): Metadata {
  const { t } = getI18n();
  return { title: t('Уведомления — Садака'), robots: 'noindex' };
}

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
