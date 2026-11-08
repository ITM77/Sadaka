'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ComponentType, ReactNode, useEffect } from 'react';
import Logo from '@/components/Logo';
import { IconClock, IconHandHeart, IconHome, IconLandmark, IconLogout, IconReport, IconUsers } from '@/components/icons';
import { AdminAuthProvider, canManageStaff, ROLE_LABELS, useAdmin } from '@/lib/adminAuth';
import { AdminStats, AdminStatsProvider, useAdminStats } from './AdminStats';

type NavItem = {
  href: string;
  label: string;
  /** Подпись в нижней панели телефона, если полная не помещается. */
  short?: string;
  icon: ComponentType<{ size?: number }>;
  count?: (s: AdminStats) => number;
  /** Только суперадмину: остальным пункт не показываем, а по прямой ссылке — «Нет прав». */
  superOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Сводка', icon: IconHome },
  { href: '/admin/mosques', label: 'Мечети', icon: IconLandmark, count: (s) => s.mosques_pending },
  { href: '/admin/campaigns', label: 'Кампании', icon: IconHandHeart, count: (s) => s.campaigns_pending },
  { href: '/admin/reports', label: 'Отчёты', icon: IconReport, count: (s) => s.reports_pending },
  { href: '/admin/staff', label: 'Сотрудники', short: 'Команда', icon: IconUsers, superOnly: true },
  { href: '/admin/audit', label: 'Журнал', icon: IconClock, superOnly: true },
];

/** Страницы без меню и без входа: вход и приглашение. */
const isPublicPath = (p: string) => p === '/admin/login' || p.startsWith('/admin/invite/');

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
  const isLogin = isPublicPath(pathname);

  useEffect(() => {
    if (ready && !admin && !isLogin) router.replace('/admin/login');
  }, [ready, admin, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!ready || !admin) return <div className="min-h-screen bg-app" aria-busy="true" />;

  return (
    <AdminStatsProvider>
      <div className="min-h-screen bg-app text-ink">
        <TopBar />
        <main className="page">{children}</main>
        <TabBar />
      </div>
    </AdminStatsProvider>
  );
}

function useNav() {
  const pathname = usePathname();
  const { stats } = useAdminStats();
  const { admin } = useAdmin();
  return NAV.filter((n) => !n.superOnly || canManageStaff(admin)).map((n) => ({
    ...n,
    active: n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href),
    pending: stats && n.count ? n.count(stats) : 0,
  }));
}

/** Белая шапка 64px как в 9c: логотип, сегментированное меню, справа — сотрудник и «Выйти». */
function TopBar() {
  const { admin, logout } = useAdmin();
  const router = useRouter();
  const nav = useNav();
  if (!admin) return null;

  return (
    <header className="bg-white lg:sticky lg:top-0 z-40">
      <div className="container-custom h-16 flex items-center justify-between gap-3">
        <div className="min-w-0 shrink">
          <Logo href="/admin" subtitle="Панель Комитета улемов" />
        </div>

        <nav aria-label="Разделы" className="segmented hidden lg:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={n.active ? 'page' : undefined}
              className="flex-none gap-2 px-3 xl:px-[18px] hover:text-accent-700"
            >
              {n.label}
              {n.pending > 0 && (
                <span className="badge badge-warning min-w-[24px] justify-center tabular">
                  {n.pending}
                  <span className="sr-only"> ждут решения</span>
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex lg:hidden xl:flex flex-col items-end text-right">
            <span className="text-sm leading-5 font-medium text-ink max-w-[200px] truncate">{admin.full_name}</span>
            <span className="caption">{ROLE_LABELS[admin.role]}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary min-h-[44px] px-4 md:px-[18px]"
            onClick={() => {
              logout();
              router.replace('/admin/login');
            }}
          >
            <IconLogout size={18} />
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}

/** Нижняя панель вкладок на телефоне и планшете (как таббар мобильного макета). */
function TabBar() {
  const nav = useNav();
  return (
    <nav
      aria-label="Разделы"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white flex px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))]"
    >
      {nav.map((n) => {
        const Icon = n.icon;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={n.active ? 'page' : undefined}
            className={`flex-1 min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-[3px] ${
              n.active ? 'text-accent-700 hover:text-accent-700' : 'text-muted hover:text-ink'
            }`}
          >
            <span
              className={`relative w-[52px] h-[30px] rounded-full flex items-center justify-center ${
                n.active ? 'bg-accent-100' : ''
              }`}
            >
              <Icon size={20} />
              {n.pending > 0 && (
                <span className="absolute -top-1 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FDF0DC] text-[#A35A00] text-[11px] leading-[18px] font-semibold text-center tabular">
                  {n.pending}
                  <span className="sr-only"> ждут решения</span>
                </span>
              )}
            </span>
            <span className="text-[11px] leading-[15px] font-medium truncate max-w-full">
              {n.short ? (
                <>
                  <span aria-hidden="true">{n.short}</span>
                  <span className="sr-only">{n.label}</span>
                </>
              ) : (
                n.label
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
