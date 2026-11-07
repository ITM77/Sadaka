'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { LogoMark } from '@/components/Logo';
import { ApiError } from '@/lib/api';
import { useAdmin } from '@/lib/adminAuth';

function IconLock({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 mt-0.5"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const { admin, ready, login } = useAdmin();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && admin) router.replace('/admin');
  }, [ready, admin, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти');
      setBusy(false);
    }
  };

  return (
    <div className="girih surface-night [--girih-opacity:0.12] min-h-screen flex items-center justify-center px-4 py-12">
      <main className="w-full max-w-[420px]">
        <form
          onSubmit={onSubmit}
          className="bg-white text-ink rounded-[24px] sm:rounded-panel p-6 sm:p-10 flex flex-col gap-[22px] shadow-[0_32px_80px_-32px_rgba(0,0,0,0.6)]"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <LogoMark size={56} />
            <h1 className="text-[26px] font-bold leading-tight">Комитет улемов</h1>
            <p className="text-[15px] text-muted">Вход в панель надзора платформы Садака</p>
          </div>
          <div>
            <label htmlFor="a-email" className="label text-[15px]">
              Служебная почта
            </label>
            <input
              id="a-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              className="input h-[52px] border-[#D5CFC3]"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="a-password" className="label text-[15px]">
              Пароль
            </label>
            <input
              id="a-password"
              type="password"
              autoComplete="current-password"
              className="input h-[52px] border-[#D5CFC3]"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="alert-error text-sm" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block h-[54px] rounded-[14px] text-base" disabled={busy}>
            {busy ? 'Входим…' : 'Войти'}
          </button>
          <p className="flex gap-2 items-start text-[13px] leading-normal text-muted">
            <IconLock />
            Доступ выдаёт суперадмин Комитета. Не передавайте пароль другим сотрудникам.
          </p>
        </form>
      </main>
    </div>
  );
}
