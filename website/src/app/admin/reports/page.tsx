'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { IconReport } from '@/components/icons';
import { useAdminStats } from '@/components/admin/AdminStats';
import {
  AdminTitle,
  DecisionNote,
  ExternalLink,
  isPublic,
  ListSkeleton,
  matches,
  ModerationActions,
  Notice,
  REPORT_BADGE,
  StatusBadge,
} from '@/components/admin/Moderation';
import { Facts, PanelBlock, PhotoLinks, QueueLayout, useSorted } from '@/components/admin/Queue';
import { useAdminList } from '@/components/admin/useAdminList';
import { Report } from '@/lib/api';
import { canModerate, useAdmin } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';

const EMPTY: Record<string, string> = {
  submitted: 'Новых отчётов на проверку нет.',
  approved: 'Принятых отчётов пока нет.',
  rejected: 'Отклонённых отчётов нет.',
  '': 'Мечети ещё не подавали отчётов.',
};

const OVER = 'text-[#B42318]';

export default function AdminReports() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Queue />
    </Suspense>
  );
}

function Queue() {
  const params = useSearchParams();
  const status = params.get('status') ?? 'submitted';
  const { admin } = useAdmin();
  const { t, fmt } = useI18n();
  const { stats, refresh } = useAdminStats();
  const { items, total, error, reload, call } = useAdminList<Report>(
    `/admin/reports?limit=100${status ? `&status=${status}` : ''}`,
    'reports',
  );
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<'old' | 'new'>(status === 'submitted' ? 'old' : 'new');
  const queue = status === 'submitted';

  const filtered = useMemo(
    () =>
      items?.filter((r) => matches(query, r.title, r.campaign?.title, r.campaign?.mosque?.name, r.campaign?.mosque?.city)) ?? null,
    [items, query],
  );
  const rows = useSorted(filtered, (r) => r.submitted_at, sort);

  const tabs = [
    { value: 'submitted', label: 'На проверке', count: stats?.reports_pending },
    { value: 'rejected', label: 'Отклонённые' },
    { value: 'approved', label: 'Принятые' },
    { value: '', label: 'Все' },
  ].map((t) => (t.value === status && items ? { ...t, count: total } : t));

  const where = (r: Report) =>
    `${r.campaign?.mosque?.name ?? t('Мечеть')}${r.campaign?.mosque?.city ? ` · ${r.campaign.mosque.city}` : ''}`;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle
        over={t(queue ? 'Очередь проверки' : 'Реестр')}
        sub={t('Поданный отчёт сразу снимает запрет на новые сборы. Если отклонить отчёт, мечеть снова не сможет открывать сборы, пока не подаст исправленный')}
        aside={stats ? t('{n} на проверке', { n: stats.reports_pending }) : undefined}
      >
        {t(queue ? 'Отчёты на проверке' : 'Отчёты')}
      </AdminTitle>

      <QueueLayout<Report>
        base="/admin/reports"
        current={status}
        tabs={tabs}
        items={rows}
        error={error}
        caption={queue ? 'Отчёты на проверке' : 'Отчёты'}
        sort={sort}
        onSort={setSort}
        search={{ value: query, onChange: setQuery, label: 'Поиск отчёта', placeholder: 'Сбор или мечеть' }}
        empty={{ icon: <IconReport size={26} />, text: EMPTY[status] ?? EMPTY[''] }}
        notice={<Notice text={notice} onClose={() => setNotice('')} />}
        columns={[
          {
            key: 'title',
            label: 'Отчёт по сбору',
            cell: (r) => (
              <>
                <span className="block font-medium truncate">{r.campaign?.title ?? r.title}</span>
                <span className="block caption truncate">
                  {where(r)} · {fmt.daysAgo(r.submitted_at)}
                </span>
              </>
            ),
          },
          { key: 'in', label: 'Собрано', width: 'w-[115px]', align: 'right', wide: true, cell: (r) => fmt.money(r.total_collected) },
          { key: 'out', label: 'Потрачено', width: 'w-[115px]', align: 'right', wide: true, cell: (r) => fmt.money(r.total_spent) },
          {
            key: 'diff',
            label: 'Остаток',
            width: 'w-[105px]',
            align: 'right',
            cell: (r) => {
              const d = r.total_collected - r.total_spent;
              return <span className={d < 0 ? `${OVER} font-medium` : ''}>{d < 0 ? '−' : ''}{fmt.money(Math.abs(d))}</span>;
            },
          },
          { key: 'status', label: 'Статус', width: 'w-[120px]', cell: (r) => <StatusBadge status={REPORT_BADGE[r.status]} /> },
        ]}
        card={(r) => {
          const d = r.total_collected - r.total_spent;
          return {
            title: r.campaign?.title ?? r.title,
            badge: <StatusBadge status={REPORT_BADGE[r.status]} />,
            meta: `${where(r)} · ${t('подан {when}', { when: fmt.daysAgo(r.submitted_at) })}`,
            extra: (
              <span className="text-[13px] leading-[18px] tabular text-body">
                {t('собрано {in} · потрачено {out}', { in: fmt.money(r.total_collected), out: fmt.money(r.total_spent) })}
                {d < 0 && <span className={`${OVER} font-medium`}> · {t('перерасход {sum}', { sum: fmt.money(-d) })}</span>}
              </span>
            ),
          };
        }}
        panel={(r, pos, n) => ({
          over: t('Отчёт · {pos} из {n}', { pos, n }),
          title: r.campaign?.title ?? r.title,
          badge: <StatusBadge status={REPORT_BADGE[r.status]} />,
          meta: `${where(r)} · ${t('подан {date}, {ago}', { date: fmt.date(r.submitted_at), ago: fmt.daysAgo(r.submitted_at) })}`,
          body: <ReportPanel r={r} />,
          footer: (
            <ModerationActions
              actions={
                r.status === 'submitted' && canModerate(admin)
                  ? [
                      { key: 'approve', label: 'Принять отчёт', path: `/admin/reports/${r.id}/approve`, tone: 'primary', done: 'отчёт принят' },
                      {
                        key: 'reject',
                        label: 'Отклонить',
                        path: `/admin/reports/${r.id}/reject`,
                        tone: 'secondary',
                        done: 'отчёт отклонён',
                        needsReason: true,
                        reasonLabel: 'Что исправить — это увидит мечеть',
                        confirmLabel: 'Отклонить отчёт',
                        reasonPlaceholder: 'Например: приложите фото чека на «Кровельные работы»',
                      },
                    ]
                  : []
              }
              extra={isPublic(r.campaign) ? <ExternalLink href={`/campaigns/${r.campaign_id}`}>{t('Страница сбора')}</ExternalLink> : undefined}
              call={call}
              onDone={(done) => {
                setNotice(`«${r.campaign?.title ?? r.title}» — ${t(done)}.`);
                reload();
                refresh();
              }}
            />
          ),
        })}
      />
    </div>
  );
}

