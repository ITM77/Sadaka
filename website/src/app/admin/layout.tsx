import { Metadata } from 'next';
import AdminShell from '@/components/admin/AdminShell';
import { getI18n } from '@/lib/i18n/server';

export function generateMetadata(): Metadata {
  const { t } = getI18n();
  return { title: t('Комитет улемов — Садака'), robots: 'noindex, nofollow' };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
