'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconHandHeart, IconLogout, IconMosque, IconSavob, IconSparkles } from '@/components/icons';
import { ApiError, apiFetch, formatDate, formatMoney, initials, Transaction } from '@/lib/api';
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
  const shown = donations?.filter((d) => filter === 'all' || d.campaign?.status === filter) ?? [];

  const stats = [
    { label: 'Пожертвовано', value: donations ? formatMoney(total) : '…', wide: true },
    { label: 'Добрых дел', value: donations ? String(completed.length) : '…' },
    { label: 'Мечетей', value: donations ? String(mosquesHelped) : '…' },
  ];

  return (
    <div className="page flex flex-col gap-3 md:gap-4">
      <header className="flex items-center gap-3 px-1">
        <span
          aria-hidden="true"
          className="w-12 h-12 rounded-full bg-white text-sec flex items-center justify-center text-base font-semibold shrink-0"
        >
          {initials(user.full_name)}
        </span>
        <div className="min-w-0">
          <p className="caption !text-[13px]">Ассалому алайкум,</p>
          <h1 className="title break-words">{user.full_name}</h1>
          <p className="caption tabular">{user.phone_number}</p>
        </div>
      </header>

      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="layout-aside">
        <section className="panel min-w-0 order-2 lg:order-1" aria-labelledby="history-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="history-title" className="title-sm">
              Мои добрые дела
            </h2>
            {donations && donations.length > 0 && (
              <div role="group" aria-label="Фильтр по статусу сбора" className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className="chip min-h-[44px] sm:min-h-[36px]"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2">
            {donations === null ? (
              error ? null : (
                <div className="flex flex-col gap-2 py-2" aria-hidden="true">
                  <div className="skeleton h-14" />
                  <div className="skeleton h-14" />
                  <div className="skeleton h-14" />
                </div>
              )
            ) : donations.length === 0 ? (
              <div className="py-6 text-center flex flex-col items-center gap-2">
                <span className="icon-round w-14 h-14">
                  <IconSavob size={24} />
                </span>
                <p className="title-sm">Пока нет пожертвований</p>
                <p className="body-text max-w-[360px]">
                  Выберите сбор — после пожертвования здесь появится история и Савоб.
                </p>
                <Link href="/campaigns" className="btn btn-primary mt-2">
                  Выбрать сбор
                </Link>
              </div>
            ) : shown.length === 0 ? (
              <p className="body-text py-6 text-center">Нет пожертвований с таким статусом сбора.</p>
            ) : (
              <ul className="divide-y divide-line">
                {shown.map((d) => {
                  const st = rowStatus(d);
                  return (
                    <li key={d.id} className="group relative flex items-center gap-3 min-h-[72px] py-2.5">
                      <span className="icon-tile" aria-hidden="true">
                        <IconHandHeart />
                      </span>
                      <div className="flex-1 min-w-0">
                        {/* Ссылка растянута на всю строку — цель нажатия 72 px */}
                        <Link
                          href={`/campaigns/${d.campaign_id}`}
                          className="block truncate text-sm leading-5 font-medium text-ink group-hover:text-accent-700 after:absolute after:inset-0 after:content-['']"
                        >
                          {d.campaign?.title ?? 'Сбор'}
                        </Link>
                        <p className="caption">
                          {formatDate(d.created_at)}
                          {d.status === 'completed' && (
                            <span className="text-sec font-medium"> · +{d.savob_earned} Савоб</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[15px] leading-[21px] font-semibold text-ink tabular whitespace-nowrap">
                          {formatMoney(d.amount)}
                        </span>
                        {st && <span className={`badge ${st.cls}`}>{st.label}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="aside-sticky flex flex-col gap-3 order-1 lg:order-2">
          <section className="panel" aria-labelledby="savob-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="savob-title" className="overtitle">
                Мой Савоб · <span lang="ar">ثواب</span>
              </h2>
              <IconSparkles size={20} className="text-sec" />
            </div>
            <p className="num-lg mt-2 text-ink">{savob ? savobFmt.format(savob.total_points) : '…'}</p>
            <p className="caption mt-0.5">Баллы духовной награды, без денежной ценности.</p>
            {savob && savob.current_multiplier > 1 && (
              <p className="mt-3 rounded-xl bg-accent-100 px-3 py-2.5 text-[13px] leading-[18px] font-medium text-accent-700">
                Сейчас {EVENT_LABELS[savob.current_event] ?? 'праздник'}: Савоб ×{savob.current_multiplier}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {stats.map((s) => (
                <div key={s.label} className={`tile !py-3 ${s.wide ? 'col-span-2' : ''}`}>
                  <p className="text-xs leading-[17px] text-body">{s.label}</p>
                  <p className="text-lg leading-6 font-semibold text-ink tabular whitespace-nowrap">{s.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel flex flex-col gap-2">
            <Link href="/cabinet" className="btn btn-secondary btn-block">
              <IconMosque size={18} />
              Кабинет мечети
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => {
                logout();
                router.replace('/');
              }}
            >
              <IconLogout size={18} />
              Выйти
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
