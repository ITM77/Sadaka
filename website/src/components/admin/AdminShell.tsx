'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ComponentType, ReactNode, Suspense, useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import {
  IconClock,
  IconHandHeart,
  IconHome,
  IconLandmark,
  IconLogout,
  IconMenu,
  IconReport,
  IconShield,
  IconUsers,
} from '@/components/icons';
import { initials } from '@/lib/api';
import { LangSwitch, useI18n } from '@/lib/i18n/client';
import { AdminAuthProvider, canManageStaff, ROLE_LABELS, useAdmin } from '@/lib/adminAuth';
import { AdminStats, AdminStatsProvider, useAdminStats } from './AdminStats';
import Dialog from './Dialog';

/**
 * Каркас панели по макету 12b: на вебе — белое меню слева (248 px) с группами
 * «Работа», «Очередь проверки», «Реестр», «Управление» и карточкой сотрудника внизу;
 * на телефоне и планшете — шапка и нижняя панель вкладок с пунктом «Ещё».
 */

type NavItem = {
  key: string;
  href: string;
  label: string;
  short?: string;
  icon?: ComponentType<{ size?: number }>;
  count?: (s: AdminStats) => number;
  superOnly?: boolean;
  /** Активен ли пункт для текущего адреса. */
  match: (path: string, status: string | null) => boolean;
};

type NavGroup = { title?: string; icon?: ComponentType<{ size?: number }>; sub?: boolean; items: NavItem[] };

const isQueue = (status: string | null, queue: string) => status === null || status === queue;

const NAV: NavGroup[] = [
  {
    title: 'Работа',
    items: [{ key: 'home', href: '/admin', label: 'Сводка', icon: IconHome, match: (p) => p === '/admin' }],
  },
  {
    title: 'Очередь проверки',
    icon: IconShield,
    sub: true,
    items: [
      {
        key: 'q-mosques',
        href: '/admin/mosques',
        label: 'Заявки мечетей',
        short: 'Заявки',
        icon: IconLandmark,
        count: (s) => s.mosques_pending,
        match: (p, st) => p === '/admin/mosques' && isQueue(st, 'pending'),
      },
      {
        key: 'q-campaigns',
        href: '/admin/campaigns',
        label: 'Сборы',
        icon: IconHandHeart,
        count: (s) => s.campaigns_pending,
        match: (p, st) => p === '/admin/campaigns' && isQueue(st, 'pending_approval'),
      },
      {
        key: 'q-reports',
        href: '/admin/reports',
        label: 'Отчёты',
        icon: IconReport,
        count: (s) => s.reports_pending,
        match: (p, st) => p === '/admin/reports' && isQueue(st, 'submitted'),
      },
    ],
  },
  {
    title: 'Реестр',
    items: [
      {
        key: 'r-mosques',
        href: '/admin/registry',
        label: 'Мечети',
        icon: IconLandmark,
        match: (p, st) => p === '/admin/registry' || (p === '/admin/mosques' && !isQueue(st, 'pending')),
      },
      {
        key: 'r-campaigns',
        href: '/admin/campaigns?status=',
        label: 'Сборы',
        icon: IconHandHeart,
        match: (p, st) => p === '/admin/campaigns' && !isQueue(st, 'pending_approval'),
      },
      {
        key: 'r-reports',
        href: '/admin/reports?status=',
        label: 'Отчёты',
        icon: IconReport,
        match: (p, st) => p === '/admin/reports' && !isQueue(st, 'submitted'),
      },
    ],
  },
  {
    title: 'Управление',
    items: [
      { key: 'staff', href: '/admin/staff', label: 'Сотрудники', icon: IconUsers, superOnly: true, match: (p) => p === '/admin/staff' },
      { key: 'audit', href: '/admin/audit', label: 'Журнал действий', short: 'Журнал', icon: IconClock, superOnly: true, match: (p) => p === '/admin/audit' },
    ],
  },
];

/** Вкладки нижней панели телефона; остальное — в «Ещё». */
const TAB_KEYS = ['home', 'q-mosques', 'q-campaigns', 'q-reports'];

