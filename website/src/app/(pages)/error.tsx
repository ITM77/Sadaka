'use client';

import Link from 'next/link';
import { IconInfo } from '@/components/icons';

export default function PagesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-custom py-14 md:py-24">
      <div className="card max-w-xl mx-auto px-6 py-10 sm:p-12 text-center flex flex-col items-center gap-3">
        <span className="icon-tile bg-sand text-brass-700 mb-1" aria-hidden="true">
          <IconInfo size={26} />
        </span>
        <h1 className="text-2xl font-bold">Не удалось загрузить данные</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Сервер Садака временно недоступен. Попробуйте обновить страницу через минуту.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Попробовать снова
          </button>
          <Link href="/" className="btn btn-ghost">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
