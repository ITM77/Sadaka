'use client';

import { FormEvent, useState } from 'react';
import ProgressBar from '@/components/ProgressBar';
import { ApiError, apiFetch, Campaign, CATEGORY_LABELS, formatTJS, Mosque, plural } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { endToDateInput, toDateInput, todayInput } from '@/lib/cabinet';
import { Alert, Field } from './ui';

export default function CampaignForm({
  mosqueId,
  mosque,
  campaign,
  onSaved,
}: {
  mosqueId: string;
  /** Для превью карточки «Так увидят жертвователи» */
  mosque?: Mosque;
  campaign?: Campaign;
  onSaved: (c: Campaign) => void;
}) {
  const { token } = useAuth();
  const [title, setTitle] = useState(campaign?.title ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [category, setCategory] = useState(campaign?.category ?? 'repairs');
  const [goal, setGoal] = useState(campaign ? String(campaign.goal_amount) : '');
  const [start, setStart] = useState(campaign ? toDateInput(campaign.start_date) : todayInput());
  const [end, setEnd] = useState(campaign ? endToDateInput(campaign.end_date) : todayInput(30));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const goalNum = Number(goal.replace(/\s/g, '').replace(',', '.'));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!Number.isFinite(goalNum) || goalNum <= 0) {
      setError('Укажите целевую сумму больше нуля');
      return;
    }
    if (end < start) {
      setError('Дата окончания раньше даты начала');
      return;
    }
    setBusy(true);
    try {
      const body = {
        mosque_id: mosqueId,
        title,
        description,
        category,
        goal_amount: Math.round(goalNum * 100) / 100,
        start_date: start,
        end_date: end,
      };
      const res = campaign
        ? await apiFetch<{ campaign: Campaign }>(`/campaigns/${campaign.id}`, { method: 'PUT', body, token })
        : await apiFetch<{ campaign: Campaign }>('/campaigns', { method: 'POST', body, token });
      onSaved(res.campaign);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить');
      setBusy(false);
    }
  };

  const days = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1 : NaN;
  const categories = Object.entries(CATEGORY_LABELS);
  // Если у сбора категория не из списка — всё равно показываем её, чтобы не потерять
  if (!CATEGORY_LABELS[category]) categories.push([category, category]);

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-7">
      <form
        onSubmit={onSubmit}
        className="lg:flex-1 min-w-0 bg-white border border-line rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 flex flex-col gap-[22px]"
      >
        <Field id="c-title" label="Название сбора">
          <input
            id="c-title"
            className="input h-[52px]"
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Таъмири бом"
          />
        </Field>
        <Field id="c-desc" label="На что нужны деньги" hint="Пишите конкретно — жертвователи доверяют понятным целям.">
          <textarea
            id="c-desc"
            className="input resize-y"
            rows={5}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <fieldset>
          <legend className="label text-[15px] mb-2.5">Категория</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map(([id, label]) => {
              const on = category === id;
              return (
                <label
                  key={id}
                  className={`inline-flex items-center gap-2 h-11 px-3.5 rounded-full text-[15px] cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-600 has-[:focus-visible]:ring-offset-2 ${
                    on
                      ? 'border-[1.5px] border-primary-600 bg-mint text-primary-700 font-semibold'
                      : 'border border-dark-300 bg-white hover:border-primary-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={id}
                    checked={on}
                    onChange={() => setCategory(id)}
                    className="w-4 h-4 text-primary-600 border-dark-300 focus:ring-0 focus:ring-offset-0"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="c-goal" className="label text-[15px]">
              Цель
            </label>
            <div className="flex items-center h-[52px] rounded-xl border border-line bg-white overflow-hidden transition-colors focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-600/15">
              <input
                id="c-goal"
                className="flex-1 min-w-0 h-full px-3.5 border-0 bg-transparent text-base font-semibold text-ink placeholder:text-dark-400 placeholder:font-normal focus:outline-none focus:ring-0"
                inputMode="decimal"
                required
                value={goal}
                onChange={(e) => setGoal(e.target.value.replace(/[^\d.,\s]/g, ''))}
                placeholder="50 000"
                aria-describedby="c-goal-cur"
              />
              <span id="c-goal-cur" className="px-3.5 text-muted">
                TJS
              </span>
            </div>
          </div>
          <div className="grid min-[400px]:grid-cols-2 sm:contents gap-4">
            <Field id="c-start" label="Начало">
              <input
                id="c-start"
                type="date"
                className="input h-[52px] px-3"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field id="c-end" label="Последний день">
              <input
                id="c-end"
                type="date"
                className="input h-[52px] px-3"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center pt-2">
          <button type="submit" className="btn btn-primary h-[54px] px-6 rounded-[14px] text-base" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Сохранить черновик'}
          </button>
          <p className="text-sm text-muted">Черновик не виден жертвователям.</p>
        </div>
      </form>

      <aside className="lg:w-[360px] shrink-0 min-w-0 flex flex-col gap-3" aria-label="Предпросмотр карточки сбора">
        <p className="text-sm font-semibold uppercase tracking-[0.04em] text-muted">Так увидят жертвователи</p>
        <div className="card p-5 sm:p-6 flex flex-col gap-4" aria-hidden="true">
          <div className="flex items-center justify-between gap-2">
            <span className="badge badge-primary">{CATEGORY_LABELS[category] ?? category}</span>
            {Number.isFinite(days) && days > 0 && (
              <span className="text-sm text-muted">
                {days} {plural(days, ['день', 'дня', 'дней'])}
              </span>
            )}
          </div>
          <div>
            <p className="text-lg leading-snug font-bold mb-1.5 break-words">{title.trim() || 'Название сбора'}</p>
            {mosque && (
              <p className="text-[15px] text-muted">
                {mosque.name} · {mosque.city}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            <ProgressBar value={0} />
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-bold text-primary-600">{formatTJS(0)}</span>
              <span className="text-sm text-muted">
                из {Number.isFinite(goalNum) && goalNum > 0 ? formatTJS(goalNum) : '— TJS'}
              </span>
            </div>
          </div>
        </div>
        <p className="rounded-2xl bg-mint text-primary-700 px-[18px] py-4 text-sm leading-normal">
          После сохранения отправьте сбор на одобрение со страницы мечети. Комитет проверит цель и описание.
        </p>
      </aside>
    </div>
  );
}
