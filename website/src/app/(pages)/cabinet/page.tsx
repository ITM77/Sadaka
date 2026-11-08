'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert, CabinetPage, Loading, MosqueStatusBadge, StatusBadge } from '@/components/cabinet/ui';
import { IconChevronRight, IconInfo, IconMosque, IconPlus } from '@/components/icons';
import { ApiError, apiFetch, Mosque } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/client';
import { isEnded, MosqueCabinetData, needsReport } from '@/lib/cabinet';

type Summary = { active: number; pending: number; collected: number; owing: number };

function summarize({ campaigns, reports }: MosqueCabinetData): Summary {
  return {
    active: campaigns.filter((c) => c.status === 'active' && !isEnded(c)).length,
    pending: campaigns.filter((c) => c.status === 'pending_approval').length,
    collected: campaigns.reduce((s, c) => s + (c.status === 'active' || c.status === 'completed' ? c.current_amount : 0), 0),
    owing: campaigns.filter((c) => needsReport(c, reports)).length,
  };
}

const STEPS = [
  'Заявка мечети — Комитет проверяет',
  'Сбор отправляется на одобрение',
  'Идёт сбор, прихожане жертвуют',
  'Отчёт — и можно открывать новый',
];

export default function CabinetHome() {
  const { token } = useAuth();
  const { t, fmt } = useI18n();
  const [mosques, setMosques] = useState<Mosque[] | null>(null);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    apiFetch<{ mosques: Mosque[] }>('/me/mosques', { token })
      .then((r) => {
        setMosques(r.mosques);
        // Сводка по сборам — только у мечетей, где сборы вообще возможны.
        r.mosques
          .filter((m) => m.status === 'approved' || m.status === 'blocked')
          .forEach((m) => {
            apiFetch<MosqueCabinetData>(`/me/mosques/${encodeURIComponent(m.id)}/campaigns`, { token })
              .then((d) => setSummaries((s) => ({ ...s, [m.id]: summarize(d) })))
              .catch(() => {
                /* сводка необязательна — карточка покажется без цифр */
              });
          });
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить мечети'));
  }, [token]);

  return (
    <CabinetPage
      eyebrow={t('Кабинет мечети')}
      title={t('Мои мечети')}
      actions={
        mosques && mosques.length > 0 ? (
          <Link href="/cabinet/mosques/new" className="btn btn-white">
            <IconPlus size={18} />
            {t('Ещё одна мечеть')}
          </Link>
        ) : undefined
      }
    >
      <div className="layout-aside">
        <div className="min-w-0 flex flex-col gap-3">
          {error && <Alert>{t(error)}</Alert>}
          {!mosques && !error && <Loading />}

          {mosques && mosques.length === 0 && (
            <section className="panel-lg text-center flex flex-col items-center gap-2.5">
              <span className="icon-round w-14 h-14">
                <IconMosque size={24} />
              </span>
              <h2 className="title-sm">{t('Вы ещё не зарегистрировали мечеть')}</h2>
              <p className="body-text max-w-[420px]">
                {t(
                  'Подайте заявку — Комитет улемов проверит мечеть. После одобрения вы сможете открывать сборы и публиковать отчёты.',
                )}
              </p>
              <Link href="/cabinet/mosques/new" className="btn btn-primary mt-2">
                {t('Подать заявку')}
              </Link>
            </section>
          )}

          {mosques && mosques.length > 0 && (
            <section className="panel !py-1" aria-label={t('Мечети')}>
              <ul className="divide-y divide-line">
                {mosques.map((m) => {
                  const sum = summaries[m.id];
                  const approved = m.status === 'approved';
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/cabinet/mosques/${m.id}`}
                        className="group flex items-center gap-3 min-h-[80px] py-3 text-ink hover:text-ink"
                      >
                        <span
                          aria-hidden="true"
                          className={`icon-tile self-start mt-0.5 ${approved ? '' : '!bg-app !text-muted'}`}
                        >
                          <IconMosque />
                        </span>
                        <span className="flex-1 min-w-0 flex flex-col gap-1">
                          <span className="block text-base leading-[22px] font-semibold break-words group-hover:text-accent-700 transition-colors">
                            {m.name}
                          </span>
                          <span className="block caption break-words">
                            {m.city} · {m.address}
                          </span>
                          <span className="flex flex-wrap gap-1.5 mt-1">
                            <MosqueStatusBadge status={m.status} />
                            {sum && sum.owing > 0 && <StatusBadge tone="wait">{t('Нужен отчёт')}</StatusBadge>}
                          </span>
                          {m.moderation_note && !approved && (
                            <span className="block text-[13px] leading-[18px] text-[#B42318]">
                              <strong className="font-semibold">{t('Комитет:')}</strong> {m.moderation_note}
                            </span>
                          )}
                          {sum && (
                            <span className="block caption tabular">
                              {t('Идёт сборов: {active} · На одобрении: {pending} · Собрано за всё время:', {
                                active: sum.active,
                                pending: sum.pending,
                              })}{' '}
                              <span className="font-medium text-ink whitespace-nowrap">{fmt.money(sum.collected)}</span>
                            </span>
                          )}
                        </span>
                        <IconChevronRight size={18} className="text-hint shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="aside-sticky flex flex-col gap-3">
          <section className="panel" aria-labelledby="how-title">
            <h2 id="how-title" className="overtitle">
              {t('Как работает кабинет')}
            </h2>
            <ol className="mt-3 flex flex-col gap-2">
              {STEPS.map((s, i) => (
                <li key={s} className="tile !py-2.5 flex items-center gap-3">
                  <span className="step-num !bg-white" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-5 text-ink">{t(s)}</span>
                </li>
              ))}
            </ol>
          </section>
          <div className="infobox">
            <IconInfo size={18} className="shrink-0 mt-px" />
            <span>{t('Нет отчёта — нет нового сбора. Отчёт по завершённому сбору открывает дорогу следующему.')}</span>
          </div>
        </aside>
      </div>
    </CabinetPage>
  );
}
