'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch, formatMoney, PAYMENT_METHODS } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { IconCard, IconCheck, IconInfo, IconLock, IconPlus, IconReport, IconSavob, IconWallet } from './icons';

const PRESETS = [20, 50, 100, 500];
const STEP = 10;

type Result = { amount: number; savob: number };

/** Сколько баллов даст сумма — та же формула, что на бэкенде (1 балл за 10 TJS × множитель, минимум 1). */
function estimateSavob(amount: number, multiplier: number) {
  return Math.max(1, Math.floor((amount * Math.max(1, multiplier)) / 10 + 1e-9));
}

/** Lucide minus. */
const IconMinus = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
  </svg>
);

/**
 * Секция формы: на телефоне — отдельная белая панель на фоне приложения,
 * на компьютере — часть одной липкой панели 340px.
 */
const SECTION = 'bg-white rounded-card p-4 lg:p-0 lg:rounded-none';

const PHONE_QUERY = '(max-width: 1023px)';

export default function DonateForm({
  campaignId,
  campaignTitle,
  mosqueName,
}: {
  campaignId: string;
  campaignTitle?: string;
  mosqueName?: string;
}) {
  const { user, token, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [amount, setAmount] = useState('50');
  const [method, setMethod] = useState<string>('card');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Текущий праздничный множитель Савоб — для подсказки «+N Савоб».
  useEffect(() => {
    if (!token) return;
    let alive = true;
    apiFetch<{ current_multiplier: number }>('/me/savob?limit=1', { token })
      .then((r) => alive && setMultiplier(r.current_multiplier || 1))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);

  // Ошибку видно, даже если платёж отправлен из закреплённой кнопки внизу экрана.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [error]);

  // Телефон: экран «Принято» поверх страницы — фокус на него, прокрутка страницы заблокирована.
  useEffect(() => {
    if (!result || !window.matchMedia(PHONE_QUERY).matches) return;
    overlayRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [result]);

  if (result) {
    const again = () => setResult(null);
    const body = (
      <>
        <span className="w-16 h-16 rounded-full bg-ok-soft text-ok flex items-center justify-center" aria-hidden="true">
          <IconCheck size={28} />
        </span>
        <h2 className="title mt-3.5">Принято</h2>
        <p className="body-text mt-1.5">
          Пусть Аллах примет вашу садақа.
          {campaignTitle && <> Пожертвование на «{campaignTitle}» получено.</>}
        </p>
        <dl className="kv w-full mt-4 text-left">
          {mosqueName && (
            <div>
              <dt className="text-body">Получатель</dt>
              <dd className="font-medium text-right min-w-0">{mosqueName}</dd>
            </div>
          )}
          <div>
            <dt className="text-body">Пожертвование</dt>
            <dd className="text-lg leading-6 font-semibold tabular whitespace-nowrap">{formatMoney(result.amount)}</dd>
          </div>
          <div>
            <dt className="text-body">Савоб начислен</dt>
            <dd className="inline-flex items-center gap-1.5 text-lg leading-6 font-semibold text-accent-700 tabular">
              <IconSavob size={18} />+{result.savob}
            </dd>
          </div>
        </dl>
        <div className="infobox w-full mt-2 text-left">
          <IconReport size={18} className="shrink-0 mt-px" />
          <span>Мечеть отчитается, на что потрачены средства, — отчёт появится на странице сбора.</span>
        </div>
      </>
    );

    return (
      <>
        {/* Компьютер: внутри липкой панели */}
        <div role="status" className="hidden lg:flex flex-col items-center text-center animate-fade-in">
          {body}
          <Link href="/profile" className="btn btn-primary btn-lg btn-block mt-4">
            Мои добрые дела
          </Link>
          <button type="button" className="btn btn-secondary btn-block mt-2" onClick={again}>
            Пожертвовать ещё
          </button>
        </div>

        {/* Телефон и планшет: полноэкранный экран «Принято» */}
        <div
          ref={overlayRef}
          role="status"
          tabIndex={-1}
          onKeyDown={(e) => e.key === 'Escape' && again()}
          className="lg:hidden fixed inset-0 z-[60] bg-app overflow-y-auto flex flex-col outline-none animate-fade-in"
        >
          <div className="flex-1 w-full max-w-[480px] mx-auto px-4 pt-6 pb-5 flex flex-col gap-3">
            <div className="bg-white rounded-card px-4 pt-6 pb-4 flex flex-col items-center text-center">{body}</div>
            <div className="mt-auto flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
              <Link href="/profile" className="btn btn-primary btn-lg btn-block">
                Мои добрые дела
              </Link>
              <button type="button" className="btn btn-white btn-block" onClick={again}>
                Вернуться к сбору
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!ready) {
    return (
      <div className={SECTION} aria-hidden="true">
        <div className="skeleton h-40 rounded-tile" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(pathname);
    return (
      <div className={`${SECTION} flex flex-col gap-3 text-center`}>
        <p className="body-text">Чтобы пожертвовать и получить Савоб, войдите в аккаунт.</p>
        <Link href={`/login?next=${next}`} className="btn btn-primary btn-lg btn-block">
          Войти и пожертвовать
        </Link>
        <Link href={`/register?next=${next}`} className="btn btn-secondary btn-block">
          Создать аккаунт
        </Link>
      </div>
    );
  }

  const value = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 1;
  const savob = valid && multiplier !== null ? estimateSavob(value, multiplier) : null;
  const amountLabel = valid ? formatMoney(value) : '';
  const selected = PAYMENT_METHODS.find((m) => m.id === method) ?? PAYMENT_METHODS[0];

  const bump = (delta: number) => {
    const base = valid ? value : 0;
    setAmount(String(Math.max(1, Math.round(base + delta))));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!valid) {
      setError('Минимальная сумма — 1 сомони');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ savob_earned: number }>('/donations', {
        method: 'POST',
        token,
        body: { campaign_id: campaignId, amount: Math.round(value * 100) / 100, payment_method: method },
      });
      setResult({ amount: value, savob: res.savob_earned });
      router.refresh(); // обновить сумму и прогресс кампании
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось выполнить платёж');
    } finally {
      setBusy(false);
    }
  };

  const submitLabel = busy ? 'Проводим платёж…' : `Пожертвовать${amountLabel ? ` · ${amountLabel}` : ''}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 lg:gap-5" noValidate aria-label="Пожертвование">
      {/* Сумма */}
      <fieldset className={SECTION}>
        <legend className="sr-only">Сумма пожертвования</legend>
        <p className="overtitle" aria-hidden="true">
          Сумма
        </p>
        <div className="flex items-center justify-between gap-3 mt-3">
          <button
            type="button"
            className="btn-icon"
            aria-label={`Уменьшить на ${STEP} сомони`}
            onClick={() => bump(-STEP)}
            disabled={!valid || value <= 1}
          >
            <IconMinus />
          </button>
          <label
            htmlFor="donate-amount"
            className="flex-1 min-w-0 flex flex-col items-center rounded-tile px-2 py-1 cursor-text focus-within:ring-2 focus-within:ring-accent-700"
          >
            <span className="sr-only">Своя сумма, сомони</span>
            <span className="flex items-baseline justify-center gap-1 max-w-full">
              <input
                id="donate-amount"
                inputMode="decimal"
                autoComplete="off"
                aria-describedby={error ? 'donate-error' : undefined}
                className="min-w-[2ch] max-w-full border-0 p-0 bg-transparent text-center num-lg text-ink shadow-none focus:ring-0 focus:outline-none"
                style={{ width: `${Math.max(2, amount.length) + 0.5}ch` }}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder="0"
              />
              <span className="num-lg" aria-hidden="true">
                с.
              </span>
            </span>
            <span className="caption" aria-hidden="true">
              сомони
            </span>
          </label>
          <button
            type="button"
            className="btn-icon"
            aria-label={`Увеличить на ${STEP} сомони`}
            onClick={() => bump(STEP)}
          >
            <IconPlus />
          </button>
        </div>
        <div className="segmented mt-3.5" role="group" aria-label="Быстрый выбор суммы">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              aria-pressed={amount === String(p)}
              className="!px-2 tabular"
            >
              {p}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Способ оплаты */}
      <fieldset className={SECTION}>
        <legend className="sr-only">Способ оплаты</legend>
        <p className="overtitle" aria-hidden="true">
          Способ оплаты
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {PAYMENT_METHODS.map((m) => {
            const on = method === m.id;
            const Icon = m.id === 'card' ? IconCard : IconWallet;
            return (
              <label
                key={m.id}
                className={`relative min-h-[72px] rounded-tile p-3 flex flex-col justify-between gap-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent-700 ${
                  on ? 'bg-accent-100 text-accent-700' : 'bg-app text-sec hover:bg-[#DDE7E6]'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={m.id}
                  checked={on}
                  onChange={() => setMethod(m.id)}
                  className="sr-only"
                />
                <Icon />
                <span className="text-sm leading-5 font-medium text-ink">{m.label}</span>
                {on && (
                  <span
                    className="absolute top-2.5 right-2.5 w-[22px] h-[22px] rounded-full bg-accent-500 text-ink flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <IconCheck size={14} strokeWidth={2.25} />
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <p className="caption mt-2.5">{selected.hint}</p>
      </fieldset>

      {/* Итог */}
      <div className={`${SECTION} lg:pt-4 lg:border-t lg:border-line`}>
        {mosqueName && (
          <div className="flex justify-between items-center gap-3 min-h-8">
            <span className="text-sm text-body">Получатель</span>
            <span className="text-sm font-medium text-ink text-right min-w-0 truncate">{mosqueName}</span>
          </div>
        )}
        <div className="flex justify-between items-center gap-3 min-h-8" aria-live="polite">
          <span className="text-sm text-body">Савоб</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 tabular">
            <IconSavob size={16} />
            {savob !== null ? `+${savob}` : '—'}
            {multiplier !== null && multiplier > 1 && savob !== null && (
              <span className="text-body font-normal">· праздник ×{multiplier}</span>
            )}
          </span>
        </div>
        <div className="divider my-2" />
        <div className="flex justify-between items-baseline gap-3">
          <span className="title-sm">Итого</span>
          <span className="num-lg whitespace-nowrap">{amountLabel || '—'}</span>
        </div>

        <div className="infobox mt-3.5">
          {process.env.NEXT_PUBLIC_PAYMENTS_MODE !== 'live' ? (
            <>
              <IconInfo size={18} className="shrink-0 mt-px" />
              <span>Тестовый режим: деньги не списываются.</span>
            </>
          ) : (
            <>
              <IconLock size={18} className="shrink-0 mt-px" />
              <span>Платёж проводит банк. Садака не хранит данные карт.</span>
            </>
          )}
        </div>

        {error && (
          <p id="donate-error" ref={errorRef} className="alert-error mt-2 scroll-mb-28" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="hidden lg:flex btn btn-primary btn-lg btn-block mt-3.5" disabled={busy}>
          {submitLabel}
        </button>
      </div>

      {/* Телефон и планшет: закреплённая кнопка внизу экрана (поверх панели вкладок) */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <button
          type="submit"
          className="btn btn-primary btn-lg btn-block flex max-w-[480px] mx-auto"
          disabled={busy}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
