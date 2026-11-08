'use client';

import Link from 'next/link';
import { ComponentType } from 'react';
import { AdminStats, useAdminStats } from '@/components/admin/AdminStats';
import { AdminTitle } from '@/components/admin/Moderation';
import { IconArrowRight, IconHandHeart, IconLandmark, IconReport, IconShield } from '@/components/icons';
import { PERMISSIONS, ROLE_LABELS, useAdmin } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';

/** Сколько полных дней прошло — «12 дн.». */
function ageDays(iso?: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));
}

export default function AdminDashboard() {
  const { stats: s, error } = useAdminStats();
  const { t, fmt } = useI18n();

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle over={fmt.today()}>{t('Сводка')}</AdminTitle>
      {error && !s && (
        <p className="alert-error" role="alert">
          {t(error)}
        </p>
      )}
      {!s && !error && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true" aria-label={t('Загрузка')}>
          <div className="flex flex-col gap-3">
            <div className="panel">
              <div className="skeleton h-4 w-32" />
              <div className="grid gap-2 md:grid-cols-3 mt-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-[172px] rounded-tile" />
                ))}
              </div>
            </div>
            <div className="panel skeleton h-[140px] rounded-card" />
          </div>
          <div className="panel skeleton h-[260px] rounded-card" />
        </div>
      )}
      {s && <Content s={s} />}
    </div>
  );
}

type Queue = { href: string; label: string; count: number; oldest?: string | null; icon: ComponentType<{ size?: number }>; fem?: boolean };

