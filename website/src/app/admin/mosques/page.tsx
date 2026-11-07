'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconMosque, IconSearch } from '@/components/icons';
import { useAdminStats } from '@/components/admin/AdminStats';
import {
  AdminTitle,
  daysAgo,
  DecisionNote,
  Description,
  InfoGrid,
  ListSkeleton,
  ModAction,
  ModCard,
  ModerationActions,
  MOSQUE_BADGE,
  Notice,
  StatusBadge,
  StatusTabs,
} from '@/components/admin/Moderation';
import { useAdminList } from '@/components/admin/useAdminList';
import { formatDate, Mosque } from '@/lib/api';
import { canBlock, canModerate, useAdmin } from '@/lib/adminAuth';

type AdminMosque = Mosque & { created_at: string; owner_id: string };

const EMPTY: Record<string, string> = {
  pending: 'Новых заявок нет — все мечети рассмотрены.',
  approved: 'Одобренных мечетей пока нет.',
  rejected: 'Отклонённых заявок нет.',
  blocked: 'Заблокированных мечетей нет.',
  '': 'Мечети ещё не подавали заявок.',
};

export default function AdminMosques() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <List />
    </Suspense>
  );
}

function List() {
  const status = useSearchParams().get('status') ?? 'pending';
  const { admin } = useAdmin();
  const { stats, refresh } = useAdminStats();
  const { items, total, error, reload, call } = useAdminList<AdminMosque>(
    `/admin/mosques?limit=100${status ? `&status=${status}` : ''}`,
    'mosques',
  );
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!items || !q) return items;
    return items.filter((m) => `${m.name} ${m.city} ${m.address}`.toLowerCase().includes(q));
  }, [items, query]);

  const tabs = [
    { value: 'pending', label: 'Заявки', count: stats?.mosques_pending },
    { value: 'approved', label: 'Одобренные', count: stats?.mosques_approved },
    { value: 'rejected', label: 'Отклонённые' },
    { value: 'blocked', label: 'Заблокированные', count: stats?.mosques_blocked },
    { value: '', label: 'Все' },
  ].map((t) => (t.value === status && items ? { ...t, count: total } : t));

  const actionsFor = (m: AdminMosque): ModAction[] => {
    const base = `/admin/mosques/${m.id}`;
    const list: ModAction[] = [];
    if (canModerate(admin) && m.status === 'pending') {
      list.push({ key: 'approve', label: 'Одобрить', path: `${base}/approve`, tone: 'primary', done: 'заявка одобрена' });
      list.push({
        key: 'reject',
        label: 'Отклонить',
        path: `${base}/reject`,
        tone: 'secondary',
        done: 'заявка отклонена',
        needsReason: true,
        reasonLabel: 'Причина отказа — её увидит мечеть',
        confirmLabel: 'Отклонить заявку',
        reasonPlaceholder: 'Например: не подтверждён адрес мечети',
      });
    }
    if (canBlock(admin) && (m.status === 'approved' || m.status === 'pending')) {
      list.push({
        key: 'block',
        label: 'Заблокировать',
        path: `${base}/block`,
        tone: 'danger',
        done: 'мечеть заблокирована',
        needsReason: true,
        reasonLabel: 'Причина блокировки — её увидит мечеть. Пожертвования сразу перестанут приниматься.',
        confirmLabel: 'Заблокировать мечеть',
        reasonPlaceholder: 'Нарушение: …',
      });
    }
    if (canBlock(admin) && m.status === 'blocked') {
      list.push({ key: 'unblock', label: 'Разблокировать', path: `${base}/unblock`, tone: 'secondary', done: 'мечеть разблокирована' });
    }
    return list;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminTitle sub="Только одобренные Комитетом мечети могут собирать пожертвования">Мечети</AdminTitle>

      <div className="flex flex-wrap justify-between items-center gap-3">
        <StatusTabs base="/admin/mosques" current={status} tabs={tabs} />
        <label className="flex items-center gap-2 h-11 px-3.5 rounded-[10px] bg-white border border-line w-full sm:w-[280px] focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-600/15">
          <IconSearch size={18} className="text-muted shrink-0" />
          <span className="sr-only">Поиск мечети</span>
          <input
            type="search"
            placeholder="Название или город"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 h-full border-0 p-0 bg-transparent text-[15px] focus:ring-0 focus:outline-none focus-visible:outline-none placeholder:text-dark-400"
          />
        </label>
      </div>

      <Notice text={notice} onClose={() => setNotice('')} />
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      {!items && !error && <ListSkeleton />}
      {items && items.length === 0 && (
        <EmptyState icon={<IconMosque size={28} />} title="Здесь пусто">
          {EMPTY[status] ?? EMPTY['']}
        </EmptyState>
      )}
      {shown && items && items.length > 0 && (
        <>
          {query.trim() && (
            <p className="text-sm text-muted" role="status">
              Найдено: {shown.length} из {items.length}
            </p>
          )}
          <ul className="flex flex-col gap-4">
            {shown.map((m) => (
              <li key={m.id}>
                <ModCard
                  title={m.name}
                  meta={
                    <>
                      {m.city} · {m.address} · заявка от {formatDate(m.created_at)}, {daysAgo(m.created_at)}
                    </>
                  }
                  badge={<StatusBadge status={MOSQUE_BADGE[m.status]} />}
                >
                  {m.description && <Description>{m.description}</Description>}
                  <InfoGrid
                    items={[
                      { label: 'Имам', value: m.imam_name || 'не указан' },
                      { label: 'Телефон имама', value: m.imam_phone || 'не указан' },
                      { label: 'Телефон мечети', value: m.phone || 'не указан' },
                      {
                        label: 'На карте',
                        value:
                          m.latitude != null && m.longitude != null
                            ? `${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}`
                            : 'не указано',
                      },
                    ]}
                  />
                  <DecisionNote note={m.moderation_note} />
                  <ModerationActions
                    actions={actionsFor(m)}
                    call={call}
                    onDone={(done) => {
                      setNotice(`«${m.name}» — ${done}.`);
                      reload();
                      refresh();
                    }}
                  />
                </ModCard>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
