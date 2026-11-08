import Link from 'next/link';
import CampaignCard from '@/components/CampaignCard';
import MosqueRow from '@/components/donor/MosqueRow';
import { categoryIcon } from '@/components/donor/categoryIcons';
import { IconChevronDown, IconSavob, IconSearch, IconShield } from '@/components/icons';
import { apiFetch, Campaign, CATEGORY_LABELS, Mosque, plural } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Если бэкенд недоступен — главная всё равно открывается, просто без списков. */
async function load<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return null;
  }
}

const MULTIPLIERS = [
  { label: 'Обычные дни', value: '×1' },
  { label: 'Рамадан', value: '×2' },
  { label: 'Курбан-байрам', value: '×3' },
];

const FAQ = [
  {
    q: 'Куда идут мои деньги?',
    a: 'Прямо на конкретный сбор мечети. После завершения мечеть публикует отчёт с расходами, Комитет его проверяет.',
  },
  {
    q: 'Что такое Савоб?',
    a: 'Баллы за пожертвования — счётчик добрых дел. Они не обмениваются на деньги. В Рамадан начисляются вдвое, в Курбан-байрам втрое.',
  },
  {
    q: 'Как мечеть попадает на Садаку?',
    a: 'Подаёт заявку в кабинете. Комитет улемов проверяет мечеть и только потом разрешает сборы.',
  },
  {
    q: 'Безопасна ли оплата?',
    a: 'Платёж проводит банк или кошелёк — Садака не хранит данные карт.',
  },
];

