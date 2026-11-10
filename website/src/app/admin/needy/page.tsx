'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, Suspense, useCallback, useEffect, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconAlert, IconChevronRight, IconHeart, IconSearch } from '@/components/icons';
import Dialog from '@/components/admin/Dialog';
import NoAccess from '@/components/admin/NoAccess';
import { AdminTitle, ListSkeleton } from '@/components/admin/Moderation';
import { ApiError } from '@/lib/api';
import { canModerate, useAdmin } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';
import { AID_KIND_LABELS, AidRecord, Beneficiary, SITUATION_LABELS } from '@/lib/needy';

/**
 * Общий список нуждающихся для Комитета: семьи на учёте во всех мечетях, выданная помощь
 * и возможные повторы (тот же телефон на учёте в другой мечети). Только просмотр.
 */

type Summary = { active: number; people: number; mosques: number; aid_total: number; duplicates: number };
type ListResponse = { beneficiaries: Beneficiary[]; total: number; summary: Summary; cities: string[] };
type Detail = { beneficiary: Beneficiary; aid: AidRecord[]; same_phone: Beneficiary[] };

const PAGE = 20;
const STATUSES: { value: string; label: string }[] = [
  { value: 'active', label: 'На учёте' },
  { value: 'closed', label: 'Сняты с учёта' },
  { value: 'all', label: 'Все' },
];

export default function NeedyPage() {
  const { admin } = useAdmin();
  if (admin && !canModerate(admin)) return <NoAccess role={admin.role} section="Общий список нуждающихся" forModerators />;
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Needy />
    </Suspense>
  );
}

