import type { ReactNode } from 'react';

interface PageHeroProps {
  /** Надпись латунью над заголовком */
  badge?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Кнопки, поиск или фильтры под описанием */
  children?: ReactNode;
  /** night — ночной фон с орнаментом (по умолчанию), light — светлый фон страницы */
  tone?: 'night' | 'light';
}

/** Шапка внутренних страниц в стиле «Лазурит и латунь». */
export default function PageHero({ badge, title, description, children, tone = 'night' }: PageHeroProps) {
  const night = tone === 'night';
  return (
    <section className={night ? 'girih surface-night' : 'bg-paper'}>
      <div className="container-custom pt-10 pb-12 md:pt-16 md:pb-20 flex flex-col gap-4 md:gap-5 max-w-[1200px]">
        {badge && <p className={`eyebrow ${night ? 'text-gold' : ''}`}>{badge}</p>}
        <h1 className="h-page max-w-[820px]">{title}</h1>
        {description && (
          <p className={`text-[17px] md:text-xl leading-relaxed max-w-[680px] ${night ? 'text-mist' : 'text-muted'}`}>
            {description}
          </p>
        )}
        {children && <div className="mt-2 md:mt-3">{children}</div>}
      </div>
    </section>
  );
}
