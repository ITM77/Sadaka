'use client';

import { FormEvent, useState } from 'react';
import { useI18n } from '@/lib/i18n/client';

const CONTACT_EMAIL = 'info@sadaka.tj';

const TOPICS = ['Пожертвование', 'Подключение мечети', 'Другое'] as const;

/**
 * Форма обратной связи. Бэкенд-эндпоинта для сообщений пока нет,
 * поэтому форма открывает почтовый клиент с заполненным письмом.
 */
export default function ContactForm() {
  const { t } = useI18n();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>(TOPICS[0]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const reply = String(data.get('reply') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    const subject = t('{topic} — сообщение с сайта Садака от {name}', { topic: t(topic), name });
    const body = `${message}\n\n—\n${name}\n${reply}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="label">
            {t('Имя')}
          </label>
          <input id="contact-name" name="name" type="text" required autoComplete="name" className="input" />
        </div>
        <div>
          <label htmlFor="contact-reply" className="label">
            {t('Телефон или email')}
          </label>
          <input id="contact-reply" name="reply" type="text" required className="input" />
        </div>
      </div>
      <fieldset>
        <legend className="label">{t('Тема')}</legend>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topicId) => {
            const on = topic === topicId;
            return (
              <label
                key={topicId}
                className={`chip min-h-[44px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-700 ${
                  on ? '!bg-accent-100 !text-accent-700' : ''
                }`}
              >
                <input
                  type="radio"
                  name="topic"
                  value={topicId}
                  checked={on}
                  onChange={() => setTopic(topicId)}
                  className="sr-only"
                />
                {t(topicId)}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label htmlFor="contact-message" className="label">
          {t('Сообщение')}
        </label>
        <textarea id="contact-message" name="message" rows={5} required className="input resize-y" />
      </div>
      <button type="submit" className="btn btn-primary btn-lg btn-block sm:w-auto sm:self-start">
        {t('Отправить')}
      </button>
    </form>
  );
}
