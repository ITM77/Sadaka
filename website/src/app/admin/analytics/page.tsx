'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { AdminTitle } from '@/components/admin/Moderation';
import { ApiError } from '@/lib/api';
import { useAdmin } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';

/**
 * Аналитика для Комитета: сколько собрано и где, как платят, отчитываются ли мечети.
 * Один график во времени (одна серия — без легенды), остальное — полосы и таблица.
 */

type Period = '30d' | '90d' | '12m' | 'all';
type Point = { bucket: string; amount: number; count: number };
type Row = { amount: number; count: number };
type Analytics = {
  period: Period;
  unit: 'day' | 'week' | 'month';
  totals: { amount: number; count: number; donors: number; avg: number; savob: number };
  previous: Row;
  has_previous: boolean;
  series: Point[];
  cities: (Row & { city: string; mosques: number })[];
  methods: (Row & { method: string })[];
  top_mosques: (Row & { id: string; name: string; city: string; donors: number })[];
  reporting: { completed: number; approved: number; review: number; rejected: number; missing: number };
};

const PERIODS: { id: Period; label: string }[] = [
  { id: '30d', label: '30 дней' },
  { id: '90d', label: '90 дней' },
  { id: '12m', label: '12 месяцев' },
  { id: 'all', label: 'Всё время' },
];

const METHOD_LABELS: Record<string, string> = { card: 'Карта', alif: 'Alif', imon: 'IMON', qr: 'QR-код' };

// Одна серия — фирменный бирюзовый; статусы отчётности — проверены валидатором палитры.
const BAR = '#1A7C80';
const BAR_HOVER = '#025256';
const STATUS = { approved: '#0E7A45', review: '#C98A12', missing: '#B42318' };

export default function AnalyticsPage() {
  return (
    <Suspense>
      <Analytics />
    </Suspense>
  );
}

function Analytics() {
  const { call } = useAdmin();
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get('period');
  const period: Period = PERIODS.some((p) => p.id === raw) ? (raw as Period) : '12m';
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    call<Analytics>(`/admin/analytics?period=${period}`)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Не удалось загрузить аналитику'));
    return () => {
      alive = false;
    };
  }, [call, period]);

  const shown = data?.period === period ? data : null;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle over={t('Комитет улемов')}>{t('Аналитика')}</AdminTitle>

      {/* Фильтр периода — одной строкой над всеми графиками */}
      <nav aria-label={t('Период')} className="segmented bg-white w-full sm:w-auto sm:self-start">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-current={period === p.id ? 'page' : undefined}
            onClick={() => router.replace(`${pathname}?period=${p.id}`, { scroll: false })}
            className="!min-h-11 flex-1 sm:flex-none !px-1.5 sm:!px-4 !text-[13px] sm:!text-sm leading-4 text-center hover:text-accent-700"
          >
            {t(p.label)}
          </button>
        ))}
      </nav>

      {error && (
        <p className="alert-error" role="alert">
          {t(error)}
        </p>
      )}
      {!shown && !error && <Skeleton />}
      {shown && <Content d={shown} />}
    </div>
  );
}

function Skeleton() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label={t('Загрузка')}>
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-[92px] rounded-tile" />
        ))}
      </div>
      <div className="panel skeleton h-[320px] rounded-card" />
    </div>
  );
}

