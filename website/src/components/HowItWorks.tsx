'use client';

import { useEffect, useRef } from 'react';

export default function HowItWorks() {
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

  const steps = [
    { icon: '📱', title: 'Загрузить', desc: 'Скачайте приложение' },
    { icon: '📝', title: 'Зарегистрироваться', desc: 'Создайте аккаунт' },
    { icon: '🕌', title: 'Выбрать мечеть', desc: 'Найдите на карте' },
    { icon: '💰', title: 'Пожертвовать', desc: 'Выберите сумму' },
    { icon: '⭐', title: 'Получить Савоб', desc: 'Баллы зачислены' },
    { icon: '📊', title: 'Видеть отчёты', desc: 'Следите за результатом' },
  ];

  return (
    <section className="section bg-gradient-to-b from-dark-50 to-white dark:from-dark-800 dark:to-dark-900">
      <div className="container-custom">
        <div ref={ref} className="animate-on-scroll">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="badge badge-primary mb-4 inline-flex">🚀 Процесс</span>
            <h2 className="text-responsive mb-4">Как это работает?</h2>
            <p className="text-lg text-dark-600 dark:text-dark-400 max-w-2xl mx-auto">
              Всего 6 простых шагов от регистрации до первого пожертвования
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-24 -right-4 w-8 h-1 bg-gradient-to-r from-primary-400 to-transparent"></div>
                )}

                {/* Step card */}
                <div className="card-hover p-8 text-center group relative z-10">
                  {/* Number badge */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {index + 1}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="text-5xl mt-2 mb-4 group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-dark-600 dark:text-dark-400">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <button className="btn btn-primary btn-lg shadow-lg hover:shadow-xl">
              Начать прямо сейчас
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
