import { Metadata } from 'next';
import { IconMosque, IconSavob, IconShield } from '@/components/icons';

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
    icon: <IconShield size={26} />,
    tile: 'bg-mint text-primary-600',
    title: 'Комитет улемов',
    text: 'Одобряет мечети и сборы, проверяет отчёты, видит статистику по стране и блокирует нарушителей.',
  },
  {
    icon: <IconMosque size={26} strokeWidth={1.6} />,
    tile: 'bg-[#E4ECF1] text-[#1B4D63]',
    title: 'Мечеть',
    text: 'Открывает сборы с целью и сроком, ведёт QR-код для прихожан и публикует отчёт после каждого сбора.',
  },
  {
    icon: <IconSavob size={26} />,
    tile: 'bg-sand text-brass-700',
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
    <>
      <section className="container-custom pt-10 pb-8 md:pt-[72px] md:pb-12 flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-12">
        <div className="lg:flex-[1.5] min-w-0 flex flex-col gap-3 md:gap-4">
          <p className="eyebrow">
            О проекте · <span lang="ar">صدقة</span>
          </p>
          <h1 className="text-[34px] leading-[1.1] sm:text-5xl lg:text-[56px] lg:leading-[1.05] font-bold" style={{ letterSpacing: '-0.025em' }}>
            Традиция садақа — в цифровом формате
          </h1>
        </div>
        <p className="lg:flex-1 min-w-0 text-[17px] md:text-lg leading-[1.7] text-dark-700">
          Садака соединяет жертвователей и мечети Таджикистана. Комитет улемов одобряет каждый сбор, а мечеть обязана
          показать, на что потрачены деньги.
        </p>
      </section>

      <section className="container-custom py-4 md:py-6">
        <div className="grid md:grid-cols-2 gap-4 md:gap-5">
          <div className="card p-6 md:p-7">
            <h2 className="text-xl font-bold mb-4">Что мешало раньше</h2>
            <ul className="list-disc pl-5 flex flex-col gap-2.5 text-base leading-normal text-dark-700 marker:text-dark-400">
              {before.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="surface-lazurite rounded-card p-6 md:p-7">
            <h2 className="text-xl font-bold mb-4">Что меняет Садака</h2>
            <ul className="list-disc pl-5 flex flex-col gap-2.5 text-base leading-normal text-[#D4E3DF] marker:text-gold">
              {after.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-custom py-10 md:py-12">
        <h2 className="text-[26px] leading-tight md:text-[36px] font-bold mb-5 md:mb-6" style={{ letterSpacing: '-0.02em' }}>
          Три участника — одна система доверия
        </h2>
        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {roles.map((r) => (
            <article key={r.title} className="card p-6 md:p-7 flex flex-col gap-3">
              <span aria-hidden="true" className={`icon-tile ${r.tile}`}>
                {r.icon}
              </span>
              <h3 className="text-xl font-bold">{r.title}</h3>
              <p className="text-base leading-relaxed text-muted">{r.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-custom pt-4 pb-16 md:pt-6 md:pb-24">
        <div className="bg-white border border-line rounded-[20px] md:rounded-[24px] p-6 md:p-10 flex flex-col lg:flex-row gap-6 lg:gap-10">
          <div className="lg:flex-1 min-w-0">
            <h2 className="text-2xl md:text-[28px] font-bold mb-3">Партнёры</h2>
            <p className="text-base leading-relaxed text-muted">
              Платформа работает вместе с государственными и платёжными институтами страны.
            </p>
          </div>
          <dl className="lg:flex-[2] min-w-0 grid sm:grid-cols-2 gap-3 md:gap-4">
            {partners.map((p) => (
              <div key={p.name} className="p-[18px] rounded-2xl bg-paper">
                <dt className="text-base font-bold">{p.name}</dt>
                <dd className="mt-1 text-sm text-muted">{p.role}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
