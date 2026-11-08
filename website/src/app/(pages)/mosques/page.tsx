import { Metadata } from 'next';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import MosqueRow from '@/components/donor/MosqueRow';
import { IconCheck, IconSearch } from '@/components/icons';
import { apiFetch, Campaign, Mosque } from '@/lib/api';
import { getI18n } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const { t } = getI18n();
  return {
    title: t('Мечети — Садака'),
    description: t('Найдите мечеть и поддержите её кампании через платформу Садака.'),
  };
}

type List = { mosques: Mosque[]; total: number };

const STATUSES = [
  { id: '', label: 'Все' },
  { id: 'active', label: 'Идёт сбор' },
] as const;

export default async function Mosques({
  searchParams,
}: {
  searchParams: { q?: string; city?: string; status?: string };
}) {
  const { t, fmt } = getI18n();
  const q = (searchParams.q ?? '').trim();
  const city = (searchParams.city ?? '').trim();
  const status = searchParams.status === 'active' ? 'active' : '';
  const params = new URLSearchParams({ limit: '60' });
  if (q) params.set('q', q);
  if (city) params.set('city', city);

  // Все одобренные мечети — для списка городов со счётчиками; активные сборы — для метки «Идёт сбор».
  const [found, everyone, active] = await Promise.all([
    apiFetch<List>(`/mosques?${params}`),
    apiFetch<List>('/mosques?limit=100').catch(() => null),
    apiFetch<{ campaigns: Campaign[] }>('/campaigns?limit=100').catch(() => null),
  ]);
  const activeIds = new Set(active?.campaigns.map((c) => c.mosque_id) ?? []);

  const counts = new Map<string, number>();
  for (const m of (everyone ?? found).mosques) {
    if (m.city) counts.set(m.city, (counts.get(m.city) ?? 0) + 1);
  }
  const cities = Array.from(counts.keys());
  if (city && !cities.some((c) => c.toLowerCase() === city.toLowerCase())) cities.push(city);
  cities.sort((a, b) => a.localeCompare(b, 'ru'));
  const selectedCity = cities.find((c) => c.toLowerCase() === city.toLowerCase()) ?? '';

  const mosques = status === 'active' ? found.mosques.filter((m) => activeIds.has(m.id)) : found.mosques;
  const total = status === 'active' ? mosques.length : found.total;
  const filtered = !!(q || city || status);
  const allCount = everyone?.total ?? found.total;

  const hrefFor = (next: { city?: string; status?: string }) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    const c = next.city ?? selectedCity;
    const s = next.status ?? status;
    if (c) p.set('city', c);
    if (s) p.set('status', s);
    const str = p.toString();
    return str ? `/mosques?${str}` : '/mosques';
  };

  const hidden = (
    <>
      {selectedCity && <input type="hidden" name="city" value={selectedCity} />}
      {status && <input type="hidden" name="status" value={status} />}
    </>
  );

  return (
    <div className="page flex flex-col gap-3 lg:gap-4">
      <header className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-4 pt-1 md:pt-0">
        <h1 className="title">{t('Мечети')}</h1>
        <p className="body-text">
          {t('{n} {verified} Комитетом улемов', {
            n: allCount,
            verified: fmt.plural(allCount, ['мечеть проверена', 'мечети проверены', 'мечетей проверены']),
          })}
        </p>
      </header>

      {/* Телефон и планшет: поиск, города чипами, статус */}
      <div className="lg:hidden flex flex-col gap-3">
        <form role="search" action="/mosques" className="flex gap-2">
          {hidden}
          <label className="relative flex-1 min-w-0">
            <span className="sr-only">{t('Название мечети')}</span>
            <IconSearch
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input type="search" name="q" defaultValue={q} placeholder={t('Название мечети')} className="input-white pl-10" />
          </label>
          <button type="submit" className="btn btn-primary px-5">
            {t('Найти')}
          </button>
        </form>
        {cities.length > 0 && (
          <nav
            aria-label={t('Город')}
            className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:-mx-8 md:px-8 [scrollbar-width:none]"
          >
            <Link
              href={hrefFor({ city: '' })}
              aria-current={!selectedCity ? 'page' : undefined}
              className="chip-white min-h-11 shrink-0"
            >
              {t('Все города')}
            </Link>
            {cities.map((c) => (
              <Link
                key={c}
                href={hrefFor({ city: c })}
                aria-current={selectedCity === c ? 'page' : undefined}
                className="chip-white min-h-11 shrink-0"
              >
                {c}
              </Link>
            ))}
          </nav>
        )}
        <nav aria-label={t('Статус')} className="segmented bg-white">
          {STATUSES.map((s) => (
            <Link
              key={s.id}
              href={hrefFor({ status: s.id })}
              aria-current={status === s.id ? 'page' : undefined}
              className="!min-h-11 hover:text-accent-700 aria-[current=page]:!bg-app"
            >
              {t(s.label)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 lg:grid-cols-[268px_minmax(0,1fr)] lg:items-start">
        {/* Компьютер: колонка фильтров 268px */}
        <aside aria-label={t('Фильтры')} className="hidden lg:flex panel flex-col gap-[18px] lg:sticky lg:top-20">
          <form role="search" action="/mosques" className="flex flex-col gap-2">
            {hidden}
            <label className="relative">
              <span className="sr-only">{t('Название мечети')}</span>
              <IconSearch
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
              <input type="search" name="q" defaultValue={q} placeholder={t('Поиск')} className="input pl-10" />
            </label>
            <button type="submit" className="btn btn-primary btn-block">
              {t('Найти')}
            </button>
          </form>

          {cities.length > 0 && (
            <nav aria-labelledby="filter-city">
              <h2 id="filter-city" className="overtitle">
                {t('Город')}
              </h2>
              <ul className="mt-2">
                <li>
                  <CityLink href={hrefFor({ city: '' })} on={!selectedCity} label={t('Все города')} count={allCount} />
                </li>
                {cities.map((c) => (
                  <li key={c}>
                    <CityLink href={hrefFor({ city: c })} on={selectedCity === c} label={c} count={counts.get(c)} />
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <nav aria-labelledby="filter-status">
            <h2 id="filter-status" className="overtitle">
              {t('Статус')}
            </h2>
            <div className="segmented mt-2">
              {STATUSES.map((s) => (
                <Link
                  key={s.id}
                  href={hrefFor({ status: s.id })}
                  aria-current={status === s.id ? 'page' : undefined}
                  className="!px-2 !text-sm hover:text-accent-700"
                >
                  {t(s.label)}
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        {/* Список */}
        <div className="flex flex-col gap-2 min-w-0">
          {mosques.length === 0 ? (
            <EmptyState icon={<IconSearch />} title={filtered ? t('Мечеть не найдена') : t('Пока нет одобренных мечетей')}>
              {filtered ? (
                <>
                  {t('Измените название или город.')}{' '}
                  <Link href="/mosques" className="link-action">
                    {t('Сбросить поиск')}
                  </Link>
                </>
              ) : (
                t('Мечети появятся здесь после одобрения Комитетом улемов.')
              )}
            </EmptyState>
          ) : (
            <>
              <p className="caption !text-body px-1" aria-live="polite">
                {t('Найдено {n} {what}', { n: total, what: fmt.plural(total, ['мечеть', 'мечети', 'мечетей']) })}
              </p>
              <section aria-label={t('Мечети')} className="bg-white rounded-card px-4 py-1 lg:px-5">
                {mosques.map((m) => (
                  <MosqueRow key={m.id} mosque={m} hasActive={activeIds.has(m.id)} large />
                ))}
              </section>
            </>
          )}

          <section aria-labelledby="add-mosque" className="panel mt-1 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex-[1_1_320px] min-w-0">
              <h2 id="add-mosque" className="title-sm">
                {t('Вашей мечети нет в списке?')}
              </h2>
              <p className="body-text mt-1">
                {t('Подайте заявку — Комитет улемов проверит её, и вы сможете открывать сборы.')}
              </p>
            </div>
            <Link href="/cabinet/mosques/new" className="btn btn-secondary max-sm:w-full">
              {t('Подать заявку')}
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function CityLink({ href, on, label, count }: { href: string; on: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={on ? 'page' : undefined}
      className="flex items-center gap-2.5 min-h-11 text-ink hover:text-accent-700 group"
    >
      <span
        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
          on ? 'bg-accent-500 text-ink' : 'bg-app group-hover:bg-accent-100'
        }`}
        aria-hidden="true"
      >
        {on && <IconCheck size={14} strokeWidth={2.25} />}
      </span>
      <span className="flex-1 min-w-0 truncate text-sm leading-5 font-medium">{label}</span>
      {count !== undefined && <span className="caption tabular">{count}</span>}
    </Link>
  );
}