function Content({ d }: { d: Analytics }) {
  const { t, fmt } = useI18n();
  const change = d.has_previous && d.previous.amount > 0 ? Math.round(((d.totals.amount - d.previous.amount) / d.previous.amount) * 100) : null;

  return (
    <>
      <dl className="grid gap-2 grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <Kpi
          wide
          label={t('Пожертвовано')}
          value={fmt.money(d.totals.amount)}
          sub={
            change !== null
              ? t('{sign}{n}% к прошлому периоду', { sign: change > 0 ? '+' : '', n: change })
              : d.has_previous && d.totals.amount > 0
                ? t('в прошлом периоде пожертвований не было')
                : undefined
          }
        />
        <Kpi label={t('Пожертвований')} value={fmt.number(d.totals.count)} />
        <Kpi label={t('Жертвователей')} value={fmt.number(d.totals.donors)} />
        <Kpi label={t('Средний чек')} value={fmt.money(d.totals.avg)} />
        <Kpi label={t('Савоб начислено')} value={fmt.number(d.totals.savob)} sub={fmt.plural(d.totals.savob, ['балл', 'балла', 'баллов'])} />
      </dl>

      <SeriesChart d={d} />

      <div className="grid gap-3 md:gap-4 lg:grid-cols-2 lg:items-start">
        <section className="panel" aria-labelledby="by-city">
          <h2 id="by-city" className="title-sm">
            {t('По городам')}
          </h2>
          <Bars
            rows={d.cities.map((c) => ({
              key: c.city,
              label: c.city,
              sub: `${fmt.number(c.mosques)} ${fmt.plural(c.mosques, ['мечеть', 'мечети', 'мечетей'])} · ${fmt.number(c.count)} ${fmt.plural(c.count, ['пожертвование', 'пожертвования', 'пожертвований'])}`,
              value: c.amount,
            }))}
            total={d.totals.amount}
          />
        </section>
        <section className="panel" aria-labelledby="by-method">
          <h2 id="by-method" className="title-sm">
            {t('Способы оплаты')}
          </h2>
          <Bars
            rows={d.methods.map((m) => ({
              key: m.method,
              label: t(METHOD_LABELS[m.method] ?? m.method),
              sub: `${fmt.number(m.count)} ${fmt.plural(m.count, ['пожертвование', 'пожертвования', 'пожертвований'])}`,
              value: m.amount,
            }))}
            total={d.totals.amount}
          />
        </section>
      </div>

      <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <TopMosques d={d} />
        <Reporting r={d.reporting} />
      </div>
    </>
  );
}

