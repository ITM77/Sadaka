'use client';

import Link from 'next/link';
import { IconLock } from '@/components/icons';
import { AdminRole, PERMISSIONS, ROLE_LABELS } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';

/** 12p: раздел только для суперадмина — что видит модератор или аналитик по прямой ссылке. */
export default function NoAccess({ role, section }: { role: AdminRole; section: string }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <section className="panel-lg flex flex-col items-start gap-4">
        <span className="icon-tile">
          <IconLock size={22} />
        </span>
        <div>
          <h1 className="title">{t('Раздел доступен только суперадмину')}</h1>
          <p className="body-text mt-1.5 max-w-[560px]">
            {t(
              '{section} может открывать только суперадмин Комитета. Ваша роль — {role}: очереди и реестры работают как обычно. Нужен доступ — обратитесь к суперадмину Комитета.',
              { section: t(section), role: t(ROLE_LABELS[role]).toLowerCase() },
            )}
          </p>
        </div>
        <Link href="/admin" className="btn btn-secondary">
          {t('Вернуться к сводке')}
        </Link>
      </section>
      <aside className="panel flex flex-col gap-3" aria-labelledby="no-access-rights">
        <h2 id="no-access-rights" className="overtitle">
          {t('Ваши права')} · {t(ROLE_LABELS[role])}
        </h2>
        <ul className="flex flex-col gap-2">
          {PERMISSIONS.map((p) => {
            const yes = p.roles.includes(role);
            return (
              <li key={p.label} className="flex gap-2 text-sm leading-5">
                <span aria-hidden="true" className={`shrink-0 font-semibold ${yes ? 'text-ok' : 'text-[#B42318]'}`}>
                  {yes ? '✓' : '✕'}
                </span>
                <span className={yes ? 'text-ink' : 'text-body'}>
                  <span className="sr-only">{yes ? t('Есть: ') : t('Нет: ')}</span>
                  {t(p.label)}
                </span>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
