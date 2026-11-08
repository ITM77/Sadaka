'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { IconArrowLeft, IconLock } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { useAdmin } from '@/lib/adminAuth';
import { LangSwitch, useI18n } from '@/lib/i18n/client';

export default function AdminLoginPage() {
  const { admin, ready, login } = useAdmin();
  const { t } = useI18n();
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
    <div className="min-h-screen bg-app flex flex-col">
      <header className="bg-white">
        <div className="container-custom h-16 flex items-center justify-between gap-3">
          <div className="min-w-0 overflow-hidden">
            <Logo href="/" subtitle="Панель Комитета улемов" />
          </div>
          <LangSwitch className="shrink-0" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-14">
        <div className="w-full max-w-[420px] flex flex-col gap-3">
          <form onSubmit={onSubmit} className="panel-lg flex flex-col gap-5">
            <div>
              <p className="overtitle">{t('Комитет улемов')}</p>
              <h1 className="title mt-1.5">{t('Вход в панель надзора')}</h1>
              <p className="body-text mt-1.5">{t('Одобрение мечетей, кампаний и отчётов платформы Садака.')}</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="a-email" className="label">
                  {t('Служебная почта')}
                </label>
                <input
                  id="a-email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  className="input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="a-password" className="label">
                  {t('Пароль')}
                </label>
                <input
                  id="a-password"
                  type="password"
                  autoComplete="current-password"
                  className="input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="alert-error" role="alert">
                {t(error)}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? t('Входим…') : t('Войти')}
            </button>

            <div className="infobox">
              <IconLock size={18} className="shrink-0 mt-px" />
              <span>{t('Доступ выдаёт суперадмин Комитета. Не передавайте пароль другим сотрудникам.')}</span>
            </div>
          </form>

          <Link href="/" className="btn btn-ghost self-center">
            <IconArrowLeft size={18} />
            {t('На сайт Садаки')}
          </Link>
        </div>
      </main>
    </div>
  );
}
