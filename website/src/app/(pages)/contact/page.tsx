import { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';
import { IconClock, IconMail, IconPin } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Контакты — Садака',
  description: 'Свяжитесь с командой Садака: вопросы о пожертвованиях, подключении мечети и отчётах.',
};

export default function Contact() {
  return (
    <div className="container-custom pt-10 pb-16 md:pt-[72px] md:pb-24 flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
      <section className="lg:flex-1 min-w-0 flex flex-col gap-6 md:gap-7">
        <div className="flex flex-col gap-3 md:gap-3.5">
          <p className="eyebrow">Контакты</p>
          <h1 className="h-page">Мы на связи</h1>
          <p className="text-[17px] md:text-lg leading-relaxed text-muted">
            Вопрос о пожертвовании, подключении мечети или отчёте — ответим в рабочее время.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          <li className="flex items-center gap-4 bg-white border border-line rounded-2xl px-5 py-[18px]">
            <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-mint text-primary-600 flex items-center justify-center shrink-0">
              <IconMail size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted">Почта</p>
              <a href="mailto:info@sadaka.tj" className="text-[17px] font-semibold text-primary-600 hover:text-primary-700 break-all">
                info@sadaka.tj
              </a>
            </div>
          </li>
          <li className="flex items-center gap-4 bg-white border border-line rounded-2xl px-5 py-[18px]">
            <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-mint text-primary-600 flex items-center justify-center shrink-0">
              <IconPin size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted">Офис</p>
              <p className="text-[17px] font-semibold">Душанбе, Таджикистан</p>
            </div>
          </li>
          <li className="flex items-center gap-4 bg-white border border-line rounded-2xl px-5 py-[18px]">
            <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-mint text-primary-600 flex items-center justify-center shrink-0">
              <IconClock size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted">Часы работы</p>
              <p className="text-[17px] font-semibold">Пн–Пт, 9:00–18:00</p>
            </div>
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="contact-form-title"
        className="lg:flex-[1.25] min-w-0 bg-white border border-line rounded-[20px] md:rounded-panel p-5 sm:p-8 md:p-10"
      >
        <h2 id="contact-form-title" className="text-2xl md:text-[26px] font-bold mb-2">
          Написать нам
        </h2>
        <p className="text-[15px] text-muted mb-6">
          Форма откроет ваш почтовый клиент с готовым письмом на info@sadaka.tj.
        </p>
        <ContactForm />
      </section>
    </div>
  );
}
