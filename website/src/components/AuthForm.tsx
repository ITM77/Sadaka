'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { IconMosque, IconReport, IconSavob } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** Разрешаем возвращаться только на свои страницы (защита от open redirect). */
function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/profile';
}

const PERKS = [
  { icon: IconSavob, text: 'Савоб за каждое пожертвование' },
  { icon: IconReport, text: 'Отчёты по сборам, которым вы помогли' },
  { icon: IconMosque, text: 'Кабинет для представителей мечетей' },
];

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { user, ready, login, register } = useAuth();
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
    <div className="container-custom pt-6 pb-14 sm:pt-14 sm:pb-20">
      {/* В DOM форма идёт первой (и на телефоне сверху), на десктопе приветствие слева */}
      <div className="flex flex-col lg:flex-row-reverse gap-6 lg:gap-8 items-stretch">
        {/* Форма */}
        <section className="flex-1 min-w-0 bg-white border border-line rounded-[20px] md:rounded-panel p-5 sm:p-10 lg:p-12 flex flex-col gap-6 sm:gap-7">
          <h1 className="sr-only">{isLogin ? 'Вход' : 'Регистрация'}</h1>
          <nav aria-label="Вход или регистрация" className="grid grid-cols-2 p-1 rounded-[14px] bg-paper">
            {(
              [
                ['/login', 'Вход', isLogin],
                ['/register', 'Регистрация', !isLogin],
              ] as const
            ).map(([href, label, active]) => (
              <Link
                key={href}
                href={`${href}${query}`}
                aria-current={active ? 'page' : undefined}
                className={`h-12 rounded-[10px] flex items-center justify-center text-base font-semibold transition-colors ${
                  active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="label text-[15px]">
                  Имя и фамилия
                </label>
                <input
                  id="fullName"
                  className="input h-[52px]"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="phone" className="label text-[15px]">
                Номер телефона
              </label>
              <div className="flex items-stretch h-[52px] rounded-xl border border-line bg-white overflow-hidden transition-colors focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-600/15">
                <span className="flex items-center px-3.5 bg-paper border-r border-line text-base font-semibold text-dark-700" aria-hidden="true">
                  +992
                </span>
                <input
                  id="phone"
                  className="flex-1 min-w-0 h-full px-3.5 border-0 bg-transparent text-base text-ink placeholder:text-dark-400 focus:outline-none focus:ring-0"
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
                Код страны +992 подставляется автоматически
              </p>
            </div>
            <div>
              <label htmlFor="password" className="label text-[15px]">
                Пароль
              </label>
              <input
                id="password"
                className="input h-[52px]"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={isLogin ? undefined : 8}
                aria-describedby={isLogin ? undefined : 'password-hint'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {!isLogin && (
                <p id="password-hint" className="mt-2 text-[13px] text-muted">
                  Минимум 8 символов, буквы и цифры.
                </p>
              )}
            </div>

            {error && (
              <p className="alert-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? 'Подождите…' : isLogin ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>

          <p className="mt-auto pt-5 border-t border-dark-100 text-sm text-muted">
            Вы сотрудник Комитета улемов?{' '}
            <Link href="/admin/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Вход для Комитета
            </Link>
          </p>
        </section>

        {/* Приветствие */}
        <section className="girih surface-night overflow-hidden flex-1 min-w-0 rounded-[20px] md:rounded-panel p-6 sm:p-10 lg:p-12 flex flex-col justify-between gap-8 lg:gap-10">
          <div className="flex flex-col gap-3 sm:gap-4">
            <p className="eyebrow text-gold">Ассалому алайкум</p>
            <h2 className="text-[28px] sm:text-[40px] leading-[1.15] font-bold" style={{ letterSpacing: '-0.02em' }}>
              Ваши добрые дела — в одном месте
            </h2>
            <p className="text-base sm:text-[17px] leading-relaxed text-mist">
              Аккаунт нужен, чтобы жертвовать, копить Савоб и получать отчёты мечетей о ваших сборах.
            </p>
          </div>
          <ul className="flex flex-col gap-3.5 text-[15px] sm:text-base">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <Icon size={22} className="text-gold shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
