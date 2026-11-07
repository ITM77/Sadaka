'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconMosque, IconSavob } from '@/components/icons';
import { ApiError, apiFetch, formatDate, formatTJS, initials, Transaction } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Savob = { total_points: number; current_multiplier: number; current_event: string };

const EVENT_LABELS: Record<string, string> = {
  ramadan: 'Рамадан',
  kurban: 'Курбан-байрам',
  special_event: 'особое событие',
};

type Filter = 'all' | 'active' | 'completed';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Сбор идёт' },
  { id: 'completed', label: 'Сбор завершён' },
];

const savobFmt = new Intl.NumberFormat('ru-RU');

/** Подпись и стиль метки для строки истории: статус платежа важнее статуса сбора. */
function rowStatus(d: Transaction): { label: string; cls: string } | null {
  if (d.status === 'pending') return { label: 'В обработке', cls: 'badge-warning' };
  if (d.status === 'failed') return { label: 'Не прошёл', cls: 'badge-danger' };
  if (d.campaign?.status === 'active') return { label: 'Сбор идёт', cls: 'badge-success' };
  if (d.campaign?.status === 'completed') return { label: 'Сбор завершён', cls: 'badge-neutral' };
  return null;
}

export default function ProfilePage() {
  const { user, token, ready, logout } = useAuth();
  const router = useRouter();
  const [savob, setSavob] = useState<Savob | null>(null);
  const [donations, setDonations] = useState<Transaction[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (ready && !user) router.replace('/login?next=/profile');
  }, [ready, user, router]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<Savob>('/me/savob?limit=1', { token }),
      apiFetch<{ transactions: Transaction[] }>('/me/donations?limit=50', { token }),
    ])
      .then(([s, d]) => {
        setSavob(s);
        setDonations(d.transactions);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить данные'));
  }, [token]);

  if (!ready || !user) {
    return <div className="min-h-[60vh]" aria-busy="true" />;
  }

  const completed = donations?.filter((d) => d.status === 'completed') ?? [];
  const total = completed.reduce((sum, d) => sum + d.amount, 0);
  const mosquesHelped = new Set(completed.map((d) => d.campaign?.mosque_id).filter(Boolean)).size;
  const shown =
    donations?.filter((d) => filter === 'all' || d.campaign?.status === filter) ?? [];

  const stats = [
    { label: 'Пожертвовано', value: donations ? formatTJS(total) : '…' },
    { label: 'Добрых дел', value: donations ? String(completed.length) : '…' },
    { label: 'Мечетей поддержано', value: donations ? String(mosquesHelped) : '…', wide: true },
  ];

  return (
    <div className="container-custom pt-5 pb-16 sm:pt-12 sm:pb-24 flex flex-col gap-4 sm:gap-8">
      <header className="flex flex-wrap items-center gap-3.5 sm:gap-5">
        <span
          aria-hidden="true"
          className="w-[52px] h-[52px] sm:w-[72px] sm:h-[72px] rounded-2xl sm:rounded-[22px] bg-sand text-brass-700 flex items-center justify-center text-lg sm:text-[26px] font-bold shrink-0"
        >
          {initials(user.full_name)}
        </span>
        <div className="flex-1 min-w-0 basis-[200px]">
          <p className="text-sm sm:text-base text-muted">Ассалому алайкум,</p>
          <h1 className="text-xl sm:text-[36px] sm:leading-tight font-bold break-words" style={{ letterSpacing: '-0.02em' }}>
            {user.full_name}
          </h1>
          <p className="text-sm text-muted mt-0.5">{user.phone_number}</p>
        </div>
        <div className="flex gap-2.5 w-full sm:w-auto">
          <Link href="/cabinet" className="btn btn-outline flex-1 sm:flex-none text-primary-700">
            <IconMosque size={18} />
            Кабинет мечети
          </Link>
          <button
            type="button"
            className="btn bg-dark-100 text-ink hover:bg-dark-200"
            onClick={() => {
              logout();
              router.replace('/');
            }}
          >
            Выйти
          </button>
        </div>
      </header>

      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}

      <section aria-label="Итоги" className="flex flex-col lg:flex-row gap-2.5 sm:gap-5">
        <div className="girih relative overflow-hidden lg:flex-[2] min-w-0 rounded-[22px] sm:rounded-[24px] bg-brass-700 text-brass-50 p-6 sm:p-8 flex flex-col gap-2.5 sm:gap-[18px] [--girih-opacity:0.16]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold text-gold">
              Мой Савоб <span className="hidden sm:inline">· <span lang="ar">ثواب</span></span>
            </h2>
            <IconSavob size={28} strokeWidth={1.6} className="text-gold hidden sm:block" />
          </div>
          <p className="text-[56px] sm:text-[72px] leading-none font-bold" style={{ letterSpacing: '-0.03em' }}>
            {savob ? savobFmt.format(savob.total_points) : '…'}
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-brass-100/90 max-w-[460px]">
            Баллы духовной награды, без денежной ценности.
          </p>
          {savob && savob.current_multiplier > 1 && (
            <p className="self-start inline-flex items-center gap-2 rounded-full bg-gold text-brass-900 px-3 py-1.5 text-sm font-semibold">
              <IconSavob size={16} />
              Сейчас {EVENT_LABELS[savob.current_event] ?? 'праздник'}: Савоб ×{savob.current_multiplier}
            </p>
          )}
        </div>
        <div className="lg:flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`bg-white border border-line rounded-2xl sm:rounded-[18px] p-4 sm:p-5 ${s.wide ? 'col-span-2 lg:col-span-1' : ''}`}
            >
              <p className="text-[13px] sm:text-sm text-muted">{s.label}</p>
              <p className="mt-1 text-xl sm:text-[26px] font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-2 sm:mt-0">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-[28px] font-bold">Мои добрые дела</h2>
          {donations && donations.length > 0 && (
            <div role="group" aria-label="Фильтр по статусу сбора" className="segmented max-w-full overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className="!h-11 sm:!h-10 !px-3.5 !text-sm whitespace-nowrap"
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {donations === null ? (
          error ? null : <div className="h-40 rounded-[20px] bg-dark-100 animate-pulse" aria-hidden="true" />
        ) : donations.length === 0 ? (
          <EmptyState icon={<IconSavob size={28} />} title="Пока нет пожертвований">
            <p>Выберите сбор — после пожертвования здесь появится история и Савоб.</p>
            <Link href="/campaigns" className="btn btn-primary mt-4">
              Выбрать сбор
            </Link>
          </EmptyState>
        ) : shown.length === 0 ? (
          <p className="card p-6 text-muted">Нет пожертвований с таким статусом сбора.</p>
        ) : (
          <ul className="bg-white border border-line rounded-[18px] sm:rounded-[20px] overflow-hidden divide-y divide-dark-100">
            {shown.map((d) => {
              const st = rowStatus(d);
              return (
                <li key={d.id} className="flex items-center gap-3 sm:gap-5 px-4 py-3.5 sm:px-6 sm:py-[18px]">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/campaigns/${d.campaign_id}`}
                      className="block truncate text-[15px] sm:text-base font-semibold text-ink hover:text-primary-600"
                    >
                      {d.campaign?.title ?? 'Сбор'}
                    </Link>
                    <p className="mt-0.5 text-[13px] sm:text-sm text-muted">
                      {formatDate(d.created_at)}
                      {st && <span className="sm:hidden"> · {st.label.toLowerCase()}</span>}
                    </p>
                  </div>
                  {st && <span className={`badge ${st.cls} hidden sm:inline-flex`}>{st.label}</span>}
                  <div className="text-right shrink-0 sm:flex sm:items-center sm:gap-5">
                    <p className="text-[15px] sm:text-[17px] font-bold sm:min-w-[110px]">{formatTJS(d.amount)}</p>
                    {d.status === 'completed' && (
                      <p className="mt-0.5 sm:mt-0 text-[13px] font-semibold text-brass-700 sm:inline-flex sm:items-center sm:justify-center sm:gap-1.5 sm:min-w-[104px] sm:rounded-full sm:bg-sand sm:px-2.5 sm:py-1.5 sm:text-sm sm:font-bold sm:text-brass-800">
                        +{d.savob_earned} Савоб
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
