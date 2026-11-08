'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/client';
import { IconMoon } from './icons';

/** Знак «Стиля 2»: полумесяц в оранжевом квадрате 36px со скруглением 12px. */
export function LogoMark({ size = 36 }: { size?: number; onDark?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="rounded-xl bg-accent-500 text-ink flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <IconMoon size={Math.round(size * 0.56)} />
    </span>
  );
}

export default function Logo({
  href = '/',
  subtitle = 'Комитет улемов РТ',
  suffix,
}: {
  href?: string;
  /** Подпись под названием по-русски (переводится здесь): «Комитет улемов РТ» → «Шӯрои уламои ҶТ» */
  subtitle?: string | null;
  /** Совместимость: старый параметр подписи */
  suffix?: string;
  onDark?: boolean;
}) {
  const { t } = useI18n();
  const sub = suffix ?? subtitle;
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 min-h-[44px] text-ink hover:text-ink no-underline">
      <LogoMark />
      <span className="flex flex-col">
        <span className="text-base leading-[22px] font-semibold">{t('Садака')}</span>
        {sub && <span className="text-xs leading-[17px] text-muted">{t(sub)}</span>}
      </span>
    </Link>
  );
}
