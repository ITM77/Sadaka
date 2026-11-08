'use client';

import Link from 'next/link';
import { IconInfo } from '@/components/icons';

export default function PagesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page">
      <div className="panel-lg max-w-xl mx-auto text-center flex flex-col items-center gap-2.5">
        <span className="icon-round w-14 h-14" aria-hidden="true">
          <IconInfo size={24} />
        </span>
        <h1 className="title mt-1">Не удалось загрузить данные</h1>
        <p className="body-text">Сервер Садака временно недоступен. Попробуйте обновить страницу через минуту.</p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Попробовать снова
          </button>
          <Link href="/" className="btn btn-secondary">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
