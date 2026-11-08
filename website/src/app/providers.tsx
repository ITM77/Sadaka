'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { Lang } from '@/lib/i18n/core';
import { I18nProvider } from '@/lib/i18n/client';

export function Providers({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <I18nProvider lang={lang}>
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  );
}
