'use client';

import Link from 'next/link';
import { cloneElement, isValidElement, ReactElement, ReactNode, useEffect, useRef } from 'react';
import { IconAlert, IconCheck, IconCheckCircle, IconInfo } from '@/components/icons';
import { Campaign, Mosque, Report } from '@/lib/api';
import { CAMPAIGN_STATUS, MOSQUE_STATUS, REPORT_STATUS, TONE_CLASS } from '@/lib/cabinet';

/** Единые цвета статусов кабинета: ok — зелёный, wait — янтарный, bad — красный, neutral — серый. */
export const TONE_BADGE = TONE_CLASS;
export type Tone = keyof typeof TONE_BADGE;

/** Пилюля статуса 24px. onTile — для плитки #E9F1F0: нейтральная метка становится белой. */
export function StatusBadge({ tone, onTile, children }: { tone: Tone; onTile?: boolean; children: ReactNode }) {
  return (
    <span className={`${TONE_BADGE[tone]} ${onTile && tone === 'neutral' ? '!bg-white' : ''}`}>
      {tone === 'ok' && <IconCheck size={14} strokeWidth={2.25} />}
      {children}
    </span>
  );
}

export function MosqueStatusBadge({ status, onTile }: { status: Mosque['status']; onTile?: boolean }) {
  const st = MOSQUE_STATUS[status];
  return (
    <StatusBadge tone={st.tone} onTile={onTile}>
      {st.label}
    </StatusBadge>
  );
}

export function CampaignStatusBadge({ campaign, ended, onTile }: { campaign: Campaign; ended?: boolean; onTile?: boolean }) {
  if (ended)
    return (
      <StatusBadge tone="wait" onTile={onTile}>
        Срок истёк
      </StatusBadge>
    );
  const st = CAMPAIGN_STATUS[campaign.status];
  return (
    <StatusBadge tone={st.tone} onTile={onTile}>
      {st.label}
    </StatusBadge>
  );
}

export function ReportStatusBadge({ status, onTile }: { status: Report['status']; onTile?: boolean }) {
  const st = REPORT_STATUS[status];
  return (
    <StatusBadge tone={st.tone} onTile={onTile}>
      {st.label}
    </StatusBadge>
  );
}

type Crumb = { href: string; label: string };

/** Хлебные крошки кабинета: подпись 13/18, ссылки — #B34A12. */
export function Crumbs({ crumbs, current }: { crumbs: Crumb[]; current?: string }) {
  return (
    <nav aria-label="Навигация по кабинету">
      <ol className="flex flex-wrap items-center gap-x-1.5 text-[13px] leading-[18px] text-muted">
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-1.5 min-w-0">
            <Link
              href={c.href}
              className="inline-flex items-center min-h-[44px] -my-2.5 font-medium truncate max-w-[60vw]"
            >
              {c.label}
            </Link>
            <span aria-hidden="true">·</span>
          </li>
        ))}
        {current && (
          <li aria-current="page" className="truncate max-w-[60vw]">
            {current}
          </li>
        )}
      </ol>
    </nav>
  );
}

/** Каркас страниц кабинета: крошки, заголовок 24/30 на фоне приложения, действия справа. */
export function CabinetPage({
  title,
  eyebrow,
  description,
  crumbs,
  current,
  actions,
  children,
}: {
  title: ReactNode;
  eyebrow?: string;
  description?: ReactNode;
  crumbs?: Crumb[];
  /** Последняя (текущая) крошка без ссылки */
  current?: string;
  actions?: ReactNode;
  /** Оставлено для совместимости: ширина у всех страниц кабинета одна — 1176 px */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="page flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between px-1">
        <div className="min-w-0 flex flex-col gap-1.5">
          {crumbs && crumbs.length > 0 && <Crumbs crumbs={crumbs} current={current} />}
          {eyebrow && <p className="overtitle">{eyebrow}</p>}
          <h1 className="title break-words">{title}</h1>
          {description && <p className="body-text max-w-[680px]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

/** Сообщение: error — красное, warn — янтарное, info — sec, success — зелёное. */
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
  const box = {
    error: 'bg-[#FDECEC]',
    warn: 'bg-[#FDF0DC]',
    info: 'bg-sec-soft',
    success: 'bg-ok-soft',
  }[tone];
  const ic = {
    error: 'text-[#B42318]',
    warn: 'text-[#A35A00]',
    info: 'text-sec',
    success: 'text-ok',
  }[tone];
  const Icon = tone === 'success' ? IconCheckCircle : tone === 'info' ? IconInfo : IconAlert;
  return (
    <div
      className={`flex flex-wrap items-start gap-x-2.5 gap-y-3 rounded-tile px-3.5 py-3 ${box}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon size={18} className={`shrink-0 mt-px ${ic}`} />
      <div className="flex-1 basis-[220px] min-w-0 text-sm leading-5 text-ink">
        {title && <strong className="font-semibold">{title} </strong>}
        {children}
      </div>
      {action && <div className="basis-full sm:basis-auto">{action}</div>}
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
    <div className="min-w-0">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="hint flex items-center gap-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Белая панель-секция формы: overtitle-заголовок, подпись, поля. */
export function FormCard({
  title,
  description,
  children,
  as = 'section',
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  as?: 'section' | 'fieldset';
}) {
  const body = (
    <>
      {title &&
        (as === 'fieldset' ? (
          <legend className="overtitle float-left w-full p-0">{title}</legend>
        ) : (
          <h2 className="overtitle">{title}</h2>
        ))}
      {description && <p className="caption clear-both mt-1">{description}</p>}
      <div className={`clear-both flex flex-col gap-4 ${title || description ? 'mt-3.5' : ''}`}>{children}</div>
    </>
  );
  const cls = 'panel min-w-0 m-0 border-0';
  return as === 'fieldset' ? <fieldset className={cls}>{body}</fieldset> : <section className={cls}>{body}</section>;
}

/**
 * Главное действие формы. На телефоне — закреплённая белая полоса снизу (поверх таб-бара, как в макете),
 * с md — обычная кнопка в потоке.
 */
export function StickyAction({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] md:static md:z-auto md:bg-transparent md:p-0">
      {children}
    </div>
  );
}

/**
 * Ошибка формы. Кнопка отправки на телефоне закреплена внизу, поэтому сообщение
 * само прокручивается в зону видимости, где бы ни находился пользователь.
 */
export function FormError({ children }: { children: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [children]);
  return (
    <div ref={ref}>
      <Alert>{children}</Alert>
    </div>
  );
}

export function Loading() {
  return <div className="skeleton h-40 !rounded-card" aria-busy="true" aria-label="Загрузка" />;
}
