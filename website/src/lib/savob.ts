// Режим Савоб: праздничный множитель (Рамадан ×2, Курбан ×3), который включает Комитет.

import { apiFetch } from './api';

export type SavobEvent = 'regular' | 'ramadan' | 'kurban' | 'special_event';

export type SavobMode = {
  event: SavobEvent;
  title: string;
  multiplier: number;
  starts_at: string | null;
  ends_at: string | null; // не включительно: полночь дня после окончания
  updated_at: string;
  active: boolean;
  effective_multiplier: number;
};

export const SAVOB_EVENT_LABELS: Record<SavobEvent, string> = {
  regular: 'Обычный режим',
  ramadan: 'Рамадан',
  kurban: 'Курбан-байрам',
  special_event: 'Особое событие',
};

/** Название события для людей: своё название особого события или подпись по типу. */
export function savobEventName(m: Pick<SavobMode, 'event' | 'title'>, t: (s: string) => string) {
  return m.event === 'special_event' && m.title ? m.title : t(SAVOB_EVENT_LABELS[m.event]);
}

/** «2» / «2,5» — множитель без лишних нулей. */
export function multiplierText(n: number) {
  return String(n).replace('.', ',');
}

/** Баллы за пожертвование — так же, как на сервере: 1 балл за 10 с., умножить, округлить вниз, минимум 1. */
export function savobPoints(amount: number, multiplier: number) {
  if (amount <= 0) return 0;
  return Math.max(1, Math.floor((amount * Math.max(1, multiplier)) / 10 + 1e-9));
}

/** Текущий режим для всех посетителей (без входа). */
export async function fetchSavobMode(): Promise<SavobMode | null> {
  try {
    const r = await apiFetch<{ mode: SavobMode }>('/savob/mode');
    return r.mode;
  } catch {
    return null;
  }
}
