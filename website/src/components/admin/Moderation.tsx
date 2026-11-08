'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useState } from 'react';
import { IconAlert, IconCheck, IconClose, IconInfo, IconSearch } from '@/components/icons';
import { ApiError, Campaign, CampaignStatus, Mosque, plural, Report } from '@/lib/api';
import { toDateInput } from '@/lib/cabinet';

export type ModAction = {
  key: string;
  label: string;
  path: string; // например /admin/mosques/:id/approve
  /** primary — одобрение (зелёная «ok»-кнопка: оранжевых на экране не больше двух), danger — блокировка. */
  tone: 'primary' | 'danger' | 'secondary';
  done: string; // текст результата: «заявка одобрена»
  needsReason?: boolean;
  reasonPlaceholder?: string;
  /** Подпись поля причины, по умолчанию «Причина — её увидит мечеть». */
  reasonLabel?: string;
  /** Текст кнопки подтверждения в форме причины, по умолчанию label. */
  confirmLabel?: string;
};

const BUTTON = {
  primary: 'btn bg-ok-soft text-ok hover:bg-[#D3EDDE] hover:text-ok',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger',
} as const;

/** Кнопки модерации. Для отказа и блокировки сначала просит причину — это и есть подтверждение. */
export function ModerationActions({
  actions,
  call,
  onDone,
  extra,
}: {
  actions: ModAction[];
  call: <T>(path: string, opts?: { method?: string; body?: unknown }) => Promise<T>;
  onDone: (message: string) => void;
  /** Дополнительные ссылки в ряду кнопок (например, публичная страница). */
  extra?: ReactNode;
}) {
  const [pending, setPending] = useState<ModAction | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState('');
  const [error, setError] = useState('');

  if (actions.length === 0 && !extra) return null;

  const run = async (a: ModAction, why = '') => {
    setBusy(true);
    setRunning(a.key);
    setError('');
    try {
      await call(a.path, { method: 'POST', body: why ? { reason: why } : {} });
      setPending(null);
      setReason('');
      onDone(a.done);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось выполнить действие');
    } finally {
      setBusy(false);
    }
  };

  const submitReason = (e: FormEvent) => {
    e.preventDefault();
    if (pending && reason.trim()) run(pending, reason.trim());
  };

  const id = pending ? `reason-${pending.path.replace(/[^a-z0-9]/gi, '-')}` : '';
  const danger = pending?.tone === 'danger';

  return (
    <div className="flex flex-col gap-3">
      {pending ? (
        <form
          onSubmit={submitReason}
          className={`infobox flex-col items-stretch gap-3 p-3.5 md:p-4 ${danger ? 'bg-[#FDECEC]' : ''}`}
        >
          <div className="flex gap-2.5 items-start">
            <span className={`shrink-0 mt-px ${danger ? 'text-[#B42318]' : 'text-sec'}`}>
              {danger ? <IconAlert size={18} /> : <IconInfo size={18} />}
            </span>
            <label className="text-sm leading-5 font-medium text-ink" htmlFor={id}>
              {pending.reasonLabel ?? 'Причина — её увидит мечеть'}
            </label>
          </div>
          <textarea
            id={id}
            className="input input-white resize-y min-h-[88px]"
            rows={2}
            autoFocus
            required
            placeholder={pending.reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={`btn flex-1 sm:flex-none ${danger ? 'bg-[#B42318] text-white hover:bg-[#931B12] hover:text-white' : 'btn-white'}`}
              disabled={busy || !reason.trim()}
            >
              {busy ? 'Сохраняем…' : (pending.confirmLabel ?? pending.label)}
            </button>
            <button
              type="button"
              className="btn bg-transparent text-ink hover:bg-white/60 hover:text-ink flex-1 sm:flex-none"
              onClick={() => {
                setPending(null);
                setError('');
              }}
              disabled={busy}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              className={`${BUTTON[a.tone]} flex-1 sm:flex-none`}
              disabled={busy}
              onClick={() => (a.needsReason ? setPending(a) : run(a))}
            >
              {a.tone === 'primary' && <IconCheck size={18} />}
              {busy && running === a.key ? 'Сохраняем…' : a.label}
            </button>
          ))}
          {extra}
        </div>
      )}
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Ссылка на публичную страницу в ряду действий. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost px-4 flex-1 sm:flex-none">
      {children}
      <span className="sr-only"> (откроется в новой вкладке)</span>
      <span aria-hidden="true">↗</span>
    </Link>
  );
}

