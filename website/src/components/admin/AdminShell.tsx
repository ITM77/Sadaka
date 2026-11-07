'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { LogoMark } from '@/components/Logo';
import { IconLogout } from '@/components/icons';
import { AdminAuthProvider, ROLE_LABELS, useAdmin } from '@/lib/adminAuth';
import { AdminStats, AdminStatsProvider, useAdminStats } from './AdminStats';

const NAV: { href: string; label: string; count?: (s: AdminStats) => number }[] = [
  { href: '/admin', label: 'Сводка' },
  { href: '/admin/mosques', label: 'Мечети', count: (s) => s.mosques_pending },
  { href: '/admin/campaigns', label: 'Кампании', count: (s) => s.campaigns_pending },
  { href: '/admin/reports', label: 'Отчёты', count: (s) => s.reports_pending },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <Guard>{children}</Guard>
    </AdminAuthProvider>
  );
}

function Guard({ children }: { children: ReactNode }) {
  const { admin, ready } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (ready && !admin && !isLogin) router.replace('/admin/login');
  }, [ready, admin, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!ready || !admin) return <div className="min-h-screen bg-[#F2F0EA]" aria-busy="true" />;

  return (
    <AdminStatsProvider>
      <div className="min-h-screen bg-[#F2F0EA] text-ink">
        <TopBar />
        <AdminNav />
        <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-7 pb-16 sm:pt-9 sm:pb-[72px]">{children}</main>
      </div>
    </AdminStatsProvider>
  );
}

function TopBar() {
  const { admin, logout } = useAdmin();
  const router = useRouter();
  if (!admin) return null;

  return (
    <header className="surface-night">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 min-h-[64px] py-2 flex items-center justify-between gap-3">
        <Link href="/admin" className="inline-flex items-center gap-2.5 text-paper hover:text-paper min-w-0">
          <LogoMark size={30} onDark />
          <span className="flex flex-col leading-[1.15] min-w-0">
            <strong className="text-[17px] font-bold">Комитет улемов</strong>
            <span className="text-xs text-[#9FB0AC]">Садака · панель надзора</span>
          </span>
        </Link>
        <div className="flex items-center gap-3.5 text-sm shrink-0">
          <span className="hidden sm:inline text-mist">
            <span className="hidden md:inline">{admin.full_name} · </span>
            <span className="text-gold">{ROLE_LABELS[admin.role]}</span>
          </span>
          <button
            type="button"
            className="btn btn-on-dark btn-sm h-11 sm:h-10 px-3.5"
            onClick={() => {
              logout();
              router.replace('/admin/login');
            }}
          >
            <IconLogout size={18} className="sm:hidden" />
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}

function AdminNav() {
  const pathname = usePathname();
  const { stats } = useAdminStats();

  return (
    <nav aria-label="Разделы" className="sticky top-0 z-40 bg-white border-b border-line">
      <div className="max-w-[1200px] mx-auto px-2 sm:px-8 flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {NAV.map((n) => {
          const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
          const count = stats && n.count ? n.count(stats) : 0;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center gap-2 h-12 px-3 sm:px-3.5 text-[15px] whitespace-nowrap border-b-2 transition-colors focus-visible:outline-offset-[-2px] ${
                active
                  ? 'border-primary-600 text-primary-700 font-bold'
                  : 'border-transparent text-dark-700 font-medium hover:text-primary-700'
              }`}
            >
              {n.label}
              {count > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FBF1DC] text-[#7A4B00] text-xs font-bold inline-flex items-center justify-center">
                  {count}
                  <span className="sr-only"> ждут решения</span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
