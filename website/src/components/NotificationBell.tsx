'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FocusEvent, ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/client';
import {
  describeNotification,
  emitNotificationsChanged,
  fetchNotifications,
  fetchUnread,
  markNotificationsRead,
  Notification,
  NOTIFY_EVENT,
  Tone,
  whenLabel,
} from '@/lib/notifications';
import { IconBell, IconHandHeart, IconMosque, IconReport, IconSparkles } from './icons';

const POLL_MS = 60_000;
const PREVIEW = 6;

const TONE_CLS: Record<Tone, string> = {
  good: 'bg-ok-soft text-ok',
  bad: 'bg-[#FDECEC] text-[#B42318]',
  info: 'bg-sec-soft text-sec',
};

/** Иконка уведомления: форма — по предмету (мечеть, сбор, отчёт, Савоб), цвет — по тону. */
export function NotificationIcon({ kind, tone }: { kind: string; tone: Tone }) {
  const Icon = kind === 'savob_event'
    ? IconSparkles
    : kind.startsWith('report')
      ? IconReport
      : kind.startsWith('mosque')
        ? IconMosque
        : IconHandHeart;
  return (
    <span aria-hidden="true" className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TONE_CLS[tone]}`}>
      <Icon size={18} />
    </span>
  );
}

/** Строка уведомления — общая для выпадающего списка и страницы «Уведомления». */
export function NotificationRow({
  n,
  meta,
  compact = false,
  onOpen,
}: {
  n: Notification;
  meta: ReactNode;
  compact?: boolean;
  onOpen: (n: Notification) => void;
}) {
  const { t } = useI18n();
  const view = describeNotification(n, t);
  const unread = !n.read_at;
  return (
    <li>
      <Link
        href={view.href}
        onClick={() => onOpen(n)}
        className={`flex items-start gap-3 rounded-xl px-2.5 py-2.5 min-h-[60px] text-ink hover:text-ink transition-colors ${
          unread ? 'bg-accent-50 hover:bg-accent-100' : 'hover:bg-app'
        }`}
      >
        <NotificationIcon kind={n.kind} tone={view.tone} />
        <span className="flex-1 min-w-0">
          <span className={`block text-sm leading-5 break-words ${unread ? 'font-semibold' : 'font-medium'}`}>
            {view.title}
          </span>
          {view.body && (
            <span className={`block body-text mt-0.5 break-words ${compact ? 'line-clamp-2' : ''}`}>{view.body}</span>
          )}
          <span className="block caption mt-1">{meta}</span>
        </span>
        {unread && (
          <>
            <span aria-hidden="true" className="mt-1.5 w-2 h-2 rounded-full bg-accent-500 shrink-0" />
            <span className="sr-only">{t('Новое')}</span>
          </>
        )}
      </Link>
    </li>
  );
}

/**
 * Колокольчик в шапке. Только для вошедших.
 * Телефон и планшет — ссылка на /profile/notifications, веб (lg+) — кнопка с выпадающим списком.
 */
export default function NotificationBell() {
  const { user, token, ready } = useAuth();
  const { t, fmt } = useI18n();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const refresh = useCallback(() => {
    if (!token) return;
    fetchUnread(token)
      .then(setUnread)
      .catch(() => {
        /* счётчик не критичен — попробуем при следующем опросе */
      });
  }, [token]);

  // Счётчик: при входе и при смене страницы
  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  // Опрос раз в минуту, пока вкладка видна; сигналы со страницы «Уведомления»
  useEffect(() => {
    if (!token) return;
    const tick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onChange = (e: Event) => {
      const n = (e as CustomEvent<number | undefined>).detail;
      if (typeof n === 'number') setUnread(n);
      else refresh();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener(NOTIFY_EVENT, onChange);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener(NOTIFY_EVENT, onChange);
    };
  }, [token, refresh]);

  // Выход из аккаунта — сбрасываем
  useEffect(() => {
    if (!token) {
      setUnread(0);
      setItems(null);
      setOpen(false);
    }
  }, [token]);

  // Переход на другую страницу закрывает список
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Открыли — загружаем последние уведомления
  useEffect(() => {
    if (!open || !token) return;
    let alive = true;
    setFailed(false);
    fetchNotifications(token, PREVIEW)
      .then((r) => {
        if (!alive) return;
        setItems(r.notifications);
        setUnread(r.unread);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [open, token]);

  // Escape и клик снаружи закрывают; фокус — в панель
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  // Фокус ушёл из колокольчика (Tab) — закрываем
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && !rootRef.current?.contains(next)) setOpen(false);
  };

  const openItem = (n: Notification) => {
    if (!n.read_at && token) {
      const now = new Date().toISOString();
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)) ?? null);
      setUnread((u) => Math.max(0, u - 1));
      markNotificationsRead(token, [n.id])
        .then(() => emitNotificationsChanged())
        .catch(refresh);
    }
    setOpen(false);
  };

  const markAll = () => {
    if (!token) return;
    const now = new Date().toISOString();
    setItems((list) => list?.map((x) => (x.read_at ? x : { ...x, read_at: now })) ?? null);
    setUnread(0);
    panelRef.current?.focus(); // кнопка исчезнет — не теряем фокус
    markNotificationsRead(token)
      .then(() => emitNotificationsChanged(0))
      .catch(refresh);
  };

  if (!ready || !user) return null;

  const label = unread > 0 ? t('Уведомления, непрочитанных: {n}', { n: unread }) : t('Уведомления');
  const badge = unread > 0 && (
    <span
      aria-hidden="true"
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-ink text-[11px] leading-[18px] font-semibold text-center tabular ring-2 ring-white"
    >
      {unread > 9 ? '9+' : unread}
    </span>
  );

  return (
    <>
      {/* Телефон и планшет: сразу на страницу уведомлений */}
      <Link
        href="/profile/notifications"
        aria-label={label}
        aria-current={pathname === '/profile/notifications' ? 'page' : undefined}
        className="lg:hidden btn-icon relative hover:text-ink"
      >
        <IconBell />
        {badge}
      </Link>

      {/* Веб: выпадающий список */}
      <div ref={rootRef} className="relative hidden lg:block" onBlur={onBlur}>
        <button
          ref={btnRef}
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-haspopup="dialog"
          onClick={() => setOpen((o) => !o)}
          className={`btn-icon relative ${open ? '!bg-accent-100 text-accent-700' : ''}`}
        >
          <IconBell />
          {badge}
        </button>

        {open && (
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={t('Уведомления')}
            tabIndex={-1}
            className="absolute right-0 top-full mt-2 z-50 w-[380px] max-w-[calc(100vw-32px)] bg-white rounded-tile p-2 outline-none ring-1 ring-dark-200/50 shadow-[0_16px_40px_-12px_rgba(20,24,30,0.28)] animate-fade-in"
          >
            <div className="flex items-center justify-between gap-2 pl-2.5 pr-1 min-h-[44px]">
              <h2 className="title-sm">{t('Уведомления')}</h2>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="link-action min-h-[36px] px-1.5 rounded-lg">
                  {t('Отметить все прочитанными')}
                </button>
              )}
            </div>

            <div className="max-h-[min(440px,calc(100vh-180px))] overflow-y-auto overscroll-contain">
              {items === null ? (
                failed ? (
                  <p className="body-text px-2.5 py-6 text-center">{t('Не удалось загрузить уведомления')}</p>
                ) : (
                  <div className="flex flex-col gap-1.5 p-1" aria-busy="true">
                    <div className="skeleton h-14" />
                    <div className="skeleton h-14" />
                    <div className="skeleton h-14" />
                  </div>
                )
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                  <span className="icon-round">
                    <IconBell />
                  </span>
                  <p className="title-sm">{t('Пока нет уведомлений')}</p>
                  <p className="caption">{t('Здесь появятся решения Комитета улемов и новости о сборах, которые вы поддержали.')}</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {items.map((n) => (
                    <NotificationRow key={n.id} n={n} compact meta={whenLabel(n.created_at, fmt)} onOpen={openItem} />
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-line mt-1.5 pt-1.5">
              <Link
                href="/profile/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center min-h-[44px] rounded-xl link-action hover:bg-app"
              >
                {t('Все уведомления')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
