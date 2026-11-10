import { tgCommon } from './tg/common';
import { tgPublic } from './tg/public';
import { tgCabinet } from './tg/cabinet';
import { tgAdmin } from './tg/admin';
import { tgMap } from './tg/map';
import { tgNotify } from './tg/notify';
import { tgNeedy } from './tg/needy';
import { tgNeedyAdmin } from './tg/needyAdmin';

/**
 * Перевод интерфейса: русский — исходный язык (ключи словаря — сами русские строки),
 * таджикский — по словарям в ./tg. Нет перевода — показываем русский текст, а не пустоту.
 *
 * Использование:
 *  - серверный компонент: `const { t, fmt } = getI18n()` из '@/lib/i18n/server';
 *  - клиентский компонент: `const { t, fmt } = useI18n()` из '@/lib/i18n/client'.
 *  - t('Собрано {sum}', { sum: fmt.money(100) }) — подстановка {имя}.
 */

export type Lang = 'ru' | 'tg';
export const LANGS: Lang[] = ['tg', 'ru'];
export const LANG_COOKIE = 'sadaka_lang';
/** Язык по умолчанию, пока пользователь не выбрал. */
export const DEFAULT_LANG: Lang = 'ru';
export const LANG_LABELS: Record<Lang, { short: string; name: string }> = {
  tg: { short: 'ТҶ', name: 'Тоҷикӣ' },
  ru: { short: 'РУ', name: 'Русский' },
};

export const isLang = (v: unknown): v is Lang => v === 'ru' || v === 'tg';

const TG: Record<string, string> = { ...tgCommon, ...tgPublic, ...tgCabinet, ...tgAdmin, ...tgMap, ...tgNotify, ...tgNeedy, ...tgNeedyAdmin };

export type Vars = Record<string, string | number>;

export function translate(lang: Lang, s: string, vars?: Vars): string {
  let out = lang === 'tg' ? (TG[s] ?? s) : s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/* ---------- Числа, даты, множественное число ---------- */

const TZ = 'Asia/Dushanbe';
const num = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

/** Части даты по Душанбе — одинаково на сервере и в браузере. */
function parts(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { y: get('year'), m: Number(get('month')) - 1, d: Number(get('day')), hh: get('hour'), mm: get('minute'), ss: get('second'), wd };
}

// Таджикские месяцы с изофатом: «9 ноябри 2026».
const TG_MONTHS = ['январи', 'феврали', 'марти', 'апрели', 'майи', 'июни', 'июли', 'августи', 'сентябри', 'октябри', 'ноябри', 'декабри'];
// Русские названия месяцев в именительном падеже (Intl даёт «ноября» в дате, а нам нужна подпись графика).
const RU_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const RU_MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const TG_DAYS =['якшанбе', 'душанбе', 'сешанбе', 'чоршанбе', 'панҷшанбе', 'ҷумъа', 'шанбе'];

const ruLong = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const ruDayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: TZ });
const ruShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ });
const ruWeekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });

