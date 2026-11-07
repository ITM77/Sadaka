import Link from 'next/link';
import CampaignCard from '@/components/CampaignCard';
import EmptyState from '@/components/EmptyState';
import ProgressBar from '@/components/ProgressBar';
import {
  IconArrowRight,
  IconChart,
  IconCheck,
  IconChevronDown,
  IconMosque,
  IconReport,
  IconSavob,
  IconShield,
} from '@/components/icons';
import { apiFetch, Campaign, CATEGORY_LABELS, formatTJS, plural, progress, timeLeftLabel } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Активные сборы для главной. Если бэкенд недоступен — главная всё равно открывается. */
async function loadCampaigns(): Promise<Campaign[] | null> {
  try {
    const { campaigns } = await apiFetch<{ campaigns: Campaign[] }>('/campaigns?limit=3');
    return campaigns;
  } catch {
    return null;
  }
}

const TRUST = [
  {
    icon: IconShield,
    title: 'Одобрение Комитета улемов',
    text: 'Сбор появляется на сайте только после проверки Комитетом. Мечеть-нарушитель блокируется сразу.',
  },
  {
    icon: IconReport,
    title: 'Отчёт по каждому сбору',
    text: 'Мечеть показывает расходы и фото чеков. Пока отчёта нет, новый сбор не запустится.',
  },
  {
    icon: IconChart,
    title: 'Суммы видны всем',
    text: 'Прогресс каждого сбора обновляется сразу после пожертвования — без скрытых счетов.',
  },
];

const STEPS = [
  { title: 'Выберите сбор', text: 'Найдите мечеть по городу или откройте сбор с QR-кода у входа.' },
  { title: 'Укажите сумму', text: 'От 1 сомони. Видно, сколько уже собрано и сколько осталось.' },
  { title: 'Оплатите', text: 'Картой Visa, Mastercard, Корти Миллӣ или кошельком Alif и IMON.' },
  { title: 'Получите Савоб и отчёт', text: 'Баллы зачисляются сразу, а отчёт мечети появится после завершения сбора.' },
];

const MULTIPLIERS = [
  { label: 'Обычные дни', value: '×1', festive: false },
  { label: 'Рамадан', value: '×2', festive: true },
  { label: 'Курбан-байрам', value: '×3', festive: true },
];

const FOR_MOSQUES = [
  'Заявка проверяется Комитетом улемов',
  'Сбор с целью, сроком и прогрессом',
  'QR-код для прихожан у входа',
  'Отчёт с расходами и фото чеков',
];

const FAQ = [
  {
    q: 'Куда идут мои деньги?',
    a: 'Прямо на конкретный сбор мечети. После завершения мечеть публикует отчёт с расходами, Комитет его проверяет.',
  },
  {
    q: 'Что такое Савоб?',
    a: 'Баллы за пожертвования — счётчик добрых дел. Они не обмениваются на деньги. В Рамадан начисляются вдвое, в Курбан-байрам втрое.',
  },
  {
    q: 'Как мечеть попадает на Садаку?',
    a: 'Подаёт заявку в кабинете. Комитет улемов проверяет мечеть и только потом разрешает сборы.',
  },
  {
    q: 'Безопасна ли оплата?',
    a: 'Платёж проводит банк или кошелёк — Садака не хранит данные карт.',
  },
];

