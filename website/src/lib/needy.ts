// Учёт нуждающихся мечети: типы ответа API и подписи меток.
// Подписи — русские ключи для t(); таджикский — в lib/i18n/tg/needy.ts.

export type NeedyStatus = 'active' | 'closed';

export type Beneficiary = {
  id: string;
  mosque_id: string;
  full_name: string;
  phone: string; // +992…, может быть пустым
  address: string;
  household_size: number;
  situation: string[];
  needs: string[];
  note: string;
  status: NeedyStatus;
  closed_reason?: string;
  created_at: string;
  updated_at: string;
  aid_total: number;
  aid_count: number;
  last_aid_on: string | null; // дата без времени
  other_mosques: number; // семья (тот же телефон) на учёте ещё в стольких мечетях
  mosque_name?: string; // только в панели Комитета
  mosque_city?: string;
};

export type AidRecord = {
  id: string;
  beneficiary_id: string;
  campaign_id?: string;
  campaign_title?: string;
  kind: string;
  description: string;
  amount: number;
  given_on: string;
  created_at: string;
};

/** Сбор «Помощь нуждающимся» и сколько в нём осталось на выдачу. */
export type WelfareFund = {
  campaign_id: string;
  title: string;
  status: 'active' | 'completed';
  collected: number;
  given: number;
  available: number;
  reported: boolean; // отчёт подан — выдачи из сбора закрыты
};

export type NeedySummary = {
  active: number;
  closed: number;
  people: number;
  month_amount: number;
  month_count: number;
  waiting: number; // активные семьи без помощи 60+ дней
};

/** Обезличенные итоги выдач из сбора — публично и для отчёта. */
export type AidSummary = {
  families: number;
  amount: number;
  count: number;
  by_kind: { kind: string; amount: number; families: number; count: number }[];
};

export const SITUATION_LABELS: Record<string, string> = {
  widow: 'Вдова',
  orphan: 'Сироты',
  disability: 'Инвалидность',
  illness: 'Тяжёлая болезнь',
  large_family: 'Многодетная семья',
  elderly: 'Пожилые',
  low_income: 'Нет дохода',
  other: 'Другое',
};

export const AID_KIND_LABELS: Record<string, string> = {
  food: 'Продукты',
  medicine: 'Лекарства',
  utilities: 'Коммунальные услуги',
  clothes: 'Одежда',
  education: 'Учёба',
  housing: 'Жильё',
  money: 'Деньги',
  other: 'Другое',
};

export const SITUATIONS = Object.keys(SITUATION_LABELS);
export const AID_KINDS = Object.keys(AID_KIND_LABELS);

/** Сколько дней без помощи считается «давно не получали» — как на сервере. */
export const WAIT_DAYS = 60;

/** Дней с последней выдачи (null — помощи ещё не было). */
export function daysSinceAid(lastAidOn: string | null, now = Date.now()) {
  if (!lastAidOn) return null;
  return Math.max(0, Math.floor((now - Date.parse(lastAidOn.slice(0, 10) + 'T00:00:00+05:00')) / 86_400_000));
}
