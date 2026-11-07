'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import ProgressBar from '@/components/ProgressBar';
import { IconCalendar } from '@/components/icons';
import { useAdminStats } from '@/components/admin/AdminStats';
import {
  AdminTitle,
  CAMPAIGN_BADGE,
  DecisionNote,
  Description,
  InfoGrid,
  isPublic,
  ListSkeleton,
  ModCard,
  ModerationActions,
  Notice,
  StatusBadge,
  StatusTabs,
} from '@/components/admin/Moderation';
import { useAdminList } from '@/components/admin/useAdminList';
import { Campaign, CATEGORY_LABELS, formatDate, formatTJS, lastDay, progress } from '@/lib/api';
import { canModerate, useAdmin } from '@/lib/adminAuth';

const EMPTY: Record<string, string> = {
  pending_approval: 'Новых кампаний на одобрение нет.',
  active: 'Сейчас не идёт ни одного сбора.',
  completed: 'Завершённых кампаний пока нет.',
  rejected: 'Отклонённых кампаний нет.',
  '': 'Мечети ещё не создавали кампаний.',
};

export default function AdminCampaigns() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <List />
    </Suspense>
  );
}

function List() {
  const status = useSearchParams().get('status') ?? 'pending_approval';
  const { admin } = useAdmin();
  const { stats, refresh } = useAdminStats();
  const { items, total, error, reload, call } = useAdminList<Campaign>(
    `/admin/campaigns?limit=100${status ? `&status=${status}` : ''}`,
    'campaigns',
  );
  const [notice, setNotice] = useState('');

  const tabs = [
    { value: 'pending_approval', label: 'На одобрении', count: stats?.campaigns_pending },
    { value: 'active', label: 'Идут', count: stats?.campaigns_active },
    { value: 'completed', label: 'Завершённые' },
    { value: 'rejected', label: 'Отклонённые' },
    { value: '', label: 'Все' },
  ].map((t) => (t.value === status && items ? { ...t, count: total } : t));

  return (
    <div className="flex flex-col gap-6">
      <AdminTitle sub="Сбор открывается только после одобрения Комитетом">Кампании</AdminTitle>
      <StatusTabs base="/admin/campaigns" current={status} tabs={tabs} />
      <Notice text={notice} onClose={() => setNotice('')} />
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      {!items && !error && <ListSkeleton />}
      {items && items.length === 0 && (
        <EmptyState icon={<IconCalendar size={28} />} title="Здесь пусто">
          {EMPTY[status] ?? EMPTY['']}
        </EmptyState>
      )}
      {items && items.length > 0 && (
        <ul className="flex flex-col gap-4">
          {items.map((c) => {
            const pending = c.status === 'pending_approval' && canModerate(admin);
            const collected = c.status === 'active' || c.status === 'completed';
            return (
              <li key={c.id}>
                <ModCard
                  title={c.title}
                  meta={
                    <>
                      {c.mosque?.name ?? '—'}
                      {c.mosque?.city ? `, ${c.mosque.city}` : ''} · {CATEGORY_LABELS[c.category] ?? c.category}
                    </>
                  }
                  badge={<StatusBadge status={CAMPAIGN_BADGE[c.status]} />}
                >
                  <Description>{c.description}</Description>
                  <InfoGrid
                    items={[
                      { label: 'Цель', value: formatTJS(c.goal_amount), strong: true },
                      { label: 'Срок', value: `${formatDate(c.start_date)} — ${lastDay(c.end_date)}` },
                      ...(collected
                        ? [
                            {
                              label: `Собрано · ${c.donation_count} пожертв.`,
                              value: (
                                <span className="flex flex-col gap-2">
                                  {formatTJS(c.current_amount)}
                                  <ProgressBar value={progress(c)} />
                                </span>
                              ),
                            },
                          ]
                        : []),
                    ]}
                  />
                  <DecisionNote note={c.moderation_note} />
                  <ModerationActions
                    actions={
                      pending
                        ? [
                            {
                              key: 'approve',
                              label: 'Одобрить и запустить',
                              path: `/admin/campaigns/${c.id}/approve`,
                              tone: 'primary',
                              done: 'сбор одобрен и запущен',
                            },
                            {
                              key: 'reject',
                              label: 'Отклонить',
                              path: `/admin/campaigns/${c.id}/reject`,
                              tone: 'secondary',
                              done: 'сбор отклонён',
                              needsReason: true,
                              reasonLabel: 'Причина отказа — её увидит мечеть',
                              confirmLabel: 'Отклонить кампанию',
                              reasonPlaceholder: 'Например: уточните смету ремонта',
                            },
                          ]
                        : []
                    }
                    extra={
                      isPublic(c) ? (
                        <Link
                          href={`/campaigns/${c.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center h-12 px-4 text-[15px] font-semibold text-primary-600 hover:text-primary-700 rounded-xl"
                        >
                          Публичная страница
                          <span className="sr-only"> (откроется в новой вкладке)</span>
                          <span aria-hidden="true" className="ml-1">↗</span>
                        </Link>
                      ) : undefined
                    }
                    call={call}
                    onDone={(done) => {
                      setNotice(`«${c.title}» — ${done}.`);
                      reload();
                      refresh();
                    }}
                  />
                </ModCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
