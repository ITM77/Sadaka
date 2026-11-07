import Link from 'next/link';
import { cloneElement, isValidElement, ReactElement, ReactNode } from 'react';
import { IconCheck, IconInfo } from '@/components/icons';
import { Campaign, Mosque, Report } from '@/lib/api';
import { CAMPAIGN_STATUS, MOSQUE_STATUS, REPORT_STATUS } from '@/lib/cabinet';

/** Единые цвета статусов кабинета: ok — лазурит, wait — латунь, bad — красный, neutral — бумага. */
export const TONE_BADGE = {
  ok: 'badge badge-success',
  wait: 'badge badge-warning',
  bad: 'badge badge-danger',
  neutral: 'badge badge-neutral',
} as const;
export type Tone = keyof typeof TONE_BADGE;

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={TONE_BADGE[tone]}>
      {tone === 'ok' && <IconCheck size={14} strokeWidth={2.25} />}
      {children}
    </span>
  );
}

export function MosqueStatusBadge({ status }: { status: Mosque['status'] }) {
  const st = MOSQUE_STATUS[status];
  return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>;
}

export function CampaignStatusBadge({ campaign, ended }: { campaign: Campaign; ended?: boolean }) {
  if (ended) return <StatusBadge tone="wait">Срок истёк</StatusBadge>;
  const st = CAMPAIGN_STATUS[campaign.status];
  return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>;
}

export function ReportStatusBadge({ status }: { status: Report['status'] }) {
  const st = REPORT_STATUS[status];
  return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>;
}

type Crumb = { href: string; label: string };

/** Каркас страниц кабинета: хлебные крошки, заголовок, действия. */
export function CabinetPage({
  title,
  eyebrow,
  description,
  crumbs,
  current,
  actions,
  wide,
  children,
}: {
  title: ReactNode;
  eyebrow?: string;
  description?: ReactNode;
  crumbs?: Crumb[];
  /** Последняя (текущая) крошка без ссылки */
  current?: string;
  actions?: ReactNode;
  /** Формы с боковой колонкой — 1120 px, остальное — 1040 px */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`container-custom ${wide ? 'max-w-[1120px]' : 'max-w-[1040px]'} pt-6 pb-16 sm:pt-10 sm:pb-24`}>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Навигация по кабинету" className="mb-4 sm:mb-5">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {crumbs.map((c) => (
              <li key={c.href} className="flex items-center gap-2 min-w-0">
                <Link href={c.href} className="text-primary-600 hover:text-primary-700 truncate max-w-[60vw] py-1">
                  {c.label}
                </Link>
                <span aria-hidden="true">/</span>
              </li>
            ))}
            {current && (
              <li aria-current="page" className="truncate max-w-[60vw]">
                {current}
              </li>
            )}
          </ol>
        </nav>
      )}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h1 className="text-[28px] leading-tight sm:text-[40px] font-bold break-words" style={{ letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {description && <p className="mt-2 text-base sm:text-[17px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Alert({
  tone = 'error',
  title,
  action,
  children,
}: {
  tone?: 'error' | 'warn' | 'info' | 'success';
  title?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const cls = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warn: 'bg-[#FBF1DC] border-[#EBD3A2] text-[#5C3B00]',
    info: 'bg-mint border-primary-200 text-primary-800',
    success: 'bg-mint border-primary-200 text-primary-800',
  }[tone];
  return (
    <div
      className={`flex flex-wrap items-start sm:items-center gap-3 sm:gap-3.5 rounded-[18px] border px-4 py-4 sm:px-5 ${cls}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <IconInfo size={22} className="shrink-0 mt-px sm:mt-0" />
      <div className="flex-1 basis-[240px] min-w-0 text-[15px] leading-normal">
        {title && <strong className="font-semibold">{title} </strong>}
        {children}
      </div>
      {action}
    </div>
  );
}

/** Подпись + поле + подсказка; подсказка привязывается к полю через aria-describedby. */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const control =
    hintId && isValidElement(children)
      ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': hintId })
      : children;
  return (
    <div>
      <label htmlFor={id} className="label text-[15px]">
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="mt-2 text-[13px] text-muted flex items-center gap-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Белая карточка-секция формы. */
export function FormCard({ title, description, children, as = 'section' }: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  as?: 'section' | 'fieldset';
}) {
  const body = (
    <>
      {title &&
        (as === 'fieldset' ? (
          <legend className="float-left w-full p-0 mb-1 text-xl font-bold">{title}</legend>
        ) : (
          <h2 className="text-xl font-bold mb-1">{title}</h2>
        ))}
      {description && <p className="clear-both -mt-1 text-sm text-muted">{description}</p>}
      <div className="clear-both flex flex-col gap-[18px]">{children}</div>
    </>
  );
  const cls = 'min-w-0 m-0 bg-white border border-line rounded-[20px] sm:rounded-[22px] p-5 sm:p-7 flex flex-col gap-[18px]';
  return as === 'fieldset' ? <fieldset className={cls}>{body}</fieldset> : <section className={cls}>{body}</section>;
}

export function Loading() {
  return <div className="h-40 rounded-[20px] bg-dark-100 animate-pulse" aria-busy="true" aria-label="Загрузка" />;
}
