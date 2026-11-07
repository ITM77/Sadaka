import { Campaign, CampaignStatus, Mosque, Report } from './api';

export type MosqueCabinetData = { mosque: Mosque; campaigns: Campaign[]; reports: Report[] };

export const MOSQUE_STATUS: Record<Mosque['status'], { label: string; tone: 'ok' | 'wait' | 'bad' }> = {
  pending: { label: 'На рассмотрении у Комитета', tone: 'wait' },
  approved: { label: 'Одобрена', tone: 'ok' },
  rejected: { label: 'Заявка отклонена', tone: 'bad' },
  blocked: { label: 'Заблокирована Комитетом', tone: 'bad' },
};

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: 'ok' | 'wait' | 'bad' | 'neutral' }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  pending_approval: { label: 'На одобрении', tone: 'wait' },
  active: { label: 'Идёт сбор', tone: 'ok' },
  rejected: { label: 'Отклонена', tone: 'bad' },
  completed: { label: 'Завершена', tone: 'neutral' },
};

export const REPORT_STATUS: Record<Report['status'], { label: string; tone: 'ok' | 'wait' | 'bad' }> = {
  submitted: { label: 'Отчёт на проверке', tone: 'wait' },
  approved: { label: 'Отчёт принят', tone: 'ok' },
  rejected: { label: 'Отчёт отклонён', tone: 'bad' },
};

export const TONE_CLASS = {
  ok: 'badge badge-success',
  wait: 'badge badge-warning',
  bad: 'badge badge-danger',
  neutral: 'badge badge-neutral',
} as const;

const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dushanbe' }); // → 2026-11-07

/** Дата для <input type="date"> в часовом поясе Душанбе. */
export function toDateInput(iso: string) {
  return ymd.format(new Date(iso));
}

/** Последний день кампании для <input type="date"> (end_date не включительно). */
export function endToDateInput(iso: string) {
  return ymd.format(new Date(new Date(iso).getTime() - 1));
}

export function todayInput(offsetDays = 0) {
  return ymd.format(new Date(Date.now() + offsetDays * 86_400_000));
}

/** Кампания истекла, но мечеть её ещё не закрыла. */
export function isEnded(c: Campaign, now = Date.now()) {
  return c.status === 'active' && now >= new Date(c.end_date).getTime();
}

/** Кампании, по которым нужен отчёт, иначе новые кампании не запустятся. */
export function needsReport(c: Campaign, reports: Report[], now = Date.now()) {
  if (c.status !== 'completed' && !isEnded(c, now)) return false;
  const r = reports.find((x) => x.campaign_id === c.id);
  return !r || r.status === 'rejected';
}
