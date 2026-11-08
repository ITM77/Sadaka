'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconClock, IconClose, IconInfo, IconSearch } from '@/components/icons';
import Dialog from '@/components/admin/Dialog';
import NoAccess from '@/components/admin/NoAccess';
import { AdminTitle, ListSkeleton } from '@/components/admin/Moderation';
import { ApiError } from '@/lib/api';
import { canManageStaff, ROLE_LABELS, useAdmin } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';
import {
  ACTION_GROUPS,
  actionOf,
  AuditEntry,
  deviceOf,
  downloadAuditCsv,
  dushanbeDate,
  OBJECT_TYPES,
  objectHref,
  objectOne,
  Staff,
  statusLabel,
  TONE_CLASS,
} from '@/lib/audit';

const PAGE = 50;
const FILTER_KEYS = ['admin_id', 'action', 'object_type', 'from', 'to', 'q'] as const;
type Filters = Record<(typeof FILTER_KEYS)[number], string>;

export default function AuditPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <AuditSection />
    </Suspense>
  );
}

function AuditSection() {
  const { admin } = useAdmin();
  if (!admin) return null;
  if (!canManageStaff(admin)) return <NoAccess role={admin.role} section="Журнал действий" />;
  return <Journal />;
}

/** Фильтры живут в адресе: ссылку «Весь журнал сотрудника» можно открыть сразу отфильтрованной. */
function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => {
    const f = {} as Filters;
    FILTER_KEYS.forEach((k) => (f[k] = params.get(k) ?? ''));
    return f;
  }, [params]);
  const entryId = params.get('entry');

  const write = useCallback(
    (next: Partial<Filters>, entry: string | null = null) => {
      const sp = new URLSearchParams();
      const merged = { ...filters, ...next };
      FILTER_KEYS.forEach((k) => merged[k] && sp.set(k, merged[k]));
      if (entry) sp.set('entry', entry);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );
  return { filters, entryId, write };
}

/** Параметры для API: группы действий раскрываются в коды. */
function apiQuery(f: Filters) {
  const sp = new URLSearchParams();
  if (f.admin_id) sp.set('admin_id', f.admin_id);
  if (f.action) {
    const codes = f.action
      .split(',')
      .flatMap((g) => ACTION_GROUPS.find((x) => x.value === g)?.codes ?? []);
    if (codes.length) sp.set('action', codes.join(','));
  }
  if (f.object_type) sp.set('object_type', f.object_type);
  if (f.from) sp.set('from', f.from);
  if (f.to) sp.set('to', f.to);
  if (f.q.trim()) sp.set('q', f.q.trim());
  return sp.toString();
}

