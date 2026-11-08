'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconSearch } from '@/components/icons';
import { useI18n } from '@/lib/i18n/client';
import Dialog from './Dialog';
import { ListSkeleton, Tab } from './Moderation';

/**
 * Очередь проверки по макетам 12c / 12e / 12f.
 * Веб: слева таблица с фильтром статуса и сортировкой, справа панель решения 440–480 px
 * по выбранной строке (?id=…). Телефон и планшет: строки-карточки, решение — в шторке снизу.
 * J / K — следующая / предыдущая строка.
 */

export type Column<T> = {
  key: string;
  label: string;
  /** Ширина колонки (Tailwind w-[…]); без неё колонка тянется. */
  width?: string;
  align?: 'right';
  /** Второстепенная колонка: видна только на широких экранах (от 1536 px), иначе название не помещается. */
  wide?: boolean;
  cell: (row: T) => ReactNode;
};

export type PanelParts = {
  over: ReactNode;
  title: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
};

type Props<T extends { id: string }> = {
  base: string;
  current: string;
  tabs: Tab[];
  items: T[] | null;
  error: string;
  columns: Column<T>[];
  caption: string;
  /** Строка-карточка на телефоне. */
  card: (row: T) => { title: ReactNode; meta?: ReactNode; badge?: ReactNode; extra?: ReactNode };
  panel: (row: T, position: number, total: number) => PanelParts;
  empty: { icon: ReactNode; text: ReactNode };
  search: { value: string; onChange: (v: string) => void; placeholder: string; label: string };
  sort: 'old' | 'new';
  onSort: (s: 'old' | 'new') => void;
  notice?: ReactNode;
};

const KBD = 'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-app text-ink text-xs font-semibold';

