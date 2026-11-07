import { ReactNode } from 'react';
import { IconMosque } from './icons';

/** Пустое состояние. icon — React-узел (иконка из ./icons); строка оставлена для совместимости. */
export default function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  const glyph = typeof icon === 'string' || icon === undefined ? <IconMosque size={28} /> : icon;
  return (
    <div className="card px-6 py-10 sm:p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-3">
      <span className="icon-tile mb-1">{glyph}</span>
      <h2 className="text-xl font-bold">{title}</h2>
      {children && <div className="text-[15px] leading-relaxed text-muted">{children}</div>}
    </div>
  );
}
