'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { Alert, CabinetPage, Loading, StatusBadge } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';
import { IconChevronRight, IconLock, IconPlus, IconSearch, IconUsers } from '@/components/icons';
import { ApiError, apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/client';
import {
  AID_KIND_LABELS,
  Beneficiary,
  daysSinceAid,
  NeedySummary,
  SITUATION_LABELS,
  WAIT_DAYS,
  WelfareFund,
} from '@/lib/needy';

type NeedyList = { beneficiaries: Beneficiary[]; summary: NeedySummary; funds: WelfareFund[] };
type Tab = 'active' | 'closed' | 'all';

const TABS: { id: Tab; label: string }[] = [
  { id: 'active', label: 'На учёте' },
  { id: 'closed', label: 'Сняты с учёта' },
  { id: 'all', label: 'Все' },
];

export default function NeedyListPage({ params }: { params: { id: string } }) {
  const { data: cab, error: cabError, notFound: missing, token } = useMosqueCabinet(params.id);
  const { t, fmt } = useI18n();
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<NeedyList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gone, setGone] = useState(false);
  if (missing || gone) notFound();

  // Поиск — с небольшой паузой, чтобы не дёргать сервер на каждую букву
  useEffect(() => {
    // Номер вида «90 111 22 33» ищем без пробелов — в базе он хранится слитно
    const s = search.trim();
    const id = setTimeout(() => setQuery(/^[\d\s+()-]+$/.test(s) ? s.replace(/\D/g, '') : s), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setLoading(true);
    const qs = new URLSearchParams({ status: tab, q: query });
    apiFetch<NeedyList>(`/me/mosques/${encodeURIComponent(params.id)}/needy?${qs}`, { token })
      .then((r) => {
        if (!alive) return;
        setData(r);
        setError('');
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setGone(true);
        else setError(e instanceof ApiError ? e.message : 'Не удалось загрузить список');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [params.id, tab, query, token]);

  const base = `/cabinet/mosques/${params.id}`;
  const summary = data?.summary;
  const list = data?.beneficiaries ?? [];
  const anyFamilies = !!summary && summary.active + summary.closed > 0;

  return (
    <CabinetPage
      title={t('Нуждающиеся')}
      description={t('Семьи, которым помогает мечеть, и учёт выданной помощи. Деньги из сбора «Помощь нуждающимся» мечеть раздаёт сама и записывает каждую выдачу.')}
      crumbs={[
        { href: '/cabinet', label: t('Кабинет') },
        { href: base, label: cab?.mosque.name ?? t('Мечеть') },
      ]}
      current={t('Нуждающиеся')}
      actions={
        <Link href={`${base}/needy/new`} className="btn btn-primary">
          <IconPlus size={18} />
          {t('Добавить семью')}
        </Link>
      }
    >
      {(error || cabError) && <Alert>{t(error || cabError)}</Alert>}
      {!data && !error && <Loading />}

      {summary && (
        <section aria-label={t('Сводка')} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryTile
            label={t('Семей на учёте')}
            value={fmt.number(summary.active)}
            sub={summary.closed > 0 ? t('снято с учёта: {n}', { n: summary.closed }) : undefined}
          />
          <SummaryTile label={t('Человек в них')} value={fmt.number(summary.people)} />
          <SummaryTile
            label={t('Выдано за месяц')}
            value={fmt.money(summary.month_amount)}
            sub={`${summary.month_count} ${fmt.plural(summary.month_count, ['выдача', 'выдачи', 'выдач'])}`}
          />
          <SummaryTile
            label={t('Давно без помощи')}
            value={fmt.number(summary.waiting)}
            sub={t('больше {n} дней или ещё не получали', { n: WAIT_DAYS })}
            warn={summary.waiting > 0}
          />
        </section>
      )}

      {data && (
        <div className="layout-aside">
          <div className="min-w-0 flex flex-col gap-3">
            <section className="panel flex flex-col gap-3" aria-label={t('Фильтр списка')}>
              <div className="segmented" role="group" aria-label={t('Статус')}>
                {TABS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    aria-pressed={tab === x.id}
                    onClick={() => setTab(x.id)}
                    className="!min-h-11 !px-2 sm:!px-4 !text-[13px] sm:!text-sm hover:text-accent-700"
                  >
                    {t(x.label)}
                  </button>
                ))}
              </div>
              <label className="relative min-w-0">
                <span className="sr-only">{t('Поиск семьи')}</span>
                <IconSearch
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('ФИО, телефон, адрес или заметка')}
                  className="input pl-10"
                />
              </label>
            </section>

            {list.length === 0 ? (
              query ? (
                <EmptyState icon={<IconSearch />} title={t('Ничего не нашлось')}>
                  <button type="button" className="link-action min-h-11 px-1" onClick={() => setSearch('')}>
                    {t('Сбросить поиск')}
                  </button>
                </EmptyState>
              ) : tab === 'closed' ? (
                <EmptyState icon={<IconUsers size={24} />} title={t('Снятых с учёта семей нет')} />
              ) : (
                <EmptyState icon={<IconUsers size={24} />} title={t('Список пока пуст')}>
                  <p>
                    {anyFamilies
                      ? t('Сейчас на учёте нет ни одной семьи.')
                      : t('Добавьте семьи, которым помогает мечеть. Отмечайте каждую выдачу — так видно, кто давно не получал помощи.')}
                  </p>
                  <Link href={`${base}/needy/new`} className="btn btn-primary mt-4">
                    <IconPlus size={18} />
                    {t('Добавить семью')}
                  </Link>
                </EmptyState>
              )
            ) : (
              <section
                className={`panel !py-1 transition-opacity ${loading ? 'opacity-60' : ''}`}
                aria-label={t('Семьи')}
                aria-busy={loading}
              >
                <ul className="divide-y divide-line">
                  {list.map((b) => (
                    <FamilyRow key={b.id} b={b} href={`${base}/needy/${b.id}`} showStatus={tab !== 'active'} />
                  ))}
                </ul>
              </section>
            )}
            {list.length >= 500 && <p className="caption px-1">{t('Показаны первые 500 семей — уточните поиск.')}</p>}
          </div>

          <aside className="aside-sticky min-w-0 flex flex-col gap-3">
            <FundsPanel funds={data.funds} base={base} />
            <div className="infobox">
              <IconLock size={18} className="shrink-0 mt-px" />
              <span>{t('Эти данные видят только ваша мечеть и Комитет улемов. На сайте их нет.')}</span>
            </div>
          </aside>
        </div>
      )}
    </CabinetPage>
  );
}

function SummaryTile({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="panel min-w-0 flex flex-col gap-1">
      <p className="caption">{label}</p>
      <p
        className={`text-xl leading-7 sm:text-[26px] sm:leading-8 font-semibold tabular break-words ${
          warn ? 'text-[#A35A00]' : 'text-ink'
        }`}
      >
        {value}
      </p>
      {sub && <p className="caption">{sub}</p>}
    </div>
  );
}

function FamilyRow({ b, href, showStatus }: { b: Beneficiary; href: string; showStatus: boolean }) {
  const { t, fmt } = useI18n();
  const days = daysSinceAid(b.last_aid_on);
  const waiting = b.status === 'active' && (days === null || days >= WAIT_DAYS);
  const needs = b.needs.map((k) => t(AID_KIND_LABELS[k] ?? k)).join(', ');

  return (
    <li>
      <Link href={href} className="group flex items-start gap-3 min-h-[72px] py-3 text-ink hover:text-ink">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-base leading-[22px] font-semibold break-words group-hover:text-accent-700 transition-colors">
              {b.full_name}
            </span>
            {showStatus && b.status === 'closed' && <StatusBadge tone="neutral">{t('Снята с учёта')}</StatusBadge>}
            {b.other_mosques > 0 && (
              <StatusBadge tone="wait">
                {t('ещё в {n} {mosques}', {
                  n: b.other_mosques,
                  mosques: fmt.plural(b.other_mosques, ['мечети', 'мечетях', 'мечетях']),
                })}
              </StatusBadge>
            )}
          </div>
          <p className="caption break-words">
            {b.household_size} {fmt.plural(b.household_size, ['человек', 'человека', 'человек'])}
            {b.address ? ` · ${b.address}` : ''}
          </p>
          {b.situation.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {b.situation.map((s) => (
                <span key={s} className="badge">
                  {t(SITUATION_LABELS[s] ?? s)}
                </span>
              ))}
            </div>
          )}
          {needs && (
            <p className="text-[13px] leading-[18px] text-body break-words">
              {t('Нужно:')} {needs}
            </p>
          )}
          <p className="text-[13px] leading-[18px] tabular">
            <span className={waiting ? 'text-[#A35A00] font-medium' : 'text-body'}>
              {b.last_aid_on
                ? t('Последняя помощь — {when}', { when: fmt.daysAgo(b.last_aid_on) })
                : t('Помощи ещё не было')}
            </span>
            {b.aid_count > 0 && (
              <span className="text-muted">
                {' · '}
                {t('всего {sum}', { sum: fmt.money(b.aid_total) })}
              </span>
            )}
          </p>
        </div>
        <IconChevronRight size={18} className="text-hint shrink-0 mt-0.5" />
      </Link>
    </li>
  );
}

