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

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; admin: Admin }>('/admin/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    store(TOKEN_KEY, res.token);
    store(ADMIN_KEY, JSON.stringify(res.admin));
    setToken(res.token);
    setAdmin(res.admin);
  }, []);

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

  const value = useMemo(() => ({ admin, token, ready, login, logout, call }), [admin, token, ready, login, logout, call]);
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

export const canModerate = (a: Admin | null) => a?.role === 'superadmin' || a?.role === 'moderator';
export const canBlock = (a: Admin | null) => a?.role === 'superadmin';
