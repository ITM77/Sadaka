'use client';

import { FormEvent, useState } from 'react';

const CONTACT_EMAIL = 'info@sadaka.tj';

const TOPICS = ['Пожертвование', 'Подключение мечети', 'Другое'] as const;

/**
 * Форма обратной связи. Бэкенд-эндпоинта для сообщений пока нет,
 * поэтому форма открывает почтовый клиент с заполненным письмом.
 */
export default function ContactForm() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>(TOPICS[0]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const reply = String(data.get('reply') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    const subject = `${topic} — сообщение с сайта Садака от ${name}`;
    const body = `${message}\n\n—\n${name}\n${reply}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="label text-[15px]">
            Имя
          </label>
          <input id="contact-name" name="name" type="text" required autoComplete="name" className="input h-[52px]" />
        </div>
        <div>
          <label htmlFor="contact-reply" className="label text-[15px]">
            Телефон или email
          </label>
          <input id="contact-reply" name="reply" type="text" required className="input h-[52px]" />
        </div>
      </div>
      <fieldset>
        <legend className="label text-[15px]">Тема</legend>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => {
            const on = topic === t;
            return (
              <label
                key={t}
                className={`inline-flex items-center gap-2 h-11 px-4 rounded-full text-[15px] cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-600 has-[:focus-visible]:ring-offset-2 ${
                  on
                    ? 'border-[1.5px] border-primary-600 bg-mint text-primary-700 font-semibold'
                    : 'border border-dark-300 bg-white font-medium hover:border-primary-300'
                }`}
              >
                <input
                  type="radio"
                  name="topic"
                  value={t}
                  checked={on}
                  onChange={() => setTopic(t)}
                  className="w-4 h-4 text-primary-600 border-dark-300 focus:ring-0 focus:ring-offset-0"
                />
                {t}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label htmlFor="contact-message" className="label text-[15px]">
          Сообщение
        </label>
        <textarea id="contact-message" name="message" rows={5} required className="input resize-y" />
      </div>
      <button type="submit" className="btn btn-primary btn-lg btn-block">
        Отправить
      </button>
    </form>
  );
}