/** Сборы «Помощь нуждающимся»: сколько собрано, выдано и осталось. */
function FundsPanel({ funds, base }: { funds: WelfareFund[]; base: string }) {
  const { t, fmt } = useI18n();
  return (
    <section className="panel" aria-labelledby="funds-title">
      <h2 id="funds-title" className="overtitle">
        {t('Сборы «Помощь нуждающимся»')}
      </h2>
      {funds.length === 0 ? (
        <>
          <p className="body-text mt-2">
            {t('Откройте сбор в категории «Помощь нуждающимся» — пожертвования придут на счёт мечети, а выдачи семьям будут списываться из него.')}
          </p>
          <Link href={`${base}/campaigns/new`} className="btn btn-secondary btn-block mt-3">
            <IconPlus size={18} />
            {t('Новый сбор')}
          </Link>
        </>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {funds.map((f) => (
            <li key={f.campaign_id} className="tile flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="title-sm min-w-0 break-words">{f.title}</p>
                <StatusBadge tone={f.status === 'active' ? 'ok' : 'neutral'} onTile>
                  {t(f.status === 'active' ? 'Идёт сбор' : 'Завершена')}
                </StatusBadge>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-[13px] leading-[18px] tabular">
                <div className="min-w-0">
                  <dt className="text-muted">{t('Собрано')}</dt>
                  <dd className="font-medium text-ink break-words">{fmt.money(f.collected)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted">{t('Выдано')}</dt>
                  <dd className="font-medium text-ink break-words">{fmt.money(f.given)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted">{t('Осталось')}</dt>
                  <dd className="font-semibold text-ink break-words">{fmt.money(f.available)}</dd>
                </div>
              </dl>
              {f.reported && <p className="caption">{t('Отчёт подан — выдачи из этого сбора закрыты.')}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
