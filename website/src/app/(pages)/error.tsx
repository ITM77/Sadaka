'use client';

import Link from 'next/link';
import { IconInfo } from '@/components/icons';
import { useI18n } from '@/lib/i18n/client';

export default function PagesError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="page">
      <div className="panel-lg max-w-xl mx-auto text-center flex flex-col items-center gap-2.5">
        <span className="icon-round w-14 h-14" aria-hidden="true">
          <IconInfo size={24} />
        </span>
        <h1 className="title mt-1">{t('Не удалось загрузить данные')}</h1>
        <p className="body-text">
          {t('Сервер Садака временно недоступен. Попробуйте обновить страницу через минуту.')}
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button type="button" className="btn btn-primary" onClick={reset}>
            {t('Попробовать снова')}
          </button>
          <Link href="/" className="btn btn-secondary">
            {t('На главную')}
          </Link>
        </div>
      </div>
    </div>
  );
}
