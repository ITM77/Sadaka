import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DonateForm from '@/components/DonateForm';
import ProgressBar from '@/components/ProgressBar';
import { IconCheck, IconMosque, IconReport, IconShield } from '@/components/icons';
import {
  apiFetchOrNull,
  Campaign,
  CATEGORY_LABELS,
  daysLeft,
  formatDate,
  formatTJS,
  lastDay,
  plural,
  progress,
  Report,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

type Data = {
  campaign: Campaign;
  recent_donations: { amount: number; created_at: string }[];
  report: Report | null;
};

const load = (id: string) => apiFetchOrNull<Data>(`/campaigns/${encodeURIComponent(id)}`);

const whenFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Dushanbe',
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await load(params.id);
  return {
    title: data ? `${data.campaign.title} — Садака` : 'Кампания не найдена — Садака',
    description: data?.campaign.description.slice(0, 160),
  };
}

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const data = await load(params.id);
  if (!data) notFound();
  const { campaign, recent_donations, report } = data;
  const pct = progress(campaign);
  const now = Date.now();
  const open =
    campaign.status === 'active' &&
    now >= new Date(campaign.start_date).getTime() &&
    now < new Date(campaign.end_date).getTime();
  const completed = campaign.status === 'completed';
  const days = daysLeft(campaign.end_date, now);
  const mosque = campaign.mosque;

  return (
    <div className="container-custom pt-4 pb-14 md:pt-8 md:pb-24">
      <nav aria-label="Навигация" className="hidden md:flex flex-wrap gap-2 text-sm text-muted mb-6">
        <Link href="/campaigns" className="hover:text-primary-700">
          Сборы
        </Link>
        <span aria-hidden="true">/</span>
        {mosque && (
          <>
            <Link href={`/mosques/${campaign.mosque_id}`} className="hover:text-primary-700">
              {mosque.name}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page" className="text-dark-700">
          {campaign.title}
        </span>
      </nav>

      {/* До lg — одна колонка в порядке холста телефона: обложка, заголовок, пожертвование, описание, отчёт */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-8 lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-6 lg:flex-[999_1_560px] lg:min-w-0">
          {/* Обложка */}
          <div
            className="order-1 girih relative overflow-hidden h-[180px] md:h-[300px] rounded-[20px] md:rounded-[24px] bg-primary-600 flex items-end p-4 md:p-7"
            style={{ '--girih-opacity': 0.18 } as React.CSSProperties}
          >
            <IconMosque
              size={120}
              strokeWidth={0.9}
              className="absolute right-5 top-5 w-[72px] h-[72px] md:right-10 md:top-10 md:w-[120px] md:h-[120px] text-gold opacity-90"
            />
            <div className="relative flex gap-2 flex-wrap">
              <span className="badge bg-white/90 text-primary-700">{CATEGORY_LABELS[campaign.category] ?? campaign.category}</span>
              <span className="badge bg-white/90 text-primary-700 gap-1.5">
                <IconShield size={15} strokeWidth={2} />
                Одобрено Комитетом улемов
              </span>
              {completed && <span className="badge bg-sand text-brass-800">Сбор завершён</span>}
            </div>
          </div>

          {/* Заголовок */}
          <header className="order-2 flex flex-col gap-3">
            <h1 className="text-[28px] leading-[1.15] md:text-[44px] md:leading-[1.1] font-bold tracking-[-0.02em]">
              {campaign.title}
            </h1>
            {mosque && (
              <Link
                href={`/mosques/${campaign.mosque_id}`}
                className="self-start inline-flex items-center gap-3 py-2 pl-2 pr-3.5 rounded-[14px] bg-white border border-line text-ink hover:border-primary-200 transition-colors"
              >
                <span className="w-10 h-10 rounded-[10px] bg-mint text-primary-600 flex items-center justify-center shrink-0" aria-hidden="true">
                  <IconMosque size={22} strokeWidth={1.6} />
                </span>
                <span className="flex flex-col min-w-0">
                  <strong className="text-[15px]">{mosque.name}</strong>
                  <span className="text-[13px] text-muted">
                    {mosque.city}
                    {mosque.address && ` · ${mosque.address}`}
                  </span>
                </span>
              </Link>
            )}
          </header>

          {/* О сборе */}
          <section className="order-4 card p-5 md:p-8 flex flex-col gap-4">
            <h2 className="text-lg md:text-[22px] font-bold">О сборе</h2>
            <p className="text-[15px] md:text-[17px] leading-relaxed md:leading-[1.7] text-dark-700 whitespace-pre-line">
              {campaign.description}
            </p>
            <dl className="grid gap-3 md:gap-4 grid-cols-2 mt-1 md:mt-2">
              <div className="p-4 rounded-[14px] bg-paper">
                <dt className="text-[13px] text-muted">Начало</dt>
                <dd className="mt-1 text-[15px] md:text-base font-semibold">{formatDate(campaign.start_date)}</dd>
              </div>
              <div className="p-4 rounded-[14px] bg-paper">
                <dt className="text-[13px] text-muted">Последний день</dt>
                <dd className="mt-1 text-[15px] md:text-base font-semibold">{lastDay(campaign.end_date)}</dd>
              </div>
            </dl>
          </section>

          {/* Отчёт */}
          {report ? (
            <ReportSection report={report} />
          ) : (
            <section className="order-5 card p-5 md:p-8 flex gap-3.5 md:gap-5 items-start">
              <span
                className="icon-tile w-10 h-10 rounded-xl md:w-[52px] md:h-[52px] md:rounded-[14px] bg-sand text-brass-700"
                aria-hidden="true"
              >
                <IconReport size={24} />
              </span>
              <div className="min-w-0">
                <h2 className="text-base md:text-xl font-bold mb-0.5 md:mb-1.5">Отчёт мечети</h2>
                <p className="text-sm md:text-base leading-relaxed text-muted">
                  {completed
                    ? 'Сбор завершён — мечеть готовит отчёт: статьи расходов, суммы и фото чеков. Пока отчёта нет, мечеть не сможет открыть новый сбор.'
                    : 'Появится здесь после завершения сбора: статьи расходов, суммы и фото чеков. Пока отчёта нет, мечеть не сможет открыть новый сбор.'}
                </p>
              </div>
            </section>
          )}

          {/* Последние пожертвования */}
          {recent_donations.length > 0 && (
            <section className="order-6 card p-5 md:p-8">
              <h2 className="text-lg md:text-xl font-bold mb-1.5 md:mb-4">Последние пожертвования</h2>
              <ul className="flex flex-col">
                {recent_donations.map((d, i) => (
                  <li
                    key={i}
                    className="flex justify-between gap-3 py-3 md:py-3.5 border-b border-dark-100 last:border-b-0 text-[15px] md:text-base"
                  >
                    <span className="flex items-center gap-2.5 text-muted">
                      <span className="w-2 h-2 rounded-full bg-brass-400 shrink-0" aria-hidden="true" />
                      {whenFmt.format(new Date(d.created_at))}
                    </span>
                    <strong className="whitespace-nowrap">{formatTJS(d.amount)}</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-3.5 text-sm text-muted">Имена жертвователей не публикуются.</p>
            </section>
          )}
        </div>

        {/* Панель пожертвования */}
        <aside
          id="donate"
          aria-label="Пожертвовать"
          className="order-3 scroll-mt-20 lg:scroll-mt-24 lg:sticky lg:top-24 lg:flex-[1_1_360px] lg:max-w-[420px] min-w-0 bg-white border border-line rounded-[20px] lg:rounded-[24px] p-5 lg:p-7 flex flex-col gap-[22px] shadow-[0_20px_48px_-32px_rgba(20,36,34,0.35)]"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 md:flex-col md:items-start md:gap-0">
              <span className="text-[26px] md:text-4xl font-bold text-primary-600 tracking-[-0.02em]">
                {formatTJS(campaign.current_amount)}
              </span>
              <span className="text-sm md:text-[15px] text-muted">собрано из {formatTJS(campaign.goal_amount)}</span>
            </div>
            <ProgressBar value={pct} size="lg" />
            <div className="grid grid-cols-3 gap-1.5 md:gap-2 text-center">
              <Stat value={`${pct}%`} label="цели" />
              <Stat
                value={String(campaign.donation_count)}
                label={plural(campaign.donation_count, ['пожертвование', 'пожертвования', 'пожертвований'])}
              />
              <Stat
                value={completed ? '—' : String(days)}
                label={completed ? 'сбор завершён' : `${plural(days, ['день', 'дня', 'дней'])} осталось`}
              />
            </div>
          </div>

          {open ? (
            <>
              <h2 className="sr-only">Пожертвовать</h2>
              <DonateForm campaignId={campaign.id} campaignTitle={campaign.title} mosqueName={mosque?.name} />
            </>
          ) : (
            <p className="rounded-xl bg-paper p-4 text-[15px] leading-relaxed text-muted">
              {completed ? 'Сбор завершён. Спасибо всем, кто помог!' : 'Сбор сейчас не принимает пожертвования.'}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[10px] md:rounded-xl bg-paper py-2 md:py-2.5 px-1">
      <div className="text-base md:text-lg font-bold">{value}</div>
      <div className="text-xs text-muted leading-tight">{label}</div>
    </div>
  );
}

function ReportSection({ report }: { report: Report }) {
  const approved = report.status === 'approved';
  return (
    <section id="report" className="order-5 card p-5 md:p-8 scroll-mt-24 flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-3.5 md:gap-5">
        <span
          className="icon-tile w-10 h-10 rounded-xl md:w-[52px] md:h-[52px] md:rounded-[14px] bg-sand text-brass-700"
          aria-hidden="true"
        >
          <IconReport size={24} />
        </span>
        <div className="flex-[1_1_240px] min-w-0">
          <h2 className="text-base md:text-xl font-bold mb-0.5 md:mb-1.5">Отчёт мечети</h2>
          <p className="text-sm md:text-base text-muted">
            {report.title} · {formatDate(report.submitted_at)}
          </p>
        </div>
        <span className={approved ? 'badge badge-success gap-1.5' : 'badge badge-warning'}>
          {approved && <IconCheck size={14} strokeWidth={2.25} />}
          {approved ? 'Проверен Комитетом' : 'На проверке у Комитета'}
        </span>
      </div>

      {report.description && (
        <p className="text-[15px] md:text-base leading-relaxed text-dark-700 whitespace-pre-line">{report.description}</p>
      )}

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[15px]">
          <caption className="sr-only">Расходы по сбору</caption>
          <thead>
            <tr className="text-left text-sm text-muted border-b border-line">
              <th scope="col" className="py-2.5 font-medium">
                Статья расходов
              </th>
              <th scope="col" className="py-2.5 font-medium text-right">
                Сумма
              </th>
            </tr>
          </thead>
          <tbody>
            {report.expenses.map((e, i) => (
              <tr key={i} className="border-b border-dark-100">
                <td className="py-3 pr-4">{e.item}</td>
                <td className="py-3 text-right whitespace-nowrap">{formatTJS(e.cost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <th scope="row" className="pt-3.5 text-left">
                Потрачено
              </th>
              <td className="pt-3.5 text-right whitespace-nowrap">{formatTJS(report.total_spent)}</td>
            </tr>
            <tr className="text-muted">
              <th scope="row" className="pt-1 text-left font-normal">
                Собрано
              </th>
              <td className="pt-1 text-right whitespace-nowrap">{formatTJS(report.total_collected)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {report.photo_urls.length > 0 && (
        <div>
          <h3 className="text-[15px] font-semibold mb-2.5">Фото подтверждения</h3>
          <ul className="flex flex-wrap gap-2">
            {report.photo_urls.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="chip h-11 font-semibold text-primary-700"
                >
                  Фото {i + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
