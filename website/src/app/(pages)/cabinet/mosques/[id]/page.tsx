'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useState } from 'react';
import ProgressBar from '@/components/ProgressBar';
import {
  Alert,
  CabinetPage,
  CampaignStatusBadge,
  Loading,
  MosqueStatusBadge,
  ReportStatusBadge,
} from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';
import { IconArrowRight, IconEdit, IconMosque, IconPlus } from '@/components/icons';
import {
  ApiError,
  apiFetch,
  Campaign,
  CATEGORY_LABELS,
  formatDate,
  formatTJS,
  lastDay,
  plural,
  progress,
  Report,
} from '@/lib/api';
import { isEnded, needsReport } from '@/lib/cabinet';

/** Компактная кнопка кабинета: 44 px — минимальная высота для пальца. */
const BTN = 'btn h-11 px-3.5 rounded-[10px]';

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

  return (
    <div className="container-custom max-w-[1040px] pt-6 pb-16 sm:pt-10 sm:pb-24 flex flex-col gap-5 sm:gap-6">
      <nav aria-label="Навигация по кабинету">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            <Link href="/cabinet" className="text-primary-600 hover:text-primary-700 py-1">
              Кабинет
            </Link>
            <span aria-hidden="true">/</span>
          </li>
          <li aria-current="page" className="truncate max-w-[60vw]">
            {mosque.name}
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-center gap-4 sm:gap-5 bg-white border border-line rounded-[20px] sm:rounded-[22px] p-5 sm:p-6">
        <span
          aria-hidden="true"
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] flex items-center justify-center shrink-0 ${
            approved ? 'bg-mint text-primary-600' : 'bg-paper text-muted'
          }`}
        >
          <IconMosque size={32} strokeWidth={1.4} />
        </span>
        <div className="flex-1 basis-[220px] min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-[30px] leading-tight font-bold break-words" style={{ letterSpacing: '-0.01em' }}>
              {mosque.name}
            </h1>
            <MosqueStatusBadge status={mosque.status} />
          </div>
          <p className="mt-1 text-[15px] text-muted break-words">
            {mosque.city} · {mosque.address}
          </p>
        </div>
        {mosque.status !== 'blocked' && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {approved && (
              <Link href={`/mosques/${mosque.id}`} className={`${BTN} btn-ghost text-primary-700`}>
                Публичная страница
                <IconArrowRight size={16} />
              </Link>
            )}
            <Link href={`${base}/edit`} className={`${BTN} bg-dark-100 text-ink hover:bg-dark-200`}>
              <IconEdit size={16} />
              Изменить данные
            </Link>
          </div>
        )}
      </header>

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
      {owing.length > 0 && (
        <Alert
          tone="warn"
          title={`Нужен отчёт по ${owingNames}.`}
          action={
            <Link
              href={`${base}/campaigns/${owing[0]!.id}/report`}
              className={`${BTN} bg-[#7A4B00] text-white hover:bg-brass-800 hover:text-white w-full sm:w-auto`}
            >
              {owingRejected && owing.length === 1 ? 'Переподать отчёт' : 'Опубликовать отчёт'}
            </Link>
          }
        >
          {owingRejected ? 'Комитет отклонил прошлый отчёт — пока он не принят' : 'Пока отчёт не опубликован'}, новые
          сборы не запустятся.
        </Alert>
      )}
      {notice && <Alert tone="success">{notice}</Alert>}
      {actionError && <Alert>{actionError}</Alert>}

      <section aria-labelledby="campaigns-title" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="campaigns-title" className="text-xl sm:text-2xl font-bold">
            Сборы
          </h2>
          {approved && (
            <Link href={`${base}/campaigns/new`} className="btn btn-primary">
              <IconPlus size={18} />
              Новый сбор
            </Link>
          )}
        </div>

        {campaigns.length === 0 ? (
          <p className="card p-6 text-muted">
            {approved ? 'Сборов пока нет. Создайте первый — Комитет проверит его перед запуском.' : 'Сборов пока нет.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3.5">
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

  const meta = [
    CATEGORY_LABELS[c.category] ?? c.category,
    `${formatDate(c.start_date)} — ${lastDay(c.end_date)}`,
    !funded ? `цель ${formatTJS(c.goal_amount)}` : !showProgress ? `собрано ${formatTJS(c.current_amount)} из ${formatTJS(c.goal_amount)}` : '',
  ].filter(Boolean);

  return (
    <li
      className={`bg-white border rounded-[20px] px-5 py-5 sm:px-6 sm:py-[22px] flex flex-col gap-3.5 ${
        owes ? 'border-[#EBD3A2]' : 'border-line'
      }`}
    >
      <div className="flex flex-wrap justify-between gap-2.5">
        <div className="min-w-0 basis-[240px] flex-1">
          <h3 className="text-lg sm:text-[19px] font-bold break-words">{c.title}</h3>
          <p className="mt-0.5 text-sm text-muted">{meta.join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 self-start">
          <CampaignStatusBadge campaign={c} ended={ended} />
          {report && <ReportStatusBadge status={report.status} />}
        </div>
      </div>

      {showProgress && (
        <div className="flex flex-col gap-3">
          <ProgressBar value={progress(c)} />
          <p className="text-[15px]">
            <strong>{formatTJS(c.current_amount)}</strong>{' '}
            <span className="text-muted">
              из {formatTJS(c.goal_amount)} · {c.donation_count}{' '}
              {plural(c.donation_count, ['пожертвование', 'пожертвования', 'пожертвований'])}
            </span>
          </p>
        </div>
      )}

      {c.status === 'rejected' && c.moderation_note && (
        <p className="text-sm text-red-700">
          <strong>Комитет:</strong> «{c.moderation_note}»
        </p>
      )}
      {report?.status === 'rejected' && report.moderation_note && (
        <p className="text-sm text-red-700">
          <strong>Комитет об отчёте:</strong> «{report.moderation_note}»
        </p>
      )}
      {c.status === 'draft' && blockedBy && (
        <p className="rounded-xl bg-red-50 text-red-800 px-3.5 py-3 text-sm leading-normal" role="note">
          Нельзя отправить на одобрение: сначала опубликуйте отчёт по {blockedBy}.
        </p>
      )}
      {c.status === 'pending_approval' && <p className="text-sm text-muted">Ждёт решения Комитета улемов.</p>}

      <div className="flex flex-wrap gap-2 empty:hidden">
        {c.status === 'draft' && (
          <>
            <Link href={editHref} className={`${BTN} bg-dark-100 text-ink hover:bg-dark-200`}>
              Редактировать
            </Link>
            <button
              type="button"
              className={`${BTN} btn-primary`}
              disabled={busy || !!blockedBy}
              onClick={onSubmit}
            >
              {busy ? 'Отправляем…' : 'Отправить на одобрение'}
            </button>
          </>
        )}
        {c.status === 'rejected' && (
          <Link href={editHref} className={`${BTN} btn-primary`}>
            Исправить
          </Link>
        )}
        {c.status === 'active' && (
          <Link href={`/campaigns/${c.id}`} className={`${BTN} btn-ghost text-primary-700`}>
            Страница сбора
            <IconArrowRight size={16} />
          </Link>
        )}
        {c.status === 'active' && !ended && (
          <button type="button" className={`${BTN} btn-secondary`} disabled={busy} onClick={onComplete}>
            {busy ? 'Завершаем…' : 'Завершить сбор'}
          </button>
        )}
        {reportable && (!report || report.status === 'rejected') && (
          <Link href={reportHref} className={`${BTN} btn-primary`}>
            {report ? 'Переподать отчёт' : 'Опубликовать отчёт'}
          </Link>
        )}
        {reportable && report && report.status !== 'rejected' && (
          <Link href={`/campaigns/${c.id}#report`} className={`${BTN} btn-ghost text-primary-700`}>
            Отчёт
            <IconArrowRight size={16} />
          </Link>
        )}
      </div>
    </li>
  );
}
