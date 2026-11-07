'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/api';
import Logo from './Logo';
import { IconChevronRight, IconClose, IconMenu } from './icons';

const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/campaigns', label: 'Сборы' },
  { href: '/mosques', label: 'Мечети' },
  { href: '/about', label: 'О проекте' },
  { href: '/contact', label: 'Контакты' },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}

export default function Header() {
  const pathname = usePathname() ?? '/';
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const signedIn = ready && !!user;

  // Закрываем меню при переходе и по Escape
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-line">
      <div className="container-custom flex items-center gap-2 md:gap-8 min-h-16 md:min-h-20 pr-3 sm:pr-8">
        <div className="mr-auto">
          <Logo />
        </div>

        <nav aria-label="Основное меню" className="hidden lg:flex items-center gap-1 flex-1">
          {NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center h-11 px-3.5 rounded-[10px] text-[15px] transition-colors ${
                  active
                    ? 'bg-mint text-primary-700 font-semibold'
                    : 'text-dark-700 font-medium hover:bg-paper hover:text-ink'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          {signedIn ? (
            <Link
              href="/profile"
              className="hidden lg:inline-flex items-center gap-2.5 h-11 pl-1.5 pr-3.5 rounded-xl border border-line text-[15px] font-semibold text-ink hover:border-dark-300"
            >
              <span
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-sand text-brass-700 flex items-center justify-center text-[13px] font-bold"
              >
                {initials(user!.full_name)}
              </span>
              Профиль
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden lg:inline-flex items-center h-11 px-4 rounded-xl text-[15px] font-semibold text-ink hover:bg-paper"
            >
              Войти
            </Link>
          )}
          <Link href="/campaigns" className="btn h-10 px-3.5 text-sm md:h-11 md:px-[18px] md:text-[15px] btn-primary">
            Пожертвовать
          </Link>
          <button
            type="button"
            className="lg:hidden w-11 h-11 rounded-xl bg-paper text-ink flex items-center justify-center"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            aria-controls="site-drawer"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconClose size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="site-drawer" className="lg:hidden girih surface-night px-4 pt-5 pb-6 animate-fade-in-down" style={{ ['--girih-opacity' as string]: 0.12 }}>
          <nav aria-label="Меню" className="flex flex-col">
            {NAV.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center justify-between min-h-14 border-b border-paper/10 text-xl ${
                    active ? 'text-gold font-bold' : 'text-paper font-medium'
                  }`}
                >
                  <span>{n.label}</span>
                  <IconChevronRight size={18} />
                </Link>
              );
            })}
          </nav>
          <div className="flex gap-2.5 mt-5">
            <Link
              href={signedIn ? '/profile' : '/login'}
              className="flex-1 flex items-center justify-center h-12 rounded-xl border border-paper/30 text-paper text-[15px] font-semibold"
            >
              {signedIn ? 'Мой профиль' : 'Войти'}
            </Link>
            <Link
              href="/cabinet"
              className="flex-1 flex items-center justify-center h-12 rounded-xl bg-paper/10 text-paper text-[15px] font-semibold"
            >
              Кабинет мечети
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
