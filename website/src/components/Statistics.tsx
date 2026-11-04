'use client';

import { useEffect, useRef } from 'react';

export default function Statistics() {
  const ref = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

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

  const stats = [
    { icon: '🕌', label: 'Мечетей', value: '200+', color: 'from-blue-500 to-cyan-500' },
    { icon: '👥', label: 'Активных пользователей', value: '10K+', color: 'from-purple-500 to-pink-500' },
    { icon: '💰', label: 'Пожертвовано', value: '5M TJS', color: 'from-green-500 to-emerald-500' },
    { icon: '📊', label: 'Кампаний', value: '500+', color: 'from-orange-500 to-red-500' },
  ];

  return (
    <section className="section bg-gradient-primary relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="container-custom relative z-10">
        <div ref={ref} className="animate-on-scroll">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-responsive text-white mb-2">Наши результаты (Год 1)</h2>
            <p className="text-xl text-primary-100">Тысячи жертвователей уже помогают мечетям</p>
          </div>

          {/* Stats grid */}
          <div
            ref={statsRef}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group relative"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Card background */}
                <div className="glass-sm p-8 text-center transform group-hover:scale-105 transition-transform duration-300">
                  {/* Icon */}
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>

                  {/* Value */}
                  <div className="text-4xl font-bold text-white mb-2 font-display">
                    {stat.value}
                  </div>

                  {/* Label */}
                  <p className="text-primary-100 font-medium">{stat.label}</p>
                </div>

                {/* Glow effect on hover */}
                <div
                  className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300 bg-gradient-to-r ${stat.color}`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
