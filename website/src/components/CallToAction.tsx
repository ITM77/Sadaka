'use client';

import { useEffect, useRef } from 'react';

export default function CallToAction() {
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
    <section className="section bg-gradient-accent relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-white rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container-custom relative z-10">
        <div ref={ref} className="animate-on-scroll max-w-3xl mx-auto text-center">
          {/* Heading */}
          <h2 className="text-responsive text-white mb-4 font-display">
            Готовы помочь мечетям?
          </h2>

          {/* Description */}
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Присоединяйтесь к тысячам жертвователей, которые уже помогают мечетям Таджикистана
            через Садака. Каждое пожертвование — это шаг к лучшему будущему.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button className="btn bg-white text-primary-600 hover:bg-gray-100 font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
              📱 iOS App Store
            </button>
            <button className="btn bg-white text-primary-600 hover:bg-gray-100 font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
              🤖 Google Play
            </button>
            <button className="btn border-2 border-white text-white hover:bg-white/10 font-bold px-8 py-4 rounded-xl">
              💻 Веб-версия
            </button>
          </div>

          {/* Platforms */}
          <p className="text-white/80">
            Доступно для iOS, Android и веб-браузеров
          </p>
        </div>
      </div>
    </section>
  );
}
