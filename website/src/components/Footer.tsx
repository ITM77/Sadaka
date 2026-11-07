import Link from 'next/link';
import { LogoMark } from './Logo';

const COLUMNS = [
  {
    title: 'Платформа',
    links: [
      { href: '/campaigns', label: 'Сборы' },
      { href: '/mosques', label: 'Мечети' },
      { href: '/about', label: 'О проекте' },
    ],
  },
  {
    title: 'Мечетям',
    links: [
      { href: '/cabinet/mosques/new', label: 'Подать заявку' },
      { href: '/cabinet', label: 'Кабинет мечети' },
      { href: '/admin/login', label: 'Комитет улемов' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="girih girih-faint bg-night text-mist">
      <div className="container-custom pt-10 pb-6 md:pt-16 md:pb-8 flex flex-col gap-8 md:gap-12">
        <div className="flex flex-wrap gap-x-6 gap-y-7 md:gap-x-16 md:gap-y-10">
          <div className="basis-full md:basis-[300px] md:flex-1 min-w-0 flex flex-col gap-4">
            <span className="inline-flex items-center gap-2.5 text-paper text-[22px] font-bold">
              <LogoMark size={32} onDark />
              Садака
            </span>
            <p className="text-[15px] leading-relaxed max-w-[340px]">
              Прозрачные пожертвования мечетям Таджикистана под надзором Комитета улемов.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav
              key={col.title}
              aria-label={col.title}
              className="basis-[40%] grow md:grow-0 md:basis-[180px] flex flex-col gap-3 text-[15px]"
            >
              <span className="text-paper font-semibold">{col.title}</span>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} className="text-mist hover:text-gold transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
          <div className="basis-[40%] grow md:grow-0 md:basis-[220px] flex flex-col gap-3 text-[15px]">
            <span className="text-paper font-semibold">Связаться</span>
            <a href="mailto:info@sadaka.tj" className="text-mist hover:text-gold transition-colors">
              info@sadaka.tj
            </a>
            <Link href="/contact" className="text-mist hover:text-gold transition-colors">
              Написать нам
            </Link>
            <span>Душанбе, Таджикистан</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 pt-6 border-t border-mist/20 text-sm text-[#9FB0AC]">
          <span>© {new Date().getFullYear()} Садака</span>
          <span>Баллы Савоб не имеют денежной ценности</span>
        </div>
      </div>
    </footer>
  );
}
