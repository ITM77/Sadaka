// Клиент API Садака. Работает и на сервере (серверные компоненты),
// и в браузере. Браузер ходит через прокси Next.js (/api/v1 → бэкенд,
// см. next.config.js), поэтому CORS не нужен.

export type Mosque = {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  imam_name: string;
  imam_phone?: string; // только владельцу мечети и Комитету
  logo_url?: string;
  photo_urls: string[];
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  moderation_note?: string;
};

export type CampaignStatus = 'draft' | 'pending_approval' | 'active' | 'rejected' | 'completed';

export type Campaign = {
  id: string;
  mosque_id: string;
  mosque?: Mosque;
  title: string;
  description: string;
  category: string;
  goal_amount: number;
  current_amount: number;
  donation_count: number;
  start_date: string;
  end_date: string; // не включительно: полночь дня после окончания
  status: CampaignStatus;
  moderation_note?: string;
};

export type ExpenseItem = { item: string; cost: number };

export type Report = {
  id: string;
  campaign_id: string;
  campaign?: Campaign; // в очереди Комитета
  mosque_id: string;
  title: string;
  description: string;
  total_collected: number;
  total_spent: number;
  expenses: ExpenseItem[];
  photo_urls: string[];
  status: 'submitted' | 'approved' | 'rejected';
  moderation_note?: string;
  submitted_at: string;
};

export type User = {
  id: string;
  phone_number: string;
  full_name: string;
  language: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  campaign_id: string;
  campaign?: Campaign;
  amount: number;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed';
  savob_earned: number;
  created_at: string;
};

export type SavobEntry = {
  id: string;
  transaction_id: string;
  points: number;
  multiplier: number;
  event_type: string;
  created_at: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

const SERVER_API_URL = process.env.API_URL || 'http://localhost:8080/api/v1';

function baseUrl() {
  return typeof window === 'undefined' ? SERVER_API_URL : '/api/v1';
}

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null; headers?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(baseUrl() + path, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Сервер недоступен. Проверьте подключение и попробуйте ещё раз.', 0, 'NETWORK');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? 'Что-то пошло не так', res.status, data?.code ?? 'UNKNOWN');
  }
  return data as T;
}

/** Для серверных компонентов: 404 → null, остальные ошибки пробрасываются. */
export async function apiFetchOrNull<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// ---------- форматирование ----------

const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function formatTJS(amount: number) {
  return `${money.format(amount)} TJS`;
}

/** Сумма в стиле макета «Стиль 2»: «74 300 с.» (сомони). */
export function formatMoney(amount: number) {
  return `${money.format(amount)} с.`;
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Dushanbe',
});

export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

/** Последний день кампании (end_date хранится как полночь следующего дня). */
export function lastDay(endIso: string) {
  return formatDate(new Date(new Date(endIso).getTime() - 1).toISOString());
}

export function daysLeft(endIso: string, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(endIso).getTime() - now) / 86_400_000));
}

/** Русское множественное число: plural(5, ['день', 'дня', 'дней']) → 'дней'. */
export function plural(n: number, forms: [string, string, string]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/** «осталось 12 дней» / «последний день» / «завершён» для карточек сборов. */
export function timeLeftLabel(c: Pick<Campaign, 'end_date' | 'status'>, now = Date.now()) {
  if (c.status === 'completed') return 'сбор завершён';
  const d = daysLeft(c.end_date, now);
  if (d <= 0) return 'срок истёк';
  if (d === 1) return 'последний день';
  return `${plural(d, ['остался', 'осталось', 'осталось'])} ${d} ${plural(d, ['день', 'дня', 'дней'])}`;
}

/** Инициалы для аватара: «Фарход Рахимов» → «ФР». */
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '•'
  );
}

export function progress(c: Pick<Campaign, 'current_amount' | 'goal_amount'>) {
  if (!c.goal_amount) return 0;
  return Math.min(100, Math.round((c.current_amount / c.goal_amount) * 100));
}

export const CATEGORY_LABELS: Record<string, string> = {
  repairs: 'Ремонт',
  construction: 'Строительство',
  education: 'Образование',
  welfare: 'Помощь нуждающимся',
  utilities: 'Коммунальные нужды',
  other: 'Другое',
};

export const PAYMENT_METHODS = [
  { id: 'card', label: 'Карта', hint: 'Visa, Mastercard, Корти Милли' },
  { id: 'alif', label: 'Alif', hint: 'Мобильный кошелёк' },
  { id: 'imon', label: 'IMON', hint: 'Мобильный кошелёк' },
] as const;
