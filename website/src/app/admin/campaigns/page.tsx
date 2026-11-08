'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import ProgressBar from '@/components/ProgressBar';
import { IconAlert, IconHandHeart } from '@/components/icons';
import { useAdminStats } from '@/components/admin/AdminStats';
import {
  AdminTitle,
  CAMPAIGN_BADGE,
  DecisionNote,
  ExternalLink,
  isPublic,
  ListSkeleton,
  matches,
  ModAction,
  ModerationActions,
  Notice,
  REPORT_BADGE,
  StatusBadge,
} from '@/components/admin/Moderation';
import { Facts, PanelBlock, QueueLayout, useSorted } from '@/components/admin/Queue';
import { useAdminList } from '@/components/admin/useAdminList';
import { ApiError, Campaign, CATEGORY_LABELS, progress, Report } from '@/lib/api';
import { canModerate, useAdmin } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';

type AdminCampaign = Campaign & { created_at: string; updated_at: string; mosque_unreported: number };

const EMPTY: Record<string, string> = {
  pending_approval: 'Новых сборов на одобрение нет.',
  active: 'Сейчас не идёт ни одного сбора.',
  completed: 'Завершённых сборов пока нет.',
  rejected: 'Отклонённых сборов нет.',
  '': 'Мечети ещё не создавали сборов.',
};


export default function AdminCampaigns() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Queue />
    </Suspense>
  );
}

