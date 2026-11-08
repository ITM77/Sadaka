import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DonateForm from '@/components/DonateForm';
import ProgressBar from '@/components/ProgressBar';
import { IconCheck, IconChevronRight, IconMosque, IconReport, IconShield } from '@/components/icons';
import { apiFetchOrNull, Campaign, CATEGORY_LABELS, progress, Report } from '@/lib/api';
import type { Fmt, I18n } from '@/lib/i18n/core';
import { getI18n } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

type Data = {
  campaign: Campaign;
  recent_donations: { amount: number; created_at: string }[];
  report: Report | null;
};

const load = (id: string) => apiFetchOrNull<Data>(`/campaigns/${encodeURIComponent(id)}`);

/** «9 ноября, 09:20» — русский формат даты последних пожертвований (для tg — fmt.short). */
const whenFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Dushanbe',
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { t } = getI18n();
  const data = await load(params.id);
  return {
    title: data ? t('{name} — Садака', { name: data.campaign.title }) : t('Кампания не найдена — Садака'),
    description: data?.campaign.description.slice(0, 160),
  };
}

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const { t, fmt, lang } = getI18n();
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
  const days = fmt.daysLeft(campaign.end_date, now);
  const mosque = campaign.mosque;

  return (
    <div className="page">
      <nav aria-label={t('Навигация')} className="caption !text-[13px] flex flex-wrap items-center gap-x-1.5 pt-1 md:pt-0">
        <Link href="/campaigns" className="inline-flex items-center min-h-11 -my-3 text-muted hover:text-accent-700">
          {t('Сборы')}
        </Link>
        {mosque && (
          <>
            <span aria-hidden="true">·</span>
            <Link
              href={`/mosques/${campaign.mosque_id}`}
              className="inline-flex items-center min-h-11 -my-3 min-w-0 break-words text-muted hover:text-accent-700"
            >
              {mosque.name}
            </Link>
          </>
        )}
      </nav>
      <h1 className="title mt-1.5">{campaign.title}</h1>

      {/* До lg — одна колонка: ход сбора, пожертвование, описание, отчёт, последние пожертвования */}
      <div className="layout-aside mt-4">
        <div className="contents lg:flex lg:flex-col lg:gap-4 lg:min-w-0">
          {/* Ход сбора */}
          <section aria-label={t('Ход сбора')} className="order-1 panel">
            <div className="flex flex-wrap gap-1.5">
              <span className="badge badge-sec">{t(CATEGORY_LABELS[campaign.category] ?? campaign.category)}</span>
              <span className="badge badge-success">
                <IconShield size={14} strokeWidth={2.25} />
                {t('Одобрено Комитетом улемов')}
              </span>
              {completed && <span className="badge badge-neutral">{t('Сбор завершён')}</span>}
            </div>
            <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="num-lg">{fmt.money(campaign.current_amount)}</span>
              <span className="body-text tabular">{t('из {sum}', { sum: fmt.money(campaign.goal_amount) })}</span>
            </div>
            <div className="mt-2.5">
              <ProgressBar value={pct} />
            </div>
            <dl className="grid grid-cols-3 gap-2 mt-3.5">
              <Stat value={`${pct}%`} label={t('цели')} />
              <Stat
                value={String(campaign.donation_count)}
                label={fmt.plural(campaign.donation_count, ['взнос', 'взноса', 'взносов'])}
              />
              <Stat
                value={completed ? '—' : String(days)}
                label={
                  completed
                    ? t('сбор завершён')
                    : t('{days} осталось', { days: fmt.plural(days, ['день', 'дня', 'дней']) })
                }
              />
            </dl>
          </section>

          {/* О сборе */}
          <section aria-labelledby="about-campaign" className="order-4 panel">
            <h2 id="about-campaign" className="overtitle">
              {t('О сборе')}
            </h2>
            <p className="body-text mt-3 whitespace-pre-line">{campaign.description}</p>
            {mosque && (
              <Link
                href={`/mosques/${campaign.mosque_id}`}
                className="tile flex items-center gap-3 mt-3.5 text-ink hover:text-ink hover:bg-[#DDE7E6] transition-colors"
              >
                <span className="icon-tile bg-white" aria-hidden="true">
                  <IconMosque />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm leading-5 font-medium">{mosque.name}</span>
                  <span className="block caption truncate">
                    {mosque.city}
                    {mosque.address && ` · ${mosque.address}`}
                  </span>
                </span>
                <IconChevronRight size={18} className="text-hint shrink-0" />
              </Link>
            )}
            <dl className="kv mt-2">
              <div>
                <dt className="text-body">{t('Начало')}</dt>
                <dd className="font-medium text-right">{fmt.date(campaign.start_date)}</dd>
              </div>
              <div>
                <dt className="text-body">{t('Последний день')}</dt>
                <dd className="font-medium text-right">{fmt.lastDay(campaign.end_date)}</dd>
              </div>
            </dl>
          </section>

          {/* Отчёт */}
          {report ? (
            <ReportSection report={report} t={t} fmt={fmt} />
          ) : (
            <section className="order-5 panel flex gap-3 items-start">
              <span className="icon-tile" aria-hidden="true">
                <IconReport />
              </span>
              <div className="min-w-0">
                <h2 className="title-sm">{t('Отчёт мечети')}</h2>
                <p className="body-text mt-1">
                  {completed
                    ? t('Сбор завершён — мечеть готовит отчёт: статьи расходов, суммы и фото чеков. Пока отчёта нет, мечеть не сможет открыть новый сбор.')
                    : t('Появится здесь после завершения сбора: статьи расходов, суммы и фото чеков. Пока отчёта нет, мечеть не сможет открыть новый сбор.')}
                </p>
              </div>
            </section>
          )}

          {/* Последние пожертвования */}
          {recent_donations.length > 0 && (
            <section aria-labelledby="recent-donations" className="order-6 panel">
              <h2 id="recent-donations" className="overtitle">
                {t('Последние пожертвования')}
              </h2>
              <ul className="mt-1.5">
                {recent_donations.map((d, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center gap-3 min-h-11 border-b border-line last:border-b-0"
                  >
                    <span className="body-text">
                      {lang === 'tg' ? fmt.short(d.created_at) : whenFmt.format(new Date(d.created_at))}
                    </span>
                    <span className="text-sm font-medium tabular whitespace-nowrap">{fmt.money(d.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="caption mt-2">{t('Имена жертвователей не публикуются.')}</p>
            </section>
          )}
        </div>

        {/* Пожертвование: липкая панель 340px на компьютере, отдельные панели на телефоне */}
        <aside
          id="donate"
          aria-labelledby="donate-title"
          className="order-3 lg:order-none aside-sticky scroll-mt-20 min-w-0 flex flex-col gap-3 lg:gap-4 lg:bg-white lg:rounded-card lg:p-5"
        >
          <h2 id="donate-title" className="sr-only lg:not-sr-only title-sm">
            {t('Пожертвовать')}
          </h2>
          {open ? (
            <DonateForm campaignId={campaign.id} campaignTitle={campaign.title} mosqueName={mosque?.name} />
          ) : (
            <p className="bg-white rounded-card p-4 lg:p-0 lg:rounded-none body-text">
              {completed ? t('Сбор завершён. Спасибо всем, кто помог!') : t('Сбор сейчас не принимает пожертвования.')}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="tile px-1.5 py-2.5 text-center min-w-0 flex flex-col-reverse justify-end gap-0.5">
      <dt className="caption leading-tight break-words">{label}</dt>
      <dd className="text-lg leading-6 font-semibold tabular">{value}</dd>
    </div>
  );
}

function ReportSection({ report, t, fmt }: { report: Report; t: I18n['t']; fmt: Fmt }) {
  const approved = report.status === 'approved';
  return (
    <section id="report" aria-labelledby="report-title" className="order-5 panel scroll-mt-24 flex flex-col gap-3.5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="icon-tile" aria-hidden="true">
          <IconReport />
        </span>
        <div className="flex-[1_1_200px] min-w-0">
          <h2 id="report-title" className="title-sm">
            {t('Отчёт мечети')}
          </h2>
          <p className="caption mt-0.5">
            {report.title} · {fmt.date(report.submitted_at)}
          </p>
        </div>
        <span className={approved ? 'badge badge-success' : 'badge badge-warning'}>
          {approved && <IconCheck size={14} strokeWidth={2.25} />}
          {approved ? t('Проверен Комитетом') : t('На проверке у Комитета')}
        </span>
      </div>

      {report.description && <p className="body-text whitespace-pre-line">{report.description}</p>}

      <dl className="grid grid-cols-2 gap-2">
        <div className="tile py-3">
          <dt className="caption !text-body">{t('Собрано')}</dt>
          <dd className="text-lg leading-6 font-semibold tabular whitespace-nowrap">
            {fmt.money(report.total_collected)}
          </dd>
        </div>
        <div className="tile py-3">
          <dt className="caption !text-body">{t('Потрачено')}</dt>
          <dd className="text-lg leading-6 font-semibold tabular whitespace-nowrap">
            {fmt.money(report.total_spent)}
          </dd>
        </div>
      </dl>

      {report.expenses.length > 0 && (
        <div className="bg-app rounded-tile px-3.5 py-1 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('Расходы по сбору')}</caption>
            <thead>
              <tr className="text-left text-body border-b border-white">
                <th scope="col" className="py-2.5 font-normal">
                  {t('Статья расходов')}
                </th>
                <th scope="col" className="py-2.5 font-normal text-right">
                  {t('Сумма')}
                </th>
              </tr>
            </thead>
            <tbody>
              {report.expenses.map((e, i) => (
                <tr key={i} className="border-b border-white last:border-b-0">
                  <td className="py-3 pr-4 text-ink">{e.item}</td>
                  <td className="py-3 text-right font-medium tabular whitespace-nowrap">{fmt.money(e.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.photo_urls.length > 0 && (
        <div>
          <h3 className="overtitle">{t('Фото подтверждения')}</h3>
          <ul className="flex flex-wrap gap-1.5 mt-2.5">
            {report.photo_urls.map((url, i) => (
              <li key={i}>
                <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="chip min-h-11">
                  {t('Фото {n}', { n: i + 1 })}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