function ReportPanel({ r }: { r: Report }) {
  const d = r.total_collected - r.total_spent;
  const sum = r.expenses.reduce((s, e) => s + e.cost, 0);
  const { t, fmt } = useI18n();
  return (
    <>
      <Facts
        items={[
          { label: 'Собрано', value: <span className="tabular">{fmt.money(r.total_collected)}</span>, sub: 'по данным сбора' },
          { label: 'Потрачено', value: <span className="tabular">{fmt.money(r.total_spent)}</span>, sub: 'сумма статей' },
          {
            label: 'Остаток',
            value: (
              <span className="tabular">
                {d < 0 ? '−' : ''}
                {fmt.money(Math.abs(d))}
              </span>
            ),
            sub: d < 0 ? 'перерасход' : d === 0 ? 'потрачено всё' : 'не потрачено',
            tone: d < 0 ? OVER : 'text-sec',
          },
        ]}
      />
      {d < 0 && (
        <p className="text-[13px] leading-[18px] text-ink bg-[#FDF0DC] rounded-tile px-3.5 py-3">
          {t('Потрачено больше, чем собрано. Уточните у мечети, откуда дополнительные деньги, — это должно быть в пояснении.')}
        </p>
      )}
      <PanelBlock title={t('Пояснение мечети')}>
        <p className="text-[13px] leading-[18px] font-medium text-ink">{r.title}</p>
        <p className="body-text whitespace-pre-line break-words">{r.description}</p>
      </PanelBlock>
      {r.expenses.length > 0 && (
        <PanelBlock title={t('Расходы по статьям')}>
          <table className="w-full text-sm leading-5 text-ink border-separate border-spacing-0">
            <caption className="sr-only">{t('Расходы по статьям отчёта')}</caption>
            <thead>
              <tr>
                <th scope="col" className="h-9 px-3 bg-app rounded-l-[12px] text-left text-[11px] font-medium uppercase tracking-[.04em] text-sec">
                  {t('Статья')}
                </th>
                <th scope="col" className="h-9 px-3 bg-app rounded-r-[12px] text-right text-[11px] font-medium uppercase tracking-[.04em] text-sec">
                  {t('Сумма')}
                </th>
              </tr>
            </thead>
            <tbody>
              {r.expenses.map((e, i) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 border-b border-line break-words">{e.item}</td>
                  <td className="px-3 py-2.5 border-b border-line text-right tabular whitespace-nowrap">{fmt.money(e.cost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="px-3 pt-2.5 text-left font-semibold">
                  {t('Итого')}
                </th>
                <td className="px-3 pt-2.5 text-right tabular font-semibold whitespace-nowrap">{fmt.money(sum)}</td>
              </tr>
            </tfoot>
          </table>
        </PanelBlock>
      )}
      <PanelBlock title={`${t('Фото подтверждения')} · ${r.photo_urls.length}`}>
        <PhotoLinks urls={r.photo_urls} />
      </PanelBlock>
      <DecisionNote note={r.moderation_note} />
    </>
  );
}