export default async function Home() {
  const [campaignData, mosqueData] = await Promise.all([
    load<{ campaigns: Campaign[]; total: number }>('/campaigns?limit=100'),
    load<{ mosques: Mosque[]; total: number }>('/mosques?limit=100'),
  ]);

  const campaigns = campaignData?.campaigns.slice(0, 3) ?? null;
  const campaignTotal = campaignData?.total ?? 0;
  const activeMosques = new Set(campaignData?.campaigns.map((c) => c.mosque_id) ?? []);
  const mosques = mosqueData?.mosques ?? null;
  const mosqueTotal = mosqueData?.total ?? 0;
  const cities = Array.from(new Set((mosques ?? []).map((m) => m.city).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );

  return (
    <div className="page">
      <div className="layout-aside">
        {/* ---------- Основная колонка ---------- */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* Поиск и категории */}
          <section
            aria-labelledby="home-title"
            className="flex flex-col gap-3 md:gap-0 md:bg-white md:rounded-card md:p-7"
          >
            <h1 id="home-title" className="title pt-1 md:pt-0">
              Какой мечети поможем?
            </h1>
            <p className="body-text md:mt-1.5">
              {mosqueTotal > 0 &&
                `${mosqueTotal} ${plural(mosqueTotal, ['проверенная мечеть', 'проверенные мечети', 'проверенных мечетей'])}. `}
              Деньги идут прямо на сбор мечети, а мечеть отчитывается о расходах.
            </p>

            <form role="search" action="/mosques" className="flex flex-wrap gap-2 md:mt-[18px]">
              <label className="relative basis-full sm:basis-auto sm:flex-[1_1_240px] min-w-0">
                <span className="sr-only">Название мечети</span>
                <IconSearch
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                />
                <input
                  type="search"
                  name="q"
                  placeholder="Название мечети"
                  className="input-white md:bg-app pl-10"
                />
              </label>
              <label className="flex-1 sm:flex-[0_1_220px] min-w-0">
                <span className="sr-only">Город</span>
                <select name="city" defaultValue="" className="input-white md:bg-app">
                  <option value="">Все города</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn-primary">
                Найти
              </button>
            </form>

            <nav
              aria-labelledby="home-categories"
              className="bg-white rounded-card p-4 md:p-0 md:mt-4 md:rounded-none"
            >
              <h2 id="home-categories" className="overtitle md:sr-only">
                На что собирают
              </h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 md:mt-0">
                {Object.entries(CATEGORY_LABELS).map(([id, label]) => {
                  const Icon = categoryIcon(id);
                  return (
                    <li key={id}>
                      <Link
                        href={`/campaigns?category=${id}`}
                        className="tile h-full min-h-[84px] p-3 flex flex-col items-start justify-between gap-2 text-sec hover:text-sec hover:bg-[#DDE7E6] transition-colors"
                      >
                        <Icon />
                        <span className="text-sm leading-5 font-medium text-ink break-words">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </section>

          {/* Активные сборы */}
          {campaigns && (
            <section aria-labelledby="home-campaigns" className="panel">
              <div className="flex justify-between items-center gap-3">
                <h2 id="home-campaigns" className="overtitle">
                  Активные сборы
                </h2>
                <Link href="/campaigns" className="link-action inline-flex items-center min-h-11 -my-3">
                  {campaignTotal > 0 ? `Все ${campaignTotal}` : 'Все сборы'}
                </Link>
              </div>
              {campaigns.length === 0 ? (
                <p className="body-text mt-3">
                  Сейчас нет активных сборов. Новые появятся после одобрения Комитетом улемов.
                </p>
              ) : (
                <div className="grid gap-2 mt-3 sm:grid-cols-2 xl:grid-cols-3">
                  {campaigns.map((c) => (
                    <CampaignCard key={c.id} campaign={c} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Мечети */}
          {mosques && mosques.length > 0 && (
            <section aria-labelledby="home-mosques" className="panel pb-2 md:pb-3">
              <div className="flex justify-between items-center gap-3">
                <h2 id="home-mosques" className="overtitle">
                  Мечети
                </h2>
                <Link href="/mosques" className="link-action inline-flex items-center min-h-11 -my-3">
                  Все мечети
                </Link>
              </div>
              <div className="grid mt-1 md:grid-cols-2 md:gap-x-6">
                {mosques.slice(0, 6).map((m) => (
                  <MosqueRow key={m.id} mosque={m} hasActive={activeMosques.has(m.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Вопросы */}
          <section aria-labelledby="home-faq" className="panel">
            <h2 id="home-faq" className="overtitle">
              Частые вопросы
            </h2>
            <div className="mt-1">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b border-line last:border-b-0">
                  <summary className="flex items-center justify-between gap-4 min-h-[52px] py-2 text-sm leading-5 font-medium text-ink cursor-pointer">
                    {f.q}
                    <IconChevronDown
                      size={18}
                      className="shrink-0 text-hint transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="body-text pb-3.5">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* ---------- Правая колонка ---------- */}
        <aside className="aside-sticky flex flex-col gap-3 min-w-0" aria-label="О платформе">
          <section aria-labelledby="home-savob" className="panel">
            <div className="flex justify-between items-center gap-3">
              <h2 id="home-savob" className="overtitle">
                Савоб
              </h2>
              <span className="icon-round w-9 h-9" aria-hidden="true">
                <IconSavob size={18} />
              </span>
            </div>
            <p className="flex items-baseline gap-2 mt-2">
              <span className="num-lg">1 балл</span>
              <span className="title-sm">за каждые 10 с.</span>
            </p>
            <p className="body-text mt-1">
              Счётчик ваших добрых дел. Баллы не имеют денежной ценности — это история вашей садақа.
            </p>
            <dl className="kv mt-3.5">
              {MULTIPLIERS.map((m) => (
                <div key={m.label}>
                  <dt className="text-body">{m.label}</dt>
                  <dd className="font-semibold tabular">{m.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="home-for-mosques" className="panel">
            <h2 id="home-for-mosques" className="title-sm">
              Для мечетей
            </h2>
            <p className="body-text mt-1">
              Подайте заявку, откройте сбор после одобрения Комитетом и отчитайтесь о расходах в кабинете.
            </p>
            <Link href="/cabinet/mosques/new" className="btn btn-secondary btn-block mt-3.5">
              Подать заявку мечети
            </Link>
          </section>

          <div className="infobox">
            <IconShield size={18} className="shrink-0 mt-px" />
            <span>
              Каждая мечеть проверена Комитетом улемов. После сбора мечеть публикует отчёт о расходах — без
              отчёта новый сбор не откроется.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
