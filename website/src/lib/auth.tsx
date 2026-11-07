'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, User } from './api';

const TOKEN_KEY = 'sadaka_token';

type AuthState = {
  user: User | null;
  token: string | null;
  ready: boolean; // false, пока не проверили сохранённый токен
  login: (phone: string, password: string) => Promise<void>;
  register: (fullName: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* приватный режим — токен живёт до перезагрузки */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readToken();
    if (!saved) {
      setReady(true);
      return;
    }
    apiFetch<{ user: User }>('/me', { token: saved })
      .then(({ user }) => {
        setToken(saved);
        setUser(user);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) writeToken(null);
      })
      .finally(() => setReady(true));
  }, []);

  const accept = useCallback((data: { token: string; user: User }) => {
    writeToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (phone: string, password: string) => {
      accept(await apiFetch('/auth/login', { method: 'POST', body: { phone_number: phone, password } }));
    },
    [accept],
  );

  const register = useCallback(
    async (fullName: string, phone: string, password: string) => {
      accept(
        await apiFetch('/auth/register', {
          method: 'POST',
          body: { full_name: fullName, phone_number: phone, password, language: 'ru' },
        }),
      );
    },
    [accept],
  );

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, ready, login, register, logout }),
    [user, token, ready, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
