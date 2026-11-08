'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconReceipt, IconReport } from '@/components/icons';
import { useAdminStats } from '@/components/admin/AdminStats';
import {
  AdminTitle,
  daysAgo,
  DecisionNote,
  Description,
  ExternalLink,
  FoundLine,
  isPublic,
  ListSkeleton,
  matches,
  ModCard,
  ModerationActions,
  ModerationLayout,
  Notice,
  REPORT_BADGE,
  StatusBadge,
} from '@/components/admin/Moderation';
import { useAdminList } from '@/components/admin/useAdminList';
import { formatDate, formatMoney, Report } from '@/lib/api';
import { canModerate, useAdmin } from '@/lib/adminAuth';

const EMPTY: Record<string, string> = {
  submitted: 'Новых отчётов на проверку нет.',
  approved: 'Принятых отчётов пока нет.',
  rejected: 'Отклонённых отчётов нет.',
  '': 'Мечети ещё не подавали отчётов.',
};

export default function AdminReports() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <List />
    </Suspense>
  );
}

function List() {
  const status = useSearchParams().get('status') ?? 'submitted';
  const { admin } = useAdmin();
  const { stats, refresh } = useAdminStats();
  const { items, total, error, reload, call } = useAdminList<Report>(
    `/admin/reports?limit=100${status ? `&status=${status}` : ''}`,
    'reports',
  );
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const shown = useMemo(
    () =>
      items?.filter((r) =>
        matches(query, r.title, r.campaign?.title, r.campaign?.mosque?.name, r.campaign?.mosque?.city),
      ) ?? null,
    [items, query],
  );

  const tabs = [
    { value: 'submitted', label: 'На проверке', count: stats?.reports_pending },
    { value: 'approved', label: 'Принятые' },
    { value: 'rejected', label: 'Отклонённые' },
    { value: '', label: 'Все' },
  ].map((t) => (t.value === status && items ? { ...t, count: total } : t));

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle
        sub="Поданный отчёт сразу снимает запрет на новые сборы. Если отклонить отчёт, мечеть снова не сможет открывать сборы, пока не подаст исправленный"
        aside={stats ? `${stats.reports_pending} на проверке` : undefined}
      >
        Отчёты мечетей
      </AdminTitle>

      <ModerationLayout
        base="/admin/reports"
        current={status}
        tabs={tabs}
        search={{ value: query, onChange: setQuery, label: 'Поиск отчёта', placeholder: 'Отчёт, сбор или мечеть' }}
      >
        <Notice text={notice} onClose={() => setNotice('')} />
        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}
        {!items && !error && <ListSkeleton />}
        {items && items.length === 0 && (
          <EmptyState icon={<IconReport size={26} />} title="Здесь пусто">
            {EMPTY[status] ?? EMPTY['']}
          </EmptyState>
        )}
        {shown && items && items.length > 0 && (
          <>
            {query.trim() && <FoundLine shown={shown.length} total={items.length} />}
            <ul className="flex flex-col gap-3">
              {shown.map((r) => {
                const diff = r.total_collected - r.total_spent;
                const campaign = r.campaign;
                return (
                  <li key={r.id}>
                    <ModCard
                      icon={<IconReport />}
                      title={r.title}
                      meta={
                        <>
                          {campaign ? `«${campaign.title}»` : 'Кампания'}
                          {campaign?.mosque ? ` · ${campaign.mosque.name}, ${campaign.mosque.city}` : ''} · подан{' '}
                          <time dateTime={r.submitted_at} title={formatDate(r.submitted_at)}>
                            {daysAgo(r.submitted_at)}
                          </time>
                        </>
                      }
                      badge={<StatusBadge status={REPORT_BADGE[r.status]} />}
                    >
                      <Description>{r.description}</Description>

                      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <Total label="Собрано" value={formatMoney(r.total_collected)} />
                        <Total label="Потрачено" value={formatMoney(r.total_spent)} />
                        <Total
                          wide
                          label={diff >= 0 ? 'Остаток' : 'Перерасход'}
                          value={formatMoney(Math.abs(diff))}
                          tone={diff < 0 ? 'text-[#A35A00]' : 'text-sec'}
                        />
                      </dl>

                      {r.expenses.length > 0 && (
                        <section aria-label="Расходы по статьям">
                          <p className="overtitle mb-2">Расходы по статьям</p>
                          <dl className="kv">
                            {r.expenses.map((e, i) => (
                              <div key={i}>
                                <dt className="text-ink min-w-0 break-words">{e.item}</dt>
                                <dd className="font-medium text-ink whitespace-nowrap tabular">{formatMoney(e.cost)}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      )}

                      <section aria-label="Фото подтверждения">
                        <p className="overtitle mb-2">Фото подтверждения</p>
                        {r.photo_urls.length > 0 ? (
                          <ul className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
                            {r.photo_urls.map((url, i) => (
                              <li key={i}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="tile flex items-center gap-3 min-h-[64px] py-2.5 text-ink hover:text-accent-800 hover:bg-[#DDE7E6] transition-colors"
                                >
                                  <span className="w-10 h-10 rounded-xl bg-white text-sec flex items-center justify-center shrink-0">
                                    <IconReceipt size={20} />
                                  </span>
                                  <span className="text-sm leading-5 font-medium">
                                    Фото {i + 1}
                                    <span className="sr-only"> (откроется в новой вкладке)</span>
                                  </span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="body-text">Фото не приложены.</p>
                        )}
                      </section>

                      <DecisionNote note={r.moderation_note} />

                      <ModerationActions
                        actions={
                          r.status === 'submitted' && canModerate(admin)
                            ? [
                                {
                                  key: 'approve',
                                  label: 'Принять отчёт',
                                  path: `/admin/reports/${r.id}/approve`,
                                  tone: 'primary',
                                  done: 'отчёт принят',
                                },
                                {
                                  key: 'reject',
                                  label: 'Отклонить',
                                  path: `/admin/reports/${r.id}/reject`,
                                  tone: 'secondary',
                                  done: 'отчёт отклонён',
                                  needsReason: true,
                                  reasonLabel: 'Что исправить — это увидит мечеть',
                                  confirmLabel: 'Отклонить отчёт',
                                  reasonPlaceholder: 'Например: приложите фото чеков',
                                },
                              ]
                            : []
                        }
                        extra={
                          isPublic(campaign) ? (
                            <ExternalLink href={`/campaigns/${r.campaign_id}`}>Страница сбора</ExternalLink>
                          ) : undefined
                        }
                        call={call}
                        onDone={(done) => {
                          setNotice(`«${r.title}» — ${done}.`);
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

/** Плитка итога как «Даромад / Харҷ» в 9b. */
function Total({ label, value, tone, wide }: { label: string; value: string; tone?: string; wide?: boolean }) {
  return (
    <div className={`tile py-3 min-w-0 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <dt className="text-xs leading-[17px] text-body">{label}</dt>
      <dd className={`text-lg leading-6 font-semibold tabular whitespace-nowrap ${tone ?? 'text-ink'}`}>{value}</dd>
    </div>
  );
}
