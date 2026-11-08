'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { IconAlert, IconArrowLeft, IconLock } from '@/components/icons';
import { ApiError, apiFetch, initials } from '@/lib/api';
import { Admin, AdminRole, ROLE_LABELS, useAdmin } from '@/lib/adminAuth';
import { formatDay } from '@/lib/audit';

type Invite = {
  full_name: string;
  email: string;
  role: AdminRole;
  invited_by_name?: string;
  expires_at: string;
  reset: boolean;
};

/** 12o: сотрудник открыл ссылку-приглашение и задаёт пароль. Без меню, как вход в панель. */
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { startSession } = useAdmin();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ invite: Invite }>(`/admin/invite/${encodeURIComponent(token)}`)
      .then((r) => setInvite(r.invite))
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : 'Не удалось открыть приглашение'));
  }, [token]);

  const checks = [
    { ok: password.length >= 8, label: 'Не короче 8 символов' },
    { ok: /\p{L}/u.test(password) && /\d/.test(password), label: 'Есть буквы и цифры' },
    { ok: password.length > 0 && password === repeat, label: 'Пароли совпадают' },
  ];
  const valid = checks.every((c) => c.ok);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ token: string; admin: Admin }>(`/admin/invite/${encodeURIComponent(token)}`, {
        method: 'POST',
        body: { password },
      });
      startSession(res.token, res.admin);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить пароль');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-app flex flex-col">
      <header className="bg-white">
        <div className="container-custom h-16 flex items-center">
          <Logo href="/" subtitle="Панель Комитета улемов" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-14">
        <div className="w-full max-w-[440px] flex flex-col gap-3">
          {loadError ? (
            <section className="panel-lg flex flex-col gap-4">
              <span className="icon-tile bg-[#FDECEC] text-[#B42318]">
                <IconAlert size={22} />
              </span>
              <div>
                <h1 className="title">Ссылка не работает</h1>
                <p className="body-text mt-1.5">{loadError}</p>
              </div>
              <Link href="/admin/login" className="btn btn-secondary btn-block">
                Ко входу в панель
              </Link>
            </section>
          ) : !invite ? (
            <div className="panel-lg flex flex-col gap-4" aria-busy="true" aria-label="Загрузка">
              <div className="skeleton h-6 w-1/2" />
              <div className="skeleton h-16 rounded-tile" />
              <div className="skeleton h-12 rounded-xl" />
              <div className="skeleton h-12 rounded-xl" />
            </div>
          ) : (
            <form onSubmit={submit} className="panel-lg flex flex-col gap-5">
              <div>
                <p className="overtitle">{invite.reset ? 'Новый пароль' : 'Приглашение'}</p>
                <h1 className="title mt-1.5">Задайте пароль</h1>
                <p className="body-text mt-1.5">
                  {invite.reset
                    ? 'Суперадмин сбросил ваш пароль. Задайте новый — старый больше не работает.'
                    : `${invite.invited_by_name ?? 'Суперадмин'} пригласил(а) вас в панель Комитета улемов.`}{' '}
                  Пароль знаете только вы — Комитет его не видит.
                </p>
              </div>

              <div className="tile flex items-center gap-3">
                <span aria-hidden="true" className="w-11 h-11 rounded-full bg-sec-soft text-sec flex items-center justify-center font-semibold shrink-0">
                  {initials(invite.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink break-words">{invite.full_name}</span>
                  <span className="block caption break-all">{invite.email}</span>
                </span>
                <span className="badge badge-sec shrink-0">{ROLE_LABELS[invite.role]}</span>
              </div>

              {/* Логин для менеджера паролей */}
              <input type="email" name="username" autoComplete="username" value={invite.email} readOnly hidden />

              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="inv-pass" className="label">
                    Новый пароль
                  </label>
                  <input
                    id="inv-pass"
                    type="password"
                    autoComplete="new-password"
                    className="input"
                    required
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby="inv-checks"
                  />
                </div>
                <div>
                  <label htmlFor="inv-repeat" className="label">
                    Повторите пароль
                  </label>
                  <input
                    id="inv-repeat"
                    type="password"
                    autoComplete="new-password"
                    className="input"
                    required
                    maxLength={72}
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                  />
                </div>
                <ul id="inv-checks" className="flex flex-col gap-1.5" aria-live="polite">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-2 text-sm leading-5">
                      <span
                        aria-hidden="true"
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          c.ok ? 'bg-ok-soft text-ok' : 'bg-app text-body'
                        }`}
                      >
                        {c.ok ? '✓' : '·'}
                      </span>
                      <span className={c.ok ? 'text-ink' : 'text-body'}>
                        {c.label}
                        <span className="sr-only"> — {c.ok ? 'выполнено' : 'пока нет'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <p className="alert-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !valid}>
                {busy ? 'Сохраняем…' : 'Войти в панель'}
              </button>

              <div className="infobox">
                <IconLock size={18} className="shrink-0 mt-px" />
                <span>
                  Ссылка действует до {formatDay(invite.expires_at)} по Душанбе и работает один раз. Потом попросите
                  суперадмина создать новую.
                </span>
              </div>
            </form>
          )}

          <Link href="/" className="btn btn-ghost self-center">
            <IconArrowLeft size={18} />
            На сайт Садаки
          </Link>
        </div>
      </main>
    </div>
  );
}