function useIsDesktop() {
  const [desk, setDesk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const on = () => setDesk(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desk;
}

export function QueueLayout<T extends { id: string }>(p: Props<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get('id');
  const desktop = useIsDesktop();
  const { t: tr } = useI18n();

  const select = useCallback(
    (id: string | null) => {
      const sp = new URLSearchParams(params.toString());
      if (id) sp.set('id', id);
      else sp.delete('id');
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const rows = useMemo(() => p.items ?? [], [p.items]);
  const index = rows.findIndex((r) => r.id === selectedId);
  const selected = index >= 0 ? rows[index] : null;

  // На вебе панель решения не бывает пустой: выбираем первую строку.
  useEffect(() => {
    if (desktop && p.items && p.items.length > 0 && !selected) select(p.items[0].id);
  }, [desktop, p.items, selected, select]);

  // J / K — по строкам, если фокус не в поле ввода.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || t.closest('input,textarea,select,[contenteditable],dialog[open]')) return;
      if (!rows.length) return;
      const k = e.key.toLowerCase();
      if (k !== 'j' && k !== 'k' && k !== 'о' && k !== 'л') return;
      e.preventDefault();
      const next = k === 'j' || k === 'о' ? Math.min(rows.length - 1, index + 1) : Math.max(0, index - 1);
      select(rows[next < 0 ? 0 : next].id);
      document.getElementById(`row-${rows[next < 0 ? 0 : next].id}`)?.scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, index, select]);

  const parts = selected ? p.panel(selected, index + 1, rows.length) : null;
  const href = (t: Tab) => (t.value ? `${p.base}?status=${t.value}` : `${p.base}?status=`);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_480px] xl:items-start">
      <section className="panel p-2 md:p-2 flex flex-col min-w-0" aria-label={tr(p.caption)}>
        <div className="flex flex-wrap items-center gap-2 p-2 pb-3">
          <nav aria-label={tr('Статус')} className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-2 px-2 max-w-full">
            {p.tabs.map((t) => {
              const active = p.current === t.value;
              return (
                <Link key={t.value || 'all'} href={href(t)} aria-current={active ? 'page' : undefined} className="chip min-h-[40px] shrink-0">
                  {tr(t.label)}
                  {typeof t.count === 'number' && <span className={`tabular ${active ? '' : 'text-muted'}`}>{t.count}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <label className="flex items-center gap-2 h-10 px-3.5 rounded-full bg-app text-muted focus-within:ring-2 focus-within:ring-accent-700 flex-1 sm:flex-none sm:w-[220px] min-w-0">
              <IconSearch size={16} className="shrink-0" />
              <span className="sr-only">{tr(p.search.label)}</span>
              <input
                type="search"
                value={p.search.value}
                onChange={(e) => p.search.onChange(e.target.value)}
                placeholder={tr(p.search.placeholder)}
                className="flex-1 min-w-0 h-full border-0 p-0 bg-transparent text-sm text-ink focus:ring-0 focus:outline-none focus-visible:outline-none"
              />
            </label>
            <label className="relative inline-flex items-center">
              <span className="sr-only">{tr('Сортировка')}</span>
              <select
                value={p.sort}
                onChange={(e) => p.onSort(e.target.value as 'old' | 'new')}
                className="h-10 pl-3.5 pr-9 rounded-full bg-app text-[13px] font-medium text-ink appearance-none cursor-pointer border-0 focus:ring-2 focus:ring-accent-700"
              >
                <option value="old">{tr('Сначала старые')}</option>
                <option value="new">{tr('Сначала новые')}</option>
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute right-3.5 text-body text-xs">
                ▾
              </span>
            </label>
          </div>
        </div>

        {p.notice && <div className="px-2 pb-2">{p.notice}</div>}
        {p.error && (
          <p className="alert-error mx-2 mb-2" role="alert">
            {tr(p.error)}
          </p>
        )}
        {!p.items && !p.error && (
          <div className="p-2">
            <ListSkeleton />
          </div>
        )}
        {p.items && p.items.length === 0 && (
          <div className="p-2">
            <EmptyState icon={p.empty.icon} title={tr('Здесь пусто')}>
              {typeof p.empty.text === 'string' ? tr(p.empty.text) : p.empty.text}
            </EmptyState>
          </div>
        )}

        {rows.length > 0 && (
          <>
            {/* Веб: таблица */}
            <table className="hidden xl:table w-full table-fixed border-separate border-spacing-0 text-sm leading-5 text-ink">
              <caption className="sr-only">{tr(p.caption)}</caption>
              <thead>
                <tr>
                  {p.columns.map((c, i) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={`h-10 px-2 bg-app text-left text-[11px] leading-[15px] font-medium uppercase tracking-[.04em] text-sec whitespace-nowrap overflow-hidden text-ellipsis ${
                        c.width ?? ''
                      } ${c.wide ? 'hidden 2xl:table-cell' : ''} ${c.align === 'right' ? 'text-right' : ''} ${i === 0 ? 'rounded-l-[14px] pl-3' : ''} ${
                        i === p.columns.length - 1 ? 'rounded-r-[14px] pr-3' : ''
                      }`}
                    >
                      {tr(c.label)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const on = r.id === selectedId;
                  return (
                    <tr
                      key={r.id}
                      id={`row-${r.id}`}
                      onClick={() => select(r.id)}
                      className={`cursor-pointer group ${on ? '' : 'hover:[&>td]:bg-[#F4F8F8]'}`}
                      aria-selected={on}
                    >
                      {p.columns.map((c, i) => (
                        <td
                          key={c.key}
                          className={`h-14 px-2 py-2 align-middle border-b ${c.wide ? 'hidden 2xl:table-cell' : ''} ${on ? 'bg-accent-100 border-white' : 'border-line'} ${
                            c.align === 'right' ? 'text-right tabular whitespace-nowrap' : ''
                          } ${i === 0 ? 'pl-3' : ''} ${i === p.columns.length - 1 ? 'pr-3' : ''} ${
                            on && i === 0 ? 'rounded-l-[14px]' : ''
                          } ${on && i === p.columns.length - 1 ? 'rounded-r-[14px]' : ''}`}
                        >
                          {i === 0 ? (
                            <button
                              type="button"
                              className="block w-full text-left min-w-0 focus-visible:outline-offset-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                select(r.id);
                              }}
                              aria-current={on ? 'true' : undefined}
                            >
                              {c.cell(r)}
                            </button>
                          ) : (
                            c.cell(r)
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="hidden xl:flex items-center gap-1.5 flex-wrap caption px-3 pt-3 pb-1">
              <kbd className={KBD}>J</kbd>/<kbd className={KBD}>K</kbd> — {tr('следующая / предыдущая строка')}
            </p>

            {/* Телефон и планшет: карточки */}
            <ul className="xl:hidden flex flex-col gap-2 p-2 pt-0">
              {rows.map((r) => {
                const c = p.card(r);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => select(r.id)}
                      className="tile w-full text-left flex flex-col items-start gap-1.5 hover:bg-[#DDE7E6] transition-colors"
                    >
                      <span className="w-full flex items-start justify-between gap-2">
                        <span className="font-medium text-ink break-words min-w-0">{c.title}</span>
                        {c.badge}
                      </span>
                      {c.meta && <span className="caption break-words">{c.meta}</span>}
                      {c.extra}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Веб: панель решения */}
      <section
        className="hidden xl:flex panel p-0 flex-col sticky top-4 max-h-[calc(100vh-140px)] min-h-[420px] overflow-hidden"
        aria-label={tr('Панель решения')}
      >
        {parts ? (
          <>
            <div className="flex-none px-5 pt-5 pb-3.5 flex flex-col gap-1.5 border-b border-line">
              <p className="overtitle">{parts.over}</p>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl leading-[26px] font-semibold tracking-[-.01em] text-ink break-words min-w-0">{parts.title}</h2>
                {parts.badge}
              </div>
              {parts.meta && <p className="caption break-words">{parts.meta}</p>}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3.5 flex flex-col gap-3.5">{parts.body}</div>
            {parts.footer && <div className="flex-none px-5 pt-4 pb-5 border-t border-line flex flex-col gap-3 bg-white">{parts.footer}</div>}
          </>
        ) : (
          <p className="body-text p-5">{tr('Выберите строку слева — здесь появятся данные и кнопки решения.')}</p>
        )}
      </section>

      {/* Телефон и планшет: решение в шторке */}
      {!desktop && (
        <Dialog
          open={Boolean(parts)}
          onClose={() => select(null)}
          variant="drawer"
          overtitle={parts?.over}
          title={parts?.title ?? ''}
          sub={parts?.meta}
          footer={parts?.footer}
        >
          {parts?.badge && <div>{parts.badge}</div>}
          {parts?.body}
        </Dialog>
      )}
    </div>
  );
}

/** Сортировка очереди: по умолчанию сначала самые старые — так ничего не залёживается. */
export function useSorted<T>(items: T[] | null, date: (t: T) => string, sort: 'old' | 'new') {
  return useMemo(() => {
    if (!items) return null;
    const s = [...items].sort((a, b) => Date.parse(date(a)) - Date.parse(date(b)));
    return sort === 'old' ? s : s.reverse();
  }, [items, date, sort]);
}

/** Плитки «ключ — значение» в две колонки (класс .fl макета). */
export function Facts({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }[] }) {
  const { t } = useI18n();
  return (
    <dl className="grid grid-cols-2 gap-2">
      {items.map((i) => (
        <div key={i.label} className="bg-app rounded-2xl px-3.5 py-2.5 min-w-0 flex flex-col gap-0.5">
          <dt className="text-xs leading-[17px] text-body">{t(i.label)}</dt>
          <dd className={`text-sm leading-5 font-medium break-words ${i.tone ?? 'text-ink'}`}>{i.value}</dd>
          {i.sub && <dd className="caption">{typeof i.sub === 'string' ? t(i.sub) : i.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Заголовок блока внутри панели. */
export function PanelBlock({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 min-h-[20px]">
        <h3 className="overtitle">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Ссылки на фото подтверждения плитками. */
export function PhotoLinks({ urls }: { urls: string[] }) {
  const { t } = useI18n();
  if (urls.length === 0) return <p className="body-text">{t('Фото не приложены.')}</p>;
  return (
    <ul className={`grid gap-2 ${urls.length > 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {urls.map((u, i) => (
        <li key={i}>
          <a
            href={u}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="h-[52px] rounded-2xl bg-app text-sec hover:bg-[#DDE7E6] hover:text-sec flex items-center justify-center text-xs font-medium"
          >
            <span className="text-ink">{t('Фото {n}', { n: i + 1 })}</span>
            <span className="sr-only"> {t('(откроется в новой вкладке)')}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
