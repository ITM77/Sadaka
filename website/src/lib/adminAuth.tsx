'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from './api';

// Сессия сотрудника Комитета улемов живёт в httpOnly-cookie: скрипты страницы её
// не видят, поэтому внедрённый код не украдёт вход в панель. Браузер сам
// прикладывает cookie к запросам /api/v1/admin/*.

/** Обязательный заголовок для запросов панели: защита от подделки запроса с чужого сайта. */
export const ADMIN_HEADERS = { 'X-Sadaka-Admin': '1' };

// Раньше токен лежал в localStorage — подчищаем у тех, кто входил до перехода на cookie.
const LEGACY_KEYS = ['sadaka_admin_token', 'sadaka_admin'];

export type AdminRole = 'superadmin' | 'moderator' | 'analyst';
export type Admin = { id: string; email: string; full_name: string; role: AdminRole };

type State = {
  admin: Admin | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Сервер уже выдал cookie (сотрудник задал пароль по приглашению) — запоминаем профиль. */
  startSession: (admin: Admin) => void;
  logout: () => void;
  /** Запрос к API панели: заголовок защиты и выход на страницу входа при 401. */
  call: <T>(path: string, opts?: { method?: string; body?: unknown }) => Promise<T>;
};

const Ctx = createContext<State | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [ready, setReady] = useState(false);

  // Есть ли действующая сессия, какая сейчас роль и не отключён ли доступ — спрашиваем сервер.
  useEffect(() => {
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* приватный режим */
    }
    let alive = true;
    apiFetch<{ admin: Admin }>('/admin/me', { headers: ADMIN_HEADERS })
      .then((res) => alive && setAdmin(res.admin))
      .catch(() => alive && setAdmin(null))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const logout = useCallback(() => {
    setAdmin(null);
    apiFetch('/admin/auth/logout', { method: 'POST' }).catch(() => {
      /* cookie всё равно истечёт */
    });
  }, []);

  const startSession = useCallback((a: Admin) => setAdmin(a), []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ admin: Admin }>('/admin/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setAdmin(res.admin);
  }, []);

  const call = useCallback(async <T,>(path: string, opts: { method?: string; body?: unknown } = {}) => {
    try {
      return await apiFetch<T>(path, { ...opts, headers: ADMIN_HEADERS });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAdmin(null); // сессия истекла или доступ отключён
      throw e;
    }
  }, []);

  const value = useMemo(
    () => ({ admin, ready, login, startSession, logout, call }),
    [admin, ready, login, startSession, logout, call],
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
  superadmin: 'Всё, что модератор, плюс блокировка мечетей, сотрудники, журнал и режим Савоб',
  moderator: 'Одобряет и отклоняет заявки мечетей, сборы и отчёты',
  analyst: 'Только смотрит сводку, аналитику, очереди и реестры — решений не принимает',
};

/** Права по отдельности: при смене роли видно, что добавится и что уберётся. */
export const PERMISSIONS: { label: string; roles: AdminRole[] }[] = [
  { label: 'Видеть сводку, аналитику, очереди и реестры', roles: ['superadmin', 'moderator', 'analyst'] },
  { label: 'Одобрять и отклонять заявки мечетей', roles: ['superadmin', 'moderator'] },
  { label: 'Одобрять и отклонять сборы', roles: ['superadmin', 'moderator'] },
  { label: 'Принимать и отклонять отчёты', roles: ['superadmin', 'moderator'] },
  { label: 'Смотреть общий список нуждающихся', roles: ['superadmin', 'moderator'] },
  { label: 'Блокировать мечети и снимать блокировку', roles: ['superadmin'] },
  { label: 'Управлять сотрудниками и смотреть журнал', roles: ['superadmin'] },
  { label: 'Включать праздничный режим Савоб', roles: ['superadmin'] },
];

export const canModerate = (a: Admin | null) => a?.role === 'superadmin' || a?.role === 'moderator';
export const canBlock = (a: Admin | null) => a?.role === 'superadmin';
export const canManageStaff = (a: Admin | null) => a?.role === 'superadmin';
