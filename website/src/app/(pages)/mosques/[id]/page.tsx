import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CampaignCard from '@/components/CampaignCard';
import EmptyState from '@/components/EmptyState';
import { QrLink, ShareButton } from '@/components/donor/ShareLink';
import { IconCheck, IconMosque, IconPhone, IconQr, IconReport, IconShield } from '@/components/icons';
import { apiFetchOrNull, Campaign, formatDate, formatTJS, Mosque, plural, Report } from '@/lib/api';

export const dynamic = 'force-dynamic';

type Data = { mosque: Mosque; campaigns: Campaign[]; reports: Report[] };

const load = (id: string) => apiFetchOrNull<Data>(`/mosques/${encodeURIComponent(id)}`);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await load(params.id);
  return { title: data ? `${data.mosque.name} — Садака` : 'Мечеть не найдена — Садака' };
}

const IconShare = ({ size = 22 }: { size?: number }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="M8.2 10.8l7.6-4.4" />
    <path d="M8.2 13.2l7.6 4.4" />
  </svg>
);

const quickCircle =
  'w-[52px] h-[52px] rounded-full bg-gold/15 border border-gold/40 text-gold flex items-center justify-center';

export default async function MosquePage({ params }: { params: { id: string } }) {
  const data = await load(params.id);
  if (!data) notFound();
  const { mosque, campaigns, reports } = data;
  const active = campaigns.filter((c) => c.status === 'active');
  const completed = campaigns.filter((c) => c.status === 'completed');
  const raised = campaigns.reduce((sum, c) => sum + c.current_amount, 0);
  const reported = new Set(reports.map((r) => r.campaign_id));
  const awaiting = completed.filter((c) => !reported.has(c.id)).length;
  const path = `/mosques/${mosque.id}`;
  const subtitle = [mosque.city, mosque.address, mosque.imam_name && `имам ${mosque.imam_name}`].filter(Boolean).join(' · ');

  return (
    <>
      {/* ---------- Шапка мечети ---------- */}
      <section className="girih surface-lazurite overflow-hidden" style={{ '--girih-opacity': 0.12 } as React.CSSProperties}>
        <div className="container-custom pt-5 pb-12 md:pt-8 md:pb-14 flex flex-col gap-[18px] md:gap-7">
          <nav aria-label="Навигация" className="hidden md:flex gap-2 text-sm text-[#CFE0DB]">
            <Link href="/mosques" className="text-[#CFE0DB] hover:text-white">
              Мечети
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{mosque.name}</span>
          </nav>

          <div className="flex flex-wrap gap-4 md:gap-7 items-start md:items-center">
            <span
              className="w-16 h-16 rounded-[18px] md:w-[104px] md:h-[104px] md:rounded-[28px] bg-gold/15 border border-gold/40 text-gold flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <IconMosque size={56} strokeWidth={1.2} className="w-9 h-9 md:w-14 md:h-14" />
            </span>
            <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-2.5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/15 text-gold text-[13px] font-semibold">
                <IconShield size={15} strokeWidth={2} />
                Одобрена Комитетом улемов
              </span>
              <h1 className="text-[30px] md:text-5xl leading-[1.1] font-bold tracking-[-0.02em]">{mosque.name}</h1>
              {subtitle && <p className="text-[15px] md:text-[17px] text-[#D4E3DF]">{subtitle}</p>}
            </div>
            {mosque.phone && (
              <a href={`tel:${mosque.phone}`} className="hidden md:inline-flex btn btn-on-dark h-[52px] px-5 text-base border-paper/40">
                <IconPhone size={18} />
                Позвонить
              </a>
            )}
          </div>

          {/* Телефон: быстрые действия */}
          <div className="md:hidden flex justify-around gap-2">
            {mosque.phone && (
              <a href={`tel:${mosque.phone}`} className="flex flex-col items-center gap-1.5 text-paper text-[13px] font-semibold min-w-[72px]">
                <span className={quickCircle} aria-hidden="true">
                  <IconPhone size={22} />
                </span>
                Позвонить
              </a>
            )}
            <ShareButton
              path={path}
              title={mosque.name}
              className="flex flex-col items-center gap-1.5 text-paper text-[13px] font-semibold min-w-[72px]"
              iconClassName={quickCircle}
              icon={<IconShare />}
              copiedIcon={<IconCheck size={22} />}
            />
          </div>
        </div>
      </section>

      <div className="container-custom pb-14 md:pb-24">
        {/* ---------- Прозрачность ---------- */}
        <section
          aria-label="Прозрачность мечети"
          className="relative -mt-7 grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4"
        >
          <StatTile label="Собрано за всё время" value={formatTJS(raised)} />
          <StatTile label="Завершено сборов" value={String(completed.length)} />
          <StatTile label="Отчётов опубликовано" value={`${completed.length - awaiting} из ${completed.length}`} />
          {completed.length === 0 ? (
            <StatTile label="Прозрачность" value="Завершённых сборов пока нет" tone="neutral" />
          ) : awaiting === 0 ? (
            <StatTile label="Прозрачность" value="Отчёты сданы" tone="good" />
          ) : (
            <StatTile
              label="Прозрачность"
              value={`Ждём ${awaiting} ${plural(awaiting, ['отчёт', 'отчёта', 'отчётов'])}`}
              tone="wait"
            />
          )}
        </section>

        <div className="flex flex-wrap gap-8 mt-8 md:mt-12 items-start">
          <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-8 md:gap-10">
            {/* Активные сборы */}
            <section>
              <h2 className="text-[22px] md:text-[28px] font-bold mb-4 md:mb-5">Идут сборы</h2>
              {active.length === 0 ? (
                <EmptyState icon={<IconMosque size={28} />} title="Сейчас нет активных кампаний">
                  Загляните позже — мечеть может открыть новый сбор после одобрения Комитетом.
                </EmptyState>
              ) : (
                <div className="grid gap-3.5 md:gap-5 md:grid-cols-2">
                  {active.map((c) => (
                    <CampaignCard key={c.id} campaign={c} showMosque={false} />
                  ))}
                </div>
              )}
            </section>

            {/* Отчёты */}
            <section>
              <h2 className="text-[22px] md:text-[28px] font-bold mb-2">Отчёты об использовании средств</h2>
              <p className="text-[15px] md:text-base text-muted mb-4 md:mb-5">
                Мечеть отчитывается по каждому сбору. Без отчёта новый сбор не открывается.
              </p>
              {reports.length === 0 ? (
                <p className="card p-5 text-[15px] text-muted">Отчётов пока нет — они появляются после завершения сборов.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {reports.map((r) => {
                    const campaign = campaigns.find((c) => c.id === r.campaign_id);
                    const approved = r.status === 'approved';
                    return (
                      <li key={r.id}>
                        <Link
                          href={`/campaigns/${r.campaign_id}#report`}
                          className="card-hover flex flex-wrap gap-x-5 gap-y-3 items-center px-[18px] py-4 md:px-[22px] md:py-[18px] rounded-2xl text-ink"
                        >
                          <span className="w-11 h-11 rounded-xl bg-sand text-brass-700 flex items-center justify-center shrink-0" aria-hidden="true">
                            <IconReport size={22} />
                          </span>
                          <div className="flex-[1_1_240px] min-w-0">
                            <p className="text-base font-semibold">{r.title}</p>
                            <p className="mt-0.5 text-sm text-muted">
                              {campaign ? `${campaign.title} · ` : ''}
                              {formatDate(r.submitted_at)} · собрано {formatTJS(r.total_collected)} · потрачено{' '}
                              {formatTJS(r.total_spent)}
                            </p>
                          </div>
                          <span className={approved ? 'badge badge-success gap-1.5' : 'badge badge-warning'}>
                            {approved && <IconCheck size={14} strokeWidth={2.25} />}
                            {approved ? 'Проверен Комитетом' : 'На проверке'}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Завершённые сборы */}
            {completed.length > 0 && (
              <section>
                <h2 className="text-[22px] md:text-[28px] font-bold mb-4 md:mb-5">Завершённые сборы</h2>
                <div className="grid gap-3.5 md:gap-5 md:grid-cols-2">
                  {completed.map((c) => (
                    <CampaignCard key={c.id} campaign={c} showMosque={false} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ---------- Боковая колонка ---------- */}
          <aside className="flex-[1_1_300px] min-w-0 lg:max-w-[380px] flex flex-col gap-5">
            <section className="hidden md:flex card p-6 flex-col gap-4 items-center text-center">
              <h2 className="self-stretch text-left text-lg font-bold">Ссылка для QR-кода</h2>
              <span className="icon-tile" aria-hidden="true">
                <IconQr size={26} />
              </span>
              <p className="text-sm leading-normal text-muted">
                Сделайте QR-код с этой ссылкой и повесьте у входа — прихожане откроют страницу мечети камерой телефона.
              </p>
              <QrLink path={path} />
            </section>

            <section className="card p-6 flex flex-col gap-3">
              <h2 className="text-lg font-bold">О мечети</h2>
              {mosque.description && (
                <p className="text-[15px] leading-relaxed text-dark-700 whitespace-pre-line">{mosque.description}</p>
              )}
              <dl className="grid gap-3 text-[15px] mt-1">
                <div>
                  <dt className="text-sm text-muted">Адрес</dt>
                  <dd className="font-semibold">
                    {mosque.address ? `${mosque.address}, ${mosque.city}` : mosque.city}
                  </dd>
                </div>
                {mosque.imam_name && (
                  <div>
                    <dt className="text-sm text-muted">Имам</dt>
                    <dd className="font-semibold">{mosque.imam_name}</dd>
                  </div>
                )}
                {mosque.phone && (
                  <div>
                    <dt className="text-sm text-muted">Телефон</dt>
                    <dd className="font-semibold">
                      <a href={`tel:${mosque.phone}`} className="text-primary-600 hover:text-primary-700">
                        {mosque.phone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'wait' | 'neutral' }) {
  const box =
    tone === 'good'
      ? 'bg-mint border-[#C7DDD6] text-primary-700'
      : tone === 'wait'
        ? 'bg-sand border-brass-200 text-brass-800'
        : 'bg-white border-line';
  return (
    <div className={`border rounded-2xl md:rounded-[18px] p-4 md:p-[22px] min-w-0 ${box}`}>
      <p className={`text-sm ${tone === 'good' || tone === 'wait' ? '' : 'text-muted'}`}>{label}</p>
      <p
        className={`mt-1.5 font-bold break-words ${tone === 'neutral' ? 'text-base md:text-lg' : 'text-xl md:text-[26px]'}`}
      >
        {value}
      </p>
    </div>
  );
}
