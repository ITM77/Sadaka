import { Metadata } from 'next';
import PageHero from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'О Садака — Миссия и ценности',
  description: 'Узнайте о проекте Садака, его миссии и как он работает для сообществ.',
};

const values = [
  { icon: '🤝', title: 'Прозрачность', text: 'Каждый видит, куда идут деньги' },
  { icon: '🛡️', title: 'Доверие', text: 'Одобрение Комитетом улемов Таджикистана' },
  { icon: '📱', title: 'Цифровой формат', text: 'Доступно молодёжи, которая не носит наличные' },
  { icon: '⭐', title: 'Система Савоб', text: 'Духовная награда за добрые дела' },
  { icon: '📊', title: 'Обязательная отчётность', text: 'Мечети обязаны отчитываться о расходах' },
];

const steps = [
  'Скачайте приложение',
  'Выберите мечеть или кампанию',
  'Пожертвуйте удобным способом',
  'Получите подтверждение и Савоб',
];

const partners = [
  'Комитет улемов Таджикистана',
  'Национальный банк Таджикистана',
  'Платёжные системы (Alif, IMON)',
  'Мечети по всей стране',
];

export default function About() {
  return (
    <>
      <PageHero
        badge="🕌 О проекте"
        title={
          <>
            О <span className="text-gradient">Садака</span>
          </>
        }
        description="Цифровая платформа, которая решает ключевую проблему в Таджикистане: отсутствие прозрачности в сборе пожертвований и недоверие жертвователей."
      />

      {/* Почему Садака */}
      <section className="section">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-responsive mb-4">Почему Садака?</h2>
            <p className="text-lg text-dark-600 dark:text-dark-400 max-w-2xl mx-auto">
              Пять принципов, на которых построена платформа
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {values.map((v) => (
              <div key={v.title} className="card-hover p-8 group">
                <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">
                  {v.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {v.title}
                </h3>
                <p className="text-dark-600 dark:text-dark-400 leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Как это работает */}
      <section className="section bg-gradient-to-b from-dark-50 to-white dark:from-dark-800 dark:to-dark-900">
        <div className="container-custom max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-responsive mb-4">Как это работает?</h2>
          </div>

          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <li key={step} className="card p-6 pt-10 text-center">
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {i + 1}
                </span>
                <p className="font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Партнёры */}
      <section className="section">
        <div className="container-custom max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-responsive mb-4">Ключевые партнёры</h2>
          </div>

          <ul className="grid sm:grid-cols-2 gap-4">
            {partners.map((p) => (
              <li key={p} className="card flex items-center gap-4 p-5">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
                  ✓
                </span>
                <span className="font-medium">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
