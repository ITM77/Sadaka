import { ApiError } from './api';
import { AdminRole, ROLE_LABELS } from './adminAuth';

// Журнал действий и сотрудники Комитета — типы и подписи.

export type AuditEntry = {
  id: string;
  created_at: string;
  actor_type: 'admin' | 'mosque';
  admin_id?: string;
  actor_name: string;
  actor_role?: AdminRole;
  action: string;
  object_type: 'mosque' | 'campaign' | 'report' | 'admin' | 'settings';
  object_id: string;
  object_title: string;
  object_subtitle?: string;
  mosque_id?: string;
  from_status?: string;
  to_status?: string;
  reason?: string;
  details?: string;
  ip?: string;
  user_agent?: string;
};

export type StaffStatus = 'active' | 'invited' | 'disabled';

export type Staff = {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
  invited_by_name?: string;
  invite_expires_at?: string;
  disabled_at?: string;
  disabled_reason?: string;
  status: StaffStatus;
  invite_expired?: boolean;
};

type Tone = 'ok' | 'wait' | 'bad' | 'neutral' | 'sec';

export const TONE_CLASS: Record<Tone, string> = {
  ok: 'badge badge-success',
  wait: 'badge badge-warning',
  bad: 'badge badge-danger',
  neutral: 'badge badge-neutral',
  sec: 'badge badge-sec',
};

export const ACTIONS: Record<string, { label: string; tone: Tone }> = {
  'mosque.approve': { label: 'Заявка одобрена', tone: 'ok' },
  'mosque.reject': { label: 'Заявка отклонена', tone: 'bad' },
  'mosque.block': { label: 'Блокировка мечети', tone: 'bad' },
  'mosque.unblock': { label: 'Блокировка снята', tone: 'ok' },
  'campaign.approve': { label: 'Сбор одобрен', tone: 'ok' },
  'campaign.reject': { label: 'Сбор отклонён', tone: 'bad' },
  'report.approve': { label: 'Отчёт принят', tone: 'ok' },
  'report.reject': { label: 'Отчёт отклонён', tone: 'bad' },
  'admin.invite': { label: 'Сотрудник приглашён', tone: 'sec' },
  'admin.reinvite': { label: 'Новая ссылка-приглашение', tone: 'sec' },
  'admin.password_reset': { label: 'Пароль сброшен', tone: 'wait' },
  'admin.role_change': { label: 'Роль изменена', tone: 'sec' },
  'admin.disable': { label: 'Доступ отключён', tone: 'bad' },
  'admin.enable': { label: 'Доступ включён', tone: 'ok' },
  'admin.invite_accept': { label: 'Приглашение принято', tone: 'ok' },
  'settings.savob_mode': { label: 'Режим Савоб изменён', tone: 'sec' },
  // События мечети — в истории мечети
  'mosque.submit': { label: 'Заявка подана', tone: 'neutral' },
  'mosque.resubmit': { label: 'Заявка подана повторно', tone: 'neutral' },
  'campaign.submit': { label: 'Сбор отправлен на одобрение', tone: 'neutral' },
  'campaign.complete': { label: 'Сбор завершён', tone: 'neutral' },
  'report.submit': { label: 'Отчёт подан', tone: 'neutral' },
};

export const actionOf = (code: string) => ACTIONS[code] ?? { label: code, tone: 'neutral' as Tone };

/** Группы для фильтра «Действие». */
export const ACTION_GROUPS: { value: string; label: string; codes: string[] }[] = [
  { value: 'approve', label: 'Одобрение', codes: ['mosque.approve', 'campaign.approve', 'report.approve'] },
  { value: 'reject', label: 'Отказ', codes: ['mosque.reject', 'campaign.reject', 'report.reject'] },
  { value: 'block', label: 'Блокировка', codes: ['mosque.block'] },
  { value: 'unblock', label: 'Снятие блокировки', codes: ['mosque.unblock'] },
  {
    value: 'staff',
    label: 'Сотрудники',
    codes: [
      'admin.invite',
      'admin.reinvite',
      'admin.password_reset',
      'admin.role_change',
      'admin.disable',
      'admin.enable',
      'admin.invite_accept',
    ],
  },
  { value: 'settings', label: 'Режим Савоб', codes: ['settings.savob_mode'] },
];

export const OBJECT_TYPES: { value: AuditEntry['object_type']; label: string; one: string }[] = [
  { value: 'mosque', label: 'Мечети', one: 'мечеть' },
  { value: 'campaign', label: 'Сборы', one: 'сбор' },
  { value: 'report', label: 'Отчёты', one: 'отчёт' },
  { value: 'admin', label: 'Сотрудники', one: 'сотрудник' },
  { value: 'settings', label: 'Настройки', one: 'настройки' },
];

export const objectOne = (t: AuditEntry['object_type']) => OBJECT_TYPES.find((o) => o.value === t)?.one ?? t;

const STATUS_LABELS: Record<string, Record<string, string>> = {
  mosque: { pending: 'На рассмотрении', approved: 'Одобрена', rejected: 'Отклонена', blocked: 'Заблокирована' },
  campaign: {
    draft: 'Черновик',
    pending_approval: 'На одобрении',
    active: 'Идёт сбор',
    rejected: 'Отклонён',
    completed: 'Завершён',
  },
  report: { submitted: 'На проверке', approved: 'Принят', rejected: 'Отклонён' },
  admin: { active: 'Активен', disabled: 'Отключён', ...ROLE_LABELS },
  settings: { regular: 'Обычный режим', ramadan: 'Рамадан', kurban: 'Курбан-байрам', special_event: 'Особое событие' },
};

export function statusLabel(objectType: string, value?: string) {
  if (!value) return '';
  return STATUS_LABELS[objectType]?.[value] ?? value;
}

/** Куда ведёт «Открыть объект»: список с поиском по названию. */
export function objectHref(e: Pick<AuditEntry, 'object_type' | 'object_id' | 'object_title'>) {
  const q = encodeURIComponent(e.object_title);
  switch (e.object_type) {
    case 'mosque':
      return `/admin/mosques?status=&q=${q}`;
    case 'campaign':
      return `/admin/campaigns?status=&q=${q}`;
    case 'report':
      return `/admin/reports?status=&q=${q}`;
    case 'settings':
      return '/admin/savob';
    default:
      return `/admin/staff?id=${e.object_id}`;
  }
}

const TZ = 'Asia/Dushanbe';

// Даты для показа — через fmt из '@/lib/i18n' (short / dateTime / dateTimeSec), с учётом языка.

/** Сегодняшняя дата по Душанбе в формате ГГГГ-ММ-ДД, со сдвигом в днях. */
export function dushanbeDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

/** Браузер и система из User-Agent — коротко, для карточки записи. */
export function deviceOf(ua?: string) {
  if (!ua) return '';
  const browser =
    /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /YaBrowser/.test(ua) ? 'Яндекс Браузер'
    : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  const os =
    /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [browser, os].filter(Boolean).join(' · ') || ua.slice(0, 60);
}

/** Скачивание CSV журнала: сессия — в cookie, плюс заголовок защиты панели. */
export async function downloadAuditCsv(query: string) {
  const res = await fetch(`/api/v1/admin/audit/export${query ? `?${query}` : ''}`, {
    headers: { 'X-Sadaka-Admin': '1' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.error ?? 'Не удалось выгрузить журнал', res.status, data?.code ?? 'UNKNOWN');
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'sadaka-journal.csv';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