function Kpi({ label, value, sub, wide }: { label: string; value: string; sub?: string; wide?: boolean }) {
  return (
    <div className={`panel !p-4 min-w-0 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
      <dt className="text-xs leading-[17px] text-body">{label}</dt>
      <dd className="text-[22px] leading-7 font-semibold tracking-[-.02em] tabular text-ink mt-0.5 break-words">{value}</dd>
      {sub && <dd className="caption mt-0.5">{sub}</dd>}
    </div>
  );
}

/** Округление вверх до «красивого» числа для шкалы: 1, 2, 2.5, 5 × 10ⁿ. */
function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function SeriesChart({ d }: { d: Analytics }) {
  const { t, fmt } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => niceMax(Math.max(0, ...d.series.map((p) => p.amount))), [d.series]);
  const n = d.series.length;
  const ticks = [0, 0.5, 1].map((f) => f * max);

  /** Подпись столбца в подсказке и таблице. */
  const full = (b: string) => {
    const iso = `${b}T12:00:00+05:00`;
    if (d.unit === 'month') return fmt.monthYear(iso);
    if (d.unit === 'week') return t('неделя с {date}', { date: fmt.dayMonth(iso) });
    return fmt.date(iso);
  };
  /** Короткая подпись оси: показываем не каждую, чтобы не налезали. */
  const short = (b: string) => {
    const iso = `${b}T12:00:00+05:00`;
    return d.unit === 'month' ? fmt.monthShort(iso) : `${Number(b.slice(8, 10))} ${fmt.monthShort(iso)}`;
  };
  // Подписей не больше 7 (месяцы) или 4 (дни, недели): на телефоне иначе налезают.
  const every = Math.max(1, Math.ceil(n / (d.unit === 'month' ? 7 : 4)));
  const title = { day: 'Пожертвования по дням', week: 'Пожертвования по неделям', month: 'Пожертвования по месяцам' }[d.unit];
  const empty = d.series.every((p) => p.amount === 0);
  const active = hover !== null ? d.series[hover] : null;

  return (
    <section className="panel" aria-labelledby="series">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="series" className="title-sm">
          {t(title)}
        </h2>
        <p className="caption tabular min-h-5" aria-live="polite">
          {active ? `${full(active.bucket)}: ${fmt.money(active.amount)} · ${fmt.number(active.count)}` : t('наведите на столбец — появятся цифры')}
        </p>
      </div>

      {empty ? (
        <p className="tile text-sm mt-3">{t('За этот период пожертвований не было.')}</p>
      ) : (
        <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2" aria-hidden="true">
          {/* Шкала: три деления, сетка — едва заметная */}
          <div className="relative h-[220px] w-[56px] md:w-[72px]">
            {ticks.map((v) => (
              <span key={v} className="absolute right-0 caption tabular -translate-y-1/2 whitespace-nowrap" style={{ top: `${100 - (v / max) * 100}%` }}>
                {fmt.number(v)}
              </span>
            ))}
          </div>
          <div className="relative h-[220px]" onMouseLeave={() => setHover(null)}>
            {ticks.map((v) => (
              <div key={v} className={`absolute inset-x-0 border-t ${v === 0 ? 'border-dark-200' : 'border-line'}`} style={{ top: `${100 - (v / max) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {d.series.map((p, i) => {
                const h = (p.amount / max) * 100;
                return (
                  <div
                    key={p.bucket}
                    className="relative flex-1 min-w-0 h-full flex items-end cursor-default"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setHover(i)}
                  >
                    <div
                      className="w-full rounded-t-[4px] transition-colors"
                      style={{ height: `${p.amount > 0 ? Math.max(h, 1.5) : 0}%`, background: hover === i ? BAR_HOVER : BAR }}
                    />
                    {hover === i && (
                      <div
                        className={`absolute z-10 bottom-full mb-1 pointer-events-none bg-ink text-white rounded-xl px-3 py-2 text-xs leading-4 whitespace-nowrap shadow-lg ${
                          i < n / 3 ? 'left-0' : i > (2 * n) / 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                        }`}
                        style={{ bottom: `${h}%` }}
                      >
                        <span className="block font-semibold">{full(p.bucket)}</span>
                        <span className="block tabular">{fmt.money(p.amount)}</span>
                        <span className="block tabular text-white/80">
                          {fmt.number(p.count)} {fmt.plural(p.count, ['пожертвование', 'пожертвования', 'пожертвований'])}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div />
          <div className="flex gap-[2px] mt-1.5">
            {d.series.map((p, i) => (
              <span key={p.bucket} className="flex-1 min-w-0 caption text-center whitespace-nowrap overflow-visible">
                {i % every === 0 ? short(p.bucket) : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Те же цифры таблицей — для экранных дикторов */}
      <table className="sr-only">
        <caption>{t(title)}</caption>
        <thead>
          <tr>
            <th scope="col">{t('Период')}</th>
            <th scope="col">{t('Сумма')}</th>
            <th scope="col">{t('Пожертвований')}</th>
          </tr>
        </thead>
        <tbody>
          {d.series.map((p) => (
            <tr key={p.bucket}>
              <td>{full(p.bucket)}</td>
              <td>{fmt.money(p.amount)}</td>
              <td>{fmt.number(p.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Горизонтальные полосы: одна мера, один цвет, подписи и суммы текстом. */
function Bars({ rows, total }: { rows: { key: string; label: string; sub: string; value: number }[]; total: number }) {
  const { t, fmt } = useI18n();
  if (rows.length === 0) return <p className="tile text-sm mt-3">{t('За этот период пожертвований не было.')}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="mt-3 flex flex-col gap-3">
      {rows.map((r) => {
        const share = total > 0 ? Math.round((r.value / total) * 100) : 0;
        return (
          <li key={r.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-ink truncate">{r.label}</span>
              <span className="tabular text-sm text-ink whitespace-nowrap">
                {fmt.money(r.value)} <span className="caption">· {share}%</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-app overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${max > 0 ? Math.max(2, (r.value / max) * 100) : 0}%`, background: BAR }} />
            </div>
            <span className="caption">{r.sub}</span>
          </li>
        );
      })}
    </ul>
  );
}

function TopMosques({ d }: { d: Analytics }) {
  const { t, fmt } = useI18n();
  return (
    <section className="panel min-w-0" aria-labelledby="top">
      <h2 id="top" className="title-sm">
        {t('Мечети с наибольшими сборами')}
      </h2>
      {d.top_mosques.length === 0 ? (
        <p className="tile text-sm mt-3">{t('За этот период пожертвований не было.')}</p>
      ) : (
        <>
          <table className="hidden md:table w-full mt-3 table-fixed border-separate border-spacing-0 text-sm leading-5 text-ink">
            <caption className="sr-only">{t('Мечети с наибольшими сборами')}</caption>
            <thead>
              <tr>
                {[
                  ['#', 'w-[44px]'],
                  ['Мечеть', ''],
                  ['Собрано', 'w-[130px] text-right'],
                  ['Пожертвований', 'w-[130px] text-right'],
                  ['Жертвователей', 'w-[130px] text-right'],
                ].map(([h, w], i, a) => (
                  <th
                    key={h}
                    scope="col"
                    className={`h-10 px-2 bg-app text-left text-[11px] font-medium uppercase tracking-[.04em] text-sec whitespace-nowrap overflow-hidden text-ellipsis ${w} ${
                      i === 0 ? 'rounded-l-[14px] pl-3' : ''
                    } ${i === a.length - 1 ? 'rounded-r-[14px] pr-3' : ''}`}
                  >
                    {h === '#' ? <span className="sr-only">{t('Место')}</span> : t(h)}
                    {h === '#' && <span aria-hidden="true">#</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.top_mosques.map((m, i) => (
                <tr key={m.id}>
                  <td className="pl-3 pr-2 py-2.5 border-b border-line tabular text-body">{i + 1}</td>
                  <td className="px-2 py-2.5 border-b border-line">
                    <Link href={`/admin/registry?q=${encodeURIComponent(m.name)}`} className="block font-medium text-ink hover:text-accent-700 truncate">
                      {m.name}
                    </Link>
                    <span className="block caption truncate">{m.city}</span>
                  </td>
                  <td className="px-2 py-2.5 border-b border-line tabular text-right whitespace-nowrap">{fmt.money(m.amount)}</td>
                  <td className="px-2 py-2.5 border-b border-line tabular text-right">{fmt.number(m.count)}</td>
                  <td className="pl-2 pr-3 py-2.5 border-b border-line tabular text-right">{fmt.number(m.donors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ol className="md:hidden flex flex-col gap-2 mt-3">
            {d.top_mosques.map((m, i) => (
              <li key={m.id} className="tile flex gap-3 items-start">
                <span className="tabular text-body w-5 shrink-0">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink break-words">{m.name}</span>
                  <span className="block caption">
                    {m.city} · {fmt.number(m.donors)} {fmt.plural(m.donors, ['жертвователь', 'жертвователя', 'жертвователей'])}
                  </span>
                </span>
                <span className="tabular text-sm font-medium text-ink whitespace-nowrap">{fmt.money(m.amount)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function Reporting({ r }: { r: Analytics['reporting'] }) {
  const { t, fmt } = useI18n();
  const noReport = r.missing + r.rejected;
  const pct = r.completed > 0 ? Math.round((r.approved / r.completed) * 100) : null;
  const parts = [
    { key: 'approved', label: 'Отчёт принят', n: r.approved, color: STATUS.approved, icon: '✓' },
    { key: 'review', label: 'Отчёт на проверке', n: r.review, color: STATUS.review, icon: '…' },
    { key: 'missing', label: 'Нет принятого отчёта', n: noReport, color: STATUS.missing, icon: '!' },
  ];
  return (
    <section className="panel" aria-labelledby="reporting">
      <h2 id="reporting" className="title-sm">
        {t('Отчётность мечетей')}
      </h2>
      <p className="caption mt-0.5">{t('Завершённые сборы за всё время')}</p>
      {r.completed === 0 ? (
        <p className="tile text-sm mt-3">{t('Завершённых сборов пока нет.')}</p>
      ) : (
        <>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-[36px] leading-[42px] font-semibold tracking-[-.02em] tabular text-ink">{pct}%</span>
            <span className="body-text">{t('сборов закрыты принятым отчётом')}</span>
          </p>
          <div className="mt-3 flex h-3 rounded-full overflow-hidden gap-[2px] bg-white" aria-hidden="true">
            {parts
              .filter((p) => p.n > 0)
              .map((p) => (
                <div key={p.key} style={{ flexGrow: p.n, background: p.color }} />
              ))}
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {parts.map((p) => (
              <li key={p.key} className="flex items-center gap-2.5 text-sm">
                <span
                  className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: p.color }}
                  aria-hidden="true"
                >
                  {p.icon}
                </span>
                <span className="flex-1 text-ink">{t(p.label)}</span>
                <span className="tabular font-medium text-ink">{fmt.number(p.n)}</span>
              </li>
            ))}
          </ul>
          {noReport > 0 && (
            <Link href="/admin" className="link-action inline-block mt-3 text-sm">
              {t('Список в «Нужен контроль» на сводке')}
            </Link>
          )}
        </>
      )}
    </section>
  );
}
