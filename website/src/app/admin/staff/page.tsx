'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { IconAlert, IconCheck, IconCopy, IconInfo, IconPlus, IconUsers } from '@/components/icons';
import Dialog from '@/components/admin/Dialog';
import NoAccess from '@/components/admin/NoAccess';
import { AdminTitle, FoundLine, ListSkeleton, matches, Notice } from '@/components/admin/Moderation';
import { ApiError, initials } from '@/lib/api';
import { AdminRole, canManageStaff, PERMISSIONS, ROLE_LABELS, ROLE_RIGHTS, useAdmin } from '@/lib/adminAuth';
import { actionOf, AuditEntry, Staff } from '@/lib/audit';
import { useI18n } from '@/lib/i18n/client';

const ROLES: AdminRole[] = ['superadmin', 'moderator', 'analyst'];

type LinkResult = { staff: Staff; invite_token: string; invite_expires_at: string; kind: 'invite' | 'reinvite' | 'reset' };

export default function StaffPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <StaffSection />
    </Suspense>
  );
}

function StaffSection() {
  const { admin } = useAdmin();
  if (!admin) return null;
  if (!canManageStaff(admin)) return <NoAccess role={admin.role} section="Сотрудников" />;
  return <StaffList />;
}

function StaffList() {
  const { admin, call } = useAdmin();
  const { t, fmt } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openId = params.get('id');

  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [inviting, setInviting] = useState(false);
  const [link, setLink] = useState<LinkResult | null>(null);
  const [roleChange, setRoleChange] = useState<{ s: Staff; role: AdminRole } | null>(null);
  const [disabling, setDisabling] = useState<Staff | null>(null);
  const [resetting, setResetting] = useState<Staff | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await call<{ staff: Staff[] }>('/admin/staff');
      setStaff(res.staff);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось загрузить сотрудников');
    }
  }, [call]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openCard = (id: string | null) => router.replace(id ? `${pathname}?id=${id}` : pathname, { scroll: false });

  const shown = useMemo(() => staff?.filter((s) => matches(query, s.full_name, s.email)) ?? null, [staff, query]);
  const counts = useMemo(() => {
    const c = { active: 0, invited: 0, disabled: 0 };
    staff?.forEach((s) => c[s.status]++);
    return c;
  }, [staff]);

  const changed = (message: string) => {
    setNotice(message);
    reload();
  };

  const enable = async (s: Staff) => {
    try {
      await call(`/admin/staff/${s.id}/enable`, { method: 'POST', body: {} });
      changed(`${s.full_name} — ${t('доступ включён')}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось включить доступ');
    }
  };

  const selected = staff?.find((s) => s.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle
        over={t('Управление')}
        sub={t('Приглашать, менять роль и отключать доступ может только суперадмин. Все изменения попадают в журнал.')}
        aside={
          staff
            ? t('{active} работают · {invited} приглашены · {disabled} отключены', {
                active: counts.active,
                invited: counts.invited,
                disabled: counts.disabled,
              })
            : undefined
        }
      >
        {t('Сотрудники')}
      </AdminTitle>

      <section className="panel flex flex-col gap-4" aria-label={t('Сотрудники Комитета')}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="input flex items-center gap-2.5 text-muted cursor-text focus-within:border-accent-700 flex-1 min-w-[220px] sm:max-w-[360px]">
            <span className="sr-only">{t('Поиск сотрудника')}</span>
            <input
              type="search"
              placeholder={t('Имя или email')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 h-full border-0 p-0 bg-transparent text-base text-ink focus:ring-0 focus:outline-none focus-visible:outline-none"
            />
          </label>
          <button type="button" className="btn btn-primary sm:ml-auto w-full sm:w-auto" onClick={() => setInviting(true)}>
            <IconPlus size={18} />
            {t('Пригласить сотрудника')}
          </button>
        </div>

        <Notice text={notice} onClose={() => setNotice('')} />
        {error && (
          <p className="alert-error" role="alert">
            {t(error)}
          </p>
        )}
        {!staff && !error && <ListSkeleton />}
        {staff && staff.length === 0 && (
          <EmptyState icon={<IconUsers size={26} />} title={t('Сотрудников нет')}>
            {t('Пригласите первого сотрудника Комитета.')}
          </EmptyState>
        )}
        {shown && staff && staff.length > 0 && (
          <>
            {query.trim() && <FoundLine shown={shown.length} total={staff.length} />}

            {/* Веб: таблица как в 12i */}
            <div className="hidden lg:block -mx-1">
              <table className="w-full text-sm leading-5 border-separate border-spacing-0">
                <caption className="sr-only">{t('Сотрудники Комитета улемов')}</caption>
                <thead>
                  <tr className="text-left text-xs leading-4 text-body">
                    <th scope="col" className="font-medium px-3 py-2.5 border-b border-line">{t('Сотрудник')}</th>
                    <th scope="col" className="font-medium px-3 py-2.5 border-b border-line hidden xl:table-cell">Email</th>
                    <th scope="col" className="font-medium px-3 py-2.5 border-b border-line w-[190px]">{t('Роль')}</th>
                    <th scope="col" className="font-medium px-3 py-2.5 border-b border-line w-[140px]">{t('Доступ')}</th>
                    <th scope="col" className="font-medium px-3 py-2.5 border-b border-line w-[150px]">{t('Последний вход')}</th>
                    <th scope="col" className="px-3 py-2.5 border-b border-line w-[150px]">
                      <span className="sr-only">{t('Действия')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s) => {
                    const self = s.id === admin?.id;
                    return (
                      <tr key={s.id} className="hover:bg-app/60">
                        <td className="px-3 py-2 border-b border-line">
                          <button
                            type="button"
                            onClick={() => openCard(s.id)}
                            className="flex items-center gap-2.5 text-left font-medium text-ink hover:text-accent-700 min-h-[44px]"
                          >
                            <Avatar name={s.full_name} muted={s.status === 'disabled'} />
                            <span className="min-w-0">
                              <span className="block break-words">
                                {s.full_name}
                                <span className="sr-only"> — {t('открыть карточку')}</span>
                              </span>
                              <span className="block xl:hidden caption font-normal [overflow-wrap:anywhere]">{s.email}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-2 border-b border-line text-body [overflow-wrap:anywhere] hidden xl:table-cell">{s.email}</td>
                        <td className="px-3 py-2 border-b border-line">
                          {self || s.status === 'disabled' ? (
                            <span className="flex flex-col">
                              <span>{t(ROLE_LABELS[s.role])}</span>
                              {self && <span className="caption">{t('это вы')}</span>}
                            </span>
                          ) : (
                            <RoleSelect value={s.role} name={s.full_name} onChange={(role) => setRoleChange({ s, role })} />
                          )}
                        </td>
                        <td className="px-3 py-2 border-b border-line">
                          <StaffBadge s={s} />
                        </td>
                        <td className="px-3 py-2 border-b border-line tabular">
                          {s.last_login_at ? fmt.short(s.last_login_at) : <span className="text-muted">{t('ещё не входил(а)')}</span>}
                        </td>
                        <td className="px-3 py-2 border-b border-line text-right">
                          {self ? (
                            <span className="caption">—</span>
                          ) : s.status === 'disabled' ? (
                            <button type="button" className="btn btn-sm bg-ok-soft text-ok hover:bg-[#DCF0E4] hover:text-ok" onClick={() => enable(s)}>
                              {t('Включить')}<span className="sr-only">: {s.full_name}</span>
                            </button>
                          ) : (
                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDisabling(s)}>
                              {t('Отключить')}<span className="sr-only">: {s.full_name}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Телефон и планшет: строки-карточки */}
            <ul className="lg:hidden flex flex-col gap-2">
              {shown.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openCard(s.id)}
                    className="tile w-full flex items-center gap-3 text-left hover:bg-[#DDE7E6] transition-colors"
                  >
                    <Avatar name={s.full_name} muted={s.status === 'disabled'} />
                    <span className="min-w-0 flex-1 flex flex-col items-start gap-0.5">
                      <span className="font-medium text-ink break-words">
                        {s.full_name}
                        {s.id === admin?.id && <span className="caption"> · {t('это вы')}</span>}
                      </span>
                      <span className="caption [overflow-wrap:anywhere]">{s.email}</span>
                      <span className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="badge badge-sec">{t(ROLE_LABELS[s.role])}</span>
                        <StaffBadge s={s} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <InviteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        onDone={(res) => {
          setInviting(false);
          setLink({ ...res, kind: 'invite' });
          changed(t('{name} приглашён(а) — передайте ссылку сотруднику.', { name: res.staff.full_name }));
        }}
      />

      <LinkDialog result={link} onClose={() => setLink(null)} />

      <StaffCard
        id={openId}
        staff={selected}
        selfId={admin?.id}
        onClose={() => openCard(null)}
        onRole={(s, role) => setRoleChange({ s, role })}
        onDisable={(s) => setDisabling(s)}
        onEnable={enable}
        onLink={(s) => setResetting(s)}
        version={staff}
      />

      <RoleDialog
        change={roleChange}
        onClose={() => setRoleChange(null)}
        onDone={(s) => {
          setRoleChange(null);
          changed(`${s.full_name} — ${t('роль изменена на «{role}»', { role: t(ROLE_LABELS[s.role]) })}.`);
        }}
      />

      <DisableDialog
        target={disabling}
        onClose={() => setDisabling(null)}
        onDone={(s) => {
          setDisabling(null);
          changed(`${s.full_name} — ${t('доступ отключён, сессии завершены')}.`);
        }}
      />

      <ResetDialog
        target={resetting}
        onClose={() => setResetting(null)}
        onDone={(res, kind) => {
          setResetting(null);
          setLink({ ...res, kind });
          changed(`${res.staff.full_name} — ${t(kind === 'reset' ? 'пароль сброшен' : 'новая ссылка готова')}.`);
        }}
      />
    </div>
  );
}

/* ---------- Мелкие части ---------- */

function Avatar({ name, muted, size = 'md' }: { name: string; muted?: boolean; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={`${size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm'} rounded-full flex items-center justify-center shrink-0 font-semibold ${
        muted ? 'bg-app text-body' : 'bg-sec-soft text-sec'
      }`}
    >
      {initials(name)}
    </span>
  );
}

function StaffBadge({ s }: { s: Staff }) {
  const { t } = useI18n();
  if (s.status === 'disabled') return <span className="badge badge-neutral shrink-0">{t('Отключён')}</span>;
  if (s.status === 'invited') {
    if (s.invite_expired) return <span className="badge badge-danger shrink-0">{t('Ссылка истекла')}</span>;
    return <span className="badge badge-warning shrink-0">{t(s.last_login_at ? 'Ждёт новый пароль' : 'Приглашён')}</span>;
  }
  return <span className="badge badge-success shrink-0">{t('Активен')}</span>;
}

function RoleSelect({ value, name, onChange }: { value: AdminRole; name: string; onChange: (r: AdminRole) => void }) {
  const { t } = useI18n();
  return (
    <label className="relative block">
      <span className="sr-only">{t('Роль: {name}', { name })}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AdminRole)}
        className="input h-11 text-sm pr-9 appearance-none cursor-pointer"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {t(ROLE_LABELS[r])}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body">
        ▾
      </span>
    </label>
  );
}

function ErrorLine({ text }: { text: string }) {
  const { t } = useI18n();
  if (!text) return null;
  return (
    <p className="alert-error" role="alert">
      {t(text)}
    </p>
  );
}

/* ---------- 12k Пригласить ---------- */

function InviteDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (r: Omit<LinkResult, 'kind'>) => void;
}) {
  const { call } = useAdmin();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('moderator');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setRole('moderator');
      setError('');
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await call<Omit<LinkResult, 'kind'>>('/admin/staff', {
        method: 'POST',
        body: { full_name: name.trim(), email: email.trim(), role },
      });
      onDone(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось пригласить');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('Пригласить сотрудника')}
      sub={t('Доступ к панели Комитета улемов')}
      footer={
        <>
          <button type="submit" form="invite-form" className="btn btn-primary flex-1 sm:flex-none" disabled={busy}>
            {busy ? t('Создаём ссылку…') : t('Создать приглашение')}
          </button>
          <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={onClose} disabled={busy}>
            {t('Отмена')}
          </button>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="inv-name" className="label">
            {t('ФИО')}
          </label>
          <input id="inv-name" className="input" required maxLength={255} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="inv-email" className="label">
            {t('Рабочий email')}
          </label>
          <input
            id="inv-email"
            type="email"
            inputMode="email"
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="inv-email-hint"
            autoComplete="off"
          />
          <p id="inv-email-hint" className="caption mt-1.5">
            {t('Станет логином сотрудника. Один email — один сотрудник.')}
          </p>
        </div>
        <fieldset>
          <legend className="label">{t('Роль')}</legend>
          <div className="flex flex-col gap-2">
            {ROLES.map((r) => (
              <label
                key={r}
                className={`tile flex gap-3 items-start cursor-pointer border-2 transition-colors ${
                  role === r ? 'border-accent-700 bg-accent-100' : 'border-transparent hover:bg-[#DDE7E6]'
                }`}
              >
                <input
                  type="radio"
                  name="inv-role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="mt-0.5 w-5 h-5 accent-[#B34A12] shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{t(ROLE_LABELS[r])}</span>
                  <span className="block caption mt-0.5">{t(ROLE_RIGHTS[r])}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="infobox">
          <IconInfo size={18} className="shrink-0 mt-px" />
          <span>
            {t('Панель создаст ссылку-приглашение на 72 часа. Писем платформа пока не отправляет — скопируйте ссылку и передайте сотруднику сами. По ней он задаст пароль и войдёт.')}
          </span>
        </div>
        <ErrorLine text={error} />
      </form>
    </Dialog>
  );
}

/* ---------- Ссылка-приглашение ---------- */

function LinkDialog({ result, onClose }: { result: LinkResult | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const { t, fmt } = useI18n();
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setCopied(false), [result]);
  if (!result) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>;

  // Код после «#»: браузер не отправляет эту часть на сервер — она не попадёт в логи.
  const url = `${origin}/admin/invite#${result.invite_token}`;
  const title = t(result.kind === 'reset' ? 'Ссылка для нового пароля' : 'Ссылка-приглашение');

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      sub={`${result.staff.full_name} · ${result.staff.email} · ${t(ROLE_LABELS[result.staff.role])}`}
      footer={
        <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={onClose}>
          {t('Готово')}
        </button>
      }
    >
      <div>
        <label htmlFor="invite-url" className="label">
          {t('Передайте ссылку сотруднику')}
        </label>
        <input id="invite-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="input text-sm font-medium text-body" />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
        <span aria-live="polite">{copied ? t('Ссылка скопирована') : t('Скопировать ссылку')}</span>
      </button>
      <div className="infobox">
        <IconInfo size={18} className="shrink-0 mt-px" />
        <span>
          {t('Ссылка одноразовая и действует до {date} по Душанбе. Показываем её один раз: если потеряете — создайте новую в карточке сотрудника. Отправляйте только на рабочий контакт.', {
            date: fmt.dateTime(result.invite_expires_at),
          })}
        </span>
      </div>
    </Dialog>
  );
}

/* ---------- 12l Карточка сотрудника ---------- */

function StaffCard({
  id,
  staff,
  selfId,
  onClose,
  onRole,
  onDisable,
  onEnable,
  onLink,
  version,
}: {
  id: string | null;
  staff: Staff | null;
  selfId?: string;
  onClose: () => void;
  onRole: (s: Staff, r: AdminRole) => void;
  onDisable: (s: Staff) => void;
  onEnable: (s: Staff) => void;
  onLink: (s: Staff) => void;
  version: unknown;
}) {
  const { call } = useAdmin();
  const [data, setData] = useState<{ staff: Staff; recent: AuditEntry[]; actions_total: number } | null>(null);
  const [error, setError] = useState('');
  const { t, fmt } = useI18n();

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }
    let alive = true;
    setError('');
    call<{ staff: Staff; recent: AuditEntry[]; actions_total: number }>(`/admin/staff/${id}`)
      .then((r) => alive && setData(r))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Не удалось открыть карточку'));
    return () => {
      alive = false;
    };
  }, [id, call, version]);

  const s = data?.staff ?? staff;
  const self = s?.id === selfId;

  return (
    <Dialog
      open={Boolean(id)}
      onClose={onClose}
      variant="drawer"
      overtitle={t('Карточка сотрудника')}
      title={s?.full_name ?? t('Загрузка…')}
      sub={s?.email}
      footer={
        s && !self ? (
          s.status === 'disabled' ? (
            <button type="button" className="btn bg-ok-soft text-ok hover:bg-[#DCF0E4] hover:text-ok flex-1" onClick={() => onEnable(s)}>
              {t('Включить доступ')}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary flex-1" onClick={() => onLink(s)}>
                {t(s.status === 'invited' ? 'Новая ссылка' : 'Сбросить пароль')}
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={() => onDisable(s)}>
                {t('Отключить доступ')}
              </button>
            </>
          )
        ) : undefined
      }
    >
      <ErrorLine text={error} />
      {!s && !error && <div className="skeleton h-40 rounded-tile" aria-busy="true" />}
      {s && (
        <>
          <div className="flex items-center gap-3">
            <Avatar name={s.full_name} size="lg" muted={s.status === 'disabled'} />
            <div className="min-w-0 flex flex-col items-start gap-1">
              <StaffBadge s={s} />
              {self && <span className="caption">{t('это вы — свою учётную запись меняет другой суперадмин')}</span>}
            </div>
          </div>

          {!self && s.status !== 'disabled' && (
            <fieldset>
              <legend className="label">{t('Роль')}</legend>
              <div className="segmented" role="radiogroup" aria-label={t('Роль')}>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={s.role === r}
                    className="text-sm px-2"
                    onClick={() => s.role !== r && onRole(s, r)}
                  >
                    {t(ROLE_LABELS[r])}
                  </button>
                ))}
              </div>
              <p className="caption mt-1.5">{t(ROLE_RIGHTS[s.role])}</p>
            </fieldset>
          )}

          <dl className="kv">
            {(self || s.status === 'disabled') && (
              <div>
                <dt className="text-body">{t('Роль')}</dt>
                <dd className="font-medium text-ink text-right">{t(ROLE_LABELS[s.role])}</dd>
              </div>
            )}
            <div>
              <dt className="text-body">{t('Добавлен(а)')}</dt>
              <dd className="font-medium text-ink text-right">
                {fmt.date(s.created_at)}
                {s.invited_by_name && <span className="block caption font-normal">{t('пригласил(а) {name}', { name: s.invited_by_name })}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-body">{t('Последний вход')}</dt>
              <dd className="font-medium text-ink text-right tabular">{s.last_login_at ? fmt.short(s.last_login_at) : t('ещё не входил(а)')}</dd>
            </div>
            {s.status === 'invited' && s.invite_expires_at && (
              <div>
                <dt className="text-body">{t('Ссылка действует до')}</dt>
                <dd className={`font-medium text-right tabular ${s.invite_expired ? 'text-[#B42318]' : 'text-ink'}`}>
                  {fmt.short(s.invite_expires_at)}
                  {s.invite_expired && ` — ${t('истекла')}`}
                </dd>
              </div>
            )}
          </dl>

          {s.status === 'disabled' && s.disabled_reason && (
            <div className="tile">
              <p className="overtitle">{t('Причина отключения')}</p>
              <p className="mt-1 text-sm leading-5 text-ink break-words">«{s.disabled_reason}»</p>
              {s.disabled_at && <p className="caption mt-1">{fmt.short(s.disabled_at)}</p>}
            </div>
          )}

          <section aria-labelledby="staff-recent">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h3 id="staff-recent" className="overtitle">
                {t('Последние действия')}
              </h3>
              {data && data.actions_total > 0 && (
                <Link href={`/admin/audit?admin_id=${s.id}`} className="text-sm font-medium text-accent-700 hover:text-accent-800">
                  {t('Весь журнал')} · {data.actions_total}
                </Link>
              )}
            </div>
            {data && data.recent.length === 0 && <p className="body-text">{t('Решений пока нет.')}</p>}
            {data && data.recent.length > 0 && (
              <ul className="kv">
                {data.recent.map((e) => (
                  <li key={e.id} className="!items-start py-2">
                    <span className="min-w-0">
                      <span className="block text-ink font-medium break-words">{t(actionOf(e.action).label)}</span>
                      <span className="block caption break-words">
                        {e.object_title}
                        {e.object_subtitle ? ` · ${e.object_subtitle}` : ''}
                      </span>
                    </span>
                    <span className="caption tabular whitespace-nowrap">{fmt.short(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Dialog>
  );
}

/* ---------- 12n Сменить роль ---------- */

function RoleDialog({
  change,
  onClose,
  onDone,
}: {
  change: { s: Staff; role: AdminRole } | null;
  onClose: () => void;
  onDone: (s: Staff) => void;
}) {
  const { call } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { t } = useI18n();
  useEffect(() => setError(''), [change]);

  if (!change) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>;
  const { s, role } = change;
  const removed = PERMISSIONS.filter((p) => p.roles.includes(s.role) && !p.roles.includes(role));
  const added = PERMISSIONS.filter((p) => !p.roles.includes(s.role) && p.roles.includes(role));
  const kept = PERMISSIONS.filter((p) => p.roles.includes(s.role) && p.roles.includes(role));

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await call<{ staff: Staff }>(`/admin/staff/${s.id}/role`, { method: 'PUT', body: { role } });
      onDone(res.staff);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось сменить роль');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('Сменить роль?')}
      sub={`${s.full_name} · ${s.email}`}
      footer={
        <>
          <button type="button" className="btn btn-primary flex-1 sm:flex-none" onClick={confirm} disabled={busy}>
            {busy ? t('Сохраняем…') : t('Сменить роль')}
          </button>
          <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={onClose} disabled={busy}>
            {t('Отмена')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="tile">
          <p className="caption">{t('Сейчас')}</p>
          <p className="font-semibold text-ink">{t(ROLE_LABELS[s.role])}</p>
        </div>
        <div className="tile bg-accent-100">
          <p className="caption">{t('Станет')}</p>
          <p className="font-semibold text-accent-700">{t(ROLE_LABELS[role])}</p>
        </div>
      </div>
      {removed.length > 0 && <PermList title={`${t('Уберутся')} · ${removed.length}`} items={removed} tone="bad" />}
      {added.length > 0 && <PermList title={`${t('Добавятся')} · ${added.length}`} items={added} tone="ok" />}
      {kept.length > 0 && <PermList title={t('Останется')} items={kept} tone="neutral" />}
      <p className="body-text">
        {t('Решения, которые сотрудник принял раньше, не отменятся. Новая роль действует сразу — без повторного входа. Смена роли попадёт в журнал с вашим именем.')}
      </p>
      <ErrorLine text={error} />
    </Dialog>
  );
}

function PermList({ title, items, tone }: { title: string; items: { label: string }[]; tone: 'ok' | 'bad' | 'neutral' }) {
  const mark = tone === 'bad' ? '✕' : '✓';
  const color = tone === 'bad' ? 'text-[#B42318]' : tone === 'ok' ? 'text-ok' : 'text-body';
  const { t } = useI18n();
  return (
    <section>
      <h3 className="overtitle mb-1.5">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((p) => (
          <li key={p.label} className="flex gap-2 text-sm leading-5 text-ink">
            <span aria-hidden="true" className={`font-semibold shrink-0 ${color}`}>
              {mark}
            </span>
            {t(p.label)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- 12m Отключить доступ ---------- */

const REASON_MAX = 500;

function DisableDialog({ target, onClose, onDone }: { target: Staff | null; onClose: () => void; onDone: (s: Staff) => void }) {
  const { call } = useAdmin();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { t } = useI18n();
  useEffect(() => {
    setReason('');
    setError('');
  }, [target]);

  if (!target) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await call<{ staff: Staff }>(`/admin/staff/${target.id}/disable`, { method: 'POST', body: { reason: reason.trim() } });
      onDone(res.staff);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отключить доступ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('Отключить доступ?')}
      sub={`${target.full_name} · ${t(ROLE_LABELS[target.role]).toLowerCase()} · ${target.email}`}
      footer={
        <>
          <button
            type="submit"
            form="disable-form"
            className="btn bg-[#B42318] text-white hover:bg-[#931B12] hover:text-white flex-1 sm:flex-none"
            disabled={busy || !reason.trim()}
          >
            {busy ? t('Отключаем…') : t('Отключить')}
          </button>
          <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={onClose} disabled={busy}>
            {t('Отмена')}
          </button>
        </>
      }
    >
      <section className="tile">
        <h3 className="overtitle mb-1.5">{t('Что произойдёт')}</h3>
        <ul className="flex flex-col gap-1.5 text-sm leading-5 text-ink list-disc pl-5">
          <li>{t('Все сессии завершатся сразу — панель закроется на всех устройствах')}</li>
          <li>{t('Войти не получится, пока суперадмин снова не включит доступ')}</li>
          <li>{t('Решения сотрудника останутся в журнале и в истории мечетей, сборов и отчётов')}</li>
          <li>{t('Очереди не пострадают: заявки, сборы и отчёты разберут другие модераторы')}</li>
        </ul>
      </section>
      <form id="disable-form" onSubmit={submit}>
        <label htmlFor="disable-reason" className="label">
          {t('Причина — её увидят суперадмины в журнале')} <span className="caption">{t('(обязательно)')}</span>
        </label>
        <textarea
          id="disable-reason"
          className="input resize-y min-h-[96px] py-3"
          required
          maxLength={REASON_MAX}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-describedby="disable-reason-count"
          placeholder={t('Например: переходит в другой отдел Комитета')}
        />
        <p id="disable-reason-count" className="caption mt-1.5 flex justify-between gap-3">
          <span>{t('Без причины доступ не отключится')}</span>
          <span className="tabular">
            {reason.length} / {REASON_MAX}
          </span>
        </p>
      </form>
      <ErrorLine text={error} />
    </Dialog>
  );
}

/* ---------- Сброс пароля / новая ссылка ---------- */

function ResetDialog({
  target,
  onClose,
  onDone,
}: {
  target: Staff | null;
  onClose: () => void;
  onDone: (r: Omit<LinkResult, 'kind'>, kind: LinkResult['kind']) => void;
}) {
  const { call } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { t } = useI18n();
  useEffect(() => setError(''), [target]);
  if (!target) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>;

  const reset = target.status === 'active';
  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await call<Omit<LinkResult, 'kind'>>(`/admin/staff/${target.id}/link`, { method: 'POST', body: {} });
      onDone(res, reset ? 'reset' : 'reinvite');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось создать ссылку');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(reset ? 'Сбросить пароль?' : 'Создать новую ссылку?')}
      sub={`${target.full_name} · ${target.email}`}
      footer={
        <>
          <button type="button" className="btn btn-primary flex-1 sm:flex-none" onClick={confirm} disabled={busy}>
            {busy ? t('Создаём…') : t(reset ? 'Сбросить пароль' : 'Создать ссылку')}
          </button>
          <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={onClose} disabled={busy}>
            {t('Отмена')}
          </button>
        </>
      }
    >
      <div className={`infobox ${reset ? 'bg-[#FDF0DC] text-[#A35A00]' : ''}`}>
        {reset ? <IconAlert size={18} className="shrink-0 mt-px" /> : <IconInfo size={18} className="shrink-0 mt-px" />}
        <span>
          {t(
            reset
              ? 'Старый пароль сразу перестанет работать, а панель закроется на всех устройствах сотрудника. Он задаст новый пароль по ссылке, которую вы ему передадите.'
              : 'Прежняя ссылка-приглашение перестанет работать. Новая действует 72 часа.',
          )}
        </span>
      </div>
      <ErrorLine text={error} />
    </Dialog>
  );
}
