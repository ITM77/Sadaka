import Link from 'next/link';
import { getI18n } from '@/lib/i18n/server';
import Logo from './Logo';

const LINKS = [
  { href: '/campaigns', label: 'Сборы' },
  { href: '/mosques', label: 'Мечети' },
  { href: '/about', label: 'О проекте' },
  { href: '/contact', label: 'Контакты' },
  { href: '/cabinet/mosques/new', label: 'Подать заявку мечети' },
  { href: '/cabinet', label: 'Кабинет мечети' },
  { href: '/admin/login', label: 'Комитет улемов' },
];

/** Подвал: белая панель на фоне приложения. На телефоне — над нижней панелью вкладок. */
export default function Footer() {
  const { t } = getI18n();
  return (
    <footer className="container-custom pb-28 lg:pb-10">
      <div className="panel-lg flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Logo />
          <p className="body-text max-w-[420px]">
            {t(
              'Пожертвования мечетям Таджикистана. Каждая мечеть проверена Комитетом улемов, отчёт о расходах публикуется после каждого сбора.',
            )}
          </p>
        </div>
        <nav aria-label={t('Ссылки')} className="flex flex-wrap gap-1.5">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="chip min-h-11 lg:min-h-[36px]">
              {t(l.label)}
            </Link>
          ))}
        </nav>
        <div className="divider" />
        <div className="flex flex-wrap justify-between gap-2 caption">
          <span>{t('© {year} Садака · info@sadaka.tj', { year: new Date().getFullYear() })}</span>
          <span>{t('Баллы Савоб не имеют денежной ценности')}</span>
        </div>
      </div>
    </footer>
  );
}
