'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAdmin } from '@/lib/adminAuth';

/** Загрузка списка из /admin/* с перезагрузкой после модерации. */
export function useAdminList<T>(path: string, key: string) {
  const { call } = useAdmin();
  const [items, setItems] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const res = await call<Record<string, unknown> & { total: number }>(path);
      setItems((res[key] as T[]) ?? []);
      setTotal(res.total);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось загрузить данные');
    }
  }, [call, path, key]);

  useEffect(() => {
    setItems(null);
    reload();
  }, [reload]);

  return { items, total, error, reload, call };
}
