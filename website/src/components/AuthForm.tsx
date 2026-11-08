'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { IconShield } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/client';

/** Разрешаем возвращаться только на свои страницы (защита от open redirect). */
function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/profile';
}

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { user, ready, login, register } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(phone, password);
      else await register(fullName, phone, password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось выполнить запрос');
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === 'login';
  const query = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="page">
      <section className="panel-lg mx-auto w-full max-w-[440px] flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="overtitle">{t('Ассалому алайкум')}</p>
          <h1 className="title">{isLogin ? t('Вход') : t('Регистрация')}</h1>
          <p className="body-text">
            {t('Аккаунт нужен, чтобы жертвовать, копить Савоб и получать отчёты мечетей о ваших сборах.')}
          </p>
        </div>

        <nav aria-label={t('Вход или регистрация')} className="segmented">
          <Link
            href={`/login${query}`}
            aria-current={isLogin ? 'page' : undefined}
            className="!min-h-11 hover:text-accent-700"
          >
            {t('Вход')}
          </Link>
          <Link
            href={`/register${query}`}
            aria-current={!isLogin ? 'page' : undefined}
            className="!min-h-11 hover:text-accent-700"
          >
            {t('Регистрация')}
          </Link>
        </nav>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div>
              <label htmlFor="fullName" className="label">
                {t('Имя и фамилия')}
              </label>
              <input
                id="fullName"
                className="input"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label htmlFor="phone" className="label">
              {t('Номер телефона')}
            </label>
            <div className="flex items-center h-12 rounded-xl border-2 border-transparent bg-app transition-colors focus-within:border-accent-700">
              <span className="pl-3.5 pr-1 text-base font-medium text-body tabular" aria-hidden="true">
                +992
              </span>
              <input
                id="phone"
                className="flex-1 min-w-0 h-full pl-1.5 pr-3.5 border-0 bg-transparent text-base text-ink tabular placeholder:text-hint focus:outline-none focus:ring-0"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="90 123 45 67"
                aria-describedby="phone-hint"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <p id="phone-hint" className="sr-only">
              {t('Код страны +992 подставляется автоматически')}
            </p>
          </div>
          <div>
            <label htmlFor="password" className="label">
              {t('Пароль')}
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={isLogin ? undefined : 8}
              aria-describedby={isLogin ? undefined : 'password-hint'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {!isLogin && (
              <p id="password-hint" className="hint">
                {t('Минимум 8 символов, буквы и цифры.')}
              </p>
            )}
          </div>

          {error && (
            <p className="alert-error" role="alert">
              {t(error)}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? t('Подождите…') : isLogin ? t('Войти') : t('Создать аккаунт')}
          </button>
        </form>

        <div className="infobox">
          <IconShield size={18} className="shrink-0 mt-px" />
          <span>
            {t('Савоб за каждое пожертвование, отчёты по сборам, которым вы помогли, и кабинет для представителей мечетей.')}
          </span>
        </div>

        <p className="caption !text-[13px] flex flex-wrap items-center gap-x-1 -my-3">
          {t('Вы сотрудник Комитета улемов?')}
          <Link href="/admin/login" className="link-action !text-[13px] inline-flex items-center min-h-11">
            {t('Вход для Комитета')}
          </Link>
        </p>
      </section>
    </div>
  );
}
