'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconReport } from '@/components/icons';
import { useAdminStats } from '@/components/admin/AdminStats';
import {
  AdminTitle,
  daysAgo,
  DecisionNote,
  Description,
  isPublic,
  ListSkeleton,
  ModCard,
  ModerationActions,
  Notice,
  REPORT_BADGE,
  StatusBadge,
  StatusTabs,
} from '@/components/admin/Moderation';
import { useAdminList } from '@/components/admin/useAdminList';
import { formatDate, formatTJS, Report } from '@/lib/api';
import { canModerate, useAdmin } from '@/lib/adminAuth';

const EMPTY: Record<string, string> = {
  submitted: 'Новых отчётов на проверку нет.',
  approved: 'Принятых отчётов пока нет.',
  rejected: 'Отклонённых отчётов нет.',
  '': 'Мечети ещё не подавали отчётов.',
};

const PHOTO_TONES = [
  'bg-mint text-primary-600',
  'bg-sand text-brass-700',
  'bg-[#E4ECF1] text-[#1B4D63]',
];

function IconReceipt({ size = 28 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </svg>
  );
}

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

  const tabs = [
    { value: 'submitted', label: 'На проверке', count: stats?.reports_pending },
    { value: 'approved', label: 'Принятые' },
    { value: 'rejected', label: 'Отклонённые' },
    { value: '', label: 'Все' },
  ].map((t) => (t.value === status && items ? { ...t, count: total } : t));

  return (
    <div className="flex flex-col gap-6">
      <AdminTitle sub="Пока отчёт не принят или отклонён, мечеть не может открывать новые сборы">
        Отчёты мечетей
      </AdminTitle>
      <StatusTabs base="/admin/reports" current={status} tabs={tabs} />
      <Notice text={notice} onClose={() => setNotice('')} />
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      {!items && !error && <ListSkeleton />}
      {items && items.length === 0 && (
        <EmptyState icon={<IconReport size={28} />} title="Здесь пусто">
          {EMPTY[status] ?? EMPTY['']}
        </EmptyState>
      )}
      {items && items.length > 0 && (
        <ul className="flex flex-col gap-4">
          {items.map((r) => {
            const diff = r.total_collected - r.total_spent;
            const campaign = r.campaign;
            return (
              <li key={r.id}>
                <ModCard
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

                  <div className="flex flex-wrap gap-5 items-start">
                    {r.expenses.length > 0 && (
                      <div className="flex-[3_1_420px] min-w-0">
                        <table className="w-full border-collapse text-[15px]">
                          <caption className="sr-only">Расходы по статьям</caption>
                          <thead>
                            <tr className="text-left text-muted text-[13px]">
                              <th scope="col" className="py-2 font-semibold">
                                Статья
                              </th>
                              <th scope="col" className="py-2 pl-3 font-semibold text-right">
                                Сумма
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.expenses.map((e, i) => (
                              <tr key={i} className="border-t border-[#EEEAE2]">
                                <td className="py-3 pr-3 break-words">{e.item}</td>
                                <td className="py-3 text-right font-semibold whitespace-nowrap">{formatTJS(e.cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <dl className="flex-[1_1_220px] min-w-0 p-[18px] rounded-2xl bg-[#F7F5F0] flex flex-col gap-2.5 text-[15px]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted">Собрано</dt>
                        <dd className="font-semibold text-right">{formatTJS(r.total_collected)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted">Потрачено</dt>
                        <dd className="font-semibold text-right">{formatTJS(r.total_spent)}</dd>
                      </div>
                      <div className="flex justify-between gap-2 pt-2.5 border-t border-line">
                        <dt className="font-semibold">{diff >= 0 ? 'Остаток' : 'Перерасход'}</dt>
                        <dd className={`font-bold text-right ${diff < 0 ? 'text-[#9A5B00]' : 'text-primary-700'}`}>
                          {formatTJS(Math.abs(diff))}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-base font-bold mb-2.5">Фото подтверждения</h3>
                    {r.photo_urls.length > 0 ? (
                      <ul className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                        {r.photo_urls.map((url, i) => (
                          <li key={i}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="group flex flex-col gap-1.5 text-ink hover:text-primary-700 rounded-[14px]"
                            >
                              <span
                                className={`h-24 sm:h-28 rounded-[14px] flex items-center justify-center transition-shadow group-hover:shadow-md ${
                                  PHOTO_TONES[i % PHOTO_TONES.length]
                                }`}
                              >
                                <IconReceipt />
                              </span>
                              <span className="text-[13px]">
                                Фото {i + 1}
                                <span className="sr-only"> (откроется в новой вкладке)</span>
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">Фото не приложены.</p>
                    )}
                  </div>

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
                        <Link
                          href={`/campaigns/${r.campaign_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center h-12 px-4 text-[15px] font-semibold text-primary-600 hover:text-primary-700 rounded-xl"
                        >
                          Страница сбора
                          <span className="sr-only"> (откроется в новой вкладке)</span>
                        </Link>
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
      )}
    </div>
  );
}
