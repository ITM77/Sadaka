import { Metadata } from 'next';
import PageHero from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'Мечети — Садака',
  description: 'Найдите мечеть и поддержите её кампании через платформу Садака.',
};

// TODO: заменить на данные из API (GET /api/v1/mosques), пока — заглушки
const mosques = [1, 2, 3, 4, 5, 6].map((id) => ({
  id,
  name: 'Мечеть Момина',
  address: 'ул. Айни, 123, Душанбе',
  rating: 4.8,
}));

export default function Mosques() {
  return (
    <>
      <PageHero
        badge="🕌 Мечети"
        title={
          <>
            Мечети в сети <span className="text-gradient">Садака</span>
          </>
        }
        description="Все мечети проверены и одобрены Комитетом улемов. Выберите мечеть и поддержите её кампании."
      />

      <section className="section pt-0 md:pt-0">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mosques.map((m) => (
              <article key={m.id} className="card-hover overflow-hidden group">
                <div className="h-36 bg-gradient-primary flex items-center justify-center">
                  <span className="text-5xl transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
                    🕌
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="text-xl font-bold group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {m.name}
                    </h2>
                    <span className="badge badge-success flex-shrink-0">✓ Одобрена</span>
                  </div>
                  <p className="text-dark-600 dark:text-dark-400 mb-5">📍 {m.address}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2" aria-label={`Рейтинг ${m.rating}`}>
                      <span className="text-amber-400">★★★★★</span>
                      <span className="text-sm text-dark-500 dark:text-dark-400">{m.rating}</span>
                    </div>
                    <button className="btn btn-outline btn-sm">Подробнее</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Регистрация мечети */}
          <div className="relative overflow-hidden mt-16 rounded-3xl bg-gradient-accent p-8 md:p-12 text-center">
            <div className="absolute inset-0 opacity-10" aria-hidden="true">
              <div className="absolute -top-10 right-1/4 w-72 h-72 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Зарегистрируйте свою мечеть
              </h2>
              <p className="text-white/90 text-lg mb-8">
                Если вы представляете мечеть и хотите присоединиться к Садака, заполните форму
                регистрации. Комитет улемов рассмотрит заявку.
              </p>
              <button className="btn btn-lg bg-white text-primary-700 hover:bg-primary-50 shadow-lg hover:shadow-xl hover:scale-105">
                Зарегистрировать мечеть
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