function Queue() {
  const params = useSearchParams();
  const status = params.get('status') ?? 'pending_approval';
  const { admin } = useAdmin();
  const { t, fmt } = useI18n();
  const { stats, refresh } = useAdminStats();
  const { items, total, error, reload, call } = useAdminList<AdminCampaign>(
    `/admin/campaigns?limit=100${status ? `&status=${status}` : ''}`,
    'campaigns',
  );
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<'old' | 'new'>(status === 'pending_approval' ? 'old' : 'new');

  const filtered = useMemo(
    () => items?.filter((c) => matches(query, c.title, c.mosque?.name, c.mosque?.city)) ?? null,
    [items, query],
  );
  const rows = useSorted(filtered, (c) => c.updated_at, sort);
  const queue = status === 'pending_approval';

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
        over={t(queue ? 'Очередь проверки' : 'Реестр')}
        sub={t('Сбор открывается только после одобрения Комитетом. Нет отчёта — нет нового сбора.')}
        aside={
          stats
            ? t('{active} идут · {pending} ждут решения', { active: fmt.number(stats.campaigns_active), pending: fmt.number(stats.campaigns_pending) })
            : undefined
        }
      >
        {t(queue ? 'Сборы на одобрении' : 'Сборы')}
      </AdminTitle>

      <QueueLayout<AdminCampaign>
        base="/admin/campaigns"
        current={status}
        tabs={tabs}
        items={rows}
        error={error}
        caption={queue ? 'Сборы на одобрении' : 'Сборы'}
        sort={sort}
        onSort={setSort}
        search={{ value: query, onChange: setQuery, label: 'Поиск сбора', placeholder: 'Сбор, мечеть, город' }}
        empty={{ icon: <IconHandHeart size={26} />, text: EMPTY[status] ?? EMPTY[''] }}
        notice={<Notice text={notice} onClose={() => setNotice('')} />}
        columns={[
          {
            key: 'title',
            label: 'Сбор',
            cell: (c) => (
              <>
                <span className="block font-medium truncate">{c.title}</span>
                <span className="block caption truncate">
                  {c.mosque?.name ?? '—'}
                  {c.mosque?.city ? ` · ${c.mosque.city}` : ''}
                </span>
              </>
            ),
          },
          { key: 'goal', label: 'Цель', width: 'w-[100px]', align: 'right', cell: (c) => fmt.money(c.goal_amount) },
          { key: 'sent', label: queue ? 'Отправлен' : 'Изменён', width: 'w-[110px]', wide: true, cell: (c) => <span className="text-[13px] tabular">{fmt.daysAgo(c.updated_at)}</span> },
          { key: 'reports', label: 'Отчёты мечети', width: 'w-[110px]', cell: (c) => <ReportsState n={c.mosque_unreported} /> },
          { key: 'status', label: 'Статус', width: 'w-[110px]', cell: (c) => <StatusBadge status={CAMPAIGN_BADGE[c.status]} /> },
        ]}
        card={(c) => ({
          title: c.title,
          badge: <StatusBadge status={CAMPAIGN_BADGE[c.status]} />,
          meta: `${c.mosque?.name ?? '—'}${c.mosque?.city ? ` · ${c.mosque.city}` : ''} · ${t('цель {sum}', { sum: fmt.money(c.goal_amount) })} · ${fmt.daysAgo(c.updated_at)}`,
          extra: c.mosque_unreported > 0 ? <ReportsState n={c.mosque_unreported} /> : undefined,
        })}
        panel={(c, pos, n) => {
          const blocked = c.status === 'pending_approval' && (c.mosque_unreported > 0 || (c.mosque && c.mosque.status !== 'approved'));
          const actions: ModAction[] =
            c.status === 'pending_approval' && canModerate(admin)
              ? [
                  ...(blocked
                    ? []
                    : [{ key: 'approve', label: 'Одобрить и запустить', path: `/admin/campaigns/${c.id}/approve`, tone: 'primary' as const, done: 'сбор одобрен и запущен' }]),
                  {
                    key: 'reject',
                    label: 'Отклонить',
                    path: `/admin/campaigns/${c.id}/reject`,
                    tone: 'secondary',
                    done: 'сбор отклонён',
                    needsReason: true,
                    reasonLabel: 'Причина отказа — её увидит мечеть',
                    confirmLabel: 'Отклонить сбор',
                    reasonPlaceholder: blocked ? 'Например: сначала опубликуйте отчёт по прошлому сбору' : 'Например: уточните смету ремонта',
                  },
                ]
              : [];
          return {
            over: t('Сбор · {pos} из {n}', { pos, n }),
            title: c.title,
            badge: <StatusBadge status={CAMPAIGN_BADGE[c.status]} />,
            meta: `${c.mosque?.name ?? '—'}${c.mosque?.city ? ` · ${c.mosque.city}` : ''} · ${t(queue ? 'отправлен {date}, {ago}' : 'изменён {date}, {ago}', { date: fmt.date(c.updated_at), ago: fmt.daysAgo(c.updated_at) })}`,
            body: <CampaignPanel c={c} />,
            footer: (
              <>
                {blocked && (
                  <div className="flex gap-2.5 items-start rounded-tile px-3.5 py-3 bg-[#FDECEC] text-[13px] leading-[18px]" role="note">
                    <IconAlert size={18} className="shrink-0 mt-px text-[#B42318]" />
                    <span className="text-ink">
                      <b className="block font-semibold text-[#B42318]">
                        {t(c.mosque_unreported > 0 ? 'Одобрить нельзя: у мечети есть завершённый сбор без отчёта' : 'Одобрить нельзя: мечеть не одобрена или заблокирована')}
                      </b>
                      {t('Отклоните с причиной или оставьте сбор в очереди до отчёта.')}
                    </span>
                  </div>
                )}
                <ModerationActions
                  actions={actions}
                  extra={isPublic(c) ? <ExternalLink href={`/campaigns/${c.id}`}>{t('Публичная страница')}</ExternalLink> : undefined}
                  call={call}
                  onDone={(done) => {
                    setNotice(`«${c.title}» — ${t(done)}.`);
                    reload();
                    refresh();
                  }}
                />
              </>
            ),
          };
        }}
      />
    </div>
  );
}

function ReportsState({ n }: { n: number }) {
  const { t } = useI18n();
  return n > 0 ? (
    <span className="badge badge-danger">
      {t('нет отчёта')}
      {n > 1 ? ` · ${n}` : ''}
    </span>
  ) : (
    <span className="badge badge-success">{t('в порядке')}</span>
  );
}

