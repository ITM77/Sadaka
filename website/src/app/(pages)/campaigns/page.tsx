import { Metadata } from 'next';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import CatalogCard from '@/components/donor/CatalogCard';
import { IconSearch } from '@/components/icons';
import { apiFetch, Campaign, CATEGORY_LABELS, plural, progress } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Сборы — Садака',
  description: 'Активные сборы мечетей Таджикистана, одобренные Комитетом улемов.',
};

const SORTS = {
  new: 'Новые',
  ending: 'Скоро завершатся',
  progress: 'Почти собраны',
} as const;
type Sort = keyof typeof SORTS;

type Params = { category?: string; q?: string; city?: string; sort?: string };

export default async function Campaigns({ searchParams }: { searchParams: Params }) {
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
    <>
      <section className="container-custom pt-7 md:pt-16 pb-6 flex flex-col gap-[18px] md:gap-7">
        <div className="flex flex-col gap-3 max-w-[720px]">
          <p className="eyebrow">Сборы</p>
          <h1 className="text-[30px] leading-[1.1] md:text-5xl font-bold tracking-[-0.02em]">
            Каждый сбор одобрен Комитетом улемов
          </h1>
          <p className="text-base md:text-lg leading-relaxed text-muted">
            После завершения мечеть публикует отчёт — на что ушёл каждый сомони.
          </p>
        </div>

        <form
          role="search"
          action="/campaigns"
          className="flex flex-wrap gap-2 md:gap-3 bg-white border border-line rounded-2xl md:rounded-[18px] p-2 md:p-3"
        >
          {category && <input type="hidden" name="category" value={category} />}
          <label className="basis-full md:flex-[1_1_320px] min-w-0 flex items-center gap-2.5 h-[52px] px-4 rounded-xl bg-paper focus-within:ring-2 focus-within:ring-primary-600">
            <IconSearch size={20} className="text-muted shrink-0" />
            <span className="sr-only">Поиск сбора</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Название сбора или мечети"
              className="flex-1 min-w-0 border-0 bg-transparent p-0 text-base text-ink placeholder:text-dark-400 focus:ring-0 focus:outline-none"
            />
          </label>
          <label className="flex-[1_1_40%] md:flex-[0_1_220px] min-w-0">
            <span className="sr-only">Город</span>
            <select name="city" defaultValue={city} className="input h-[52px]">
              <option value="">Все города</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-[1_1_40%] md:flex-[0_1_220px] min-w-0">
            <span className="sr-only">Сортировка</span>
            <select name="sort" defaultValue={sort} className="input h-[52px]">
              {Object.entries(SORTS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary h-[52px] px-6 text-base basis-full md:basis-auto">
            Найти
          </button>
        </form>

        <nav
          aria-label="Категории"
          className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-visible -mx-4 px-4 pb-1 sm:-mx-8 sm:px-8 md:mx-0 md:px-0 md:pb-0 [scrollbar-width:none]"
        >
          <CategoryLink href={hrefFor('')} active={!category}>
            Все
          </CategoryLink>
          {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
            <CategoryLink key={id} href={hrefFor(id)} active={category === id}>
              {label}
            </CategoryLink>
          ))}
        </nav>
      </section>

      <section className="container-custom pt-2 pb-16 md:pb-24">
        {campaigns.length === 0 ? (
          <EmptyState
            icon={<IconSearch size={26} />}
            title={filtered ? 'Ничего не найдено' : 'Сейчас нет активных кампаний'}
          >
            {filtered ? (
              <Link href={category ? `/campaigns?category=${category}` : '/campaigns'} className="font-semibold">
                Сбросить поиск
              </Link>
            ) : (
              'Новые сборы появятся после одобрения Комитетом улемов.'
            )}
          </EmptyState>
        ) : (
          <>
            <p className="mb-4 text-[15px] text-muted" aria-live="polite">
              Найдено {campaigns.length} {plural(campaigns.length, ['сбор', 'сбора', 'сборов'])}
            </p>
            <div className="grid gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c, i) => (
                <CatalogCard key={c.id} campaign={c} index={i} />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className="chip h-11 font-semibold shrink-0">
      {children}
    </Link>
  );
}
