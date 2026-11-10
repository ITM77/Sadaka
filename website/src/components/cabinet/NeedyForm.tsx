'use client';

import { FormEvent, useState } from 'react';
import { IconCheck, IconLock, IconPlus } from '@/components/icons';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/client';
import { AID_KIND_LABELS, AID_KINDS, Beneficiary, SITUATION_LABELS, SITUATIONS } from '@/lib/needy';
import { Field, FormCard, FormError, StickyAction } from './ui';

/** Ошибки сервера приходят со строчной буквы — показываем с заглавной. */
export const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** +992937771122 → +992 93 777 11 22 */
export function formatPhone(p: string) {
  return /^\+992\d{9}$/.test(p) ? `+992 ${p.slice(4, 6)} ${p.slice(6, 9)} ${p.slice(9, 11)} ${p.slice(11)}` : p;
}

/** Тело PUT /me/needy/:id из карточки — для смены статуса без формы. */
export function needyBody(b: Beneficiary, patch: Partial<Pick<Beneficiary, 'status' | 'closed_reason'>> = {}) {
  return {
    full_name: b.full_name,
    phone: b.phone,
    address: b.address,
    household_size: b.household_size,
    situation: b.situation,
    needs: b.needs,
    note: b.note,
    status: b.status,
    closed_reason: b.closed_reason ?? '',
    ...patch,
  };
}

