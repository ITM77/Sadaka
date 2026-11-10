'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LangSwitch, useI18n } from '@/lib/i18n/client';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
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
  const { t } = useI18n();
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
        <div className="max-w-[1240px] mx-auto h-14 lg:h-16 px-4 lg:px-8 flex items-center justify-between gap-3 xl:gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Logo />
            {/* Телефон и планшет: переключатель языка рядом с логотипом */}
            <LangSwitch className="lg:hidden shrink-0 !p-0.5 [&>button]:min-h-11" />
          </div>

          <nav aria-label={t('Основное меню')} className="hidden lg:flex segmented !flex-none">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(pathname, n.href) ? 'page' : undefined}
                className="!px-2 xl:!px-[18px] hover:text-accent-700"
              >
                {t(n.label)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <LangSwitch className="hidden lg:inline-flex" />
            {/* С колокольчиком на 1024–1279 px места нет (таджикские подписи длиннее) — «Контакты» остаются в подвале */}
            <Link
              href="/contact"
              className={`hidden ${signedIn ? 'xl:inline-flex' : 'lg:inline-flex'} btn btn-secondary min-h-[44px] px-4`}
            >
              {t('Контакты')}
            </Link>
            {/* Колокольчик уведомлений: на телефоне — ссылка, на вебе — выпадающий список */}
            <NotificationBell />
            {/* На телефоне вход и профиль — в нижней панели вкладок */}
            <Link
              href={signedIn ? '/profile' : '/login'}
              className="hidden sm:inline-flex btn btn-secondary min-h-[44px] px-[18px]"
            >
              {signedIn ? t('Мои добрые дела') : t('Войти')}
            </Link>
          </div>
        </div>
      </header>

      {/* Телефон: нижняя панель вкладок */}
      <nav
        aria-label={t('Разделы')}
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white flex px-2 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))] shadow-lg"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={tab.active ? 'page' : undefined}
              className={`flex-1 min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-[3px] ${
                tab.active ? 'text-accent-700 hover:text-accent-700' : 'text-muted hover:text-ink'
              }`}
            >
              <span
                className={`w-[52px] h-[30px] rounded-full flex items-center justify-center ${
                  tab.active ? 'bg-accent-100' : ''
                }`}
              >
                <Icon />
              </span>
              <span className="text-[11px] leading-[15px] font-medium text-center">{t(tab.label)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
