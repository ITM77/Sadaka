'use client';

import { useEffect, useRef } from 'react';

const features = [
  {
    icon: '🕌',
    title: 'Поиск мечетей',
    description: 'Найдите ближайшую мечеть на интерактивной карте с фильтрацией по городу и активным кампаниям',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: '📊',
    title: 'Прогресс в реальном времени',
    description: 'Видите, как растут суммы каждой кампании, и как используются средства',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: '💳',
    title: 'Безопасные платежи',
    description: 'Карты, мобильные кошельки (Alif, IMON), QR-коды — все способы оплаты',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: '📋',
    title: 'Обязательная отчётность',
    description: 'Мечети публикуют подробные отчёты об использовании каждого тенге',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: '⭐',
    title: 'Система Савоб',
    description: 'Получайте баллы духовной награды за каждое пожертвование и благодеяние',
    gradient: 'from-yellow-500 to-amber-500',
  },
  {
    icon: '🛡️',
    title: 'Полная защита',
    description: 'Одобрение Комитетом улемов и государственный надзор за каждой кампанией',
    gradient: 'from-indigo-500 to-blue-500',
  },
];

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section className="section">
      <div className="container-custom">
        <div ref={ref} className="animate-on-scroll">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="badge badge-primary mb-4 inline-flex">✨ Возможности</span>
            <h2 className="text-responsive mb-4">Почему выбрать Садака?</h2>
            <p className="text-lg text-dark-600 dark:text-dark-400 max-w-2xl mx-auto">
              Шесть ключевых возможностей, которые делают Садака лучшей платформой для пожертвований
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card-hover p-8 group overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-r ${feature.gradient}`}
                ></div>

                {/* Content */}
                <div className="relative">
                  {/* Icon */}
                  <div className="text-5xl mb-4 transform group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-300">
                    {feature.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-dark-600 dark:text-dark-400 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Accent line */}
                  <div className="mt-4 h-1 w-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
