'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Logo from './Logo';
import { IconHeart, IconHome, IconLandmark, IconUser } from './icons';

/** Веб: сегментированное меню-пилюля в белой шапке 64px. */
const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/mosques', label: 'Мечети' },
  { href: '/campaigns', label: 'Сборы' },
  { href: '/about', label: 'О проекте' },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}

export default function Header() {
  const pathname = usePathname() ?? '/';
  const { user, ready } = useAuth();
  const signedIn = ready && !!user;

  const tabs = [
    { href: '/', label: 'Главная', icon: IconHome, active: pathname === '/' },
    { href: '/mosques', label: 'Мечети', icon: IconLandmark, active: isActive(pathname, '/mosques') },
    { href: '/campaigns', label: 'Сборы', icon: IconHeart, active: isActive(pathname, '/campaigns') },
    {
      href: signedIn ? '/profile' : '/login',
      label: signedIn ? 'Профиль' : 'Войти',
      icon: IconUser,
      active: ['/profile', '/login', '/register', '/cabinet'].some((p) => isActive(pathname, p)),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white">
        <div className="max-w-[1240px] mx-auto h-14 lg:h-16 px-4 lg:px-8 flex items-center justify-between gap-4">
          <Logo />

          <nav aria-label="Основное меню" className="hidden lg:flex segmented !flex-none">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(pathname, n.href) ? 'page' : undefined}
                className="!px-[18px] hover:text-accent-700"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/contact"
              className="hidden lg:inline-flex btn btn-secondary min-h-[44px] px-4"
            >
              Контакты
            </Link>
            <Link
              href={signedIn ? '/profile' : '/login'}
              className="btn btn-secondary min-h-[44px] px-[18px]"
            >
              {signedIn ? 'Мои добрые дела' : 'Войти'}
            </Link>
          </div>
        </div>
      </header>

      {/* Телефон: нижняя панель вкладок */}
      <nav
        aria-label="Разделы"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white flex px-2 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))] shadow-lg"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.label}
              href={t.href}
              aria-current={t.active ? 'page' : undefined}
              className={`flex-1 min-h-[52px] flex flex-col items-center justify-center gap-[3px] ${
                t.active ? 'text-accent-700 hover:text-accent-700' : 'text-muted hover:text-ink'
              }`}
            >
              <span
                className={`w-[52px] h-[30px] rounded-full flex items-center justify-center ${
                  t.active ? 'bg-accent-100' : ''
                }`}
              >
                <Icon />
              </span>
              <span className="text-[11px] leading-[15px] font-medium">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