export default async function Home() {
  const campaigns = await loadCampaigns();
  const live = campaigns?.[0];

  return (
    <>
      {/* ---------- Герой ---------- */}
      <section className="girih surface-night overflow-hidden">
        <div className="container-custom px-5 sm:px-8 pt-7 pb-10 md:pt-24 md:pb-28 flex flex-wrap gap-16 items-center">
          <div className="flex-[1_1_520px] min-w-0 flex flex-col gap-[18px] md:gap-7">
            <span className="self-start inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-3.5 md:py-2 rounded-full border border-gold/35 text-gold text-[13px] md:text-sm font-medium">
              <IconShield size={18} className="w-[15px] h-[15px] md:w-[18px] md:h-[18px]" />
              <span className="md:hidden">Одобрено Комитетом улемов</span>
              <span className="hidden md:inline">Каждый сбор одобрен Комитетом улемов</span>
            </span>
            <h1 className="h-display">Садақа, которой можно доверять</h1>
            <p className="text-[17px] md:text-xl leading-[1.55] md:leading-relaxed text-mist max-w-[560px]">
              Жертвуйте мечетям Таджикистана онлайн. Комитет улемов проверяет каждый сбор, а мечеть публикует
              отчёт о каждом потраченном сомони.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Link href="/campaigns" className="btn btn-gold btn-lg gap-2.5">
                Выбрать сбор
                <IconArrowRight size={20} />
              </Link>
              <Link href="/mosques" className="btn btn-on-dark btn-lg max-sm:h-[52px] max-sm:text-base">
                Найти мечеть
              </Link>
            </div>
            <div className="hidden md:flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-mist">
              <span>Visa · Mastercard · Корти Миллӣ</span>
              <span>Alif · IMON</span>
              <span>QR-код в мечети</span>
            </div>
          </div>

          {/* Живая карточка — реальный активный сбор */}
          {live && <LiveCampaign campaign={live} />}
        </div>
      </section>

      {/* ---------- Почему доверяют ---------- */}
      <section className="container-custom pt-7 pb-2 md:pt-24 md:pb-10">
        <h2 className="sr-only">Почему Садаке доверяют</h2>
        <div className="grid gap-2.5 md:gap-6 md:grid-cols-3">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="card flex md:flex-col items-start gap-3.5 p-[18px] rounded-[18px] md:p-8 md:rounded-card"
            >
              <span className="icon-tile w-11 h-11 rounded-xl md:w-[52px] md:h-[52px] md:rounded-[14px]">
                <Icon size={24} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base md:text-xl font-bold">{title}</h3>
                <p className="mt-0.5 md:mt-3.5 text-sm md:text-base leading-normal md:leading-relaxed text-muted">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Сейчас собирают ---------- */}
      {campaigns && (
        <section className="container-custom py-7 md:py-14">
          <div className="flex flex-wrap justify-between items-baseline md:items-end gap-4 mb-3.5 md:mb-7">
            <div>
              <p className="eyebrow hidden md:block mb-2">Сейчас собирают</p>
              <h2 className="text-2xl md:text-[40px] leading-[1.15] font-bold">
                <span className="md:hidden">Сейчас собирают</span>
                <span className="hidden md:inline">Помогите мечетям сегодня</span>
              </h2>
            </div>
            <Link
              href="/campaigns"
              className="inline-flex items-center gap-2 min-h-11 text-[15px] md:text-base font-semibold text-primary-600 hover:text-primary-700"
            >
              <span className="md:hidden">Все</span>
              <span className="hidden md:inline">Все сборы</span>
              <IconArrowRight size={18} className="hidden md:block" />
            </Link>
          </div>
          {campaigns.length === 0 ? (
            <EmptyState icon={<IconMosque size={28} />} title="Сейчас нет активных сборов">
              Новые сборы появятся после одобрения Комитетом улемов.
            </EmptyState>
          ) : (
            <div className="grid gap-3.5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------- Как это работает ---------- */}
      <section className="container-custom py-7 md:py-14">
        <div className="panel bg-white border border-line">
          <h2 className="text-[26px] md:text-4xl font-bold mb-6 md:mb-10">Пожертвование за минуту</h2>
          <ol className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-3">
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Савоб ---------- */}
      <section className="container-custom py-7 md:py-14">
        <div className="panel surface-sand girih girih-brass flex flex-wrap gap-8 md:gap-12 items-center">
          <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-3 md:gap-[18px]">
            <p className="eyebrow text-brass-700">Савоб · ثواب</p>
            <h2 className="h-section text-brass-900">Счётчик ваших добрых дел</h2>
            <p className="text-[15px] md:text-lg leading-relaxed text-brass-800">
              За каждые 10 сомони — 1 балл Савоб. Баллы не имеют денежной ценности: это история вашей садақа,
              которая всегда с вами.
            </p>
          </div>
          <div className="flex-[1_1_300px] max-w-[440px] min-w-0 bg-white rounded-card p-6 md:p-7 flex flex-col gap-[18px] shadow-brass text-ink">
            <div className="flex justify-between items-center">
              <span className="text-[15px] text-muted">Начисление баллов</span>
              <IconSavob size={24} className="text-brass-600" />
            </div>
            <p className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[40px] md:text-5xl font-bold text-brass-700 leading-none tracking-tight">1 балл</span>
              <span className="text-[15px] text-muted">за каждые 10 TJS</span>
            </p>
            <ul className="flex flex-col gap-2.5 text-[15px]">
              {MULTIPLIERS.map((m) => (
                <li
                  key={m.label}
                  className={`flex justify-between px-3.5 py-3 rounded-xl ${m.festive ? 'bg-sand text-brass-800' : 'bg-paper'}`}
                >
                  <span>{m.label}</span>
                  <strong>{m.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Для мечетей ---------- */}
      <section className="container-custom py-7 md:py-14">
        <div className="panel surface-lazurite flex flex-wrap gap-8 md:gap-12 items-center">
          <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-3.5 md:gap-[18px]">
            <p className="eyebrow text-gold">Для мечетей</p>
            <h2 className="text-[22px] leading-tight md:text-[40px] md:leading-[1.15] font-bold tracking-[-0.02em]">Собирайте открыто — прихожане это ценят</h2>
            <p className="text-[15px] md:text-lg leading-relaxed text-[#D4E3DF]">
              Подайте заявку, откройте сбор после одобрения Комитетом и отчитайтесь о расходах в личном кабинете.
            </p>
            <Link
              href="/cabinet/mosques/new"
              className="btn h-[52px] px-6 text-base bg-white text-primary-700 hover:bg-mint hover:text-primary-700 sm:self-start"
            >
              Подать заявку мечети
            </Link>
          </div>
          <ul className="hidden md:flex flex-[1_1_360px] min-w-0 flex-col gap-3.5 text-[17px]">
            {FOR_MOSQUES.map((item) => (
              <li key={item} className="flex gap-3 items-start">
                <IconCheck size={22} className="text-gold shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Вопросы ---------- */}
      <section className="container-custom pt-7 pb-14 md:pt-14 md:pb-[104px]">
        <h2 className="text-[26px] md:text-4xl font-bold mb-6 md:mb-8">Частые вопросы</h2>
        <div className="grid gap-3 md:gap-4 md:grid-cols-2 items-start">
          {FAQ.map((f, i) => (
            <details key={f.q} open={i < 2} className="group card rounded-2xl px-5 md:px-6 py-[18px] md:py-[22px]">
              <summary className="flex items-center justify-between gap-4 min-h-6 text-base md:text-[17px] font-semibold cursor-pointer rounded-md">
                {f.q}
                <IconChevronDown size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function LiveCampaign({ campaign: c }: { campaign: Campaign }) {
  return (
    <div className="hidden md:block relative flex-[1_1_380px] max-w-[460px] min-w-0">
      <article className="bg-white text-ink rounded-[24px] overflow-hidden shadow-lg">
        <div className="girih girih-strong relative h-[168px] bg-primary-600 flex items-center justify-center">
          <IconMosque size={72} strokeWidth={1.25} className="text-gold" />
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            <span className="badge badge-primary">{CATEGORY_LABELS[c.category] ?? c.category}</span>
            <span className="badge font-medium">{timeLeftLabel(c)}</span>
          </div>
          <div>
            <h2 className="text-[22px] leading-snug font-bold mb-1">{c.title}</h2>
            {c.mosque && (
              <p className="text-[15px] text-muted">
                {c.mosque.name} · {c.mosque.city}
              </p>
            )}
          </div>
          <ProgressBar value={progress(c)} size="lg" />
          <div className="flex justify-between items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-bold text-primary-600">{formatTJS(c.current_amount)}</span>
            <span className="text-sm text-muted">
              из {formatTJS(c.goal_amount)} · {c.donation_count}{' '}
              {plural(c.donation_count, ['пожертвование', 'пожертвования', 'пожертвований'])}
            </span>
          </div>
          <Link href={`/campaigns/${c.id}#donate`} className="btn btn-primary btn-block h-[52px] text-base">
            Пожертвовать
          </Link>
        </div>
      </article>
      <div className="absolute right-0 lg:-right-[18px] top-[132px] flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-sand text-brass-800 shadow-md">
        <IconSavob size={22} />
        <span className="text-[15px] font-bold">+1 Савоб за 10 TJS</span>
      </div>
    </div>
  );
}
