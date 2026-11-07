'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useState } from 'react';
import { IconClose } from '@/components/icons';
import { ApiError, Campaign, CampaignStatus, Mosque, plural, Report } from '@/lib/api';
import { toDateInput } from '@/lib/cabinet';

export type ModAction = {
  key: string;
  label: string;
  path: string; // например /admin/mosques/:id/approve
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
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary border-[#D5CFC3]',
  danger: 'btn bg-transparent text-[#A3312A] hover:bg-red-50 hover:text-[#8A2721]',
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
  const [error, setError] = useState('');

  if (actions.length === 0 && !extra) return null;

  const run = async (a: ModAction, why = '') => {
    setBusy(true);
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

  return (
    <div className="flex flex-col gap-3">
      {pending ? (
        <form onSubmit={submitReason} className="mod-reason flex flex-col gap-2.5 p-4 sm:p-[18px] rounded-[14px] bg-[#F2F8F6]">
          <label className="text-[15px] font-semibold" htmlFor={id}>
            {pending.reasonLabel ?? 'Причина — её увидит мечеть'}
          </label>
          <textarea
            id={id}
            className="input border-[#B9D3CB] text-[15px] resize-y"
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
              className={`btn h-11 rounded-[10px] px-[18px] ${
                pending.tone === 'danger' ? 'bg-[#A3312A] text-white hover:bg-[#8A2721]' : 'btn-primary'
              }`}
              disabled={busy || !reason.trim()}
            >
              {busy ? 'Сохраняем…' : (pending.confirmLabel ?? pending.label)}
            </button>
            <button
              type="button"
              className="btn btn-ghost h-11 rounded-[10px] px-[18px]"
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
              className={BUTTON[a.tone]}
              disabled={busy}
              onClick={() => (a.needsReason ? setPending(a) : run(a))}
            >
              {a.label}
            </button>
          ))}
          {extra}
        </div>
      )}
      {error && (
        <p className="alert-error text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export type Tab = { value: string; label: string; count?: number | null };

/** Вкладки статусов: ?status=… */
export function StatusTabs({ base, current, tabs }: { base: string; current: string; tabs: Tab[] }) {
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Фильтр по статусу">
      {tabs.map((t) => {
        const active = current === t.value;
        const hasCount = typeof t.count === 'number';
        return (
          <Link
            key={t.value || 'all'}
            href={t.value ? `${base}?status=${t.value}` : base}
            aria-current={active ? 'page' : undefined}
            className="chip h-11 gap-2 font-semibold"
          >
            {t.label}
            {hasCount &&
              (active ? (
                <span className="px-[7px] py-px rounded-full bg-white/20 text-[13px]">{t.count}</span>
              ) : (
                <span>· {t.count}</span>
              ))}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminTitle({ children, sub, aside }: { children: ReactNode; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap justify-between items-end gap-3">
      <div>
        <h1 className="text-[26px] sm:text-[32px] leading-tight font-bold" style={{ letterSpacing: '-0.01em' }}>
          {children}
        </h1>
        {sub && <p className="mt-1 text-[15px] sm:text-base text-muted">{sub}</p>}
      </div>
      {aside}
    </header>
  );
}

export function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  if (!text) return null;
  return (
    <div className="alert-success flex items-center justify-between gap-3 py-1.5 pr-1.5" role="status">
      <span>{text}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть уведомление"
        className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-white/60"
      >
        <IconClose size={18} />
      </button>
    </div>
  );
}

/* ---------- Статусы ---------- */

type Tone = 'ok' | 'wait' | 'bad' | 'neutral';

const TONE: Record<Tone, string> = {
  ok: 'badge badge-success px-3 py-1.5',
  wait: 'badge bg-[#FBF1DC] text-[#7A4B00] px-3 py-1.5',
  bad: 'badge badge-danger px-3 py-1.5',
  neutral: 'badge badge-neutral px-3 py-1.5',
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
  return <span className={`${TONE[status.tone]} self-start`}>{status.label}</span>;
}

/* ---------- Карточка модерации ---------- */

export function ModCard({
  title,
  meta,
  badge,
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  badge: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="bg-white border border-line rounded-[20px] p-5 sm:p-6 flex flex-col gap-[18px] transition-colors has-[.mod-reason]:border-primary-600 has-[.mod-reason]:shadow-[0_0_0_0.5px_#0F5C55]">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[19px] sm:text-[21px] leading-snug font-bold break-words">{title}</h2>
          {meta && <p className="mt-1 text-[15px] text-muted">{meta}</p>}
        </div>
        {badge}
      </div>
      {children}
    </article>
  );
}

export function Description({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-dark-700 whitespace-pre-line break-words">{children}</p>;
}

/** Серый блок «термин — значение». */
export function InfoGrid({ items }: { items: { label: string; value: ReactNode; strong?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 p-4 rounded-[14px] bg-[#F7F5F0]">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[13px] text-muted">{i.label}</dt>
          <dd className={`mt-0.5 break-words ${i.strong ? 'text-base font-bold' : 'text-[15px] font-semibold'}`}>
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DecisionNote({ note, label = 'Решение Комитета' }: { note?: string; label?: string }) {
  if (!note) return null;
  return (
    <p className="px-4 py-3.5 rounded-xl bg-[#F7F5F0] text-sm leading-relaxed text-dark-700 break-words">
      <strong>{label}:</strong> «{note}»
    </p>
  );
}

/* ---------- Состояния списка ---------- */

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Загрузка">
      {[0, 1].map((i) => (
        <div key={i} className="h-48 rounded-[20px] bg-white border border-line animate-pulse" />
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
