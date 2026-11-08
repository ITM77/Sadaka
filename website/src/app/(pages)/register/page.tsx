import { Metadata } from 'next';
import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';
import { getI18n } from '@/lib/i18n/server';

export function generateMetadata(): Metadata {
  const { t } = getI18n();
  return { title: t('Регистрация — Садака') };
}

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
