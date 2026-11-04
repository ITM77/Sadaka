'use client';

import { useState, useEffect, useRef } from 'react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
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

  const faqs = [
    {
      q: '🤔 Как начать использовать Садака?',
      a: 'Скачайте приложение, зарегистрируйтесь с номером телефона, найдите мечеть и пожертвуйте. Всё работает через удобный мобильный интерфейс.',
    },
    {
      q: '🔒 Безопасны ли платежи?',
      a: 'Да! Все платежи шифруются и обрабатываются через надёжные платёжные системы банка Хумо (Alif, IMON, Visa, Mastercard).',
    },
    {
      q: '⭐ Что такое Савоб?',
      a: 'Савоб — баллы духовной награды за каждое пожертвование. Вы получаете историю своих добрых дел, и в праздники (Рамадан) баллы удваиваются или утраиваются.',
    },
    {
      q: '🕌 Как мечети присоединяются к платформе?',
      a: 'Мечети заполняют форму регистрации. Комитет улемов Таджикистана проверяет и одобряет каждую мечеть перед запуском.',
    },
    {
      q: '📊 Как я узнаю, куда идят мои деньги?',
      a: 'Каждая кампания одобрена Комитетом, а мечеть обязана публиковать подробные отчёты об использовании каждого тенге. Без отчёта новая кампания не запустится.',
    },
    {
      q: '💳 Какие способы оплаты доступны?',
      a: 'Карты (Visa, Mastercard), мобильные кошельки (Alif, IMON), QR-коды на мечетях и банковские переводы. Выбирайте удобный способ.',
    },
  ];

  return (
    <section className="section">
      <div className="container-custom">
        <div ref={ref} className="animate-on-scroll">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="badge badge-primary mb-4 inline-flex">❓ Вопросы</span>
            <h2 className="text-responsive mb-4">Часто задаваемые вопросы</h2>
            <p className="text-lg text-dark-600 dark:text-dark-400 max-w-2xl mx-auto">
              Найдите ответы на самые популярные вопросы о Садака
            </p>
          </div>

          {/* FAQ Items */}
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="card overflow-hidden transition-all duration-300 hover:shadow-md"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 text-left font-semibold hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors flex justify-between items-center group"
                >
                  <span className="group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {faq.q}
                  </span>
                  <span className="text-2xl transform transition-transform duration-300" style={{
                    transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>
                    ↓
                  </span>
                </button>

                {openIndex === index && (
                  <div className="px-6 py-5 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-dark-700 dark:to-dark-800 border-t border-dark-100 dark:border-dark-700 animate-fade-in-down">
                    <p className="text-dark-700 dark:text-dark-300 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-dark-600 dark:text-dark-400 mb-4">
              Не нашли ответ? Свяжитесь с нашей командой
            </p>
            <button className="btn btn-primary">Написать нам</button>
          </div>
        </div>
      </div>
    </section>
  );
}