function CampaignPanel({ c }: { c: AdminCampaign }) {
  const collected = c.status === 'active' || c.status === 'completed';
  const pct = progress(c);
  const { t, fmt } = useI18n();
  return (
    <>
      <Facts
        items={[
          { label: 'Категория', value: t(CATEGORY_LABELS[c.category] ?? c.category) },
          { label: 'Цель', value: <span className="tabular">{fmt.money(c.goal_amount)}</span> },
          { label: 'Начало', value: fmt.date(c.start_date) },
          { label: 'Окончание', value: fmt.lastDay(c.end_date) },
        ]}
      />
      {collected && (
        <div className="tile flex flex-col gap-2">
          <p className="overtitle">{t('Собрано')}</p>
          <ProgressBar value={pct} onTile />
          <div className="flex flex-wrap justify-between gap-x-3 text-[13px] leading-[18px] font-medium text-ink tabular">
            <span>
              {fmt.money(c.current_amount)} · {pct}%
            </span>
            <span className="font-normal text-body">
              {fmt.number(c.donation_count)} {fmt.plural(c.donation_count, ['взнос', 'взноса', 'взносов'])}
            </span>
          </div>
        </div>
      )}
      <PanelBlock title={t('Описание')}>
        <p className="body-text whitespace-pre-line break-words">{c.description}</p>
      </PanelBlock>
      <MosqueContext campaign={c} />
      <DecisionNote note={c.moderation_note} />
    </>
  );
}

/** «Контекст мечети» из 12e: другие сборы мечети и состояние отчёта по каждому. */
function MosqueContext({ campaign }: { campaign: AdminCampaign }) {
  const { call } = useAdmin();
  const { t } = useI18n();
  const [data, setData] = useState<{ campaigns: AdminCampaign[]; reports: Pick<Report, 'campaign_id' | 'status'>[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    call<{ campaigns: AdminCampaign[]; reports: Report[] }>(`/admin/mosques/${campaign.mosque_id}/campaigns`)
      .then((r) => alive && setData(r))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Не удалось загрузить сборы мечети'));
    return () => {
      alive = false;
    };
  }, [campaign.mosque_id, call]);

  const others = data?.campaigns.filter((x) => x.id !== campaign.id && x.status !== 'draft') ?? [];
  const reportOf = (id: string) => data?.reports.find((r) => r.campaign_id === id);
  const mosqueOk = campaign.mosque?.status === 'approved';

  return (
    <PanelBlock
      title={t('Контекст мечети')}
      aside={
        <span className="flex items-center gap-2">
          {campaign.mosque && <span className={`badge ${mosqueOk ? 'badge-success' : 'badge-danger'}`}>{t(mosqueOk ? 'мечеть одобрена' : 'мечеть не одобрена')}</span>}
          <Link href={`/admin/registry?q=${encodeURIComponent(campaign.mosque?.name ?? '')}`} className="text-[13px] font-medium">
            {t('В реестре')}
          </Link>
        </span>
      }
    >
      {error && <p className="alert-error">{t(error)}</p>}
      {!data && !error && <div className="skeleton h-20 rounded-tile" aria-busy="true" />}
      {data && others.length === 0 && <p className="body-text">{t('Других сборов у мечети нет — это первый.')}</p>}
      {data && others.length > 0 && (
        <ul className="kv">
          {others.map((o) => {
            const r = reportOf(o.id);
            const ended = o.status === 'completed' || (o.status === 'active' && Date.parse(o.end_date) <= Date.now());
            return (
              <li key={o.id} className="!items-start py-2">
                <span className="min-w-0">
                  <span className="block text-ink font-medium break-words">{o.title}</span>
                  <span className="block mt-0.5">
                    <StatusBadge status={CAMPAIGN_BADGE[o.status]} />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {r ? (
                    <StatusBadge status={REPORT_BADGE[r.status]} />
                  ) : ended ? (
                    <span className="badge badge-danger">{t('нет отчёта')}</span>
                  ) : (
                    <span className="caption">{t('отчёт ещё не нужен')}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </PanelBlock>
  );
}
