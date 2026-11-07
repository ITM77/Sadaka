'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MosqueCabinetData } from '@/lib/cabinet';

/** Мечеть владельца с кампаниями и отчётами. notFound — чужая или нет такой. */
export function useMosqueCabinet(mosqueId: string) {
  const { token } = useAuth();
  const [data, setData] = useState<MosqueCabinetData | null>(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      setData(await apiFetch<MosqueCabinetData>(`/me/mosques/${encodeURIComponent(mosqueId)}/campaigns`, { token }));
      setError('');
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setNotFound(true);
      else setError(e instanceof ApiError ? e.message : 'Не удалось загрузить данные');
    }
  }, [mosqueId, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, notFound, reload, token };
}
