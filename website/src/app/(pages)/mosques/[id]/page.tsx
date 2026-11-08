import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CampaignCard from '@/components/CampaignCard';
import ProgressBar from '@/components/ProgressBar';
import { QrLink, ShareButton } from '@/components/donor/ShareLink';
import { IconCheck, IconPhone, IconPin, IconQr, IconReport, IconShare, IconShield } from '@/components/icons';
import { apiFetchOrNull, Campaign, formatDate, formatMoney, Mosque, plural, progress, Report } from '@/lib/api';

export const dynamic = 'force-dynamic';

type Data = { mosque: Mosque; campaigns: Campaign[]; reports: Report[] };

const load = (id: string) => apiFetchOrNull<Data>(`/mosques/${encodeURIComponent(id)}`);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await load(params.id);
  return { title: data ? `${data.mosque.name} — Садака` : 'Мечеть не найдена — Садака' };
}

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
  const photos = mosque.photo_urls ?? [];
  const featured = active[0];

  return (
    <div className="page">
      <nav aria-label="Навигация" className="caption !text-[13px] flex flex-wrap gap-x-1.5 pt-1 md:pt-0">
        <Link href="/mosques" className="text-muted hover:text-accent-700">
          Мечети
        </Link>
        {mosque.city && (
          <>
            <span aria-hidden="true">·</span>
            <Link
              href={`/mosques?city=${encodeURIComponent(mosque.city)}`}
              className="text-muted hover:text-accent-700"
            >
              {mosque.city}
            </Link>
          </>
        )}
      </nav>
      <h1 className="title mt-1.5">{mosque.name}</h1>

      <div className="layout-aside mt-4">
        {/* ---------- Основная колонка ---------- */}
        <div className="flex flex-col gap-3 lg:gap-4 min-w-0">
          {photos.length > 0 && (
            <div
              className={`grid gap-3 h-[200px] md:h-[300px] ${photos.length >= 3 ? 'md:grid-cols-[2fr_1fr]' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[0]}
                alt={`Мечеть: ${mosque.name}`}
                className="w-full h-full object-cover rounded-card bg-white"
              />
              {photos.length >= 3 && (
                <div className="hidden md:grid grid-rows-2 gap-3 min-h-0">
                  {photos.slice(1, 3).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src + i}
                      src={src}
                      alt={`${mosque.name}, фото ${i + 2}`}
                      loading="lazy"
                      className="w-full h-full min-h-0 object-cover rounded-tile bg-white"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* О мечети */}
          <section aria-label="О мечети" className="panel">
            <span className="badge badge-success min-h-[28px] px-2.5 text-[13px] gap-1.5">
              <IconShield size={14} strokeWidth={2.25} />
              Проверена Комитетом улемов
            </span>
            {mosque.description && <p className="body-text mt-3 whitespace-pre-line">{mosque.description}</p>}
            <dl className="kv mt-3.5">
              <div>
                <dt className="text-body inline-flex items-center gap-1.5 shrink-0">
                  <IconPin size={16} className="text-muted" />
                  Адрес
                </dt>
                <dd className="font-medium text-right min-w-0 py-2.5">
                  {mosque.address ? `${mosque.address}, ${mosque.city}` : mosque.city}
                </dd>
              </div>
              {mosque.imam_name && (
                <div>
                  <dt className="text-body">Имам</dt>
                  <dd className="font-medium text-right">{mosque.imam_name}</dd>
                </div>
              )}
              {mosque.phone && (
                <div>
                  <dt className="text-body">Телефон</dt>
                  <dd className="font-medium text-right">
                    <a href={`tel:${mosque.phone}`} className="tabular">
                      {mosque.phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-2 mt-3.5">
              {mosque.phone && (
                <a href={`tel:${mosque.phone}`} className="btn btn-secondary flex-1 sm:flex-none">
                  <IconPhone size={18} />
                  Позвонить
                </a>
              )}
              <ShareButton
                path={path}
                title={mosque.name}
                className="btn btn-secondary flex-1 sm:flex-none"
                iconClassName="inline-flex"
                icon={<IconShare size={18} />}
                copiedIcon={<IconCheck size={18} />}
              />
            </div>
          </section>

          {/* Сборы */}
          <section id="campaigns" aria-labelledby="mosque-campaigns" className="panel scroll-mt-20">
            <h2 id="mosque-campaigns" className="overtitle">
              Идут сборы
            </h2>
            {active.length === 0 ? (
              <p className="body-text mt-3">
                Сейчас нет активных кампаний. Мечеть может открыть новый сбор после одобрения Комитетом.
              </p>
            ) : (
              <div className="grid gap-2 mt-3 sm:grid-cols-2">
                {active.map((c) => (
                  <CampaignCard key={c.id} campaign={c} showMosque={false} />
                ))}
              </div>
            )}
            {completed.length > 0 && (
              <>
                <h3 className="overtitle mt-5">Завершённые сборы</h3>
                <div className="grid gap-2 mt-3 sm:grid-cols-2">
                  {completed.map((c) => (
                    <CampaignCard key={c.id} campaign={c} showMosque={false} />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Прозрачность и отчёты */}
          <section aria-labelledby="mosque-reports" className="panel">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 id="mosque-reports" className="overtitle">
                Отчёты об использовании средств
              </h2>
              {completed.length > 0 &&
                (awaiting === 0 ? (
                  <span className="badge badge-success">
                    <IconCheck size={14} strokeWidth={2.25} />
                    Отчёты сданы
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    Ждём {awaiting} {plural(awaiting, ['отчёт', 'отчёта', 'отчётов'])}
                  </span>
                ))}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              <StatTile label="Собрано за всё время" value={formatMoney(raised)} />
              <StatTile label="Завершено сборов" value={String(completed.length)} />
              <StatTile
                label="Отчётов опубликовано"
                value={`${completed.length - awaiting} из ${completed.length}`}
                wide
              />
            </dl>

            {reports.length === 0 ? (
              <p className="body-text mt-3">Отчётов пока нет — они появляются после завершения сборов.</p>
            ) : (
              <ul className="mt-1.5">
                {reports.map((r) => {
                  const campaign = campaigns.find((c) => c.id === r.campaign_id);
                  const approved = r.status === 'approved';
                  return (
                    <li key={r.id} className="border-b border-line last:border-b-0">
                      <Link
                        href={`/campaigns/${r.campaign_id}#report`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 min-h-[64px] py-2.5 text-ink hover:text-ink group"
                      >
                        <span className="icon-tile" aria-hidden="true">
                          <IconReport />
                        </span>
                        <span className="flex-[1_1_200px] min-w-0">
                          <span className="block text-sm leading-5 font-medium group-hover:text-accent-700 transition-colors">
                            {r.title}
                          </span>
                          <span className="block caption">
                            {campaign ? `${campaign.title} · ` : ''}
                            {formatDate(r.submitted_at)} · собрано {formatMoney(r.total_collected)} · потрачено{' '}
                            {formatMoney(r.total_spent)}
                          </span>
                        </span>
                        <span className={approved ? 'badge badge-success' : 'badge badge-warning'}>
                          {approved && <IconCheck size={14} strokeWidth={2.25} />}
                          {approved ? 'Проверен Комитетом' : 'На проверке'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="caption mt-2">Мечеть отчитывается по каждому сбору. Без отчёта новый сбор не открывается.</p>
          </section>
        </div>

        {/* ---------- Правая колонка ---------- */}
        <aside className="aside-sticky flex flex-col gap-3 min-w-0" aria-label="Пожертвовать мечети">
          {featured ? (
            <section aria-labelledby="featured-title" className="hidden lg:block panel">
              <p className="overtitle">Идёт сбор</p>
              <h2 id="featured-title" className="title-sm mt-2.5">
                {featured.title}
              </h2>
              <div className="mt-3">
                <ProgressBar value={progress(featured)} />
              </div>
              <p className="flex justify-between gap-2 mt-2 text-[13px] leading-[18px] font-medium tabular">
                <span className="whitespace-nowrap">
                  {formatMoney(featured.current_amount)} · {progress(featured)}%
                </span>
                <span className="font-normal text-body whitespace-nowrap">из {formatMoney(featured.goal_amount)}</span>
              </p>
              <Link href={`/campaigns/${featured.id}#donate`} className="btn btn-primary btn-lg btn-block mt-4">
                Пожертвовать
              </Link>
              {active.length > 1 && (
                <a href="#campaigns" className="link-action flex justify-center items-center min-h-11 mt-1">
                  Ещё {active.length - 1} {plural(active.length - 1, ['сбор', 'сбора', 'сборов'])}
                </a>
              )}
            </section>
          ) : (
            <section className="hidden lg:block panel">
              <p className="overtitle">Сборы</p>
              <p className="body-text mt-2">Сейчас у мечети нет активных сборов.</p>
            </section>
          )}

          <section aria-labelledby="qr-title" className="hidden md:block panel">
            <div className="flex items-center gap-3">
              <span className="icon-tile" aria-hidden="true">
                <IconQr />
              </span>
              <h2 id="qr-title" className="title-sm">
                Ссылка для QR-кода
              </h2>
            </div>
            <p className="body-text mt-3 mb-3">
              Сделайте QR-код с этой ссылкой и повесьте у входа — прихожане откроют страницу мечети камерой телефона.
            </p>
            <QrLink path={path} />
          </section>

          <div className="infobox">
            <IconShield size={18} className="shrink-0 mt-px" />
            <span>Пожертвование идёт на сбор этой мечети. Комитет улемов проверяет сборы и отчёты.</span>
          </div>
        </aside>
      </div>

      {/* Телефон и планшет: закреплённая кнопка пожертвования (поверх панели вкладок) */}
      {featured && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
          <Link
            href={`/campaigns/${featured.id}#donate`}
            className="btn btn-primary btn-lg btn-block flex max-w-[480px] mx-auto"
          >
            Пожертвовать
          </Link>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`tile py-3 min-w-0 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <dt className="caption !text-body">{label}</dt>
      <dd className="text-lg leading-6 font-semibold tabular break-words">{value}</dd>
    </div>
  );
}