function Content({ s }: { s: AdminStats }) {
  const { admin } = useAdmin();
  const { t, fmt } = useI18n();
  const queues: Queue[] = [
    { href: '/admin/mosques', label: 'Заявки мечетей', count: s.mosques_pending, oldest: s.oldest_mosque_pending, icon: IconLandmark, fem: true },
    { href: '/admin/campaigns', label: 'Сборы на одобрении', count: s.campaigns_pending, oldest: s.oldest_campaign_pending, icon: IconHandHeart },
    { href: '/admin/reports', label: 'Отчёты на проверке', count: s.reports_pending, oldest: s.oldest_report_pending, icon: IconReport },
  ];
  const waiting = queues.reduce((n, q) => n + q.count, 0);
  const unreported = s.unreported ?? [];

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex flex-col gap-3 md:gap-4 min-w-0">
        <section className="panel" aria-labelledby="queues">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="queues" className="title-sm">
              {t('Ждут решения')}
            </h2>
            <p className="caption tabular">{waiting ? t('{n} в очередях', { n: fmt.number(waiting) }) : t('очереди пусты')}</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-3 mt-3">
            {queues.map((q) => {
              const Icon = q.icon;
              const age = q.count > 0 ? ageDays(q.oldest) : null;
              return (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="tile group flex flex-col gap-1.5 h-full min-h-[150px] sm:min-h-[172px] p-4 text-ink hover:text-ink hover:bg-[#DDE7E6] transition-colors"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="w-10 h-10 rounded-xl bg-white text-sec flex items-center justify-center shrink-0">
                        <Icon size={20} />
                      </span>
                      {age !== null ? (
                        <span className={`badge ${age >= 7 ? 'badge-danger' : 'badge-warning'}`}>
                          {t(q.fem ? 'самая старая — {age}' : 'самый старый — {age}', { age: age === 0 ? t('сегодня') : t('{n} дн.', { n: age }) })}
                        </span>
                      ) : (
                        <span className="badge badge-success">{t('нет новых')}</span>
                      )}
                    </span>
                    <span className={`mt-auto text-[36px] leading-[42px] font-semibold tracking-[-.02em] tabular ${q.count ? 'text-ink' : 'text-hint'}`}>
                      {fmt.number(q.count)}
                    </span>
                    <span className="text-[15px] leading-5 font-semibold">{t(q.label)}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-700">
                      {q.count ? t('Открыть очередь') : t('Посмотреть')}
                      <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel" aria-labelledby="totals">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="totals" className="title-sm">
              {t('Платформа сегодня')}
            </h2>
            <p className="caption">{t('всего с запуска')}</p>
          </div>
          <dl className="grid gap-2 grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr] xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] mt-3">
            <Kpi
              wide
              label={t('Пожертвовано через платформу')}
              value={fmt.money(s.donations_total)}
              sub={`${fmt.number(s.donations)} ${fmt.plural(s.donations, ['пожертвование', 'пожертвования', 'пожертвований'])}`}
            />
            <Kpi label={t('Идёт сборов')} value={fmt.number(s.campaigns_active)} />
            <Kpi label={t('Одобрено мечетей')} value={fmt.number(s.mosques_approved)} sub={s.mosques_blocked ? t('заблокировано: {n}', { n: fmt.number(s.mosques_blocked) }) : undefined} />
            <Kpi label={t('Пользователей')} value={fmt.number(s.users)} />
            <Kpi label={t('Савоб начислено')} value={fmt.number(s.savob_distributed)} sub={fmt.plural(s.savob_distributed, ['балл', 'балла', 'баллов'])} />
          </dl>
        </section>

        <section className="panel" aria-labelledby="control">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="control" className="title-sm">
              {t('Нужен контроль')}
            </h2>
            <p className="caption">{t('Завершённые сборы без отчёта')} · {s.campaigns_without_report}</p>
          </div>
          <p className="body-text mt-1">{t('Пока отчёта нет, мечеть не отправит новый сбор, а Комитет не сможет его одобрить.')}</p>
          {unreported.length === 0 ? (
            <p className="mt-3 tile text-sm text-ok bg-ok-soft">{t('Все завершённые сборы закрыты отчётами.')}</p>
          ) : (
            <>
              <table className="hidden md:table w-full mt-3 table-fixed border-separate border-spacing-0 text-sm leading-5 text-ink">
                <caption className="sr-only">{t('Завершённые сборы без поданного или принятого отчёта')}</caption>
                <thead>
                  <tr>
                    {[
                      ['Мечеть', ''],
                      ['Сбор', ''],
                      ['Завершён', 'w-[110px]'],
                      ['Без отчёта', 'w-[100px]'],
                      ['Состояние', 'w-[30%]'],
                    ].map(([h, w], i, a) => (
                      <th
                        key={h}
                        scope="col"
                        className={`h-10 px-2 bg-app text-left text-[11px] font-medium uppercase tracking-[.04em] text-sec whitespace-nowrap ${w} ${
                          i === 0 ? 'rounded-l-[14px] pl-3' : ''
                        } ${i === a.length - 1 ? 'rounded-r-[14px] pr-3' : ''}`}
                      >
                        {t(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unreported.map((u) => (
                    <tr key={u.campaign_id}>
                      <td className="pl-3 pr-2 py-2.5 border-b border-line">
                        <Link href={`/admin/registry?q=${encodeURIComponent(u.mosque_name)}`} className="block font-medium text-ink hover:text-accent-700 truncate">
                          {u.mosque_name}
                        </Link>
                        <span className="block caption truncate">{u.city}</span>
                      </td>
                      <td className="px-2 py-2.5 border-b border-line truncate">{u.campaign_title}</td>
                      <td className="px-2 py-2.5 border-b border-line tabular">{u.completed_at ? fmt.dayMonth(u.completed_at) : '—'}</td>
                      <td className="px-2 py-2.5 border-b border-line tabular">{u.completed_at ? t('{n} дн.', { n: ageDays(u.completed_at) ?? 0 }) : '—'}</td>
                      <td className="pl-2 pr-3 py-2.5 border-b border-line">
                        <UnreportedState u={u} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="md:hidden flex flex-col gap-2 mt-3">
                {unreported.map((u) => (
                  <li key={u.campaign_id} className="tile flex flex-col gap-1">
                    <span className="font-medium text-ink break-words">{u.campaign_title}</span>
                    <span className="caption break-words">
                      {u.mosque_name} · {u.city}
                      {u.completed_at ? ` · ${t('завершён {date}, {n} дн. без отчёта', { date: fmt.dayMonth(u.completed_at), n: ageDays(u.completed_at) ?? 0 })}` : ''}
                    </span>
                    <UnreportedState u={u} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-3 md:gap-4 lg:sticky lg:top-4" aria-label={t('Права сотрудника')}>
        {admin && (
          <section className="panel" aria-labelledby="my-rights">
            <div className="flex items-center justify-between gap-2">
              <h2 id="my-rights" className="title-sm">
                {t('Мои права')}
              </h2>
              <span className="badge badge-sec">{t(ROLE_LABELS[admin.role])}</span>
            </div>
            <ul className="mt-2">
              {PERMISSIONS.map((p) => {
                const yes = p.roles.includes(admin.role);
                return (
                  <li key={p.label} className="flex gap-2.5 items-start py-2 border-b border-line last:border-b-0 text-sm leading-5">
                    <span aria-hidden="true" className={`shrink-0 font-semibold ${yes ? 'text-ok' : 'text-muted'}`}>
                      {yes ? '✓' : '✕'}
                    </span>
                    <span className={yes ? 'text-ink' : 'text-body'}>
                      <span className="sr-only">{yes ? t('Есть: ') : t('Нет: ')}</span>
                      {t(p.label)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <div className="infobox">
          <IconShield size={18} className="shrink-0 mt-px" />
          <span>{t('Нет отчёта — нет нового сбора. Отказ и блокировка — только с причиной: её увидит мечеть.')}</span>
        </div>
      </aside>
    </div>
  );
}

function UnreportedState({ u }: { u: NonNullable<AdminStats['unreported']>[number] }) {
  const { t, fmt } = useI18n();
  if (u.report_status === 'rejected')
    return (
      <span className="badge badge-danger whitespace-normal">
        {u.report_updated ? t('отчёт отклонён {date}', { date: fmt.dayMonth(u.report_updated) }) : t('отчёт отклонён')}
      </span>
    );
  if (u.pending_new) return <span className="badge badge-warning whitespace-normal">{t('новый сбор ждёт решения')}</span>;
  return <span className="badge badge-neutral whitespace-normal">{t('отчёта нет')}</span>;
}

function Kpi({ label, value, sub, wide }: { label: string; value: string; sub?: string; wide?: boolean }) {
  return (
    <div className={`tile min-w-0 ${wide ? 'col-span-2 md:col-span-1' : ''}`}>
      <dt className="text-xs leading-[17px] text-body">{label}</dt>
      <dd className="text-[22px] leading-7 font-semibold tracking-[-.02em] tabular text-ink mt-0.5 break-words">{value}</dd>
      {sub && <dd className="caption mt-0.5">{sub}</dd>}
    </div>
  );
}
