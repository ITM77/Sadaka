'use client';

import { FormEvent, useEffect, useState } from 'react';
import NoAccess from '@/components/admin/NoAccess';
import { AdminTitle, Notice } from '@/components/admin/Moderation';
import { IconInfo, IconMoon } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { canManageStaff, useAdmin } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';
import { multiplierText, SAVOB_EVENT_LABELS, savobEventName, SavobEvent, SavobMode, savobPoints } from '@/lib/savob';

/**
 * Режим Савоб: суперадмин включает праздничный множитель на даты (Рамадан ×2).
 * Баллы не имеют денежной ценности — множитель только мотивирует жертвовать в праздники.
 * Каждое изменение пишется в журнал действий.
 */

const EVENTS: SavobEvent[] = ['regular', 'ramadan', 'kurban', 'special_event'];
const MULTIPLIERS = [1.5, 2, 2.5, 3, 4, 5];

export default function SavobPage() {
  const { admin } = useAdmin();
  if (!admin) return null;
  if (!canManageStaff(admin)) return <NoAccess role={admin.role} section="Режим Савоб" />;
  return <SavobForm />;
}

/** «2027-03-31T00:00:00+05:00» → «2027-03-30» (последний день включительно) для поля даты. */
function toInput(iso: string | null, endExclusive = false) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() - (endExclusive ? 1000 : 0));
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dushanbe' }).format(d);
}

function SavobForm() {
  const { call } = useAdmin();
  const { t, fmt } = useI18n();
  const [mode, setMode] = useState<SavobMode | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [event, setEvent] = useState<SavobEvent>('regular');
  const [title, setTitle] = useState('');
  const [mult, setMult] = useState(2);
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const fill = (m: SavobMode) => {
    setMode(m);
    setEvent(m.event);
    setTitle(m.title ?? '');
    if (m.event !== 'regular') setMult(m.multiplier);
    setStartsOn(toInput(m.starts_at));
    setEndsOn(toInput(m.ends_at, true));
  };

  useEffect(() => {
    call<{ mode: SavobMode }>('/admin/savob-mode')
      .then((r) => fill(r.mode))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить режим Савоб'));
  }, [call]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const body =
        event === 'regular'
          ? { event }
          : { event, title: title.trim(), multiplier: mult, starts_on: startsOn, ends_on: endsOn, notify };
      const r = await call<{ mode: SavobMode }>('/admin/savob-mode', { method: 'PUT', body });
      fill(r.mode);
      setNotice(
        event === 'regular'
          ? t('Включён обычный режим: ×1')
          : t('Сохранено: {event} ×{n}', { event: savobEventName(r.mode, t), n: multiplierText(r.mode.multiplier) }),
      );
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const regular = event === 'regular';

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle over={t('Управление')}>{t('Режим Савоб')}</AdminTitle>
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}
      {error && (
        <p className="alert-error" role="alert">
          {t(error)}
        </p>
      )}

      {mode && (
        <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <form onSubmit={submit} className="panel flex flex-col gap-5" aria-labelledby="savob-form">
            <h2 id="savob-form" className="title-sm">
              {t('Множитель баллов')}
            </h2>

            <fieldset className="flex flex-col gap-2">
              <legend className="overtitle mb-2">{t('Событие')}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {EVENTS.map((ev) => (
                  <label
                    key={ev}
                    className={`tile flex items-center gap-3 min-h-[52px] cursor-pointer transition-colors ${
                      event === ev ? '!bg-accent-100 ring-2 ring-accent-500' : 'hover:bg-[#DDE7E6]'
                    }`}
                  >
                    <input type="radio" name="event" value={ev} checked={event === ev} onChange={() => setEvent(ev)} className="accent-[#B34A12] w-4 h-4" />
                    <span className="font-medium text-ink">{t(SAVOB_EVENT_LABELS[ev])}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {event === 'special_event' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">{t('Название события')}</span>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                  placeholder={t('Например: Мавлид')}
                />
              </label>
            )}

            {!regular && (
              <>
                <fieldset>
                  <legend className="overtitle mb-2">{t('Множитель')}</legend>
                  <div className="flex flex-wrap gap-2">
                    {MULTIPLIERS.map((m) => (
                      <label key={m} className="chip min-h-11 cursor-pointer has-[:checked]:!bg-accent-100 has-[:checked]:ring-2 has-[:checked]:ring-accent-500 has-[:focus-visible]:outline has-[:focus-visible]:outline-2">
                        <input type="radio" name="mult" className="sr-only" checked={mult === m} onChange={() => setMult(m)} />
                        <span className="tabular">×{multiplierText(m)}</span>
                      </label>
                    ))}
                  </div>
                  <p className="caption mt-2">
                    {t('Пожертвование {sum} даст {n} баллов вместо {base}', {
                      sum: fmt.money(100),
                      n: savobPoints(100, mult),
                      base: savobPoints(100, 1),
                    })}
                  </p>
                </fieldset>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink">{t('Начало')}</span>
                    <input type="date" className="input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
                    <span className="caption">{t('Пусто — с сегодняшнего дня')}</span>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink">{t('Последний день')}</span>
                    <input type="date" className="input" value={endsOn} min={startsOn || undefined} onChange={(e) => setEndsOn(e.target.value)} />
                    <span className="caption">{t('Пусто — пока не выключите вручную')}</span>
                  </label>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[#B34A12] w-5 h-5 mt-0.5 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-ink">{t('Разослать уведомление всем пользователям')}</span>
                    <span className="block caption">{t('Каждый увидит его в колокольчике на сайте.')}</span>
                  </span>
                </label>
              </>
            )}

            {formError && (
              <p className="alert-error" role="alert">
                {t(formError)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary max-sm:w-full" disabled={busy}>
                {busy ? t('Сохраняем…') : regular ? t('Включить обычный режим') : t('Сохранить режим')}
              </button>
            </div>
          </form>

          <aside className="flex flex-col gap-3 md:gap-4 lg:sticky lg:top-4">
            <section className="panel flex flex-col gap-2" aria-labelledby="savob-now">
              <h2 id="savob-now" className="overtitle">
                {t('Сейчас действует')}
              </h2>
              <p className="flex items-center gap-3">
                <span className="icon-tile shrink-0">
                  <IconMoon size={22} />
                </span>
                <span>
                  <span className="block text-[22px] leading-7 font-semibold tabular text-ink">×{multiplierText(mode.effective_multiplier)}</span>
                  <span className="block body-text">{mode.active ? savobEventName(mode, t) : t('Обычный режим')}</span>
                </span>
              </p>
              {mode.event !== 'regular' && !mode.active && (
                <p className="caption">
                  {mode.starts_at && new Date(mode.starts_at) > new Date()
                    ? t('{event} ×{n} начнётся {date}', { event: savobEventName(mode, t), n: multiplierText(mode.multiplier), date: fmt.date(mode.starts_at) })
                    : t('{event} закончился', { event: savobEventName(mode, t) })}
                </p>
              )}
              {mode.active && mode.ends_at && <p className="caption">{t('до {date} включительно', { date: fmt.lastDay(mode.ends_at) })}</p>}
            </section>
            <div className="infobox">
              <IconInfo size={18} className="shrink-0 mt-px" />
              <span>
                {t('Баллы Савоб не имеют денежной ценности. Множитель действует только на новые пожертвования; уже начисленные баллы не меняются. Изменение попадёт в журнал действий.')}
              </span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
