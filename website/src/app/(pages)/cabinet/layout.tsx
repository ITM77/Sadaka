import { Metadata } from 'next';
import RequireAuth from '@/components/cabinet/RequireAuth';

export const metadata: Metadata = { title: 'Кабинет мечети — Садака', robots: 'noindex' };

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