export function makeFmt(lang: Lang) {
  const tg = lang === 'tg';
  const t = (s: string, v?: Vars) => translate(lang, s, v);

  /** Множественное число: в таджикском после числа существительное не меняется — берём первую форму. */
  const plural = (n: number, forms: [string, string, string]) => {
    if (tg) return t(forms[0]);
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  };

  /** «9 ноября 2026 г.» / «9 ноябри 2026» */
  const date = (iso: string) => {
    if (!tg) return ruLong.format(new Date(iso));
    const p = parts(iso);
    return `${p.d} ${TG_MONTHS[p.m]} ${p.y}`;
  };
  /** «9 ноября» / «9 ноябри» */
  const dayMonth = (iso: string) => {
    if (!tg) return ruDayMonth.format(new Date(iso));
    const p = parts(iso);
    return `${p.d} ${TG_MONTHS[p.m]}`;
  };
  /** «9 нояб., 09:20» / «9 ноябри, 09:20» */
  const short = (iso: string) => {
    if (!tg) return ruShort.format(new Date(iso));
    const p = parts(iso);
    return `${p.d} ${TG_MONTHS[p.m]}, ${p.hh}:${p.mm}`;
  };
  /** «9 ноября 2026 г., 09:20» */
  const dateTime = (iso: string) => {
    const p = parts(iso);
    return tg ? `${p.d} ${TG_MONTHS[p.m]} ${p.y}, ${p.hh}:${p.mm}` : `${ruLong.format(new Date(iso))}, ${p.hh}:${p.mm}`;
  };
  /** С секундами — для записи журнала. */
  const dateTimeSec = (iso: string) => {
    const p = parts(iso);
    return tg ? `${p.d} ${TG_MONTHS[p.m]} ${p.y}, ${p.hh}:${p.mm}:${p.ss}` : `${ruLong.format(new Date(iso))}, ${p.hh}:${p.mm}:${p.ss}`;
  };
  /** «Понедельник, 9 ноября 2026 г.» / «Душанбе, 9 ноябри 2026» */
  const today = (d = new Date()) => {
    if (!tg) {
      const s = ruWeekday.format(d);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    const p = parts(d);
    const w = TG_DAYS[p.wd] ?? '';
    return `${w.charAt(0).toUpperCase()}${w.slice(1)}, ${p.d} ${TG_MONTHS[p.m]} ${p.y}`;
  };

  /** «ноябрь 2026» / «ноябри 2026» — для графиков по месяцам. */
  const monthYear = (iso: string) => {
    const p = parts(iso);
    if (!tg) return `${RU_MONTHS[p.m]} ${p.y}`;
    return `${TG_MONTHS[p.m]} ${p.y}`;
  };
  /** «нояб.» / «ноя» — подпись оси. */
  const monthShort = (iso: string) => {
    const p = parts(iso);
    return tg ? TG_MONTHS[p.m].slice(0, 3) : RU_MONTHS_SHORT[p.m];
  };

  /** «74 300 с.» */
  const money = (amount: number) => `${num.format(amount)} ${t('с.')}`;
  const number = (n: number) => num.format(n);

  /** Последний день сбора (end_date — полночь следующего дня). */
  const lastDay = (endIso: string) => date(new Date(new Date(endIso).getTime() - 1).toISOString());

  const daysLeft = (endIso: string, now = Date.now()) => Math.max(0, Math.ceil((new Date(endIso).getTime() - now) / 86_400_000));

  /** «осталось 12 дней» / «последний день» / «сбор завершён». */
  const timeLeft = (c: { end_date: string; status: string }, now = Date.now()) => {
    if (c.status === 'completed') return t('сбор завершён');
    const d = daysLeft(c.end_date, now);
    if (d <= 0) return t('срок истёк');
    if (d === 1) return t('последний день');
    if (tg) return t('{n} рӯз монд', { n: d });
    return `${plural(d, ['остался', 'осталось', 'осталось'])} ${d} ${plural(d, ['день', 'дня', 'дней'])}`;
  };

  /** «сегодня» / «вчера» / «3 дня назад» — по календарю Душанбе. */
  const daysAgo = (iso: string) => {
    const key = (x: string | Date) => {
      const p = parts(x);
      return Date.UTC(Number(p.y), p.m, p.d);
    };
    const days = Math.round((key(new Date()) - key(iso)) / 86_400_000);
    if (days <= 0) return t('сегодня');
    if (days === 1) return t('вчера');
    if (tg) return t('{n} рӯз пеш', { n: days });
    return `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`;
  };

  return { plural, date, dayMonth, short, dateTime, dateTimeSec, today, monthYear, monthShort, money, number, lastDay, daysLeft, timeLeft, daysAgo };
}

export type Fmt = ReturnType<typeof makeFmt>;

export function makeI18n(lang: Lang) {
  return { lang, t: (s: string, v?: Vars) => translate(lang, s, v), fmt: makeFmt(lang) };
}

export type I18n = ReturnType<typeof makeI18n>;
