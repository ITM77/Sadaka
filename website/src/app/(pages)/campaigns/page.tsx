import { Metadata } from 'next';
import Link from 'next/link';
import CampaignCard from '@/components/CampaignCard';
import EmptyState from '@/components/EmptyState';
import { IconSearch } from '@/components/icons';
import { apiFetch, Campaign, CATEGORY_LABELS, progress } from '@/lib/api';
import { getI18n } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const { t } = getI18n();
  return {
    title: t('Сборы — Садака'),
    description: t('Активные сборы мечетей Таджикистана, одобренные Комитетом улемов.'),
  };
}

const SORTS = {
  new: 'Новые',
  ending: 'Скоро завершатся',
  progress: 'Почти собраны',
} as const;
type Sort = keyof typeof SORTS;

type Params = { category?: string; q?: string; city?: string; sort?: string };

export default async function Campaigns({ searchParams }: { searchParams: Params }) {
  const { t, fmt } = getI18n();
  const category = searchParams.category && CATEGORY_LABELS[searchParams.category] ? searchParams.category : '';
  const q = (searchParams.q ?? '').trim();
  const city = (searchParams.city ?? '').trim();
  const sort: Sort =
    searchParams.sort && Object.prototype.hasOwnProperty.call(SORTS, searchParams.sort)
      ? (searchParams.sort as Sort)
      : 'new';

  const params = new URLSearchParams({ limit: '100' });
  if (category) params.set('category', category);
  const { campaigns: all } = await apiFetch<{ campaigns: Campaign[]; total: number }>(`/campaigns?${params}`);

  // API фильтрует только по категории; поиск, город и сортировка — по полученному списку.
  const cities = Array.from(new Set(all.map((c) => c.mosque?.city).filter((x): x is string => !!x)));
  if (city && !cities.some((c) => c.toLowerCase() === city.toLowerCase())) cities.push(city);
  cities.sort((a, b) => a.localeCompare(b, 'ru'));

  const needle = q.toLowerCase();
  const campaigns = all
    .filter((c) => !city || c.mosque?.city.toLowerCase() === city.toLowerCase())
    .filter(
      (c) =>
        !needle ||
        c.title.toLowerCase().includes(needle) ||
        (c.mosque?.name.toLowerCase().includes(needle) ?? false),
    );
  if (sort === 'ending') campaigns.sort((a, b) => +new Date(a.end_date) - +new Date(b.end_date));
  if (sort === 'progress') campaigns.sort((a, b) => progress(b) - progress(a));

  const filtered = !!(q || city);
  const hrefFor = (cat: string) => {
    const p = new URLSearchParams();
    if (cat) p.set('category', cat);
    if (q) p.set('q', q);
    if (city) p.set('city', city);
    if (sort !== 'new') p.set('sort', sort);
    const s = p.toString();
    return s ? `/campaigns?${s}` : '/campaigns';
  };

  return (
    <div className="page flex flex-col gap-3">
      <header className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-4 pt-1 md:pt-0">
        <h1 className="title">{t('Сборы')}</h1>
        <p className="body-text">{t('Каждый сбор одобрен Комитетом улемов. После завершения — отчёт мечети.')}</p>
      </header>

      <form role="search" action="/campaigns" className="panel flex flex-wrap gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <label className="relative basis-full md:basis-auto md:flex-[1_1_280px] min-w-0">
          <span className="sr-only">{t('Поиск сбора')}</span>
          <IconSearch
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t('Название сбора или мечети')}
            className="input pl-10"
          />
        </label>
        <label className="flex-[1_1_40%] md:flex-[0_1_200px] min-w-0">
          <span className="sr-only">{t('Город')}</span>
          <select name="city" defaultValue={city} className="input">
            <option value="">{t('Все города')}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-[1_1_40%] md:flex-[0_1_200px] min-w-0">
          <span className="sr-only">{t('Сортировка')}</span>
          <select name="sort" defaultValue={sort} className="input">
            {Object.entries(SORTS).map(([id, label]) => (
              <option key={id} value={id}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary basis-full md:basis-auto">
          {t('Найти')}
        </button>
      </form>

      <nav
        aria-label={t('Категории')}
        className="flex flex-nowrap md:flex-wrap gap-1.5 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none]"
      >
        <CategoryLink href={hrefFor('')} active={!category}>
          {t('Все')}
        </CategoryLink>
        {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
          <CategoryLink key={id} href={hrefFor(id)} active={category === id}>
            {t(label)}
          </CategoryLink>
        ))}
      </nav>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<IconSearch />}
          title={filtered ? t('Ничего не найдено') : t('Сейчас нет активных кампаний')}
        >
          {filtered ? (
            <Link href={category ? `/campaigns?category=${category}` : '/campaigns'} className="link-action">
              {t('Сбросить поиск')}
            </Link>
          ) : (
            t('Новые сборы появятся после одобрения Комитетом улемов.')
          )}
        </EmptyState>
      ) : (
        <section aria-labelledby="campaigns-found" className="panel">
          <h2 id="campaigns-found" className="overtitle" aria-live="polite">
            {t('Найдено {n} {what}', { n: campaigns.length, what: fmt.plural(campaigns.length, ['сбор', 'сбора', 'сборов']) })}
          </h2>
          <div className="grid gap-2 mt-3 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className="chip-white min-h-11 shrink-0">
      {children}
    </Link>
  );
}
