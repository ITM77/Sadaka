import { Metadata } from 'next';
import RequireAuth from '@/components/cabinet/RequireAuth';
import { getI18n } from '@/lib/i18n/server';

export function generateMetadata(): Metadata {
  const { t } = getI18n();
  return { title: t('Кабинет мечети — Садака'), robots: 'noindex' };
}

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
