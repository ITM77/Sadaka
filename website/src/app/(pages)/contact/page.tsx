import { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Контакты — Садака',
  description: 'Свяжитесь с командой Садака.',
};

const contacts = [
  { icon: '📍', title: 'Адрес', lines: ['Душанбе, Таджикистан', 'Офис Садака'] },
  { icon: '📧', title: 'Email', lines: ['info@sadaka.tj', 'support@sadaka.tj'] },
  { icon: '📱', title: 'Телефон', lines: ['+992 371 123 456', '+992 901 234 567'] },
  { icon: '🕐', title: 'Время работы', lines: ['Пн-Пт: 9:00 - 18:00', 'Сб-Вс: Закрыто'] },
];

export default function Contact() {
  return (
    <>
      <PageHero
        badge="✉️ Контакты"
        title={
          <>
            Свяжитесь <span className="text-gradient">с нами</span>
          </>
        }
        description="Есть вопрос, предложение или хотите подключить мечеть? Напишите нам — ответим в рабочее время."
      />

      <section className="section pt-0 md:pt-0">
        <div className="container-custom max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {contacts.map((c) => (
              <div key={c.title} className="card-hover p-6 group">
                <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110">
                  {c.icon}
                </div>
                <h2 className="text-lg font-bold mb-2">{c.title}</h2>
                <p className="text-dark-600 dark:text-dark-400 text-sm leading-relaxed">
                  {c.lines.map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>

          <div className="card p-8 md:p-10 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Отправьте сообщение</h2>
            <p className="text-dark-600 dark:text-dark-400 mb-8">
              Заполните форму — откроется ваш почтовый клиент с готовым письмом.
            </p>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
