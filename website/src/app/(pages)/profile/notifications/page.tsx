'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import RequireAuth from '@/components/cabinet/RequireAuth';
import EmptyState from '@/components/EmptyState';
import { IconArrowLeft, IconBell, IconCheck } from '@/components/icons';
import { NotificationRow } from '@/components/NotificationBell';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/client';
import {
  dayLabel,
  emitNotificationsChanged,
  fetchNotifications,
  markNotificationsRead,
  Notification,
  timeOf,
} from '@/lib/notifications';

const PAGE = 20;

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsList />
    </RequireAuth>
  );
}

function NotificationsList() {
  const { token } = useAuth();
  const { t, fmt } = useI18n();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (offset: number) => {
      if (!token) return;
      setError('');
      if (offset > 0) setLoadingMore(true);
      try {
        const r = await fetchNotifications(token, PAGE, offset);
        setItems((prev) => {
          if (offset === 0 || !prev) return r.notifications;
          // Пока листали, могли прийти новые — убираем повторы
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...r.notifications.filter((x) => !seen.has(x.id))];
        });
        setUnread(r.unread);
        setHasMore(r.notifications.length === PAGE);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Не удалось загрузить уведомления');
      } finally {
        setLoadingMore(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  // Группы по дням: «Сегодня», «Вчера», «9 ноября»
  const groups = useMemo(() => {
    const out: { label: string; items: Notification[] }[] = [];
    for (const n of items ?? []) {
      const label = dayLabel(n.created_at, fmt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(n);
      else out.push({ label, items: [n] });
    }
    return out;
  }, [items, fmt]);

  const openItem = (n: Notification) => {
    if (n.read_at || !token) return;
    const now = new Date().toISOString();
    setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)) ?? null);
    setUnread((u) => Math.max(0, u - 1));
    markNotificationsRead(token, [n.id])
      .then(() => emitNotificationsChanged())
      .catch(() => {
        /* не страшно: останется непрочитанным */
      });
  };

  const markAll = () => {
    if (!token) return;
    const now = new Date().toISOString();
    setItems((list) => list?.map((x) => (x.read_at ? x : { ...x, read_at: now })) ?? null);
    setUnread(0);
    markNotificationsRead(token)
      .then(() => emitNotificationsChanged(0))
      .catch(() => load(0));
  };

  return (
    <div className="page">
      <div className="max-w-[720px] mx-auto flex flex-col gap-3 md:gap-4">
        <Link href="/profile" className="link-action inline-flex items-center gap-1.5 min-h-[44px] self-start px-1">
          <IconArrowLeft size={18} />
          {t('Мои добрые дела')}
        </Link>

        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between px-1">
          <div className="min-w-0">
            <h1 className="title">{t('Уведомления')}</h1>
            {items !== null && items.length > 0 && (
              <p className="caption mt-0.5" aria-live="polite">
                {unread > 0 ? t('Непрочитанных: {n}', { n: unread }) : t('Все прочитаны')}
              </p>
            )}
          </div>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="btn btn-white btn-sm min-h-[44px] self-start sm:self-auto">
              <IconCheck size={18} />
              {t('Отметить все прочитанными')}
            </button>
          )}
        </header>

        {error && (
          <div className="alert-error flex flex-wrap items-center justify-between gap-2" role="alert">
            <span>{t(error)}</span>
            <button type="button" onClick={() => load(items?.length ?? 0)} className="font-semibold underline min-h-[44px]">
              {t('Попробовать снова')}
            </button>
          </div>
        )}

        {items === null ? (
          error ? null : (
            <div className="panel flex flex-col gap-2" aria-busy="true">
              <div className="skeleton h-16" />
              <div className="skeleton h-16" />
              <div className="skeleton h-16" />
            </div>
          )
        ) : items.length === 0 ? (
          <EmptyState icon={<IconBell size={24} />} title={t('Пока нет уведомлений')}>
            {t('Здесь появятся решения Комитета улемов по вашим заявкам и новости о сборах, которые вы поддержали.')}
          </EmptyState>
        ) : (
          <section className="panel !px-2 md:!px-3 flex flex-col gap-3" aria-label={t('Уведомления')}>
            {groups.map((g, i) => (
              <div key={`${g.label}-${i}`}>
                <h2 className="overtitle px-2.5 pt-1 pb-1.5">{g.label}</h2>
                <ul className="flex flex-col gap-1">
                  {g.items.map((n) => (
                    <NotificationRow key={n.id} n={n} meta={timeOf(n.created_at)} onOpen={openItem} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {items !== null && hasMore && (
          <button
            type="button"
            onClick={() => load(items.length)}
            disabled={loadingMore}
            className="btn btn-white btn-block"
          >
            {loadingMore ? t('Загружаем…') : t('Показать ещё')}
          </button>
        )}
      </div>
    </div>
  );
}