function Journal() {
  const { call, token } = useAdmin();
  const { t, fmt } = useI18n();
  const { filters, entryId, write } = useFilters();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState(filters.q);

  const query = apiQuery(filters);

  useEffect(() => {
    call<{ staff: Staff[] }>('/admin/staff')
      .then((r) => setStaff(r.staff))
      .catch(() => setStaff([]));
  }, [call]);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    setError('');
    call<{ entries: AuditEntry[]; total: number }>(`/admin/audit?limit=${PAGE}${query ? `&${query}` : ''}`)
      .then((r) => {
        if (!alive) return;
        setEntries(r.entries);
        setTotal(r.total);
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Не удалось загрузить журнал'));
    return () => {
      alive = false;
    };
  }, [call, query]);

  // Поиск — с паузой, чтобы не дёргать сервер на каждую букву.
  useEffect(() => setSearch(filters.q), [filters.q]);
  useEffect(() => {
    if (search === filters.q) return;
    const t = setTimeout(() => write({ q: search }), 350);
    return () => clearTimeout(t);
  }, [search, filters.q, write]);

  const more = async () => {
    if (!entries) return;
    setLoadingMore(true);
    try {
      const r = await call<{ entries: AuditEntry[]; total: number }>(
        `/admin/audit?limit=${PAGE}&offset=${entries.length}${query ? `&${query}` : ''}`,
      );
      setEntries([...entries, ...r.entries]);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось загрузить записи');
    } finally {
      setLoadingMore(false);
    }
  };

  const staffName = (id: string) => staff.find((s) => s.id === id)?.full_name ?? t('сотрудник');
  const chips: { key: keyof Filters; label: string }[] = [];
  if (filters.admin_id) chips.push({ key: 'admin_id', label: staffName(filters.admin_id) });
  if (filters.action)
    chips.push({ key: 'action', label: t(ACTION_GROUPS.find((g) => g.value === filters.action)?.label ?? filters.action) });
  if (filters.object_type)
    chips.push({ key: 'object_type', label: t(OBJECT_TYPES.find((o) => o.value === filters.object_type)?.label ?? filters.object_type) });
  if (filters.from) chips.push({ key: 'from', label: t('с {date}', { date: filters.from.split('-').reverse().join('.') }) });
  if (filters.to) chips.push({ key: 'to', label: t('по {date}', { date: filters.to.split('-').reverse().join('.') }) });
  if (filters.q) chips.push({ key: 'q', label: `«${filters.q}»` });

  const period = (days: number | null) =>
    days === null ? write({ from: '', to: '' }) : write({ from: dushanbeDate(-(days - 1)), to: dushanbeDate() });
  const activePeriod =
    filters.to === dushanbeDate() ? [1, 7, 30].find((d) => filters.from === dushanbeDate(-(d - 1))) ?? null : null;

  const selected = entries?.find((e) => e.id === entryId) ?? null;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle
        over={t('Управление')}
        sub={t('Все решения сотрудников: кто, когда и с какой причиной. Записи нельзя изменить или удалить.')}
        aside={entries ? `${fmt.number(total)} ${fmt.plural(total, ['запись', 'записи', 'записей'])}` : undefined}
      >
        {t('Журнал действий')}
      </AdminTitle>

      <section className="panel flex flex-col gap-4" aria-label={t('Фильтры журнала')}>
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_150px_150px] gap-2">
          <Select
            label={t('Сотрудник')}
            value={filters.admin_id}
            onChange={(v) => write({ admin_id: v })}
            options={staff.map((s) => ({ value: s.id, label: s.full_name }))}
            all={t('Сотрудник: все')}
          />
          <Select
            label={t('Действие')}
            value={filters.action}
            onChange={(v) => write({ action: v })}
            options={ACTION_GROUPS.map((g) => ({ value: g.value, label: t(g.label) }))}
            all={t('Действие: все')}
          />
          <Select
            label={t('Объект')}
            value={filters.object_type}
            onChange={(v) => write({ object_type: v })}
            options={OBJECT_TYPES.map((o) => ({ value: o.value, label: t(o.label) }))}
            all={t('Объект: все')}
          />
          <DateField label={t('с')} value={filters.from} onChange={(v) => write({ from: v })} max={filters.to || undefined} />
          <DateField label={t('по')} value={filters.to} onChange={(v) => write({ to: v })} min={filters.from || undefined} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label={t('Быстрый период')}>
            {[
              { d: 1, l: 'Сегодня' },
              { d: 7, l: '7 дней' },
              { d: 30, l: '30 дней' },
            ].map((p) => (
              <button key={p.d} type="button" className="chip min-h-[44px]" aria-pressed={activePeriod === p.d} onClick={() => period(p.d)}>
                {t(p.l)}
              </button>
            ))}
          </div>
          <label className="input flex items-center gap-2.5 text-muted cursor-text focus-within:border-accent-700 flex-1 min-w-[220px] lg:max-w-[340px] lg:ml-auto">
            <IconSearch size={18} className="shrink-0" />
            <span className="sr-only">{t('Поиск в журнале')}</span>
            <input
              type="search"
              placeholder={t('Объект, сотрудник или причина')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 h-full border-0 p-0 bg-transparent text-base text-ink focus:ring-0 focus:outline-none focus-visible:outline-none"
            />
          </label>
          <button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={() => setExporting(true)} disabled={!entries || total === 0}>
            {t('Скачать CSV')}
          </button>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" aria-label={t('Применённые фильтры')}>
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                className="chip bg-accent-100 text-accent-700 min-h-[36px] pr-2.5"
                onClick={() => write({ [c.key]: '' })}
              >
                {c.label}
                <IconClose size={14} />
                <span className="sr-only">— {t('снять фильтр')}</span>
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => write({ admin_id: '', action: '', object_type: '', from: '', to: '', q: '' })}
            >
              {t('Сбросить всё')}
            </button>
          </div>
        )}
      </section>

      <section className="panel flex flex-col gap-3" aria-label={t('Записи журнала')}>
        {error && (
          <p className="alert-error" role="alert">
            {t(error)}
          </p>
        )}
        {!entries && !error && <ListSkeleton />}
        {entries && entries.length === 0 && (
          <EmptyState icon={<IconClock size={26} />} title={t(chips.length ? 'Ничего не нашлось' : 'Журнал пока пуст')}>
            {t(
              chips.length
                ? 'Попробуйте снять часть фильтров.'
                : 'Здесь появятся решения по мечетям, сборам и отчётам и изменения сотрудников.',
            )}
          </EmptyState>
        )}
        {entries && entries.length > 0 && (
          <>
            {/* Веб: таблица 12j */}
            <div className="hidden lg:block -mx-1">
              <table className="w-full text-sm leading-5 border-separate border-spacing-0 table-fixed">
                <caption className="sr-only">{t('Решения сотрудников, сначала новые')}</caption>
                <colgroup>
                  <col className="w-[140px]" />
                  <col className="w-[180px]" />
                  <col className="w-[200px]" />
                  <col className="w-[280px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="text-left text-xs leading-4 text-body">
                    {['Время', 'Сотрудник', 'Действие', 'Объект', 'Причина'].map((h) => (
                      <th key={h} scope="col" className="font-medium px-3 py-2.5 border-b border-line">
                        {t(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className={`hover:bg-app/60 ${e.id === entryId ? 'bg-accent-100/60' : ''}`}>
                      <td className="px-3 py-2.5 border-b border-line align-top">
                        <button
                          type="button"
                          className="text-left tabular font-medium text-ink hover:text-accent-700 min-h-[32px]"
                          onClick={() => write({}, e.id)}
                        >
                          {fmt.short(e.created_at)}
                          <span className="sr-only"> — {t('открыть запись')}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 border-b border-line align-top text-ink break-words">{e.actor_name}</td>
                      <td className="px-3 py-2.5 border-b border-line align-top">
                        <ActionBadge code={e.action} />
                      </td>
                      <td className="px-3 py-2.5 border-b border-line align-top">
                        <Link href={objectHref(e)} className="font-medium text-accent-700 hover:text-accent-800 break-words">
                          {e.object_title}
                        </Link>
                        <span className="block caption break-words">
                          {t(objectOne(e.object_type))}
                          {e.object_subtitle ? ` · ${e.object_subtitle}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-line align-top text-ink">
                        {e.reason ? <span className="line-clamp-2 break-words">{e.reason}</span> : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Телефон и планшет: карточки */}
            <ul className="lg:hidden flex flex-col gap-2">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => write({}, e.id)}
                    className="tile w-full text-left flex flex-col gap-1.5 hover:bg-[#DDE7E6] transition-colors"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <ActionBadge code={e.action} />
                      <span className="caption tabular whitespace-nowrap">{fmt.short(e.created_at)}</span>
                    </span>
                    <span className="font-medium text-ink break-words">{e.object_title}</span>
                    <span className="caption break-words">
                      {t(objectOne(e.object_type))}
                      {e.object_subtitle ? ` · ${e.object_subtitle}` : ''} · {e.actor_name}
                    </span>
                    {e.reason && <span className="text-sm leading-5 text-body line-clamp-2 break-words">«{e.reason}»</span>}
                  </button>
                </li>
              ))}
            </ul>

            {entries.length < total && (
              <button type="button" className="btn btn-secondary self-center" onClick={more} disabled={loadingMore}>
                {loadingMore ? t('Загружаем…') : t('Показать ещё · осталось {n}', { n: total - entries.length })}
              </button>
            )}
          </>
        )}
      </section>

      <EntryDrawer
        id={entryId}
        entry={selected}
        position={entries && selected ? entries.indexOf(selected) + 1 : 0}
        total={total}
        onClose={() => write({})}
      />

      <ExportDialog
        open={exporting}
        onClose={() => setExporting(false)}
        chips={chips.map((c) => c.label)}
        total={total}
        onDownload={() => downloadAuditCsv(query, token)}
      />
    </div>
  );
}

function ActionBadge({ code }: { code: string }) {
  const { t } = useI18n();
  const a = actionOf(code);
  return <span className={`${TONE_CLASS[a.tone]} whitespace-normal`}>{t(a.label)}</span>;
}

function Select({
  label,
  value,
  onChange,
  options,
  all,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  all: string;
}) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input pr-9 appearance-none cursor-pointer truncate">
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-body">
        ▾
      </span>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  const { t } = useI18n();
  return (
    <label className="input flex items-center gap-2 text-body focus-within:border-accent-700">
      <span className="text-sm shrink-0">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t('Период {label}', { label })}
        className="flex-1 min-w-0 h-full border-0 p-0 bg-transparent text-[15px] text-ink focus:ring-0 focus:outline-none focus-visible:outline-none"
      />
    </label>
  );
}

/* ---------- 12r Запись журнала ---------- */

function EntryDrawer({
  id,
  entry,
  position,
  total,
  onClose,
}: {
  id: string | null;
  entry: AuditEntry | null;
  position: number;
  total: number;
  onClose: () => void;
}) {
  const { call } = useAdmin();
  const { t, fmt } = useI18n();
  const [loaded, setLoaded] = useState<AuditEntry | null>(null);
  const [error, setError] = useState('');

  // Запись по прямой ссылке может быть не на первой странице — догружаем.
  useEffect(() => {
    setLoaded(null);
    setError('');
    if (!id || entry) return;
    let alive = true;
    call<{ entry: AuditEntry }>(`/admin/audit/${id}`)
      .then((r) => alive && setLoaded(r.entry))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Не удалось открыть запись'));
    return () => {
      alive = false;
    };
  }, [id, entry, call]);

  const e = entry ?? loaded;
  const a = e ? actionOf(e.action) : null;

  return (
    <Dialog
      open={Boolean(id)}
      onClose={onClose}
      variant="drawer"
      overtitle={position ? t('Запись журнала · {pos} из {n}', { pos: position, n: total }) : t('Запись журнала')}
      title={a ? t(a.label) : t('Загрузка…')}
      sub={e ? `${e.object_title}${e.object_subtitle ? ` · ${e.object_subtitle}` : ''}` : undefined}
      footer={
        e ? (
          <Link href={objectHref(e)} className="btn btn-secondary flex-1">
            {t('Открыть объект')}
          </Link>
        ) : undefined
      }
    >
      {error && (
        <p className="alert-error" role="alert">
          {t(error)}
        </p>
      )}
      {!e && !error && <div className="skeleton h-48 rounded-tile" aria-busy="true" />}
      {e && (
        <>
          <dl className="kv">
            <Row label={t('Время')}>
              <span className="tabular">{fmt.dateTimeSec(e.created_at)}</span>
              <span className="block caption font-normal">{t('по Душанбе, UTC+5')}</span>
            </Row>
            <Row label={t('Сотрудник')}>
              {e.actor_name}
              {e.actor_role && <span className="block caption font-normal">{t(ROLE_LABELS[e.actor_role])}</span>}
            </Row>
            <Row label={t('Действие')}>
              <ActionBadge code={e.action} />
            </Row>
            <Row label={t('Объект')}>
              {e.object_title}
              <span className="block caption font-normal">
                {t(objectOne(e.object_type))}
                {e.object_subtitle ? ` · ${e.object_subtitle}` : ''}
              </span>
            </Row>
            {(e.from_status || e.to_status) && (
              <Row label={t(e.action === 'admin.role_change' || e.action === 'admin.invite' ? 'Роль' : 'Статус')}>
                {e.from_status && (
                  <>
                    {t(statusLabel(e.object_type, e.from_status))}
                    <span aria-hidden="true" className="text-body font-normal"> → </span>
                    <span className="sr-only"> {t('стало')} </span>
                  </>
                )}
                {t(statusLabel(e.object_type, e.to_status))}
              </Row>
            )}
            {e.details && <Row label={t('Подробности')}>{t(e.details)}</Row>}
          </dl>

          {e.reason && (
            <section className="tile">
              <h3 className="overtitle">
                {t(e.object_type === 'admin' ? 'Причина — видят суперадмины' : 'Причина — её видит мечеть')}
              </h3>
              <p className="mt-1 text-sm leading-5 text-ink whitespace-pre-line break-words">{e.reason}</p>
            </section>
          )}

          <section>
            <h3 className="overtitle mb-1.5">{t('Откуда выполнено')}</h3>
            <dl className="kv">
              <Row label={t('IP-адрес')}>
                <span className="tabular">{e.ip || t('не записан')}</span>
              </Row>
              <Row label={t('Устройство')}>{deviceOf(e.user_agent) || t('не записано')}</Row>
            </dl>
          </section>
        </>
      )}
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="!items-start py-2.5">
      <dt className="text-body shrink-0">{label}</dt>
      <dd className="font-medium text-ink text-right min-w-0 break-words">{children}</dd>
    </div>
  );
}

/* ---------- 12t Выгрузка ---------- */

function ExportDialog({
  open,
  onClose,
  chips,
  total,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  chips: string[];
  total: number;
  onDownload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { t, fmt } = useI18n();
  useEffect(() => setError(''), [open]);

  const go = async () => {
    setBusy(true);
    setError('');
    try {
      await onDownload();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось выгрузить журнал');
    } finally {
      setBusy(false);
    }
  };

  const n = Math.min(total, 10000);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('Выгрузка журнала')}
      sub={chips.length ? t('С текущими фильтрами: {list}', { list: chips.join(' · ') }) : t('Весь журнал, без фильтров')}
      footer={
        <>
          <button type="button" className="btn btn-primary flex-1 sm:flex-none" onClick={go} disabled={busy}>
            {busy ? t('Готовим файл…') : t('Скачать CSV')}
          </button>
          <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={onClose} disabled={busy}>
            {t('Отмена')}
          </button>
        </>
      }
    >
      <div className="tile">
        <p className="font-medium text-ink">{t('CSV · UTF-8, разделитель «;»')}</p>
        <p className="caption mt-0.5">{t('Сразу открывается в Excel и Google Таблицах.')}</p>
      </div>
      <div className="infobox">
        <IconInfo size={18} className="shrink-0 mt-px" />
        <span>
          {t('В файле {n} {word}', { n: fmt.number(n), word: fmt.plural(n, ['запись', 'записи', 'записей']) })}
          {total > 10000 ? ` — ${t('первые 10 000, сузьте период, чтобы выгрузить остальное')}` : ''}.{' '}
          {t('Столбцы: время, сотрудник, роль, действие, объект, статус до и после, причина, IP.')}
        </span>
      </div>
      {error && (
        <p className="alert-error" role="alert">
          {t(error)}
        </p>
      )}
    </Dialog>
  );
}
