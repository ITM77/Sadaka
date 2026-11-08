'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconLandmark } from '@/components/icons';
import { useAdminStats } from '@/components/admin/AdminStats';
import {
  AdminTitle,
  daysAgo,
  DecisionNote,
  Description,
  FoundLine,
  KvGrid,
  ListSkeleton,
  matches,
  ModAction,
  ModCard,
  ModerationActions,
  ModerationLayout,
  MOSQUE_BADGE,
  Notice,
  StatusBadge,
} from '@/components/admin/Moderation';
import MosqueHistory from '@/components/admin/MosqueHistory';
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

const num = new Intl.NumberFormat('ru-RU');

export default function AdminMosques() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <List />
    </Suspense>
  );
}

function List() {
  const params = useSearchParams();
  const status = params.get('status') ?? 'pending';
  const { admin } = useAdmin();
  const { stats, refresh } = useAdminStats();
  const { items, total, error, reload, call } = useAdminList<AdminMosque>(
    `/admin/mosques?limit=100${status ? `&status=${status}` : ''}`,
    'mosques',
  );
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState(params.get('q') ?? ''); // ?q= — переход из журнала

  const shown = useMemo(
    () => items?.filter((m) => matches(query, m.name, m.city, m.address)) ?? null,
    [items, query],
  );

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
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle
        sub="Только одобренные Комитетом мечети могут собирать пожертвования"
        aside={stats ? `${num.format(stats.mosques_approved)} одобрено · ${num.format(stats.mosques_pending)} ждут решения` : undefined}
      >
        Мечети
      </AdminTitle>

      <ModerationLayout
        base="/admin/mosques"
        current={status}
        tabs={tabs}
        search={{ value: query, onChange: setQuery, label: 'Поиск мечети', placeholder: 'Название или город' }}
      >
        <Notice text={notice} onClose={() => setNotice('')} />
        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}
        {!items && !error && <ListSkeleton />}
        {items && items.length === 0 && (
          <EmptyState icon={<IconLandmark size={26} />} title="Здесь пусто">
            {EMPTY[status] ?? EMPTY['']}
          </EmptyState>
        )}
        {shown && items && items.length > 0 && (
          <>
            {query.trim() && <FoundLine shown={shown.length} total={items.length} />}
            <ul className="flex flex-col gap-3">
              {shown.map((m) => (
                <li key={m.id}>
                  <ModCard
                    icon={<IconLandmark />}
                    title={m.name}
                    meta={
                      <>
                        {m.city} · {m.address} · заявка от {formatDate(m.created_at)}, {daysAgo(m.created_at)}
                      </>
                    }
                    badge={<StatusBadge status={MOSQUE_BADGE[m.status]} />}
                  >
                    {m.description && <Description>{m.description}</Description>}
                    <KvGrid
                      items={[
                        { label: 'Имам', value: m.imam_name || 'не указан' },
                        { label: 'Телефон имама', value: m.imam_phone || 'не указан' },
                        { label: 'Телефон мечети', value: m.phone || 'не указан' },
                        {
                          label: 'На карте',
                          value:
                            m.latitude != null && m.longitude != null ? (
                              <span className="tabular">
                                {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                              </span>
                            ) : (
                              'не указано'
                            ),
                        },
                      ]}
                    />
                    <DecisionNote note={m.moderation_note} />
                    <MosqueHistory mosqueId={m.id} />
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
      </ModerationLayout>
    </div>
  );
}