/** Страницы без меню и без входа: вход и приглашение. */
const isPublicPath = (p: string) => p === '/admin/login' || p === '/admin/invite';

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
      <div className="min-h-screen bg-app text-ink lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <Suspense fallback={<aside className="hidden lg:block bg-white" />}>
          <SideBar />
        </Suspense>
        <div className="min-w-0 flex flex-col">
          <MobileTop />
          <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-5 pt-4 md:pt-5 lg:pt-0 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-6">
            {children}
          </main>
        </div>
        <Suspense fallback={null}>
          <TabBar />
        </Suspense>
      </div>
    </AdminStatsProvider>
  );
}

function useNav() {
  const pathname = usePathname();
  const status = useSearchParams().get('status');
  const { stats } = useAdminStats();
  const { admin } = useAdmin();
  return NAV.map((g) => ({
    ...g,
    items: g.items
      .filter((n) => !n.superOnly || canManageStaff(admin))
      .map((n) => ({ ...n, active: n.match(pathname, status), pending: stats && n.count ? n.count(stats) : 0 })),
  })).filter((g) => g.items.length > 0);
}

function Count({ n }: { n: number }) {
  const { t } = useI18n();
  if (n <= 0) return null;
  return (
    <span className="ml-auto min-w-[24px] h-[22px] px-[7px] rounded-full bg-[#FDF0DC] text-[#A35A00] text-xs font-semibold tabular inline-flex items-center justify-center">
      {n}
      <span className="sr-only"> {t('ждут решения')}</span>
    </span>
  );
}

