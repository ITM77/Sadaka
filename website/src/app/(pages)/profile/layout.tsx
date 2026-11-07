import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Мои добрые дела — Садака', robots: 'noindex' };

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
