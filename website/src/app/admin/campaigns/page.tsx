'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import ProgressBar from '@/components/ProgressBar';
import { IconHandHeart } from '@/components/icons';
import { useAdminStats } from '@/components/admin/AdminStats';
import {
  AdminTitle,
  CAMPAIGN_BADGE,
  DecisionNote,
  Description,
  ExternalLink,
  FoundLine,
  isPublic,
  KvGrid,
  ListSkeleton,
  matches,
  ModCard,
  ModerationActions,
  ModerationLayout,
  Notice,
  StatusBadge,
} from '@/components/admin/Moderation';
import { useAdminList } from '@/components/admin/useAdminList';
import { Campaign, CATEGORY_LABELS, formatDate, formatMoney, lastDay, plural, progress } from '@/lib/api';
import { canModerate, useAdmin } from '@/lib/adminAuth';

const EMPTY: Record<string, string> = {
  pending_approval: 'Новых кампаний на одобрение нет.',
  active: 'Сейчас не идёт ни одного сбора.',
  completed: 'Завершённых кампаний пока нет.',
  rejected: 'Отклонённых кампаний нет.',
  '': 'Мечети ещё не создавали кампаний.',
};

const num = new Intl.NumberFormat('ru-RU');

export default function AdminCampaigns() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <List />
    </Suspense>
  );
}

function List() {
  const params = useSearchParams();
  const status = params.get('status') ?? 'pending_approval';
  const { admin } = useAdmin();
  const { stats, refresh } = useAdminStats();
  const { items, total, error, reload, call } = useAdminList<Campaign>(
    `/admin/campaigns?limit=100${status ? `&status=${status}` : ''}`,
    'campaigns',
  );
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState(params.get('q') ?? ''); // ?q= — переход из журнала

  const shown = useMemo(
    () => items?.filter((c) => matches(query, c.title, c.mosque?.name, c.mosque?.city)) ?? null,
    [items, query],
  );

  const tabs = [
    { value: 'pending_approval', label: 'На одобрении', count: stats?.campaigns_pending },
    { value: 'active', label: 'Идут', count: stats?.campaigns_active },
    { value: 'completed', label: 'Завершённые' },
    { value: 'rejected', label: 'Отклонённые' },
    { value: '', label: 'Все' },
  ].map((t) => (t.value === status && items ? { ...t, count: total } : t));

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle
        sub="Сбор открывается только после одобрения Комитетом"
        aside={
          stats
            ? `${num.format(stats.campaigns_active)} идут · ${num.format(stats.campaigns_pending)} ждут решения`
            : undefined
        }
      >
        Кампании
      </AdminTitle>

      <ModerationLayout
        base="/admin/campaigns"
        current={status}
        tabs={tabs}
        search={{ value: query, onChange: setQuery, label: 'Поиск кампании', placeholder: 'Название или мечеть' }}
      >
        <Notice text={notice} onClose={() => setNotice('')} />
        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}
        {!items && !error && <ListSkeleton />}
        {items && items.length === 0 && (
          <EmptyState icon={<IconHandHeart size={26} />} title="Здесь пусто">
            {EMPTY[status] ?? EMPTY['']}
          </EmptyState>
        )}
        {shown && items && items.length > 0 && (
          <>
            {query.trim() && <FoundLine shown={shown.length} total={items.length} />}
            <ul className="flex flex-col gap-3">
              {shown.map((c) => {
                const pending = c.status === 'pending_approval' && canModerate(admin);
                const collected = c.status === 'active' || c.status === 'completed';
                const pct = progress(c);
                return (
                  <li key={c.id}>
                    <ModCard
                      icon={<IconHandHeart />}
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
                      <KvGrid
                        items={[
                          { label: 'Цель', value: <span className="tabular">{formatMoney(c.goal_amount)}</span> },
                          { label: 'Срок', value: `${formatDate(c.start_date)} — ${lastDay(c.end_date)}` },
                        ]}
                      />
                      {collected && (
                        <div className="tile flex flex-col gap-2">
                          <p className="overtitle">Собрано</p>
                          <ProgressBar value={pct} onTile />
                          <div className="flex flex-wrap justify-between gap-x-3 text-[13px] leading-[18px] font-medium text-ink tabular">
                            <span className="whitespace-nowrap">
                              {formatMoney(c.current_amount)} · {pct}%
                            </span>
                            <span className="font-normal text-body whitespace-nowrap">
                              {num.format(c.donation_count)}{' '}
                              {plural(c.donation_count, ['пожертвование', 'пожертвования', 'пожертвований'])}
                            </span>
                          </div>
                        </div>
                      )}
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
                          isPublic(c) ? <ExternalLink href={`/campaigns/${c.id}`}>Публичная страница</ExternalLink> : undefined
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
          </>
        )}
      </ModerationLayout>
    </div>
  );
}