/** Веб: меню слева, как в 12b. */
function SideBar() {
  const nav = useNav();
  const { t } = useI18n();
  return (
    <aside className="hidden lg:flex flex-col bg-white px-3 py-4 sticky top-0 h-screen overflow-y-auto" aria-label={t('Меню панели')}>
      <div className="px-2">
        <Logo href="/admin" subtitle="Комитет улемов" />
      </div>
      <nav aria-label={t('Разделы панели')} className="flex flex-col gap-0.5 mt-2">
        {nav.map((g) => (
          <div key={g.title} className="flex flex-col gap-0.5">
            {g.sub ? (
              <p className="flex items-center gap-2.5 min-h-[36px] px-3 mt-1 text-sm font-medium text-ink">
                {g.icon && <g.icon size={18} />}
                {t(g.title ?? '')}
              </p>
            ) : (
              <p className="px-3 pt-3.5 pb-1.5 text-[11px] leading-[15px] font-medium uppercase tracking-[.04em] text-sec">{t(g.title ?? '')}</p>
            )}
            {g.items.map((n) => {
              const Icon = n.icon;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  aria-current={n.active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 min-h-[40px] rounded-full text-sm font-medium transition-colors ${
                    g.sub ? 'pl-10 pr-3' : 'px-3'
                  } ${n.active ? 'bg-accent-100 text-accent-700 hover:text-accent-700' : 'text-ink hover:bg-app hover:text-ink'}`}
                >
                  {!g.sub && Icon && <Icon size={18} />}
                  <span className="min-w-0 truncate">{t(n.label)}</span>
                  <Count n={n.pending} />
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <MeCard />
    </aside>
  );
}

function MeCard() {
  const { admin, logout } = useAdmin();
  const { t } = useI18n();
  const router = useRouter();
  if (!admin) return null;
  return (
    <div className="mt-auto pt-4 flex flex-col gap-3">
      <LangSwitch className="self-start ml-1" />
      <div className="rounded-tile bg-app p-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span aria-hidden="true" className="w-9 h-9 rounded-full bg-white text-sec flex items-center justify-center text-[13px] font-semibold shrink-0">
            {initials(admin.full_name)}
          </span>
          <span className="min-w-0 flex flex-col items-start gap-1">
            <span className="text-sm leading-5 font-medium text-ink max-w-full truncate">{admin.full_name}</span>
            <span className="badge badge-sec">{t(ROLE_LABELS[admin.role])}</span>
          </span>
        </div>
        <button
          type="button"
          className="btn btn-white btn-sm w-full hover:bg-accent-100 hover:text-accent-700"
          onClick={() => {
            logout();
            router.replace('/admin/login');
          }}
        >
          <IconLogout size={18} />
          {t('Выйти')}
        </button>
      </div>
    </div>
  );
}

/** Телефон и планшет: шапка с логотипом, языком и ролью. */
function MobileTop() {
  const { admin } = useAdmin();
  const { t } = useI18n();
  if (!admin) return null;
  return (
    <header className="lg:hidden bg-white">
      <div className="h-16 px-4 md:px-5 flex items-center justify-between gap-2 sm:gap-3">
        <div className="min-w-0 shrink overflow-hidden">
          <Logo href="/admin" subtitle="Комитет улемов" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LangSwitch />
          <span className="badge badge-sec hidden min-[360px]:inline-flex">{t(ROLE_LABELS[admin.role])}</span>
        </div>
      </div>
    </header>
  );
}

/** Нижняя панель вкладок: Сводка, три очереди и «Ещё» с реестром, управлением и выходом. */
function TabBar() {
  const nav = useNav();
  const all = nav.flatMap((g) => g.items);
  const tabs = TAB_KEYS.map((k) => all.find((n) => n.key === k)!).filter(Boolean);
  const rest = nav
    .map((g) => ({ ...g, items: g.items.filter((n) => !TAB_KEYS.includes(n.key)) }))
    .filter((g) => g.items.length > 0);
  const restActive = rest.some((g) => g.items.some((n) => n.active));
  const [more, setMore] = useState(false);
  const pathname = usePathname();
  const { admin, logout } = useAdmin();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => setMore(false), [pathname]);

  const tab = (active: boolean) =>
    `flex-1 min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-[3px] ${
      active ? 'text-accent-700 hover:text-accent-700' : 'text-muted hover:text-ink'
    }`;
  const pill = (active: boolean) =>
    `relative w-[52px] h-[30px] rounded-full flex items-center justify-center ${active ? 'bg-accent-100' : ''}`;

  return (
    <>
      <nav
        aria-label={t('Разделы')}
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white flex px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-1px_0_#EFF1F5]"
      >
        {tabs.map((n) => {
          const Icon = n.icon!;
          return (
            <Link key={n.key} href={n.href} aria-current={n.active ? 'page' : undefined} className={tab(n.active)}>
              <span className={pill(n.active)}>
                <Icon size={20} />
                {n.pending > 0 && (
                  <span className="absolute -top-1 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FDF0DC] text-[#A35A00] text-[11px] leading-[18px] font-semibold text-center tabular">
                    {n.pending}
                    <span className="sr-only"> {t('ждут решения')}</span>
                  </span>
                )}
              </span>
              <span className="text-[11px] leading-[15px] font-medium truncate max-w-full">{t(n.short ?? n.label)}</span>
            </Link>
          );
        })}
        <button type="button" className={tab(restActive)} onClick={() => setMore(true)} aria-haspopup="dialog">
          <span className={pill(restActive)}>
            <IconMenu size={20} />
          </span>
          <span className="text-[11px] leading-[15px] font-medium">{t('Ещё')}</span>
        </button>
      </nav>

      <Dialog open={more} onClose={() => setMore(false)} title={t('Разделы панели')} sub={admin ? `${admin.full_name} · ${t(ROLE_LABELS[admin.role])}` : undefined}>
        {rest.map((g) => (
          <section key={g.title}>
            <h3 className="overtitle mb-1.5">{t(g.title ?? '')}</h3>
            <ul className="flex flex-col gap-1">
              {g.items.map((n) => {
                const Icon = n.icon;
                return (
                  <li key={n.key}>
                    <Link
                      href={n.href}
                      aria-current={n.active ? 'page' : undefined}
                      onClick={() => setMore(false)}
                      className={`flex items-center gap-3 min-h-[48px] px-3.5 rounded-tile font-medium ${
                        n.active ? 'bg-accent-100 text-accent-700 hover:text-accent-700' : 'bg-app text-ink hover:text-ink'
                      }`}
                    >
                      {Icon && <Icon size={20} />}
                      {t(n.label)}
                      <Count n={n.pending} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={() => {
            logout();
            router.replace('/admin/login');
          }}
        >
          <IconLogout size={18} />
          {t('Выйти')}
        </button>
      </Dialog>
    </>
  );
}
