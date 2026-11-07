'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert, CabinetPage, Loading, MosqueStatusBadge, StatusBadge } from '@/components/cabinet/ui';
import EmptyState from '@/components/EmptyState';
import { IconMosque, IconPlus } from '@/components/icons';
import { ApiError, apiFetch, formatTJS, Mosque } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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
      eyebrow="Кабинет мечети"
      title="Мои мечети"
      actions={
        mosques && mosques.length > 0 ? (
          <Link href="/cabinet/mosques/new" className="btn btn-secondary">
            <IconPlus size={18} />
            Ещё одна мечеть
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6 sm:gap-8">
        {error && <Alert>{error}</Alert>}
        {!mosques && !error && <Loading />}

        {mosques && mosques.length === 0 && (
          <EmptyState icon={<IconMosque size={28} />} title="Вы ещё не зарегистрировали мечеть">
            <p className="mb-6">
              Подайте заявку — Комитет улемов проверит мечеть. После одобрения вы сможете открывать сборы и публиковать
              отчёты.
            </p>
            <Link href="/cabinet/mosques/new" className="btn btn-primary">
              Подать заявку
            </Link>
          </EmptyState>
        )}

        {mosques && mosques.length > 0 && (
          <ul className="flex flex-col gap-4">
            {mosques.map((m) => {
              const sum = summaries[m.id];
              const approved = m.status === 'approved';
              return (
                <li key={m.id}>
                  <Link
                    href={`/cabinet/mosques/${m.id}`}
                    className="card-hover flex flex-wrap items-center gap-4 sm:gap-5 rounded-[20px] sm:rounded-[22px] p-5 sm:p-6 text-ink"
                  >
                    <span
                      aria-hidden="true"
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] flex items-center justify-center shrink-0 ${
                        approved ? 'bg-mint text-primary-600' : 'bg-paper text-muted'
                      }`}
                    >
                      <IconMosque size={32} strokeWidth={1.4} />
                    </span>
                    <div className="flex-1 basis-[220px] min-w-0">
                      <p className="text-lg sm:text-xl font-bold break-words">{m.name}</p>
                      <p className="mt-0.5 text-[15px] text-muted break-words">
                        {m.city} · {m.address}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {sum && sum.owing > 0 && <StatusBadge tone="wait">Нужен отчёт</StatusBadge>}
                      <MosqueStatusBadge status={m.status} />
                    </div>
                    {m.moderation_note && !approved && (
                      <p className="basis-full text-sm text-red-700">
                        <strong>Комитет:</strong> {m.moderation_note}
                      </p>
                    )}
                    {sum && (
                      <dl className="basis-full grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-dark-100">
                        <div>
                          <dt className="text-[13px] text-muted">Идёт сборов</dt>
                          <dd className="mt-0.5 text-lg font-bold">{sum.active}</dd>
                        </div>
                        <div>
                          <dt className="text-[13px] text-muted">На одобрении</dt>
                          <dd className="mt-0.5 text-lg font-bold">{sum.pending}</dd>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <dt className="text-[13px] text-muted">Собрано за всё время</dt>
                          <dd className="mt-0.5 text-lg font-bold">{formatTJS(sum.collected)}</dd>
                        </div>
                      </dl>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <section className="bg-white border border-line rounded-[20px] sm:rounded-[22px] p-5 sm:p-7">
          <h2 className="text-xl font-bold mb-5">Как работает кабинет</h2>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="step-num !w-8 !h-8 !text-sm" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="text-[15px] leading-normal text-dark-700">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </CabinetPage>
  );
}
