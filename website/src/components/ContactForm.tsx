'use client';

import { FormEvent } from 'react';

const CONTACT_EMAIL = 'info@sadaka.tj';

/**
 * Форма обратной связи. Бэкенд-эндпоинта для сообщений пока нет,
 * поэтому форма открывает почтовый клиент с заполненным письмом.
 */
export default function ContactForm() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    const subject = `Сообщение с сайта Садака — ${name}`;
    const body = `${message}\n\n—\n${name}\n${email}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="contact-name" className="label">
            Имя
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="input"
            placeholder="Ваше имя"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="label">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="your@email.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="label">
          Сообщение
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          className="input resize-y"
          placeholder="Ваше сообщение..."
        />
      </div>
      <button type="submit" className="btn btn-primary btn-lg w-full">
        Отправить
      </button>
    </form>
  );
}