function Needy() {
  const { call } = useAdmin();
  const { t, fmt } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawStatus = params.get('status');
  const status = STATUSES.some((s) => s.value === rawStatus) ? (rawStatus as string) : 'active';
  const city = params.get('city') ?? '';
  const q = params.get('q') ?? '';
  const dup = params.get('duplicates') === '1';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const openId = params.get('id') ?? '';

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(q);

  const write = useCallback(
    (next: Record<string, string>) => {
      const sp = new URLSearchParams(params.toString());
      Object.entries(next).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
      if (!('page' in next) && !('id' in next)) sp.delete('page');
      const s = sp.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const sp = new URLSearchParams({ status, limit: String(PAGE), offset: String((page - 1) * PAGE) });
    if (city) sp.set('city', city);
    if (q) sp.set('q', q);
    if (dup) sp.set('duplicates', '1');
    call<ListResponse>(`/admin/needy?${sp}`)
      .then((r) => {
        if (!alive) return;
        setData({ ...r, beneficiaries: r.beneficiaries ?? [], cities: r.cities ?? [] });
        setError('');
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Не удалось загрузить список'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [call, status, city, q, dup, page]);

  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q) return;
    const id = setTimeout(() => write({ q: search }), 350);
    return () => clearTimeout(id);
  }, [search, q, write]);

  const rows = loading ? null : (data?.beneficiaries ?? null);
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE + 1;
  const to = Math.min(total, page * PAGE);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const s = data?.summary;
  const open = (id: string) => write({ id });

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle
        over={t('Реестр')}
        sub={t('Семьи, которых мечети взяли на учёт, и выданная им помощь. Карточки ведут сами мечети — здесь только просмотр.')}
        aside={data ? `${fmt.number(total)} ${fmt.plural(total, ['семья', 'семьи', 'семей'])}` : undefined}
      >
        {t('Нуждающиеся')}
      </AdminTitle>

      {/* Сводка по всей стране — не зависит от фильтров */}
      {s ? (
        <dl className="grid gap-2 grid-cols-2 lg:grid-cols-5" aria-label={t('Сводка по всем мечетям')}>
          <Kpi label={t('Семей на учёте')} value={fmt.number(s.active)} />
          <Kpi label={t('Человек в этих семьях')} value={fmt.number(s.people)} />
          <Kpi label={t('Мечетей ведут учёт')} value={fmt.number(s.mosques)} />
          <Kpi label={t('Выдано всего')} value={fmt.money(s.aid_total)} />
          <Kpi
            wide
            warn={s.duplicates > 0}
            label={t('Возможных повторов')}
            value={fmt.number(s.duplicates)}
            sub={t('тот же телефон на учёте в другой мечети')}
          />
        </dl>
      ) : (
        !error && (
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`skeleton h-[84px] rounded-card ${i === 4 ? 'col-span-2 lg:col-span-1' : ''}`} />
            ))}
          </div>
        )
      )}

      <section className="panel p-2 md:p-2 flex flex-col" aria-label={t('Список нуждающихся')}>
        <div className="flex flex-col gap-2 p-2 pb-3 xl:flex-row xl:flex-wrap xl:items-center">
          <div role="group" aria-label={t('Статус')} className="segmented w-full sm:w-auto">
            {STATUSES.map((st) => (
              <button
                key={st.value}
                type="button"
                aria-pressed={status === st.value}
                onClick={() => write({ status: st.value === 'active' ? '' : st.value })}
                className="!min-h-11 lg:!min-h-8 !px-2 sm:!px-4 !text-[13px] sm:!text-sm hover:text-accent-700"
              >
                {t(st.label)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0 xl:flex-1">
            <label className="flex items-center gap-2 h-11 lg:h-10 px-3.5 rounded-full bg-app text-muted focus-within:ring-2 focus-within:ring-accent-700 w-full sm:w-[280px]">
              <IconSearch size={16} className="shrink-0" />
              <span className="sr-only">{t('Поиск по списку нуждающихся')}</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('ФИО, телефон, адрес')}
                className="flex-1 min-w-0 h-full border-0 p-0 bg-transparent text-sm text-ink focus:ring-0 focus:outline-none focus-visible:outline-none"
              />
            </label>
            <label className="relative inline-flex items-center flex-1 sm:flex-none min-w-0">
              <span className="sr-only">{t('Город')}</span>
              <select
                value={city}
                onChange={(e) => write({ city: e.target.value })}
                className="w-full h-11 lg:h-10 pl-3.5 pr-9 rounded-full bg-app text-[13px] font-medium text-ink appearance-none cursor-pointer border-0 focus:ring-2 focus:ring-accent-700 truncate"
              >
                <option value="">{t('Город: все')}</option>
                {(data?.cities ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute right-3.5 text-body text-xs">
                ▾
              </span>
            </label>
            <button
              type="button"
              aria-pressed={dup}
              onClick={() => write({ duplicates: dup ? '' : '1' })}
              className="chip min-h-11 lg:min-h-10 shrink-0"
            >
              <IconAlert size={16} className={dup ? '' : 'text-[#A35A00]'} />
              {t('Только возможные повторы')}
            </button>
          </div>
        </div>

        {error && (
          <p className="alert-error mx-2 mb-2" role="alert">
            {t(error)}
          </p>
        )}
        {!rows && !error && (
          <div className="p-2">
            <ListSkeleton />
          </div>
        )}
        {rows && rows.length === 0 && (
          <div className="p-2">
            <EmptyState icon={<IconHeart size={26} />} title={q || city || dup ? t('Ничего не нашлось') : t('Пока никого нет')}>
              {q || city || dup
                ? t('Попробуйте другой запрос или снимите фильтры.')
                : t('Здесь появятся семьи, которых мечети возьмут на учёт.')}
            </EmptyState>
          </div>
        )}
        {rows && rows.length > 0 && (
          <>
            <table className="hidden xl:table w-full table-fixed border-separate border-spacing-0 text-sm leading-5 text-ink">
              <caption className="sr-only">{t('Список нуждающихся')}</caption>
              <thead>
                <tr>
                  {[
                    ['ФИО и телефон', 'w-[22%]'],
                    ['Мечеть', 'w-[20%]'],
                    ['Семья', 'w-[84px]'],
                    ['Нужды', ''],
                    ['Последняя помощь', 'w-[150px]'],
                    ['Выдано', 'w-[104px] text-right'],
                    ['Контроль', 'w-[148px]'],
                  ].map(([h, w], i, arr) => (
                    <th
                      key={h}
                      scope="col"
                      className={`h-10 px-2 bg-app text-left text-[11px] leading-[15px] font-medium uppercase tracking-[.04em] text-sec whitespace-nowrap overflow-hidden text-ellipsis ${w} ${
                        i === 0 ? 'rounded-l-[14px] pl-3' : ''
                      } ${i === arr.length - 1 ? 'rounded-r-[14px] pr-3' : ''}`}
                    >
                      {t(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="cursor-pointer hover:[&>td]:bg-[#F4F8F8]" onClick={() => open(b.id)}>
                    <td className="h-14 pl-3 pr-2 py-2 border-b border-line">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          open(b.id);
                        }}
                        className="block max-w-full text-left font-medium text-ink hover:text-accent-700 truncate"
                      >
                        {b.full_name}
                      </button>
                      <span className="block caption truncate tabular">{b.phone || t('без телефона')}</span>
                    </td>
                    <td className="px-2 py-2 border-b border-line">
                      <span className="block truncate">{b.mosque_name}</span>
                      <span className="block caption truncate">{b.mosque_city}</span>
                    </td>
                    <td className="px-2 py-2 border-b border-line tabular whitespace-nowrap">
                      {b.household_size} {t('чел.')}
                    </td>
                    <td className="px-2 py-2 border-b border-line">
                      <span className="block text-[13px] leading-[18px] line-clamp-2 break-words">
                        {b.needs.length ? b.needs.map((n) => t(AID_KIND_LABELS[n] ?? n)).join(', ') : <span className="text-muted">—</span>}
                      </span>
                    </td>
                    <td className="px-2 py-2 border-b border-line">
                      {b.last_aid_on ? (
                        <>
                          <span className="block whitespace-nowrap">{fmt.dayMonth(b.last_aid_on)}</span>
                          <span className="block caption whitespace-nowrap">{fmt.daysAgo(b.last_aid_on)}</span>
                        </>
                      ) : (
                        <span className="text-muted">{t('ещё не было')}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 border-b border-line text-right tabular whitespace-nowrap">
                      {b.aid_total > 0 ? fmt.money(b.aid_total) : <span className="text-muted">—</span>}
                    </td>
                    <td className="pl-2 pr-3 py-2 border-b border-line">
                      <Flags b={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="xl:hidden flex flex-col gap-2 p-2 pt-0">
              {rows.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => open(b.id)}
                    className="tile w-full text-left flex flex-col gap-2 text-ink hover:bg-[#E9F1F0] transition-colors"
                  >
                    <span className="flex items-start gap-2 w-full">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium break-words">{b.full_name}</span>
                        <span className="block caption break-words">
                          {b.mosque_name} · {b.mosque_city}
                        </span>
                      </span>
                      <IconChevronRight size={18} className="text-hint shrink-0 mt-0.5" />
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Flags b={b} />
                      <span className="badge badge-neutral bg-white">
                        {t('семья: {n} чел.', { n: b.household_size })}
                      </span>
                      {b.aid_total > 0 && <span className="badge badge-neutral bg-white tabular">{t('выдано {sum}', { sum: fmt.money(b.aid_total) })}</span>}
                    </span>
                    <span className="caption break-words">
                      {b.last_aid_on
                        ? t('Последняя помощь: {when}', { when: `${fmt.dayMonth(b.last_aid_on)} · ${fmt.daysAgo(b.last_aid_on)}` })
                        : t('Помощь ещё не выдавалась')}
                      {b.needs.length > 0 && ` · ${t('нужды: {list}', { list: b.needs.map((n) => t(AID_KIND_LABELS[n] ?? n)).join(', ') })}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2 p-3">
              <p className="caption tabular">{t('Показаны {from}–{to} из {total}', { from, to, total })}</p>
              <div className="flex gap-2 ml-auto">
                <button type="button" className="btn btn-secondary btn-sm !min-h-11 lg:!min-h-10" disabled={page <= 1} onClick={() => write({ page: String(page - 1) })}>
                  {t('Назад')}
                </button>
                <button type="button" className="btn btn-secondary btn-sm !min-h-11 lg:!min-h-10" disabled={page >= pages} onClick={() => write({ page: String(page + 1) })}>
                  {t('Дальше')}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <DetailDialog id={openId} onOpen={open} onClose={() => write({ id: '' })} />
    </div>
  );
}

function Kpi({ label, value, sub, wide, warn }: { label: string; value: string; sub?: string; wide?: boolean; warn?: boolean }) {
  return (
    <div className={`panel !p-4 min-w-0 ${wide ? 'col-span-2 lg:col-span-1' : ''} ${warn ? '!bg-[#FDF0DC]' : ''}`}>
      <dt className={`text-xs leading-[17px] ${warn ? 'text-[#A35A00]' : 'text-body'}`}>{label}</dt>
      <dd className="text-[22px] leading-7 font-semibold tracking-[-.02em] tabular text-ink mt-0.5 break-words">{value}</dd>
      {sub && <dd className="caption mt-0.5">{sub}</dd>}
    </div>
  );
}

/** Отметки строки: возможный повтор и снятие с учёта. */
function Flags({ b }: { b: Beneficiary }) {
  const { t } = useI18n();
  if (b.other_mosques <= 0 && b.status === 'active') return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {b.other_mosques > 0 && (
        <span className="badge badge-warning">{t(b.other_mosques === 1 ? 'ещё в {n} мечети' : 'ещё в {n} мечетях', { n: b.other_mosques })}</span>
      )}
      {b.status === 'closed' && <span className="badge badge-neutral">{t('Снята с учёта')}</span>}
    </span>
  );
}

/** Карточка семьи: шторка снизу на телефоне и боковая панель на вебе. */
function DetailDialog({ id, onOpen, onClose }: { id: string; onOpen: (id: string) => void; onClose: () => void }) {
  const { call } = useAdmin();
  const { t, fmt } = useI18n();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setD(null);
    setError('');
    if (!id) return;
    let alive = true;
    call<Detail>(`/admin/needy/${encodeURIComponent(id)}`)
      .then((r) => alive && setD({ ...r, aid: r.aid ?? [], same_phone: r.same_phone ?? [] }))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Не удалось загрузить карточку'));
    return () => {
      alive = false;
    };
  }, [id, call]);

  const b = d?.beneficiary;
  const people = (n: number) => `${n} ${fmt.plural(n, ['человек', 'человека', 'человек'])}`;

  return (
    <Dialog
      open={!!id}
      onClose={onClose}
      variant="drawer"
      overtitle={b ? `${b.mosque_name ?? ''} · ${b.mosque_city ?? ''}` : t('Карточка семьи')}
      title={b ? b.full_name : error ? t('Карточка семьи') : t('Загрузка…')}
      sub={b ? t('На учёте с {date}', { date: fmt.date(b.created_at) }) : undefined}
    >
      {error && (
        <p className="alert-error" role="alert">
          {t(error)}
        </p>
      )}
      {!b && !error && (
        <div className="flex flex-col gap-3" aria-busy="true">
          <div className="skeleton h-5 w-2/3" />
          <div className="skeleton h-32 rounded-tile" />
          <div className="skeleton h-24 rounded-tile" />
        </div>
      )}
      {b && d && (
        <>
          {b.other_mosques > 0 && (
            <div className="flex gap-2.5 items-start rounded-tile px-3.5 py-3 bg-[#FDF0DC] text-[13px] leading-[18px]">
              <IconAlert size={18} className="shrink-0 mt-px text-[#A35A00]" />
              <span className="text-ink">
                {t(
                  b.other_mosques === 1
                    ? 'Тот же телефон на учёте ещё в {n} мечети — проверьте, не получает ли семья помощь дважды.'
                    : 'Тот же телефон на учёте ещё в {n} мечетях — проверьте, не получает ли семья помощь дважды.',
                  { n: b.other_mosques },
                )}
              </span>
            </div>
          )}
          {b.status === 'closed' && (
            <div className="infobox">
              <span className="font-medium">{t('Снята с учёта')}</span>
              <div className="min-w-0 break-words">{b.closed_reason ? `«${b.closed_reason}»` : t('Причина не указана')}</div>
            </div>
          )}

          <dl className="kv">
            <Row label={t('Телефон')}>
              {b.phone ? (
                <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`} className="tabular text-ink hover:text-accent-700">
                  {b.phone}
                </a>
              ) : (
                <span className="text-muted">{t('не указан')}</span>
              )}
            </Row>
            <Row label={t('Адрес')}>{b.address || <span className="text-muted">{t('не указан')}</span>}</Row>
            <Row label={t('Семья')}>{people(b.household_size)}</Row>
            <Row label={t('Выдано всего')}>
              <span className="tabular">
                {fmt.money(b.aid_total)}
                {b.aid_count > 0 && (
                  <span className="text-body font-normal">
                    {' '}
                    · {b.aid_count} {fmt.plural(b.aid_count, ['раз', 'раза', 'раз'])}
                  </span>
                )}
              </span>
            </Row>
            <Row label={t('Последняя помощь')}>
              {b.last_aid_on ? `${fmt.date(b.last_aid_on)} · ${fmt.daysAgo(b.last_aid_on)}` : <span className="text-muted">{t('ещё не было')}</span>}
            </Row>
          </dl>

          <Tags title={t('Положение семьи')} items={b.situation.map((s) => t(SITUATION_LABELS[s] ?? s))} />
          <Tags title={t('Нужды')} items={b.needs.map((n) => t(AID_KIND_LABELS[n] ?? n))} />

          {b.note && (
            <div className="tile">
              <p className="overtitle">{t('Заметка мечети')}</p>
              <p className="mt-1 text-sm leading-5 text-ink whitespace-pre-line break-words">{b.note}</p>
            </div>
          )}

          <section aria-labelledby="needy-aid">
            <h3 id="needy-aid" className="overtitle">
              {t('История помощи')}
            </h3>
            {d.aid.length === 0 ? (
              <p className="body-text mt-1.5">{t('Мечеть ещё не выдавала помощь этой семье.')}</p>
            ) : (
              <ul className="mt-2 bg-app rounded-tile px-3.5">
                {d.aid.map((a) => (
                  <li key={a.id} className="py-3 border-b border-white last:border-b-0 flex items-start gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-5 font-medium text-ink break-words">
                        {t(AID_KIND_LABELS[a.kind] ?? a.kind)}
                        {a.description && <span className="font-normal text-body"> · {a.description}</span>}
                      </span>
                      <span className="block caption break-words">
                        {fmt.date(a.given_on)} ·{' '}
                        {a.campaign_title ? t('из сбора «{title}»', { title: a.campaign_title }) : t('из средств мечети')}
                      </span>
                    </span>
                    <span className="text-sm leading-5 font-medium tabular whitespace-nowrap">{fmt.money(a.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {d.same_phone.length > 0 && (
            <section aria-labelledby="needy-same">
              <h3 id="needy-same" className="overtitle">
                {t('Та же семья в других мечетях')}
              </h3>
              <p className="caption mt-0.5">{t('Совпадает номер телефона.')}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {d.same_phone.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(o.id)}
                      className="tile w-full text-left flex items-start gap-2 text-ink hover:bg-[#E9F1F0] transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-5 font-medium break-words">{o.mosque_name}</span>
                        <span className="block caption break-words">
                          {o.mosque_city} · {o.full_name}
                        </span>
                        <span className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className={o.status === 'active' ? 'badge badge-success' : 'badge badge-neutral bg-white'}>
                            {t(o.status === 'active' ? 'На учёте' : 'Снята с учёта')}
                          </span>
                          <span className="badge badge-neutral bg-white tabular">
                            {o.aid_total > 0 ? t('выдано {sum}', { sum: fmt.money(o.aid_total) }) : t('помощи не было')}
                          </span>
                          {o.last_aid_on && <span className="badge badge-neutral bg-white">{fmt.dayMonth(o.last_aid_on)}</span>}
                        </span>
                      </span>
                      <IconChevronRight size={18} className="text-hint shrink-0 mt-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="caption">{t('Комитет видит карточку только для проверки: изменить её может лишь сама мечеть.')}</p>
        </>
      )}
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-body shrink-0">{label}</dt>
      <dd className="font-medium text-ink text-right min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Tags({ title, items }: { title: string; items: string[] }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="overtitle">{title}</p>
      {items.length ? (
        <ul className="flex flex-wrap gap-1.5 mt-2">
          {items.map((s) => (
            <li key={s} className="badge badge-sec">
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="body-text mt-1">{t('не указано')}</p>
      )}
    </div>
  );
}
