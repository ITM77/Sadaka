'use client';

import { useEffect, useRef } from 'react';

export default function Hero() {
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
    <section className="relative min-h-screen pt-20 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-200 dark:bg-primary-900/20 rounded-full blur-3xl opacity-50 animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-200 dark:bg-accent-900/20 rounded-full blur-3xl opacity-50 animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="bg-gradient-hero relative">
        <div className="container-custom py-20 md:py-32">
          <div ref={ref} className="animate-on-scroll max-w-2xl mx-auto text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex">
              <span className="badge badge-primary animate-fade-in">
                ✨ Новая платформа пожертвований
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-responsive-lg font-display font-bold mb-6 animate-fade-in-up">
              <span className="text-gradient">Пожертвования</span>
              <br />
              <span>с верой и прозрачностью</span>
            </h1>

            {/* Description */}
            <p className="text-xl text-dark-600 dark:text-dark-300 mb-8 leading-relaxed max-w-xl mx-auto">
              Садака — платформа, которая объединяет жертвователей и мечети Таджикистана.
              Прозрачные платежи, обязательная отчётность, духовная награда.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <button className="btn btn-primary btn-lg shadow-lg hover:shadow-xl hover:scale-105">
                📱 Скачать приложение
              </button>
              <button className="btn btn-outline btn-lg">
                Узнать больше
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-2xl mx-auto">
              {[
                { value: '200+', label: 'Мечетей' },
                { value: '10K+', label: 'Пользователей' },
                { value: '5M TJS', label: 'Пожертвовано' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="card p-4 md:p-6 text-center transform hover:scale-105 transition-transform"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  <div className="text-2xl md:text-3xl font-bold text-gradient mb-1">
                    {stat.value}
                  </div>
                  <p className="text-sm text-dark-600 dark:text-dark-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
