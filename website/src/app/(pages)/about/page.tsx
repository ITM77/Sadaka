import { Metadata } from 'next';
import Link from 'next/link';
import { IconCheck, IconClose, IconMosque, IconSavob, IconShield } from '@/components/icons';

export const metadata: Metadata = {
  title: 'О проекте — Садака',
  description:
    'Садака соединяет жертвователей и мечети Таджикистана. Комитет улемов одобряет каждый сбор, а мечеть обязана показать, на что потрачены деньги.',
};

const before = [
  'Пожертвования наличными без учёта',
  'Мечети не отчитывались о расходах',
  'Нет единого стандарта по стране',
  'Молодёжь не носит наличные',
];

const after = [
  'Онлайн-пожертвования картой и кошельком',
  'Обязательный отчёт по каждому сбору',
  'Одобрение Комитетом улемов',
  'Савоб — история ваших добрых дел',
];

const roles = [
  {
    icon: <IconShield />,
    title: 'Комитет улемов',
    text: 'Одобряет мечети и сборы, проверяет отчёты, видит статистику по стране и блокирует нарушителей.',
  },
  {
    icon: <IconMosque />,
    title: 'Мечеть',
    text: 'Открывает сборы с целью и сроком, ведёт QR-код для прихожан и публикует отчёт после каждого сбора.',
  },
  {
    icon: <IconSavob />,
    title: 'Жертвователь',
    text: 'Выбирает мечеть или сбор, жертвует онлайн, получает Савоб и видит отчёт о расходах.',
  },
];

const partners = [
  { name: 'Комитет улемов', role: 'Регулятор и модератор сборов' },
  { name: 'Национальный банк', role: 'Лицензирование платежей' },
  { name: 'Alif и IMON', role: 'Платёжная инфраструктура' },
  { name: 'Мечети страны', role: 'Операторы сборов' },
];

export default function About() {
  return (
    <div className="page flex flex-col gap-3 md:gap-4">
      <section className="panel-lg flex flex-col gap-1.5">
        <p className="overtitle">
          О проекте · <span lang="ar">صدقة</span>
        </p>
        <h1 className="title">Традиция садақа — в цифровом формате</h1>
        <p className="body-text max-w-[680px]">
          Садака соединяет жертвователей и мечети Таджикистана. Комитет улемов одобряет каждый сбор, а мечеть обязана
          показать, на что потрачены деньги.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/campaigns" className="btn btn-primary">
            Выбрать сбор
          </Link>
          <Link href="/cabinet" className="btn btn-secondary">
            Кабинет мечети
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="change-title">
        <h2 id="change-title" className="overtitle">
          Зачем нужна платформа
        </h2>
        <div className="grid md:grid-cols-2 gap-2 mt-3">
          <div className="tile">
            <h3 className="title-sm">Что мешало раньше</h3>
            <ul className="mt-2 flex flex-col">
              {before.map((t) => (
                <li key={t} className="flex items-start gap-2.5 py-1.5 body-text">
                  <IconClose size={18} className="text-muted shrink-0 mt-px" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="tile !bg-sec-soft">
            <h3 className="title-sm">Что меняет Садака</h3>
            <ul className="mt-2 flex flex-col">
              {after.map((t) => (
                <li key={t} className="flex items-start gap-2.5 py-1.5 text-sm leading-5 text-ink">
                  <IconCheck size={18} className="text-sec shrink-0 mt-px" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="roles-title">
        <p className="overtitle">Участники</p>
        <h2 id="roles-title" className="title mt-1.5">
          Три участника — одна система доверия
        </h2>
        <div className="grid md:grid-cols-3 gap-2 mt-4">
          {roles.map((r) => (
            <article key={r.title} className="tile flex flex-col gap-2.5">
              <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-white text-sec flex items-center justify-center">
                {r.icon}
              </span>
              <h3 className="title-sm">{r.title}</h3>
              <p className="body-text">{r.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="partners-title">
        <p className="overtitle">Партнёры</p>
        <h2 id="partners-title" className="title-sm mt-1.5">
          Платформа работает вместе с государственными и платёжными институтами страны
        </h2>
        <dl className="kv mt-3">
          {partners.map((p) => (
            <div key={p.name} className="!flex-wrap !gap-x-3 !gap-y-0 py-2">
              <dt className="font-medium text-ink">{p.name}</dt>
              <dd className="text-body">{p.role}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
