import { ReactNode } from 'react';
import { IconSearch } from './icons';

/** Пустое состояние: белая панель, иконка в круге sec, заголовок и подсказка. */
export default function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  const glyph = typeof icon === 'string' || icon === undefined ? <IconSearch /> : icon;
  return (
    <div className="panel-lg text-center flex flex-col items-center gap-2.5">
      <span className="icon-round w-14 h-14">{glyph}</span>
      <h2 className="title-sm">{title}</h2>
      {children && <div className="body-text max-w-[420px]">{children}</div>}
    </div>
  );
}
