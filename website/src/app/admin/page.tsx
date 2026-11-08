'use client';

import Link from 'next/link';
import { ComponentType } from 'react';
import { AdminStats, useAdminStats } from '@/components/admin/AdminStats';
import { AdminTitle } from '@/components/admin/Moderation';
import { IconArrowRight, IconHandHeart, IconLandmark, IconReport, IconShield, IconUser } from '@/components/icons';
import { formatMoney, plural } from '@/lib/api';
import { canModerate, ROLE_LABELS, useAdmin } from '@/lib/adminAuth';

const num = new Intl.NumberFormat('ru-RU');

export default function AdminDashboard() {
  const { stats: s, error } = useAdminStats();

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle sub="Состояние платформы по всей стране">Сводка</AdminTitle>
      {error && !s && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      {!s && !error && (
        <div className="layout-aside grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true" aria-label="Загрузка">
          <div className="flex flex-col gap-3">
            <div className="panel">
              <div className="skeleton h-4 w-32" />
              <div className="grid gap-2 md:grid-cols-3 mt-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-[132px] rounded-tile" />
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-[88px] rounded-tile mt-3" />
            </div>
          </div>
          <div className="panel skeleton h-[180px] rounded-card" />
        </div>
      )}
      {s && <Content s={s} />}
    </div>
  );
}

type Queue = {
  href: string;
  label: string;
  count: number;
  icon: ComponentType<{ size?: number }>;
};

function Content({ s }: { s: AdminStats }) {
  const { admin } = useAdmin();
  const queues: Queue[] = [
    { href: '/admin/mosques?status=pending', label: 'Заявки мечетей', count: s.mosques_pending, icon: IconLandmark },
    {
      href: '/admin/campaigns?status=pending_approval',
      label: 'Кампании на одобрение',
      count: s.campaigns_pending,
      icon: IconHandHeart,
    },
    { href: '/admin/reports?status=submitted', label: 'Отчёты на проверку', count: s.reports_pending, icon: IconReport },
  ];
  const noReport = s.campaigns_without_report;

  return (
    <div className="layout-aside grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-3 min-w-0">
        <section className="panel" aria-labelledby="queues">
          <h2 id="queues" className="overtitle">
            Ждут решения
          </h2>
          <ul className="grid gap-2 md:grid-cols-3 mt-3">
            {queues.map((q) => {
              const waiting = q.count > 0;
              const Icon = q.icon;
              return (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="tile group flex flex-col gap-3 h-full min-h-[132px] text-ink hover:text-ink hover:bg-[#DDE7E6] transition-colors"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sec">
                        <Icon size={20} />
                      </span>
                      {waiting ? (
                        <span className="badge badge-warning">ждут</span>
                      ) : (
                        <span className="badge badge-success">нет новых</span>
                      )}
                    </span>
                    <span className="mt-auto flex flex-col">
                      <span className={`num-lg ${waiting ? 'text-ink' : 'text-hint'}`}>{num.format(q.count)}</span>
                      <span className="text-sm leading-5 font-medium">{q.label}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-700">
                      {waiting ? 'Открыть очередь' : 'Посмотреть'}
                      <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel" aria-labelledby="totals">
          <h2 id="totals" className="overtitle">
            Показатели
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            <dl className="tile">
              <dt className="text-xs leading-[17px] text-body">Пожертвовано через платформу</dt>
              <dd className="num-lg text-ink mt-0.5 break-words">{formatMoney(s.donations_total)}</dd>
              <dd className="caption mt-0.5">
                {num.format(s.donations)} {plural(s.donations, ['пожертвование', 'пожертвования', 'пожертвований'])}
              </dd>
            </dl>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Kpi label="Активных кампаний" value={num.format(s.campaigns_active)} />
              <Kpi
                label="Одобренных мечетей"
                value={num.format(s.mosques_approved)}
                sub={s.mosques_blocked ? `заблокировано: ${num.format(s.mosques_blocked)}` : undefined}
              />
              <Kpi label="Пользователей" value={num.format(s.users)} />
              <Kpi
                label="Савоб начислено"
                value={num.format(s.savob_distributed)}
                sub={plural(s.savob_distributed, ['балл', 'балла', 'баллов'])}
              />
            </dl>
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-3 aside-sticky">
        <section className="panel" aria-labelledby="no-report">
          <h2 id="no-report" className="overtitle">
            Завершены без отчёта
          </h2>
          <div className="flex items-baseline gap-2 mt-3">
            <span className={`num-lg ${noReport > 0 ? 'text-[#A35A00]' : 'text-ink'}`}>{num.format(noReport)}</span>
            <span className="text-base leading-[22px] font-semibold text-ink">
              {plural(noReport, ['кампания', 'кампании', 'кампаний'])}
            </span>
          </div>
          <p className="body-text mt-1">
            {noReport > 0
              ? 'Эти мечети не откроют новый сбор, пока не опубликуют отчёт.'
              : 'Все завершённые сборы закрыты отчётами.'}
          </p>
        </section>

        <div className="infobox">
          <IconShield size={18} className="shrink-0 mt-px" />
          <span>
            Нет отчёта — нет новой кампании. Каждый сбор открывается только после одобрения Комитетом.
          </span>
        </div>

        {admin && (
          <div className="panel flex items-start gap-3">
            <span className="icon-round">
              <IconUser />
            </span>
            <div className="min-w-0">
              <p className="title-sm break-words">{admin.full_name}</p>
              <p className="caption">{ROLE_LABELS[admin.role]}</p>
              <p className="body-text mt-1.5">
                {admin.role === 'superadmin'
                  ? 'Все решения, включая блокировку и разблокировку мечетей.'
                  : canModerate(admin)
                    ? 'Можно одобрять и отклонять заявки, кампании и отчёты.'
                    : 'Доступ только для просмотра — решения принимают модераторы.'}
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile min-w-0">
      <dt className="text-xs leading-[17px] text-body">{label}</dt>
      <dd className="num-lg text-ink mt-0.5 break-words">{value}</dd>
      {sub && <dd className="caption mt-0.5">{sub}</dd>}
    </div>
  );
}
