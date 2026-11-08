'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useState } from 'react';
import ProgressBar from '@/components/ProgressBar';
import {
  Alert,
  CabinetPage,
  CampaignStatusBadge,
  Crumbs,
  Loading,
  MosqueStatusBadge,
  ReportStatusBadge,
  StatusBadge,
} from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';
import { IconArrowRight, IconEdit, IconInfo, IconPin, IconPlus, IconReport } from '@/components/icons';
import {
  ApiError,
  apiFetch,
  Campaign,
  CATEGORY_LABELS,
  formatDate,
  formatMoney,
  lastDay,
  plural,
  progress,
  Report,
} from '@/lib/api';
import { isEnded, needsReport } from '@/lib/cabinet';

/** Действие в строке сбора: белая пилюля на плитке, 44 px — минимальная высота для пальца. */
const ROW_BTN = 'btn btn-white min-h-[44px] px-4 text-sm';

export default function CabinetMosquePage({ params }: { params: { id: string } }) {
  const { data, error, notFound: missing, reload, token } = useMosqueCabinet(params.id);
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  if (missing) notFound();

  const act = async (c: Campaign, action: 'submit' | 'complete', okText: string) => {
    if (action === 'complete' && !confirm(`Завершить сбор «${c.title}»? Пожертвования перестанут приниматься.`)) return;
    setBusyId(c.id);
    setActionError('');
    setNotice('');
    try {
      await apiFetch(`/campaigns/${c.id}/${action}`, { method: 'POST', token });
      setNotice(okText);
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Не удалось выполнить действие');
    } finally {
      setBusyId('');
    }
  };

  if (!data) {
    return (
      <CabinetPage title="Мечеть" crumbs={[{ href: '/cabinet', label: 'Кабинет' }]}>
        {error ? <Alert>{error}</Alert> : <Loading />}
      </CabinetPage>
    );
  }

  const { mosque, campaigns, reports } = data;
  const approved = mosque.status === 'approved';
  const owing = campaigns.filter((c) => needsReport(c, reports));
  const base = `/cabinet/mosques/${mosque.id}`;
  const owingNames = owing.map((c) => `«${c.title}»`).join(', ');
  const owingRejected = owing.some((c) => reports.some((r) => r.campaign_id === c.id && r.status === 'rejected'));

  const activeCount = campaigns.filter((c) => c.status === 'active' && !isEnded(c)).length;
  const pendingCount = campaigns.filter((c) => c.status === 'pending_approval').length;
  const collected = campaigns.reduce(
    (s, c) => s + (c.status === 'active' || c.status === 'completed' ? c.current_amount : 0),
    0,
  );
  const titleOf = (id: string) => campaigns.find((c) => c.id === id)?.title;

  return (
    <div className="page flex flex-col gap-4">
      <header className="flex flex-col gap-1.5 px-1">
        <Crumbs crumbs={[{ href: '/cabinet', label: 'Кабинет' }]} current={mosque.name} />
        <h1 className="title break-words">{mosque.name}</h1>
        <p className="flex items-start gap-1.5 body-text">
          <IconPin size={16} className="shrink-0 mt-0.5 text-muted" />
          <span className="break-words">
            {mosque.city} · {mosque.address}
          </span>
        </p>
      </header>

      <div className="layout-aside">
        {/* Состояние и действия: на телефоне — сверху, на десктопе — липкая правая колонка */}
        <aside className="aside-sticky flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
          <section className="panel" aria-labelledby="state-title">
            <h2 id="state-title" className="overtitle">
              Состояние
            </h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <MosqueStatusBadge status={mosque.status} />
              {owing.length > 0 && <StatusBadge tone="wait">Нужен отчёт</StatusBadge>}
            </div>
            {(approved || mosque.status === 'blocked') && (
              <dl className="kv mt-3.5">
                <div>
                  <dt className="text-body">Идёт сборов</dt>
                  <dd className="font-medium text-ink tabular">{activeCount}</dd>
                </div>
                <div>
                  <dt className="text-body">На одобрении</dt>
                  <dd className="font-medium text-ink tabular">{pendingCount}</dd>
                </div>
                <div>
                  <dt className="text-body">Собрано за всё время</dt>
                  <dd className="font-medium text-ink tabular whitespace-nowrap">{formatMoney(collected)}</dd>
                </div>
              </dl>
            )}
            <div className="mt-4 flex flex-col gap-2 empty:hidden">
              {owing.length > 0 && (
                <Link href={`${base}/campaigns/${owing[0]!.id}/report`} className="btn btn-primary btn-block">
                  <IconReport size={18} />
                  {owingRejected && owing.length === 1 ? 'Переподать отчёт' : 'Опубликовать отчёт'}
                </Link>
              )}
              {approved && (
                <Link
                  href={`${base}/campaigns/new`}
                  className={`btn btn-block ${owing.length > 0 ? 'btn-secondary' : 'btn-primary'}`}
                >
                  <IconPlus size={18} />
                  Новый сбор
                </Link>
              )}
              {mosque.status !== 'blocked' && (
                <Link href={`${base}/edit`} className="btn btn-secondary btn-block">
                  <IconEdit size={18} />
                  Изменить данные
                </Link>
              )}
              {approved && (
                <Link href={`/mosques/${mosque.id}`} className="btn btn-ghost btn-block">
                  Публичная страница
                  <IconArrowRight size={16} />
                </Link>
              )}
            </div>
          </section>

          {owing.length > 0 ? (
            <Alert tone="warn" title={`Нужен отчёт по ${owingNames}.`}>
              {owingRejected
                ? 'Комитет отклонил прошлый отчёт — пока вы не подадите исправленный'
                : 'Пока отчёт не опубликован'}
              , новые сборы не запустятся.
            </Alert>
          ) : (
            <div className="infobox">
              <IconInfo size={18} className="shrink-0 mt-px" />
              <span>Нет отчёта — нет нового сбора. После завершения сбора опубликуйте отчёт о расходах.</span>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
          {mosque.status === 'pending' && (
            <Alert tone="info">
              Заявка на рассмотрении у Комитета улемов. После одобрения здесь можно будет открывать сборы.
            </Alert>
          )}
          {mosque.status === 'rejected' && (
            <Alert title="Комитет отклонил заявку.">
              {mosque.moderation_note ? `«${mosque.moderation_note}». ` : ''}Исправьте данные — заявка снова уйдёт на
              рассмотрение.
            </Alert>
          )}
          {mosque.status === 'blocked' && (
            <Alert title="Мечеть заблокирована Комитетом.">
              {mosque.moderation_note ? `«${mosque.moderation_note}». ` : ''}Пожертвования не принимаются.
            </Alert>
          )}
          {notice && <Alert tone="success">{notice}</Alert>}
          {actionError && <Alert>{actionError}</Alert>}

          <section aria-labelledby="campaigns-title" className="panel">
            <div className="flex items-center justify-between gap-3">
              <h2 id="campaigns-title" className="overtitle">
                Сборы
              </h2>
              {campaigns.length > 0 && <span className="caption tabular">{campaigns.length}</span>}
            </div>

            {campaigns.length === 0 ? (
              <p className="body-text mt-3">
                {approved ? 'Сборов пока нет. Создайте первый — Комитет проверит его перед запуском.' : 'Сборов пока нет.'}
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {campaigns.map((c) => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    report={reports.find((r) => r.campaign_id === c.id)}
                    owes={needsReport(c, reports)}
                    blockedBy={owing.length > 0 ? owingNames : ''}
                    base={base}
                    busy={busyId === c.id}
                    onSubmit={() =>
                      act(c, 'submit', `«${c.title}» отправлена на одобрение. Комитет проверит её и откроет сбор.`)
                    }
                    onComplete={() => act(c, 'complete', `Сбор «${c.title}» завершён. Теперь опубликуйте отчёт.`)}
                  />
                ))}
              </ul>
            )}
          </section>

          {reports.length > 0 && (
            <section aria-labelledby="reports-title" className="panel !pb-1">
              <h2 id="reports-title" className="overtitle">
                Отчёты
              </h2>
              <ul className="mt-1 divide-y divide-line">
                {reports.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 min-h-[72px] py-2.5">
                    <span className="icon-tile" aria-hidden="true">
                      <IconReport />
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/campaigns/${r.campaign_id}#report`}
                        className="block text-sm leading-5 font-medium text-ink hover:text-accent-700 break-words"
                      >
                        {r.title || titleOf(r.campaign_id) || 'Отчёт'}
                      </Link>
                      <p className="caption tabular">
                        {formatDate(r.submitted_at)} · потрачено {formatMoney(r.total_spent)} из{' '}
                        {formatMoney(r.total_collected)}
                      </p>
                      {r.status === 'rejected' && r.moderation_note && (
                        <p className="text-[13px] leading-[18px] text-[#B42318]">
                          <strong className="font-semibold">Комитет:</strong> «{r.moderation_note}»
                        </p>
                      )}
                      <span className="mt-1 flex sm:hidden">
                        <ReportStatusBadge status={r.status} />
                      </span>
                    </div>
                    <span className="shrink-0 hidden sm:flex">
                      <ReportStatusBadge status={r.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignRow({
  campaign: c,
  report,
  owes,
  blockedBy,
  base,
  busy,
  onSubmit,
  onComplete,
}: {
  campaign: Campaign;
  report?: Report;
  owes: boolean;
  /** Названия сборов без отчёта — пока они есть, отправить черновик нельзя */
  blockedBy: string;
  base: string;
  busy: boolean;
  onSubmit: () => void;
  onComplete: () => void;
}) {
  const ended = isEnded(c);
  const reportable = c.status === 'completed' || ended;
  const editHref = `${base}/campaigns/${c.id}/edit`;
  const reportHref = `${base}/campaigns/${c.id}/report`;
  const funded = c.status === 'active' || c.status === 'completed';
  const showProgress = c.status === 'active' && !ended;
  const pct = progress(c);

  const meta = [
    CATEGORY_LABELS[c.category] ?? c.category,
    `${formatDate(c.start_date)} — ${lastDay(c.end_date)}`,
    !funded
      ? `цель ${formatMoney(c.goal_amount)}`
      : !showProgress
        ? `собрано ${formatMoney(c.current_amount)} из ${formatMoney(c.goal_amount)}`
        : '',
  ].filter(Boolean);

  return (
    <li className="tile flex flex-col gap-2.5">
      <div className="flex flex-wrap justify-between gap-2">
        <div className="min-w-0 basis-[220px] flex-1">
          <h3 className="title-sm break-words">{c.title}</h3>
          <p className="caption mt-0.5">{meta.join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 self-start">
          <CampaignStatusBadge campaign={c} ended={ended} onTile />
          {report && <ReportStatusBadge status={report.status} onTile />}
          {owes && !report && (
            <StatusBadge tone="wait" onTile>
              Нужен отчёт
            </StatusBadge>
          )}
        </div>
      </div>

      {showProgress && (
        <div className="flex flex-col gap-2">
          <ProgressBar value={pct} onTile />
          <div className="flex justify-between gap-3 text-[13px] leading-[18px] font-medium text-ink tabular">
            <span className="whitespace-nowrap">
              {formatMoney(c.current_amount)} · {pct}%
            </span>
            <span className="font-normal text-body text-right">
              из {formatMoney(c.goal_amount)} · {c.donation_count}{' '}
              {plural(c.donation_count, ['пожертвование', 'пожертвования', 'пожертвований'])}
            </span>
          </div>
        </div>
      )}

      {c.status === 'rejected' && c.moderation_note && (
        <p className="text-[13px] leading-[18px] text-[#B42318]">
          <strong className="font-semibold">Комитет:</strong> «{c.moderation_note}»
        </p>
      )}
      {report?.status === 'rejected' && report.moderation_note && (
        <p className="text-[13px] leading-[18px] text-[#B42318]">
          <strong className="font-semibold">Комитет об отчёте:</strong> «{report.moderation_note}»
        </p>
      )}
      {c.status === 'draft' && blockedBy && (
        <p className="alert-error" role="note">
          Нельзя отправить на одобрение: сначала опубликуйте отчёт по {blockedBy}.
        </p>
      )}
      {c.status === 'pending_approval' && <p className="caption">Ждёт решения Комитета улемов.</p>}

      <div className="flex flex-wrap gap-2 empty:hidden">
        {c.status === 'draft' && (
          <>
            <Link href={editHref} className={ROW_BTN}>
              <IconEdit size={16} />
              Редактировать
            </Link>
            <button type="button" className={ROW_BTN} disabled={busy || !!blockedBy} onClick={onSubmit}>
              {busy ? 'Отправляем…' : 'Отправить на одобрение'}
            </button>
          </>
        )}
        {c.status === 'rejected' && (
          <Link href={editHref} className={ROW_BTN}>
            <IconEdit size={16} />
            Исправить
          </Link>
        )}
        {c.status === 'active' && (
          <Link href={`/campaigns/${c.id}`} className={ROW_BTN}>
            Страница сбора
            <IconArrowRight size={16} />
          </Link>
        )}
        {c.status === 'active' && !ended && (
          <button type="button" className={ROW_BTN} disabled={busy} onClick={onComplete}>
            {busy ? 'Завершаем…' : 'Завершить сбор'}
          </button>
        )}
        {reportable && (!report || report.status === 'rejected') && (
          <Link href={reportHref} className={ROW_BTN}>
            <IconReport size={16} />
            {report ? 'Переподать отчёт' : 'Опубликовать отчёт'}
          </Link>
        )}
        {reportable && report && report.status !== 'rejected' && (
          <Link href={`/campaigns/${c.id}#report`} className={ROW_BTN}>
            Отчёт
            <IconArrowRight size={16} />
          </Link>
        )}
      </div>
    </li>
  );
}
