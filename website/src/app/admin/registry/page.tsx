'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconAlert, IconLandmark, IconSearch } from '@/components/icons';
import Dialog from '@/components/admin/Dialog';
import { AdminTitle, ListSkeleton, MOSQUE_BADGE, Notice, StatusBadge } from '@/components/admin/Moderation';
import { ApiError, Campaign, Mosque } from '@/lib/api';
import { canBlock, useAdmin } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';

/** Реестр мечетей по макету 12g: все мечети в любом статусе, фильтры, счётчики и меню строки. */

type RegistryMosque = Mosque & {
  created_at: string;
  active_campaigns: number;
  unreported_campaigns: number;
  active_collected: number;
};

const PAGE = 20;
const STATUSES: { value: string; label: string }[] = [
  { value: 'pending', label: 'На рассмотрении' },
  { value: 'approved', label: 'Одобрена' },
  { value: 'rejected', label: 'Отклонена' },
  { value: 'blocked', label: 'Заблокирована' },
];

export default function RegistryPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Registry />
    </Suspense>
  );
}

function Registry() {
  const { call, admin } = useAdmin();
  const { t, fmt } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.get('status') ?? '';
  const city = params.get('city') ?? '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const [rows, setRows] = useState<RegistryMosque[] | null>(null);
  const [total, setTotal] = useState(0);
  const [cities, setCities] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(q);
  const [notice, setNotice] = useState('');
  const [blocking, setBlocking] = useState<RegistryMosque | null>(null);
  const [version, setVersion] = useState(0);

  const write = useCallback(
    (next: Record<string, string>) => {
      const sp = new URLSearchParams(params.toString());
      Object.entries(next).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
      if (!('page' in next)) sp.delete('page');
      const s = sp.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    let alive = true;
    setRows(null);
    const sp = new URLSearchParams({ limit: String(PAGE), offset: String((page - 1) * PAGE) });
    if (status) sp.set('status', status);
    if (city) sp.set('city', city);
    if (q) sp.set('q', q);
    call<{ mosques: RegistryMosque[]; total: number; cities: string[] }>(`/admin/mosques?${sp}`)
      .then((r) => {
        if (!alive) return;
        setRows(r.mosques);
        setTotal(r.total);
        setCities(r.cities ?? []);
        setError('');
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Не удалось загрузить реестр'));
    return () => {
      alive = false;
    };
  }, [call, status, city, q, page, version]);

  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => write({ q: search }), 350);
    return () => clearTimeout(t);
  }, [search, q, write]);

  const unblock = async (m: RegistryMosque) => {
    try {
      await call(`/admin/mosques/${m.id}/unblock`, { method: 'POST', body: {} });
      setNotice(`«${m.name}» — ${t('блокировка снята')}.`);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось снять блокировку');
    }
  };

  const from = total === 0 ? 0 : (page - 1) * PAGE + 1;
  const to = Math.min(total, page * PAGE);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle
        over={t('Реестр')}
        sub={t('Все мечети в любом статусе. Блокировать мечеть может только суперадмин.')}
        aside={rows ? `${fmt.number(total)} ${fmt.plural(total, ['мечеть', 'мечети', 'мечетей'])}` : undefined}
      >
        {t('Мечети')}
      </AdminTitle>

      <section className="panel p-2 md:p-2 flex flex-col" aria-label={t('Реестр мечетей')}>
        <div className="flex flex-wrap items-center gap-2 p-2 pb-3">
          <label className="flex items-center gap-2 h-10 px-3.5 rounded-full bg-app text-muted focus-within:ring-2 focus-within:ring-accent-700 w-full sm:w-[300px]">
            <IconSearch size={16} className="shrink-0" />
            <span className="sr-only">{t('Поиск в реестре')}</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Название, адрес, имам, телефон')}
              className="flex-1 min-w-0 h-full border-0 p-0 bg-transparent text-sm text-ink focus:ring-0 focus:outline-none focus-visible:outline-none"
            />
          </label>
          <Select
            label={t('Статус')}
            value={status}
            all={t('Статус: все')}
            options={STATUSES.map((s) => ({ value: s.value, label: t(s.label) }))}
            onChange={(v) => write({ status: v })}
          />
          <Select label={t('Город')} value={city} all={t('Город: все')} options={cities.map((c) => ({ value: c, label: c }))} onChange={(v) => write({ city: v })} />
        </div>

        {notice && (
          <div className="px-2 pb-2">
            <Notice text={notice} onClose={() => setNotice('')} />
          </div>
        )}
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
            <EmptyState icon={<IconLandmark size={26} />} title={t('Ничего не нашлось')}>
              {t('Попробуйте другой запрос или снимите фильтры.')}
            </EmptyState>
          </div>
        )}
        {rows && rows.length > 0 && (
          <>
            <table className="hidden lg:table w-full table-fixed border-separate border-spacing-0 text-sm leading-5 text-ink">
              <caption className="sr-only">{t('Реестр мечетей')}</caption>
              <thead>
                <tr>
                  {[
                    ['Мечеть', ''],
                    ['Город', 'w-[120px]'],
                    ['Статус', 'w-[150px]'],
                    ['Идёт сборов', 'w-[110px] text-right hidden xl:table-cell'],
                    ['Без отчёта', 'w-[100px] text-right'],
                    ['Решение Комитета', 'w-[24%] hidden xl:table-cell'],
                    ['', 'w-[64px]'],
                  ].map(([h, w], i, arr) => (
                    <th
                      key={i}
                      scope="col"
                      className={`h-10 px-2 bg-app text-left text-[11px] leading-[15px] font-medium uppercase tracking-[.04em] text-sec whitespace-nowrap overflow-hidden text-ellipsis ${w} ${
                        i === 0 ? 'rounded-l-[14px] pl-3' : ''
                      } ${i === arr.length - 1 ? 'rounded-r-[14px] pr-3' : ''}`}
                    >
                      {h ? t(h) : <span className="sr-only">{t('Действия')}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="hover:[&>td]:bg-[#F4F8F8]">
                    <td className="h-14 pl-3 pr-2 py-2 border-b border-line">
                      <Link href={cardHref(m)} className="block font-medium text-ink hover:text-accent-700 truncate">
                        {m.name}
                      </Link>
                      <span className="block caption truncate">{m.address}</span>
                    </td>
                    <td className="px-2 py-2 border-b border-line truncate">{m.city}</td>
                    <td className="px-2 py-2 border-b border-line">
                      <StatusBadge status={MOSQUE_BADGE[m.status]} />
                    </td>
                    <td className="px-2 py-2 border-b border-line text-right tabular hidden xl:table-cell">{m.active_campaigns}</td>
                    <td className="px-2 py-2 border-b border-line text-right tabular">
                      {m.unreported_campaigns > 0 ? <span className="badge badge-danger">{m.unreported_campaigns}</span> : 0}
                    </td>
                    <td className="px-2 py-2 border-b border-line hidden xl:table-cell">
                      {m.moderation_note ? (
                        <span className="block text-[13px] leading-[18px] line-clamp-2 break-words" title={m.moderation_note}>
                          {m.moderation_note}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="pl-2 pr-3 py-2 border-b border-line text-right">
                      <RowMenu m={m} superadmin={canBlock(admin)} onBlock={() => setBlocking(m)} onUnblock={() => unblock(m)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="lg:hidden flex flex-col gap-2 p-2 pt-0">
              {rows.map((m) => (
                <li key={m.id} className="tile flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <Link href={cardHref(m)} className="min-w-0 flex-1 text-ink hover:text-accent-700">
                      <span className="block font-medium break-words">{m.name}</span>
                      <span className="block caption break-words">
                        {m.city} · {m.address}
                      </span>
                    </Link>
                    <RowMenu m={m} superadmin={canBlock(admin)} onBlock={() => setBlocking(m)} onUnblock={() => unblock(m)} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={MOSQUE_BADGE[m.status]} />
                    <span className="badge badge-neutral bg-white">{t('идёт сборов: {n}', { n: m.active_campaigns })}</span>
                    {m.unreported_campaigns > 0 && <span className="badge badge-danger">{t('без отчёта: {n}', { n: m.unreported_campaigns })}</span>}
                  </div>
                  {m.moderation_note && <p className="text-[13px] leading-[18px] text-body break-words">«{m.moderation_note}»</p>}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2 p-3">
              <p className="caption tabular">
                {t('Показаны {from}–{to} из {total}', { from, to, total })}
              </p>
              <div className="flex gap-2 ml-auto">
                <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => write({ page: String(page - 1) })}>
                  {t('Назад')}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => write({ page: String(page + 1) })}>
                  {t('Дальше')}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <BlockDialog
        mosque={blocking}
        onClose={() => setBlocking(null)}
        onDone={(m) => {
          setBlocking(null);
          setNotice(`«${m.name}» — ${t('мечеть заблокирована, пожертвования остановлены')}.`);
          setVersion((v) => v + 1);
        }}
      />
    </div>
  );
}

const cardHref = (m: Mosque) => `/admin/mosques?status=&q=${encodeURIComponent(m.name)}&id=${m.id}`;

function Select({
  label,
  value,
  all,
  options,
  onChange,
}: {
  label: string;
  value: string;
  all: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative inline-flex items-center flex-1 sm:flex-none min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 pl-3.5 pr-9 rounded-full bg-app text-[13px] font-medium text-ink appearance-none cursor-pointer border-0 focus:ring-2 focus:ring-accent-700 truncate"
      >
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-3.5 text-body text-xs">
        ▾
      </span>
    </label>
  );
}

/** Меню строки реестра: карточка, сборы и отчёты мечети, блокировка. */
function RowMenu({
  m,
  superadmin,
  onBlock,
  onUnblock,
}: {
  m: RegistryMosque;
  superadmin: boolean;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const q = encodeURIComponent(m.name);
  const item = 'flex items-center w-full min-h-[44px] px-3 rounded-[14px] text-sm font-medium text-left';
  return (
    <div ref={ref} className="relative inline-block shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-11 h-11 lg:w-10 lg:h-10 rounded-full inline-flex items-center justify-center text-ink ${open ? 'bg-app' : 'hover:bg-app'}`}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
        <span className="sr-only">{t('Действия: {name}', { name: m.name })}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[248px] bg-white rounded-tile p-1.5 shadow-[0_8px_24px_-12px_rgba(20,24,30,.18),0_0_0_1px_#EFF1F5] flex flex-col gap-0.5 text-left"
        >
          <Link role="menuitem" href={cardHref(m)} className={`${item} text-ink hover:bg-app hover:text-ink`}>
            {t('Открыть карточку')}
          </Link>
          <Link role="menuitem" href={`/admin/campaigns?status=&q=${q}`} className={`${item} text-ink hover:bg-app hover:text-ink`}>
            {t('Сборы мечети')}
          </Link>
          <Link role="menuitem" href={`/admin/reports?status=&q=${q}`} className={`${item} text-ink hover:bg-app hover:text-ink`}>
            {t('Отчёты мечети')}
          </Link>
          {superadmin && (m.status === 'approved' || m.status === 'pending') && (
            <>
              <div className="h-px bg-line my-1" role="separator" />
              <button
                role="menuitem"
                type="button"
                className={`${item} text-[#B42318] hover:bg-[#FDECEC]`}
                onClick={() => {
                  setOpen(false);
                  onBlock();
                }}
              >
                {t('Заблокировать…')}
              </button>
            </>
          )}
          {superadmin && m.status === 'blocked' && (
            <>
              <div className="h-px bg-line my-1" role="separator" />
              <button
                role="menuitem"
                type="button"
                className={`${item} text-ok hover:bg-ok-soft`}
                onClick={() => {
                  setOpen(false);
                  onUnblock();
                }}
              >
                {t('Снять блокировку')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** 12h: подтверждение блокировки — последствия, активные сборы и обязательная причина. */
function BlockDialog({ mosque, onClose, onDone }: { mosque: RegistryMosque | null; onClose: () => void; onDone: (m: RegistryMosque) => void }) {
  const { call } = useAdmin();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState<Campaign[] | null>(null);
  const { t, fmt } = useI18n();

  useEffect(() => {
    setReason('');
    setError('');
    setActive(null);
    if (!mosque) return;
    call<{ campaigns: Campaign[] }>(`/admin/mosques/${mosque.id}/campaigns`)
      .then((r) => setActive(r.campaigns.filter((c) => c.status === 'active')))
      .catch(() => setActive([]));
  }, [mosque, call]);

  if (!mosque) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      await call(`/admin/mosques/${mosque.id}/block`, { method: 'POST', body: { reason: reason.trim() } });
      onDone(mosque);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось заблокировать мечеть');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('Заблокировать мечеть?')}
      sub={`${mosque.name} · ${mosque.city}, ${mosque.address}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={onClose} disabled={busy}>
            {t('Отмена')}
          </button>
          <button
            type="submit"
            form="block-form"
            className="btn bg-[#B42318] text-white hover:bg-[#931B12] hover:text-white flex-1 sm:flex-none"
            disabled={busy || !reason.trim()}
          >
            {busy ? t('Блокируем…') : t('Заблокировать мечеть')}
          </button>
        </>
      }
    >
      <div className="flex gap-2.5 items-start rounded-tile px-3.5 py-3 bg-[#FDECEC] text-[13px] leading-[18px]">
        <IconAlert size={18} className="shrink-0 mt-px text-[#B42318]" />
        <span className="text-ink">
          {t('Пожертвования во все сборы мечети перестанут приниматься сразу. Мечеть увидит причину в карточке «Решение Комитета». Снять блокировку может только суперадмин.')}
        </span>
      </div>
      <dl className="kv">
        <div>
          <dt className="text-body">{t('Идёт сборов')}</dt>
          <dd className="font-medium text-ink text-right break-words">
            {mosque.active_campaigns}
            {active && active.length > 0 && ` · ${active.map((c) => `«${c.title}»`).join(', ')}`}
          </dd>
        </div>
        <div>
          <dt className="text-body">{t('Собрано в них')}</dt>
          <dd className="font-medium text-ink text-right tabular">{fmt.money(mosque.active_collected)}</dd>
        </div>
      </dl>
      <form id="block-form" onSubmit={submit}>
        <label htmlFor="block-reason" className="label">
          {t('Причина блокировки — её увидит мечеть')} <span className="caption">{t('(обязательно)')}</span>
        </label>
        <textarea
          id="block-reason"
          className="input resize-y min-h-[110px] py-3"
          required
          maxLength={2000}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-describedby="block-reason-count"
          placeholder={t('Что именно нарушено и как это проверено')}
        />
        <p id="block-reason-count" className="caption mt-1.5 flex justify-between gap-3">
          <span>{t('Без причины сервер не заблокирует мечеть')}</span>
          <span className="tabular">{reason.length} / 2000</span>
        </p>
      </form>
      {error && (
        <p className="alert-error" role="alert">
          {t(error)}
        </p>
      )}
    </Dialog>
  );
}
