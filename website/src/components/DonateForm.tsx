'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch, formatTJS, PAYMENT_METHODS } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { IconSavob } from './icons';

const PRESETS = [20, 50, 100, 500];

type Result = { amount: number; savob: number };

/** Сколько баллов даст сумма — та же формула, что на бэкенде (1 балл за 10 TJS × множитель, минимум 1). */
function estimateSavob(amount: number, multiplier: number) {
  return Math.max(1, Math.floor((amount * Math.max(1, multiplier)) / 10 + 1e-9));
}

const IconBell = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 mt-px text-gold"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);

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
  const [barVisible, setBarVisible] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Текущий праздничный множитель Савоб — для подсказки «Вы получите +N Савоб».
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

  // Телефон: закреплённая полоса «Пожертвовать», пока кнопка формы ниже экрана.
  useEffect(() => {
    const el = submitRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setBarVisible(false);
      return;
    }
    const io = new IntersectionObserver(([e]) => setBarVisible(!e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, [user, ready, result]);

  // Телефон: экран «Савоб начислен» поверх страницы — фокус на него, прокрутка страницы заблокирована.
  useEffect(() => {
    if (!result || !window.matchMedia('(max-width: 767px)').matches) return;
    overlayRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [result]);

  if (result) {
    const again = () => setResult(null);
    return (
      <>
        {/* Планшет и компьютер: внутри панели */}
        <div
          role="status"
          className="hidden md:flex relative overflow-hidden rounded-[18px] bg-sand px-[22px] py-7 text-center flex-col items-center gap-3 animate-scale-in"
        >
          <svg aria-hidden="true" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path d="M32 6 L58 32 L32 58 L6 32 Z" stroke="#C9A25A" strokeWidth="1.5" />
            <rect x="13.6" y="13.6" width="36.8" height="36.8" stroke="#C9A25A" strokeWidth="1.5" />
            <path d="M24 33l6 6 12-14" stroke="#7A5418" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-2xl font-bold text-brass-900">Савоб начислен</p>
          <p className="text-base leading-relaxed text-brass-800">
            Вы пожертвовали <strong>{formatTJS(result.amount)}</strong> и получили{' '}
            <strong>+{result.savob} Савоб</strong>. Пусть Аллах примет вашу садақа.
          </p>
          <p className="text-sm text-brass-700">
            Мечеть отчитается, на что потрачены средства, — отчёт появится на этой странице.
          </p>
          <Link href="/profile" className="btn btn-primary btn-block h-[52px] text-base mt-1.5">
            Мои добрые дела
          </Link>
          <button type="button" className="btn btn-block text-primary-700 hover:bg-white/60" onClick={again}>
            Пожертвовать ещё
          </button>
        </div>

        {/* Телефон: полноэкранный экран благодарности */}
        <div
          ref={overlayRef}
          role="status"
          tabIndex={-1}
          onKeyDown={(e) => e.key === 'Escape' && again()}
          className="md:hidden fixed inset-0 z-[60] girih surface-night overflow-y-auto flex flex-col outline-none animate-fade-in"
          style={{ '--girih-opacity': 0.12 } as React.CSSProperties}
        >
          <div className="flex-1 flex flex-col items-center justify-center text-center px-7 pt-12 pb-6 gap-5">
            <div className="relative w-[168px] h-[168px] flex items-center justify-center" aria-hidden="true">
              <svg width="168" height="168" viewBox="0 0 168 168" fill="none" className="absolute inset-0">
                <path d="M84 8 L160 84 L84 160 L8 84 Z" stroke="#C9A25A" strokeWidth="1.5" />
                <rect x="30.3" y="30.3" width="107.4" height="107.4" stroke="#C9A25A" strokeWidth="1.5" />
                <circle cx="84" cy="84" r="46" fill="#F1D9A6" />
              </svg>
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0B2725"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.06em] text-gold">Джазакаллаху хайран</p>
            <h2 className="text-[34px] leading-[1.1] font-bold">Савоб начислен</h2>
            <p className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-gold/15 border border-gold/40 text-gold">
              <IconSavob size={22} />
              <span className="text-xl font-bold">+{result.savob} Савоб</span>
            </p>
            <p className="text-base leading-relaxed text-mist">
              Вы пожертвовали <strong className="text-paper">{formatTJS(result.amount)}</strong>
              {campaignTitle && <> на «{campaignTitle}»</>}
              {mosqueName && <> в {mosqueName}</>}. Пусть Аллах примет вашу садақа.
            </p>
            <div className="w-full flex gap-3 items-start text-left px-4 py-3.5 rounded-[14px] bg-paper/[0.06] border border-paper/[0.12] text-sm leading-normal text-mist">
              <IconBell />
              Мечеть опубликует отчёт о расходах на странице сбора.
            </div>
          </div>
          <div className="px-5 pb-7 flex flex-col gap-2.5">
            <Link href="/profile" className="btn btn-gold btn-lg btn-block">
              Мои добрые дела
            </Link>
            <button type="button" className="btn btn-on-dark btn-block h-[52px] text-base" onClick={again}>
              Вернуться к сбору
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!ready) {
    return <div className="h-40 rounded-2xl bg-paper animate-pulse" aria-hidden="true" />;
  }

  if (!user) {
    const next = encodeURIComponent(pathname);
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-[15px] leading-relaxed text-muted">Чтобы пожертвовать и получить Савоб, войдите в аккаунт.</p>
        <Link href={`/login?next=${next}`} className="btn btn-primary btn-lg btn-block">
          Войти и пожертвовать
        </Link>
        <Link href={`/register?next=${next}`} className="btn btn-ghost btn-block">
          Создать аккаунт
        </Link>
      </div>
    );
  }

  const value = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 1;
  const savob = valid && multiplier !== null ? estimateSavob(value, multiplier) : null;
  const amountLabel = valid ? formatTJS(value) : '';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!valid) {
      setError('Минимальная сумма — 1 TJS');
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[22px]" noValidate aria-label="Пожертвование">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="text-[15px] font-semibold mb-2.5">Сумма, TJS</legend>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => {
            const on = amount === String(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                aria-pressed={on}
                className={`h-12 rounded-xl text-base font-semibold transition-colors ${
                  on
                    ? 'border-[1.5px] border-primary-600 bg-mint text-primary-700'
                    : 'border border-[#D5CFC3] bg-white text-ink hover:border-primary-300'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
        <label
          htmlFor="donate-amount"
          className="flex items-center gap-2 h-[52px] px-4 rounded-xl border border-[#D5CFC3] bg-white transition-colors focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-600/15"
        >
          <span className="text-sm text-muted whitespace-nowrap">Своя сумма</span>
          <input
            id="donate-amount"
            inputMode="decimal"
            autoComplete="off"
            aria-describedby={error ? 'donate-error' : undefined}
            className="flex-1 min-w-0 border-0 p-0 bg-transparent text-right text-lg font-bold text-ink shadow-none focus:ring-0 focus:outline-none"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0"
          />
          <span className="text-[15px] text-muted">TJS</span>
        </label>
      </fieldset>

      <fieldset>
        <legend className="text-[15px] font-semibold mb-2.5">Способ оплаты</legend>
        <div className="flex flex-col gap-2">
          {PAYMENT_METHODS.map((m) => {
            const on = method === m.id;
            return (
              <label
                key={m.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 min-h-[52px] px-4 py-2.5 rounded-xl cursor-pointer text-[15px] transition-colors focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 ${
                  on ? 'border-[1.5px] border-primary-600 bg-[#F2F8F6]' : 'border border-line bg-white hover:border-primary-300'
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
                <span
                  aria-hidden="true"
                  className={`shrink-0 w-[18px] h-[18px] rounded-full bg-white ${
                    on ? 'border-[5px] border-primary-600' : 'border-[1.5px] border-[#A9B3B0]'
                  }`}
                />
                <span className="font-semibold">{m.label}</span>
                <span className="ml-auto text-sm text-muted">{m.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {savob !== null && (
        <p className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-sand text-brass-800 text-[15px]" aria-live="polite">
          <IconSavob size={20} className="shrink-0" />
          <span>
            Вы получите <strong>+{savob} Савоб</strong>
            {multiplier !== null && multiplier > 1 && <> · праздничный множитель ×{multiplier}</>}
          </span>
        </p>
      )}

      {error && (
        <p id="donate-error" className="alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button ref={submitRef} type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'Проводим платёж…' : `Пожертвовать ${amountLabel}`}
        </button>
        <p className="text-[13px] leading-normal text-center text-muted">
          {process.env.NEXT_PUBLIC_PAYMENTS_MODE !== 'live'
            ? 'Тестовый режим: деньги не списываются.'
            : 'Платёж проводит банк. Садака не хранит данные карт.'}
        </p>
      </div>

      {/* Телефон: закреплённая полоса пожертвования */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-line shadow-[0_-12px_32px_-20px_rgba(20,36,34,0.35)] transition-transform duration-200 ${
          barVisible ? 'translate-y-0' : 'translate-y-full invisible'
        }`}
      >
        <div className="flex-1 min-w-0 flex flex-col">
          <strong className="text-[17px] truncate">{amountLabel || 'Укажите сумму'}</strong>
          {savob !== null && (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brass-700">
              <IconSavob size={14} strokeWidth={2} />+{savob} Савоб
            </span>
          )}
        </div>
        <button type="submit" className="btn btn-primary h-[52px] px-[22px] text-base rounded-[14px]" disabled={busy}>
          {busy ? 'Платёж…' : 'Пожертвовать'}
        </button>
      </div>
    </form>
  );
}
