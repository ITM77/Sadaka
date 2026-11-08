'use client';

import { FormEvent, useState } from 'react';
import ProgressBar from '@/components/ProgressBar';
import { IconInfo } from '@/components/icons';
import { ApiError, apiFetch, Campaign, CATEGORY_LABELS, formatMoney, Mosque, plural } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { endToDateInput, toDateInput, todayInput } from '@/lib/cabinet';
import { Field, FormCard, FormError, StickyAction } from './ui';

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
  const goalOk = Number.isFinite(goalNum) && goalNum > 0;

  return (
    <div className="layout-aside">
      <form id="campaign-form" onSubmit={onSubmit} className="min-w-0 flex flex-col gap-3">
        <FormCard title="Описание">
          <Field id="c-title" label="Название сбора">
            <input
              id="c-title"
              className="input"
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
        </FormCard>

        <section className="panel" aria-labelledby="c-cat-title">
          <h2 id="c-cat-title" className="overtitle">
            Категория
          </h2>
          <div role="radiogroup" aria-labelledby="c-cat-title" className="mt-3 flex flex-wrap gap-2">
            {categories.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={category === id}
                onClick={() => setCategory(id)}
                className="chip min-h-[44px] md:min-h-[36px]"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <FormCard title="Цель и сроки">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label htmlFor="c-goal" className="label">
                Цель
              </label>
              <div className="flex items-center h-12 rounded-xl border-2 border-transparent bg-app transition-colors focus-within:border-accent-700">
                <input
                  id="c-goal"
                  className="flex-1 min-w-0 h-full pl-3.5 pr-1 border-0 bg-transparent text-base font-semibold text-ink tabular placeholder:text-hint placeholder:font-normal focus:outline-none focus:ring-0"
                  inputMode="decimal"
                  required
                  value={goal}
                  onChange={(e) => setGoal(e.target.value.replace(/[^\d.,\s]/g, ''))}
                  placeholder="50 000"
                  aria-describedby="c-goal-cur"
                />
                <span id="c-goal-cur" className="pr-3.5 text-sm text-muted">
                  сомони
                </span>
              </div>
            </div>
            <div className="grid min-[400px]:grid-cols-2 sm:contents gap-4">
              <Field id="c-start" label="Начало">
                <input
                  id="c-start"
                  type="date"
                  className="input px-3"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field id="c-end" label="Последний день">
                <input
                  id="c-end"
                  type="date"
                  className="input px-3"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </FormCard>
      </form>

      <aside className="aside-sticky min-w-0 flex flex-col gap-3" aria-label="Предпросмотр и сохранение">
        <section className="panel">
          <h2 className="overtitle">Так увидят жертвователи</h2>
          <div className="tile mt-3 flex flex-col gap-2" aria-hidden="true">
            <div className="flex items-center justify-between gap-2">
              <span className="badge badge-sec">{CATEGORY_LABELS[category] ?? category}</span>
              {Number.isFinite(days) && days > 0 && (
                <span className="caption tabular whitespace-nowrap">
                  {days} {plural(days, ['день', 'дня', 'дней'])}
                </span>
              )}
            </div>
            <p className="title-sm break-words">{title.trim() || 'Название сбора'}</p>
            {mosque && (
              <p className="text-xs leading-[17px] text-body">
                {mosque.name} · {mosque.city}
              </p>
            )}
            <ProgressBar value={0} onTile />
            <div className="flex justify-between gap-3 text-[13px] leading-[18px] font-medium text-ink tabular">
              <span className="whitespace-nowrap">{formatMoney(0)} · 0%</span>
              <span className="font-normal text-body whitespace-nowrap">
                из {goalOk ? formatMoney(goalNum) : '— с.'}
              </span>
            </div>
          </div>

          <div className="divider my-4" />

          {error && (
            <div className="mb-3">
              <FormError>{error}</FormError>
            </div>
          )}
          <StickyAction>
            <button type="submit" form="campaign-form" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сохранить черновик'}
            </button>
          </StickyAction>
          <p className="caption mt-2 text-center md:text-left">Черновик не виден жертвователям.</p>
        </section>

        <div className="infobox">
          <IconInfo size={18} className="shrink-0 mt-px" />
          <span>
            После сохранения отправьте сбор на одобрение со страницы мечети. Комитет проверит цель и описание.
          </span>
        </div>
      </aside>
    </div>
  );
}
