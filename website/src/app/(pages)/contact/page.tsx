import { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';
import { IconClock, IconInfo, IconMail, IconPin } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Контакты — Садака',
  description: 'Свяжитесь с командой Садака: вопросы о пожертвованиях, подключении мечети и отчётах.',
};

export default function Contact() {
  return (
    <div className="page flex flex-col gap-3 md:gap-4">
      <section className="panel-lg flex flex-col gap-1.5">
        <p className="overtitle">Контакты</p>
        <h1 className="title">Мы на связи</h1>
        <p className="body-text max-w-[680px]">
          Вопрос о пожертвовании, подключении мечети или отчёте — ответим в рабочее время.
        </p>
      </section>

      <div className="layout-aside">
        <section aria-labelledby="contact-form-title" className="panel-lg min-w-0">
          <h2 id="contact-form-title" className="title-sm">
            Написать нам
          </h2>
          <p className="caption mt-1 mb-5">Форма откроет ваш почтовый клиент с готовым письмом на info@sadaka.tj.</p>
          <ContactForm />
        </section>

        <aside className="aside-sticky flex flex-col gap-3">
          <section className="panel" aria-labelledby="contacts-title">
            <h2 id="contacts-title" className="overtitle">
              Как связаться
            </h2>
            <ul className="mt-1 divide-y divide-line">
              <li className="flex items-center gap-3 min-h-[64px] py-2">
                <span aria-hidden="true" className="icon-tile">
                  <IconMail />
                </span>
                <div className="min-w-0">
                  <p className="caption">Почта</p>
                  <a href="mailto:info@sadaka.tj" className="text-sm leading-5 font-semibold break-all">
                    info@sadaka.tj
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-3 min-h-[64px] py-2">
                <span aria-hidden="true" className="icon-tile">
                  <IconPin />
                </span>
                <div className="min-w-0">
                  <p className="caption">Офис</p>
                  <p className="text-sm leading-5 font-medium text-ink">Душанбе, Таджикистан</p>
                </div>
              </li>
              <li className="flex items-center gap-3 min-h-[64px] py-2">
                <span aria-hidden="true" className="icon-tile">
                  <IconClock />
                </span>
                <div className="min-w-0">
                  <p className="caption">Часы работы</p>
                  <p className="text-sm leading-5 font-medium text-ink tabular">Пн–Пт, 9:00–18:00</p>
                </div>
              </li>
            </ul>
          </section>
          <div className="infobox">
            <IconInfo size={18} className="shrink-0 mt-px" />
            <span>
              Представителям мечетей: заявку на подключение можно подать в кабинете мечети — её проверит Комитет улемов.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
