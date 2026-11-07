'use client';

import Link from 'next/link';
import { AdminStats, useAdminStats } from '@/components/admin/AdminStats';
import { AdminTitle } from '@/components/admin/Moderation';
import { IconChevronRight } from '@/components/icons';
import { formatTJS, plural } from '@/lib/api';

const num = new Intl.NumberFormat('ru-RU');

export default function AdminDashboard() {
  const { stats: s, error } = useAdminStats();

  return (
    <div className="flex flex-col gap-8">
      <AdminTitle sub="Состояние платформы по всей стране">Сводка</AdminTitle>
      {error && !s && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      {!s && !error && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Загрузка">
          <div className="h-28 rounded-[18px] bg-white border border-line animate-pulse" />
          <div className="h-56 rounded-[18px] bg-white border border-line animate-pulse" />
        </div>
      )}
      {s && <Content s={s} />}
    </div>
  );
}

function Content({ s }: { s: AdminStats }) {
  const queues = [
    { href: '/admin/mosques?status=pending', label: 'Заявки мечетей', count: s.mosques_pending },
    { href: '/admin/campaigns?status=pending_approval', label: 'Кампании на одобрение', count: s.campaigns_pending },
    { href: '/admin/reports?status=submitted', label: 'Отчёты на проверку', count: s.reports_pending },
  ];

  return (
    <>
      <section aria-labelledby="queues">
        <h2 id="queues" className="text-lg font-bold mb-3.5">
          Ждут решения
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {queues.map((q) => {
            const waiting = q.count > 0;
            return (
              <Link
                key={q.href}
                href={q.href}
                className={`group flex justify-between items-center gap-3 bg-white border rounded-[18px] p-5 sm:p-[22px] text-ink hover:text-ink transition-[border-color,box-shadow] hover:shadow-md ${
                  waiting ? 'border-[#EBD3A2] hover:border-brass-400' : 'border-line hover:border-primary-200'
                }`}
              >
                <span className="flex flex-col gap-0.5 min-w-0">
                  <strong className="text-[17px]">{q.label}</strong>
                  <span className="inline-flex items-center gap-1 text-sm text-muted group-hover:text-primary-700">
                    {waiting ? 'Открыть очередь' : 'Очередь пуста'}
                    {waiting && <IconChevronRight size={14} />}
                  </span>
                </span>
                <span className={`text-[36px] leading-none font-bold ${waiting ? 'text-[#9A5B00]' : 'text-dark-400'}`}>
                  {q.count}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="totals">
        <h2 id="totals" className="text-lg font-bold mb-3.5">
          Показатели
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 sm:gap-3.5">
          <Kpi
            wide
            label="Пожертвовано"
            value={formatTJS(s.donations_total)}
            sub={`${num.format(s.donations)} ${plural(s.donations, ['пожертвование', 'пожертвования', 'пожертвований'])}`}
          />
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
          <Kpi
            label="Завершены без отчёта"
            value={num.format(s.campaigns_without_report)}
            warn={s.campaigns_without_report > 0}
            sub="мечети не откроют новый сбор"
          />
        </div>
      </section>
    </>
  );
}

function Kpi({
  label,
  value,
  sub,
  warn,
  wide,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`bg-white border border-line rounded-2xl p-4 sm:p-[18px] min-w-0 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-1.5 text-[22px] sm:text-[26px] leading-tight font-bold break-words ${warn ? 'text-[#9A5B00]' : ''}`}
        style={{ letterSpacing: '-0.01em' }}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
    </div>
  );
}
