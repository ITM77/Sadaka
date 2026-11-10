'use client';

import { notFound } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import NeedyForm, { capFirst, formatPhone, needyBody } from '@/components/cabinet/NeedyForm';
import { Alert, CabinetPage, Field, FormError, Loading, StatusBadge } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';
import { IconClose, IconEdit, IconLock } from '@/components/icons';
import { ApiError, apiFetch } from '@/lib/api';
import { todayInput } from '@/lib/cabinet';
import { useI18n } from '@/lib/i18n/client';
import {
  AID_KIND_LABELS,
  AID_KINDS,
  AidRecord,
  Beneficiary,
  daysSinceAid,
  SITUATION_LABELS,
  WAIT_DAYS,
  WelfareFund,
} from '@/lib/needy';

type Card = { beneficiary: Beneficiary; aid: AidRecord[]; funds: WelfareFund[] };

export default function NeedyCardPage({ params }: { params: { id: string; bid: string } }) {
  const { data: cab, notFound: missing, token } = useMosqueCabinet(params.id);
  const { t, fmt } = useI18n();
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState('');
  const [gone, setGone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState('');

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      const r = await apiFetch<Card>(`/me/needy/${encodeURIComponent(params.bid)}`, { token });
      if (r.beneficiary.mosque_id !== params.id) return setGone(true);
      setCard(r);
      setError('');
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setGone(true);
      else setError(e instanceof ApiError ? e.message : 'Не удалось загрузить карточку');
    }
  }, [params.bid, params.id, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (missing || gone) notFound();

  const base = `/cabinet/mosques/${params.id}`;
  const crumbs = [
    { href: '/cabinet', label: t('Кабинет') },
    { href: base, label: cab?.mosque.name ?? t('Мечеть') },
    { href: `${base}/needy`, label: t('Нуждающиеся') },
  ];

  if (!card) {
    return (
      <CabinetPage title={t('Семья')} crumbs={crumbs}>
        {error ? <Alert>{t(error)}</Alert> : <Loading />}
      </CabinetPage>
    );
  }

  const { beneficiary: b, aid, funds } = card;
  const active = b.status === 'active';

  if (editing) {
    return (
      <CabinetPage title={b.full_name} crumbs={crumbs} current={t('Редактирование')}>
        <NeedyForm
          mosqueId={params.id}
          beneficiary={b}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            setNotice(t('Изменения сохранены.'));
            await reload();
          }}
        />
      </CabinetPage>
    );
  }

  // Смена статуса: PUT с теми же данными семьи
  const setStatus = async (status: 'active' | 'closed') => {
    setBusy('status');
    setActionError('');
    setNotice('');
    try {
      await apiFetch(`/me/needy/${b.id}`, {
        method: 'PUT',
        token,
        body: needyBody(b, { status, closed_reason: status === 'closed' ? reason.trim() : '' }),
      });
      setClosing(false);
      setReason('');
      // О снятии с учёта и так говорит плашка над карточкой
      if (status === 'active') setNotice(t('Семья снова в списке нуждающихся.'));
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Не удалось выполнить действие');
    } finally {
      setBusy('');
    }
  };

  const removeAid = async (a: AidRecord) => {
    if (
      !confirm(
        t('Удалить запись «{kind}» на {sum} от {date}? Это нельзя отменить.', {
          kind: t(AID_KIND_LABELS[a.kind] ?? a.kind),
          sum: fmt.money(a.amount),
          date: fmt.date(a.given_on),
        }),
      )
    )
      return;
    setBusy(a.id);
    setActionError('');
    setNotice('');
    try {
      await apiFetch(`/me/aid/${a.id}`, { method: 'DELETE', token });
      setNotice(t('Запись удалена.'));
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Не удалось удалить запись');
    } finally {
      setBusy('');
    }
  };

  const days = daysSinceAid(b.last_aid_on);
  const reportedIds = new Set(funds.filter((f) => f.reported).map((f) => f.campaign_id));

  return (
    <CabinetPage
      title={b.full_name}
      crumbs={crumbs}
      current={b.full_name}
      actions={
        <button type="button" className="btn btn-white" onClick={() => setEditing(true)}>
          <IconEdit size={18} />
          {t('Изменить')}
        </button>
      }
    >
      {notice && <Alert tone="success">{notice}</Alert>}
      {actionError && <Alert>{capFirst(t(actionError))}</Alert>}

      {/* На телефоне порядок: данные → выдача → история; на десктопе выдача — в правой колонке */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
        <div className="contents lg:flex lg:flex-col lg:gap-3 lg:min-w-0">
          <div className="order-1 lg:order-none min-w-0 flex flex-col gap-3">
            {b.other_mosques > 0 && (
              <Alert tone="warn">
                {t('Эта семья уже на учёте ещё в {n} {mosques} — уточните, не получает ли она помощь дважды.', {
                  n: b.other_mosques,
                  mosques: fmt.plural(b.other_mosques, ['мечети', 'мечетях', 'мечетях']),
                })}
              </Alert>
            )}
            {!active && (
              <Alert tone="info" title={t('Семья снята с учёта.')}>
                {b.closed_reason ? `«${b.closed_reason}»` : ''}
              </Alert>
            )}

            <section className="panel" aria-labelledby="family-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="family-title" className="overtitle">
                  {t('Семья')}
                </h2>
                <StatusBadge tone={active ? 'ok' : 'neutral'}>{active ? t('На учёте') : t('Снята с учёта')}</StatusBadge>
              </div>
              <dl className="kv mt-3">
                <div>
                  <dt className="text-body">{t('Телефон')}</dt>
                  <dd className="font-medium text-ink tabular text-right">{b.phone ? formatPhone(b.phone) : t('не указан')}</dd>
                </div>
                <div>
                  <dt className="text-body shrink-0">{t('Адрес')}</dt>
                  <dd className="font-medium text-ink text-right break-words min-w-0">{b.address || t('не указан')}</dd>
                </div>
                <div>
                  <dt className="text-body">{t('В семье')}</dt>
                  <dd className="font-medium text-ink tabular">
                    {b.household_size} {fmt.plural(b.household_size, ['человек', 'человека', 'человек'])}
                  </dd>
                </div>
                <div>
                  <dt className="text-body">{t('На учёте с')}</dt>
                  <dd className="font-medium text-ink tabular text-right">{fmt.date(b.created_at)}</dd>
                </div>
              </dl>

              {b.situation.length > 0 && (
                <div className="mt-3.5">
                  <h3 className="caption">{t('Положение')}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {b.situation.map((s) => (
                      <span key={s} className="badge badge-sec">
                        {t(SITUATION_LABELS[s] ?? s)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {b.needs.length > 0 && (
                <div className="mt-3.5">
                  <h3 className="caption">{t('Что нужно')}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {b.needs.map((s) => (
                      <span key={s} className="badge">
                        {t(AID_KIND_LABELS[s] ?? s)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {b.note && (
                <div className="mt-3.5">
                  <h3 className="caption">{t('Заметка')}</h3>
                  <p className="body-text mt-1 whitespace-pre-line break-words">{b.note}</p>
                </div>
              )}
              <p className="caption mt-3.5 flex items-center gap-1.5">
                <IconLock size={14} className="shrink-0" />
                {t('Видят только ваша мечеть и Комитет улемов.')}
              </p>
            </section>
          </div>

          <section className="order-3 lg:order-none panel !pb-1" aria-labelledby="history-title">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id="history-title" className="overtitle">
                {t('История помощи')}
              </h2>
              {b.aid_count > 0 && (
                <span className="caption tabular">
                  {t('всего {sum}', { sum: fmt.money(b.aid_total) })} · {b.aid_count}{' '}
                  {fmt.plural(b.aid_count, ['выдача', 'выдачи', 'выдач'])}
                </span>
              )}
            </div>
            {aid.length === 0 ? (
              <p className="body-text mt-2 mb-3">{t('Помощи ещё не было.')}</p>
            ) : (
              <>
                {days !== null && (
                  <p className={`caption mt-1 ${active && days >= WAIT_DAYS ? '!text-[#A35A00]' : ''}`}>
                    {t('Последняя помощь — {when}', { when: fmt.daysAgo(b.last_aid_on!) })}
                  </p>
                )}
                <ul className="mt-1 divide-y divide-line">
                  {aid.map((a) => {
                    const locked = !!a.campaign_id && reportedIds.has(a.campaign_id);
                    return (
                      <li key={a.id} className="flex items-start gap-3 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <p className="text-sm leading-5 font-medium text-ink">
                              {t(AID_KIND_LABELS[a.kind] ?? a.kind)}
                            </p>
                            <p className="text-sm leading-5 font-semibold text-ink tabular whitespace-nowrap">
                              {fmt.money(a.amount)}
                            </p>
                          </div>
                          {a.description && (
                            <p className="body-text break-words">{a.description}</p>
                          )}
                          <p className="caption mt-0.5 break-words">
                            {fmt.date(a.given_on)} ·{' '}
                            {a.campaign_id
                              ? t('из сбора «{title}»', { title: a.campaign_title || t('Сбор') })
                              : t('из средств мечети')}
                            {locked ? ` · ${t('вошла в отчёт')}` : ''}
                          </p>
                        </div>
                        {!locked && (
                          <button
                            type="button"
                            className="btn-icon disabled:opacity-40"
                            aria-label={t('Удалить запись от {date}', { date: fmt.date(a.given_on) })}
                            disabled={busy === a.id}
                            onClick={() => removeAid(a)}
                          >
                            <IconClose size={18} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>

        {/* Без липкости: форма выдачи выше экрана ноутбука */}
        <aside className="order-2 lg:order-none min-w-0 flex flex-col gap-3">
          {active ? (
            <AidForm
              beneficiary={b}
              funds={funds}
              token={token}
              onStart={() => {
                setNotice('');
                setActionError('');
              }}
              onSaved={async () => {
                setNotice(t('Выдача записана.'));
                setActionError('');
                await reload();
              }}
            />
          ) : (
            <section className="panel">
              <h2 className="overtitle">{t('Выдать помощь')}</h2>
              <p className="body-text mt-2">
                {t('Семья снята с учёта — выдачи не записываются. Верните её в список, если помощь снова нужна.')}
              </p>
            </section>
          )}

          <section className="panel" aria-labelledby="status-title">
            <h2 id="status-title" className="overtitle">
              {t('Учёт')}
            </h2>
            {active ? (
              closing ? (
                <div className="mt-3 flex flex-col gap-3">
                  <Field id="n-reason" label={t('Почему помощь больше не нужна')} hint={t('Необязательно.')}>
                    <input
                      id="n-reason"
                      className="input"
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('Например: глава семьи нашёл работу')}
                    />
                  </Field>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary flex-1 !px-3"
                      disabled={busy === 'status'}
                      onClick={() => {
                        setClosing(false);
                        setReason('');
                      }}
                    >
                      {t('Отмена')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger flex-1 !px-3"
                      disabled={busy === 'status'}
                      onClick={() => setStatus('closed')}
                    >
                      {busy === 'status' ? t('Сохраняем…') : t('Снять с учёта')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="caption mt-1">{t('Если помощь больше не нужна, снимите семью с учёта — история сохранится.')}</p>
                  <button type="button" className="btn btn-secondary btn-block mt-3" onClick={() => setClosing(true)}>
                    {t('Снять с учёта')}
                  </button>
                </>
              )
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-block mt-3"
                disabled={busy === 'status'}
                onClick={() => setStatus('active')}
              >
                {busy === 'status' ? t('Сохраняем…') : t('Вернуть в список')}
              </button>
            )}
          </section>
        </aside>
      </div>
    </CabinetPage>
  );
}

/** Из сбора можно выдавать, пока по нему нет отчёта и остались деньги. */
const usable = (f: WelfareFund) => !f.reported && f.available > 0;

/** Форма «Выдать помощь»: вид, что именно, сумма, дата и источник денег. */
function AidForm({
  beneficiary: b,
  funds,
  token,
  onStart,
  onSaved,
}: {
  beneficiary: Beneficiary;
  funds: WelfareFund[];
  token: string | null;
  onStart: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t, fmt } = useI18n();
  const [kind, setKind] = useState(b.needs[0] ?? 'food');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => todayInput());
  const [source, setSource] = useState(() => funds.find(usable)?.campaign_id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // После перезагрузки карточки выбранный сбор мог исчерпаться или закрыться отчётом
  useEffect(() => {
    setSource((s) => {
      const f = funds.find((x) => x.campaign_id === s);
      return !s || (f && usable(f)) ? s : (funds.find(usable)?.campaign_id ?? '');
    });
  }, [funds]);

  const today = todayInput();
  const amountNum = Number(amount.replace(/\s/g, '').replace(',', '.'));
  const fund = funds.find((f) => f.campaign_id === source);
  const over = !!fund && Number.isFinite(amountNum) && amountNum > fund.available;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    onStart();
    if (!Number.isFinite(amountNum) || amountNum <= 0) return setError('Укажите сумму больше нуля');
    if (!date || date > today) return setError('Дата выдачи не может быть в будущем');
    setBusy(true);
    try {
      await apiFetch(`/me/needy/${b.id}/aid`, {
        method: 'POST',
        token,
        body: {
          kind,
          description: description.trim(),
          amount: Math.round(amountNum * 100) / 100,
          given_on: date,
          ...(source ? { campaign_id: source } : {}),
        },
      });
      setDescription('');
      setAmount('');
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось записать выдачу');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="panel flex flex-col gap-4" aria-labelledby="aid-title">
      <h2 id="aid-title" className="overtitle">
        {t('Выдать помощь')}
      </h2>

      <div role="radiogroup" aria-labelledby="aid-kind" className="min-w-0">
        <p id="aid-kind" className="label">
          {t('Вид помощи')}
        </p>
        <div className="flex flex-wrap gap-2">
          {AID_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className="chip min-h-[44px] lg:min-h-[36px]"
            >
              {t(AID_KIND_LABELS[k])}
            </button>
          ))}
        </div>
      </div>

      <Field id="aid-desc" label={t('Что именно')}>
        <input
          id="aid-desc"
          className="input"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('Мука 50 кг, масло 5 л')}
        />
      </Field>

      <div className="grid min-[360px]:grid-cols-2 lg:grid-cols-1 gap-4">
        <div className="min-w-0">
          <label htmlFor="aid-amount" className="label">
            {t('Сумма')}
          </label>
          <div className="flex items-center h-12 rounded-xl border-2 border-transparent bg-app transition-colors focus-within:border-accent-700">
            <input
              id="aid-amount"
              className="flex-1 min-w-0 h-full pl-3.5 pr-1 border-0 bg-transparent text-base font-semibold text-ink tabular placeholder:text-hint placeholder:font-normal focus:outline-none focus:ring-0"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,\s]/g, ''))}
              placeholder="500"
            />
            <span className="pr-3.5 text-sm text-muted">{t('с.')}</span>
          </div>
        </div>
        <Field id="aid-date" label={t('Дата')}>
          <input
            id="aid-date"
            type="date"
            className="input px-3"
            required
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>

      <Field
        id="aid-source"
        label={t('Из каких денег')}
        hint={
          over
            ? t('В сборе осталось {sum} — больше выдать нельзя.', { sum: fmt.money(fund!.available) })
            : fund
              ? t('Сумма спишется с остатка сбора: осталось {sum}', { sum: fmt.money(fund.available) })
              : funds.length === 0
                ? t('Сборов «Помощь нуждающимся» пока нет — выдача запишется как помощь из средств мечети.')
                : t('Выдача не спишется ни с одного сбора.')
        }
      >
        <select
          id="aid-source"
          className={`input ${over ? '!border-[#B42318]' : ''}`}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          {funds.map((f) => (
            <option key={f.campaign_id} value={f.campaign_id} disabled={!usable(f)}>
              {f.reported
                ? t('{title} — отчёт подан', { title: f.title })
                : f.available > 0
                  ? t('{title} — осталось {sum}', { title: f.title, sum: fmt.money(f.available) })
                  : t('{title} — средств не осталось', { title: f.title })}
            </option>
          ))}
          <option value="">{t('Из средств мечети (без сбора)')}</option>
        </select>
      </Field>

      {error && <FormError>{capFirst(t(error))}</FormError>}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? t('Записываем…') : t('Записать выдачу')}
      </button>
    </form>
  );
}
