import { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';

export function generateMetadata(): Metadata {
  const { t } = getI18n();
  return { title: t('Мои добрые дела — Садака'), robots: 'noindex' };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
