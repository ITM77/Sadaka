import type { ReactNode } from 'react';

interface PageHeroProps {
  /** overtitle (sec, верхний регистр) или «хлебные крошки» над заголовком */
  badge?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Поиск, фильтры или кнопки под описанием */
  children?: ReactNode;
  /** panel — белая панель (по умолчанию), plain — заголовок прямо на фоне приложения */
  tone?: 'panel' | 'plain' | 'night' | 'light';
}

/** Заголовок страницы «Стиля 2»: 24/30 semibold, подпись 14/20 #515B6B. */
export default function PageHero({ badge, title, description, children, tone = 'panel' }: PageHeroProps) {
  const inPanel = tone === 'panel' || tone === 'night';
  const body = (
    <>
      {badge && <p className={inPanel ? 'overtitle' : 'caption !text-[13px]'}>{badge}</p>}
      <h1 className="title">{title}</h1>
      {description && <p className="body-text max-w-[680px]">{description}</p>}
      {children && <div className="mt-3">{children}</div>}
    </>
  );
  return (
    <div className="container-custom pt-4 md:pt-7">
      {inPanel ? (
        <section className="panel-lg flex flex-col gap-1.5">{body}</section>
      ) : (
        <section className="flex flex-col gap-1.5">{body}</section>
      )}
    </div>
  );
}
