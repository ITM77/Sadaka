import { Metadata } from 'next';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import { IconArrowRight, IconCheck, IconMosque, IconSearch } from '@/components/icons';
import { apiFetch, Mosque, plural } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Мечети — Садака',
  description: 'Найдите мечеть и поддержите её кампании через платформу Садака.',
};

/** Оттенки плашки с иконкой: лазурит, латунь, глубокая бирюза. */
const TONES = ['bg-mint text-primary-600', 'bg-sand text-brass-700', 'bg-[#E4ECF1] text-[#1B4D63]'];

type List = { mosques: Mosque[]; total: number };

export default async function Mosques({ searchParams }: { searchParams: { q?: string; city?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const city = (searchParams.city ?? '').trim();
  const params = new URLSearchParams({ limit: '60' });
  if (q) params.set('q', q);
  if (city) params.set('city', city);

  // Список городов для выбора берём из всех одобренных мечетей.
  const [{ mosques, total }, everyone] = await Promise.all([
    apiFetch<List>(`/mosques?${params}`),
    q || city ? apiFetch<List>('/mosques?limit=100').catch(() => null) : null,
  ]);
  const cities = Array.from(new Set((everyone ?? { mosques }).mosques.map((m) => m.city).filter(Boolean)));
  if (city && !cities.some((c) => c.toLowerCase() === city.toLowerCase())) cities.push(city);
  cities.sort((a, b) => a.localeCompare(b, 'ru'));
  const selectedCity = cities.find((c) => c.toLowerCase() === city.toLowerCase()) ?? '';

  return (
    <>
      <section className="container-custom pt-7 md:pt-16 pb-6 flex flex-col gap-[18px] md:gap-7">
        <div className="flex flex-col gap-3 max-w-[680px]">
          <p className="eyebrow">Мечети</p>
          <h1 className="text-[30px] leading-[1.1] md:text-5xl font-bold tracking-[-0.02em]">
            Мечети, проверенные Комитетом
          </h1>
          <p className="text-base md:text-lg leading-relaxed text-muted">
            На Садаке только мечети, которые одобрил Комитет улемов Таджикистана.
          </p>
        </div>

        <form
          role="search"
          action="/mosques"
          className="flex flex-wrap gap-2 md:gap-3 bg-white border border-line rounded-2xl md:rounded-[18px] p-2 md:p-3"
        >
          <label className="basis-full md:flex-[1_1_320px] min-w-0 flex items-center gap-2.5 h-[52px] px-4 rounded-xl bg-paper focus-within:ring-2 focus-within:ring-primary-600">
            <IconSearch size={20} className="text-muted shrink-0" />
            <span className="sr-only">Название мечети</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Название мечети"
              className="flex-1 min-w-0 border-0 bg-transparent p-0 text-base text-ink placeholder:text-dark-400 focus:ring-0 focus:outline-none"
            />
          </label>
          <label className="flex-[1_1_50%] md:flex-[0_1_220px] min-w-0">
            <span className="sr-only">Город</span>
            <select name="city" defaultValue={selectedCity} className="input h-[52px]">
              <option value="">Все города</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary h-[52px] px-6 text-base flex-[1_1_30%] md:flex-none">
            Найти
          </button>
        </form>
      </section>

      <section className="container-custom pt-2 pb-14 md:pb-24">
        {mosques.length === 0 ? (
          <EmptyState
            icon={<IconSearch size={26} />}
            title={q || city ? 'Ничего не найдено' : 'Пока нет одобренных мечетей'}
          >
            {q || city ? (
              <Link href="/mosques" className="font-semibold">
                Сбросить поиск
              </Link>
            ) : (
              'Мечети появятся здесь после одобрения Комитетом улемов.'
            )}
          </EmptyState>
        ) : (
          <>
            <p className="mb-4 text-[15px] text-muted">
              Найдено {total} {plural(total, ['мечеть', 'мечети', 'мечетей'])}
            </p>
            <div className="grid gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mosques.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/mosques/${m.id}`}
                  className="card-hover flex flex-col gap-3.5 md:gap-[18px] p-[18px] md:p-6 text-ink group"
                >
                  <div className="flex gap-4 items-center">
                    <span
                      className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center shrink-0 ${TONES[i % TONES.length]}`}
                      aria-hidden="true"
                    >
                      <IconMosque size={30} strokeWidth={1.4} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-xl font-bold mb-1 group-hover:text-primary-700 transition-colors">
                        {m.name}
                      </h2>
                      <p className="text-[15px] text-muted">
                        {m.city}
                        {m.address && ` · ${m.address}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-primary gap-1.5">
                      <IconCheck size={14} strokeWidth={2.25} />
                      Одобрена
                    </span>
                  </div>
                  <div className="mt-auto flex justify-between items-center gap-3 pt-4 border-t border-dark-100 text-[15px]">
                    <span className="text-muted min-w-0 truncate">{m.imam_name ? `Имам: ${m.imam_name}` : ''}</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-primary-600 shrink-0">
                      Открыть <IconArrowRight size={16} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-7 md:mt-12 flex flex-wrap gap-6 justify-between items-center p-6 md:p-8 rounded-[24px] border-[1.5px] border-dashed border-brass-400 bg-brass-50">
          <div className="flex-[1_1_420px] min-w-0">
            <h2 className="text-xl md:text-2xl font-bold mb-1.5">Вашей мечети нет в списке?</h2>
            <p className="text-[15px] md:text-base leading-relaxed text-muted">
              Подайте заявку — Комитет улемов проверит её, и вы сможете открывать сборы.
            </p>
          </div>
          <Link href="/cabinet/mosques/new" className="btn btn-primary h-[52px] px-6 text-base max-sm:w-full">
            Подать заявку
          </Link>
        </div>
      </section>
    </>
  );
}
