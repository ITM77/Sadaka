'use client';

import { usePathname } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAdmin } from '@/lib/adminAuth';

/** Ответ GET /admin/dashboard. */
export type AdminStats = {
  mosques_approved: number;
  mosques_pending: number;
  mosques_blocked: number;
  campaigns_active: number;
  campaigns_pending: number;
  reports_pending: number;
  campaigns_without_report: number;
  users: number;
  donations: number;
  donations_total: number;
  savob_distributed: number;
  /** Самая старая заявка в каждой очереди — для «самая старая — 12 дн.». */
  oldest_mosque_pending?: string | null;
  oldest_campaign_pending?: string | null;
  oldest_report_pending?: string | null;
  /** «Нужен контроль»: завершённые сборы без поданного или принятого отчёта. */
  unreported?: UnreportedItem[];
};

export type UnreportedItem = {
  mosque_id: string;
  mosque_name: string;
  city: string;
  campaign_id: string;
  campaign_title: string;
  completed_at: string | null;
  report_status: '' | 'rejected';
  report_updated: string | null;
  pending_new: boolean;
};

type State = { stats: AdminStats | null; error: string; refresh: () => void };

const Ctx = createContext<State>({ stats: null, error: '', refresh: () => {} });

/** Сводка нужна и дашборду, и счётчикам очередей в навигации — грузим один раз на переход. */
export function AdminStatsProvider({ children }: { children: ReactNode }) {
  const { call } = useAdmin();
  const pathname = usePathname();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    call<AdminStats>('/admin/dashboard')
      .then((s) => {
        setStats(s);
        setError('');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить сводку'));
  }, [call]);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  const value = useMemo(() => ({ stats, error, refresh }), [stats, error, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAdminStats = () => useContext(Ctx);