export type Tab = { value: string; label: string; count?: number | null };

/**
 * Список модерации как в 9d: слева колонка 268px с поиском и фильтром статуса (?status=…),
 * справа — карточки. На телефоне фильтр — строка чипов над списком.
 */
export function ModerationLayout({
  base,
  current,
  tabs,
  search,
  children,
}: {
  base: string;
  current: string;
  tabs: Tab[];
  search?: { value: string; onChange: (v: string) => void; label: string; placeholder: string };
  children: ReactNode;
}) {
  const href = (t: Tab) => (t.value ? `${base}?status=${t.value}` : base);
  const labelId = `status-${base.replace(/\W+/g, '-')}`;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:gap-4 lg:grid-cols-[268px_minmax(0,1fr)] lg:items-start">
      <aside className="panel min-w-0 flex flex-col gap-4 lg:gap-[18px] lg:sticky lg:top-20">
        {search && (
          <label className="input flex items-center gap-2.5 text-muted cursor-text focus-within:border-accent-700">
            <IconSearch size={18} className="shrink-0" />
            <span className="sr-only">{search.label}</span>
            <input
              type="search"
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="flex-1 min-w-0 h-full border-0 p-0 bg-transparent text-base text-ink focus:ring-0 focus:outline-none focus-visible:outline-none"
            />
          </label>
        )}
        <div>
          <p className="overtitle" id={labelId}>
            Статус
          </p>
          {/* Телефон и планшет: чипы с горизонтальной прокруткой */}
          <nav
            aria-labelledby={labelId}
            className="lg:hidden flex gap-1.5 mt-2 -mx-4 md:-mx-5 px-4 md:px-5 overflow-x-auto [scrollbar-width:none]"
          >
            {tabs.map((t) => {
              const active = current === t.value;
              return (
                <Link
                  key={t.value || 'all'}
                  href={href(t)}
                  aria-current={active ? 'page' : undefined}
                  className="chip min-h-[44px] shrink-0"
                >
                  {t.label}
                  {typeof t.count === 'number' && (
                    <span className={`tabular ${active ? '' : 'text-muted'}`}>{t.count}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          {/* Веб: строки с отметкой и счётчиком */}
          <nav aria-labelledby={labelId} className="hidden lg:flex flex-col mt-2">
            {tabs.map((t) => {
              const active = current === t.value;
              return (
                <Link
                  key={t.value || 'all'}
                  href={href(t)}
                  aria-current={active ? 'page' : undefined}
                  className="min-h-[44px] flex items-center gap-2.5 text-ink hover:text-accent-700 group"
                >
                  <span
                    aria-hidden="true"
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-ink ${
                      active ? 'bg-accent-500' : 'bg-app group-hover:bg-accent-100'
                    }`}
                  >
                    {active && <IconCheck size={14} strokeWidth={2.25} />}
                  </span>
                  <span className={`flex-1 text-sm leading-5 font-medium ${active ? 'text-accent-700' : ''}`}>
                    {t.label}
                  </span>
                  {typeof t.count === 'number' && <span className="caption tabular">{t.count}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="flex flex-col gap-3 min-w-0">{children}</div>
    </div>
  );
}

/** Заголовок страницы: title 24/30, подзаголовок и сводка справа (как в 9d). */
export function AdminTitle({ children, sub, aside }: { children: ReactNode; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap justify-between items-end gap-x-6 gap-y-1.5">
      <div className="min-w-0">
        <h1 className="title">{children}</h1>
        {sub && <p className="body-text mt-1.5 max-w-[640px]">{sub}</p>}
      </div>
      {aside && <p className="body-text tabular">{aside}</p>}
    </header>
  );
}

export function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  if (!text) return null;
  return (
    <div className="alert-success flex items-center justify-between gap-3 py-1 pr-1" role="status">
      <span className="flex items-center gap-2 min-w-0">
        <IconCheck size={18} className="shrink-0" />
        <span className="min-w-0 break-words">{text}</span>
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть уведомление"
        className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full hover:bg-white/60"
      >
        <IconClose size={18} />
      </button>
    </div>
  );
}

/** Строка «Найдено: N из M» при поиске. */
export function FoundLine({ shown, total }: { shown: number; total: number }) {
  return (
    <p className="caption px-1" role="status">
      Найдено: {shown} из {total}
    </p>
  );
}

/* ---------- Статусы ---------- */

type Tone = 'ok' | 'wait' | 'bad' | 'neutral';

const TONE: Record<Tone, string> = {
  ok: 'badge badge-success',
  wait: 'badge badge-warning',
  bad: 'badge badge-danger',
  neutral: 'badge badge-neutral',
};

export const MOSQUE_BADGE: Record<Mosque['status'], { label: string; tone: Tone }> = {
  pending: { label: 'На рассмотрении', tone: 'wait' },
  approved: { label: 'Одобрена', tone: 'ok' },
  rejected: { label: 'Отклонена', tone: 'bad' },
  blocked: { label: 'Заблокирована', tone: 'bad' },
};

export const CAMPAIGN_BADGE: Record<CampaignStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  pending_approval: { label: 'На одобрении', tone: 'wait' },
  active: { label: 'Идёт сбор', tone: 'ok' },
  rejected: { label: 'Отклонена', tone: 'bad' },
  completed: { label: 'Завершена', tone: 'neutral' },
};

export const REPORT_BADGE: Record<Report['status'], { label: string; tone: Tone }> = {
  submitted: { label: 'На проверке', tone: 'wait' },
  approved: { label: 'Принят', tone: 'ok' },
  rejected: { label: 'Отклонён', tone: 'bad' },
};

export function StatusBadge({ status }: { status: { label: string; tone: Tone } }) {
  return <span className={`${TONE[status.tone]} shrink-0`}>{status.label}</span>;
}

/* ---------- Карточка модерации ---------- */

export function ModCard({
  icon,
  title,
  meta,
  badge,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  badge: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="panel flex flex-col gap-4">
      <div className="flex items-start gap-3">
        {icon && <span className="icon-tile hidden sm:flex">{icon}</span>}
        <div className="min-w-0 flex-1 sm:pt-0.5">
          <h2 className="title-sm break-words">{title}</h2>
          {meta && <p className="caption mt-0.5 break-words">{meta}</p>}
        </div>
        {badge}
      </div>
      {children}
    </article>
  );
}

export function Description({ children }: { children: ReactNode }) {
  return <p className="body-text whitespace-pre-line break-words">{children}</p>;
}

type KvItem = { label: string; value: ReactNode };

/** Строки «ключ — значение» на плитке; на вебе — в две колонки. */
export function KvGrid({ items }: { items: KvItem[] }) {
  const half = Math.ceil(items.length / 2);
  const cols = items.length > 2 ? [items.slice(0, half), items.slice(half)] : [items];
  return (
    <div className={cols.length > 1 ? 'grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2' : ''}>
      {cols.map((col, i) => (
        <dl key={i} className="kv">
          {col.map((it) => (
            <div key={it.label}>
              <dt className="text-body shrink-0">{it.label}</dt>
              <dd className="font-medium text-ink text-right min-w-0 break-words">{it.value}</dd>
            </div>
          ))}
        </dl>
      ))}
    </div>
  );
}

export function DecisionNote({ note, label = 'Решение Комитета' }: { note?: string; label?: string }) {
  if (!note) return null;
  return (
    <div className="tile">
      <p className="overtitle">{label}</p>
      <p className="mt-1 text-sm leading-5 text-ink break-words">«{note}»</p>
    </div>
  );
}

/* ---------- Состояния списка ---------- */

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Загрузка">
      {[0, 1].map((i) => (
        <div key={i} className="panel flex flex-col gap-4">
          <div className="skeleton h-5 w-2/3" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-24 rounded-tile" />
          <div className="skeleton h-12 w-40 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** «сегодня», «вчера», «3 дня назад» — по календарю Душанбе. */
export function daysAgo(iso: string) {
  const days = Math.round((Date.parse(toDateInput(new Date().toISOString())) - Date.parse(toDateInput(iso))) / 86_400_000);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  return `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`;
}

export const isPublic = (c?: Pick<Campaign, 'status'>) => c?.status === 'active' || c?.status === 'completed';

/** Поиск без учёта регистра по склеенной строке полей. */
export function matches(q: string, ...fields: (string | undefined | null)[]) {
  const s = q.trim().toLowerCase();
  return !s || fields.filter(Boolean).join(' ').toLowerCase().includes(s);
}
