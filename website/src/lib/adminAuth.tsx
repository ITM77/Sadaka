'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from './api';

// Сессия сотрудника Комитета улемов. Хранится отдельно от входа жертвователя.
const TOKEN_KEY = 'sadaka_admin_token';
const ADMIN_KEY = 'sadaka_admin';

export type AdminRole = 'superadmin' | 'moderator' | 'analyst';
export type Admin = { id: string; email: string; full_name: string; role: AdminRole };

type State = {
  admin: Admin | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Вход готовым токеном — после того как сотрудник задал пароль по приглашению. */
  startSession: (token: string, admin: Admin) => void;
  logout: () => void;
  /** Обёртка над apiFetch: подставляет токен и выкидывает на вход при 401. */
  call: <T>(path: string, opts?: { method?: string; body?: unknown }) => Promise<T>;
};

const Ctx = createContext<State | null>(null);

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* приватный режим */
  }
}

function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = load(TOKEN_KEY);
    const a = load(ADMIN_KEY);
    if (t && a) {
      try {
        setAdmin(JSON.parse(a));
        setToken(t);
      } catch {
        store(TOKEN_KEY, null);
        store(ADMIN_KEY, null);
      }
    }
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    store(TOKEN_KEY, null);
    store(ADMIN_KEY, null);
    setToken(null);
    setAdmin(null);
  }, []);

  const startSession = useCallback((t: string, a: Admin) => {
    store(TOKEN_KEY, t);
    store(ADMIN_KEY, JSON.stringify(a));
    setToken(t);
    setAdmin(a);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ token: string; admin: Admin }>('/admin/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      startSession(res.token, res.admin);
    },
    [startSession],
  );

  // Роль могла смениться, а доступ — отключиться: сверяемся с сервером при открытии панели.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    apiFetch<{ admin: Admin }>('/admin/me', { token })
      .then((res) => {
        if (!alive) return;
        store(ADMIN_KEY, JSON.stringify(res.admin));
        setAdmin(res.admin);
      })
      .catch((e) => {
        if (alive && e instanceof ApiError && e.status === 401) logout();
      });
    return () => {
      alive = false;
    };
  }, [token, logout]);

  const call = useCallback(
    async <T,>(path: string, opts: { method?: string; body?: unknown } = {}) => {
      try {
        return await apiFetch<T>(path, { ...opts, token });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) logout(); // токен истёк
        throw e;
      }
    },
    [token, logout],
  );

  const value = useMemo(
    () => ({ admin, token, ready, login, startSession, logout, call }),
    [admin, token, ready, login, startSession, logout, call],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdmin вне AdminAuthProvider');
  return ctx;
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: 'Суперадмин',
  moderator: 'Модератор',
  analyst: 'Аналитик',
};

/** Что даёт роль — для приглашения и подтверждения смены роли. */
export const ROLE_RIGHTS: Record<AdminRole, string> = {
  superadmin: 'Всё, что модератор, плюс блокировка мечетей, сотрудники и журнал',
  moderator: 'Одобряет и отклоняет заявки мечетей, сборы и отчёты',
  analyst: 'Только смотрит сводку, очереди и реестры — решений не принимает',
};

/** Права по отдельности: при смене роли видно, что добавится и что уберётся. */
export const PERMISSIONS: { label: string; roles: AdminRole[] }[] = [
  { label: 'Видеть сводку, очереди и реестры', roles: ['superadmin', 'moderator', 'analyst'] },
  { label: 'Одобрять и отклонять заявки мечетей', roles: ['superadmin', 'moderator'] },
  { label: 'Одобрять и отклонять сборы', roles: ['superadmin', 'moderator'] },
  { label: 'Принимать и отклонять отчёты', roles: ['superadmin', 'moderator'] },
  { label: 'Блокировать мечети и снимать блокировку', roles: ['superadmin'] },
  { label: 'Управлять сотрудниками и смотреть журнал', roles: ['superadmin'] },
];

export const canModerate = (a: Admin | null) => a?.role === 'superadmin' || a?.role === 'moderator';
export const canBlock = (a: Admin | null) => a?.role === 'superadmin';
export const canManageStaff = (a: Admin | null) => a?.role === 'superadmin';