/** Чипы-переключатели для набора меток (положение семьи, нужды). */
function TagChips({
  id,
  title,
  hint,
  options,
  labels,
  value,
  onChange,
}: {
  id: string;
  title: string;
  hint?: string;
  options: string[];
  labels: Record<string, string>;
  value: string[];
  onChange: (update: (v: string[]) => string[]) => void;
}) {
  const { t } = useI18n();
  const toggle = (k: string) => onChange((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]));
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="overtitle">
        {title}
      </h2>
      {hint && <p className="caption mt-1">{hint}</p>}
      <div role="group" aria-labelledby={id} className="mt-3 flex flex-wrap gap-2">
        {options.map((k) => {
          const on = value.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(k)}
              className="chip min-h-[44px] lg:min-h-[36px]"
            >
              {on && <IconCheck size={14} strokeWidth={2.25} />}
              {t(labels[k] ?? k)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const MIN_SIZE = 1;
const MAX_SIZE = 30;

export default function NeedyForm({
  mosqueId,
  beneficiary,
  onSaved,
  onCancel,
}: {
  mosqueId: string;
  /** Есть — правка карточки, нет — новая семья */
  beneficiary?: Beneficiary;
  onSaved: (b: Beneficiary) => void;
  onCancel?: () => void;
}) {
  const { token } = useAuth();
  const { t, fmt } = useI18n();
  const [fullName, setFullName] = useState(beneficiary?.full_name ?? '');
  const [phone, setPhone] = useState(formatPhone(beneficiary?.phone ?? ''));
  const [address, setAddress] = useState(beneficiary?.address ?? '');
  const [size, setSize] = useState(String(beneficiary?.household_size ?? 1));
  const [situation, setSituation] = useState<string[]>(beneficiary?.situation ?? []);
  const [needs, setNeeds] = useState<string[]>(beneficiary?.needs ?? []);
  const [note, setNote] = useState(beneficiary?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sizeNum = Number(size);
  const step = (d: number) =>
    setSize((s) => String(Math.min(MAX_SIZE, Math.max(MIN_SIZE, (Number(s) || MIN_SIZE) + d))));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) return setError('Укажите ФИО');
    if (!Number.isInteger(sizeNum) || sizeNum < MIN_SIZE || sizeNum > MAX_SIZE)
      return setError('В семье — от 1 до 30 человек');
    setBusy(true);
    try {
      const body = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        household_size: sizeNum,
        situation,
        needs,
        note: note.trim(),
        // При правке статус не меняем — для этого кнопки на карточке
        ...(beneficiary ? { status: beneficiary.status, closed_reason: beneficiary.closed_reason ?? '' } : {}),
      };
      const res = beneficiary
        ? await apiFetch<{ beneficiary: Beneficiary }>(`/me/needy/${beneficiary.id}`, { method: 'PUT', body, token })
        : await apiFetch<{ beneficiary: Beneficiary }>(`/me/mosques/${encodeURIComponent(mosqueId)}/needy`, {
            method: 'POST',
            body,
            token,
          });
      onSaved(res.beneficiary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить');
      setBusy(false);
    }
  };

  return (
    <div className="layout-aside">
      <form id="needy-form" onSubmit={onSubmit} className="min-w-0 flex flex-col gap-3">
        <FormCard title={t('Семья')}>
          <Field id="n-name" label={t('ФИО')} hint={t('Глава семьи или тот, кто получает помощь.')}>
            <input
              id="n-name"
              className="input"
              required
              maxLength={255}
              autoComplete="off"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              id="n-phone"
              label={t('Телефон')}
              hint={t('Необязательно. По номеру видно, не стоит ли семья на учёте в другой мечети.')}
            >
              <input
                id="n-phone"
                className="input tabular"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+992 93 777 11 22"
              />
            </Field>
            <Field id="n-address" label={t('Адрес или махалля')}>
              <input
                id="n-address"
                className="input"
                maxLength={500}
                autoComplete="off"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
          </div>
          <div className="min-w-0">
            <label htmlFor="n-size" className="label">
              {t('Сколько человек в семье')}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-icon text-xl font-semibold disabled:opacity-40"
                aria-label={t('Меньше')}
                disabled={sizeNum <= MIN_SIZE}
                onClick={() => step(-1)}
              >
                <span aria-hidden="true">−</span>
              </button>
              <input
                id="n-size"
                className="input !w-20 text-center font-semibold tabular"
                inputMode="numeric"
                required
                value={size}
                onChange={(e) => setSize(e.target.value.replace(/\D/g, '').slice(0, 2))}
              />
              <button
                type="button"
                className="btn-icon disabled:opacity-40"
                aria-label={t('Больше')}
                disabled={sizeNum >= MAX_SIZE}
                onClick={() => step(1)}
              >
                <IconPlus size={18} />
              </button>
              <span className="body-text">
                {fmt.plural(Number.isFinite(sizeNum) ? sizeNum : 0, ['человек', 'человека', 'человек'])}
              </span>
            </div>
          </div>
        </FormCard>

        <TagChips
          id="n-situation"
          title={t('Положение')}
          hint={t('Отметьте всё, что подходит.')}
          options={SITUATIONS}
          labels={SITUATION_LABELS}
          value={situation}
          onChange={setSituation}
        />
        <TagChips
          id="n-needs"
          title={t('Что нужно')}
          options={AID_KINDS}
          labels={AID_KIND_LABELS}
          value={needs}
          onChange={setNeeds}
        />

        <FormCard title={t('Заметка')}>
          <Field id="n-note" label={t('Что важно учесть')} hint={t('Например: кто рекомендовал, когда навестить.')}>
            <textarea
              id="n-note"
              className="input resize-y"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </FormCard>
      </form>

      <aside className="aside-sticky min-w-0 flex flex-col gap-3" aria-label={t('Сохранение')}>
        <section className="panel">
          <div className="infobox">
            <IconLock size={18} className="shrink-0 mt-px" />
            <span>{t('Эти данные видят только ваша мечеть и Комитет улемов. На сайте их нет.')}</span>
          </div>
          {error && (
            <div className="mt-3">
              <FormError>{capFirst(t(error))}</FormError>
            </div>
          )}
          <div className="mt-4">
            <StickyAction>
              <div className="flex gap-2">
                {onCancel && (
                  <button type="button" className="btn btn-secondary btn-lg flex-1 !px-3" onClick={onCancel} disabled={busy}>
                    {t('Отмена')}
                  </button>
                )}
                <button type="submit" form="needy-form" className="btn btn-primary btn-lg flex-1 !px-3" disabled={busy}>
                  {busy ? t('Сохраняем…') : beneficiary ? t('Сохранить') : t('Добавить семью')}
                </button>
              </div>
            </StickyAction>
          </div>
        </section>
      </aside>
    </div>
  );
}
