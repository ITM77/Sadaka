import type { ReactNode } from 'react';

interface PageHeroProps {
  badge: string;
  title: ReactNode;
  description?: ReactNode;
}

/** Шапка внутренних страниц в стиле v2 (общая для about / contact / mosques). */
export default function PageHero({ badge, title, description }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero pt-32 pb-16 md:pt-40 md:pb-20">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-10 left-1/4 w-80 h-80 bg-primary-200 dark:bg-primary-900/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-10 right-1/4 w-72 h-72 bg-accent-200 dark:bg-accent-900/20 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="container-custom text-center max-w-3xl animate-fade-in-up">
        <span className="badge badge-primary mb-6">{badge}</span>
        <h1 className="text-responsive-lg font-bold mb-6">{title}</h1>
        {description && (
          <p className="text-lg md:text-xl text-dark-600 dark:text-dark-300 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
