'use client';

import { IconCheck, IconInfo } from '@/components/icons';
import { useI18n } from '@/lib/i18n/client';

const CHECKS = ['Мечеть существует по указанному адресу', 'Имам и представитель на связи', 'Нет прошлых нарушений'];

/** Правая колонка формы мечети: что проверяет Комитет и что будет при отказе. */
export function MosqueChecklist() {
  const { t } = useI18n();
  return (
    <aside className="aside-sticky min-w-0 flex flex-col gap-3">
      <section className="panel" aria-labelledby="checklist-title">
        <h2 id="checklist-title" className="overtitle">
          {t('Что проверяет Комитет')}
        </h2>
        <ul className="kv mt-3">
          {CHECKS.map((c) => (
            <li key={c} className="!justify-start !gap-2.5 py-2.5 !items-start">
              <IconCheck size={18} className="text-sec shrink-0 mt-px" />
              <span className="text-ink">{t(c)}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="infobox">
        <IconInfo size={18} className="shrink-0 mt-px" />
        <span>
          <strong className="font-semibold">{t('Если откажут,')}</strong>{' '}
          {t('в кабинете будет причина. Исправьте данные — заявка снова уйдёт на рассмотрение.')}
        </span>
      </div>
    </aside>
  );
}
