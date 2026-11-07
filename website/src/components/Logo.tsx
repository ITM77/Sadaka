import Link from 'next/link';

/** Знак: ромб и квадрат латунью (восьмиконечная звезда) с лазуритовой точкой. */
export function LogoMark({ size = 34, onDark = false }: { size?: number; onDark?: boolean }) {
  const line = onDark ? '#C9A25A' : '#9A6B1F';
  const dot = onDark ? '#F1D9A6' : '#0F5C55';
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 3 L29 16 L16 29 L3 16 Z" stroke={line} strokeWidth="1.5" />
      <rect x="6.8" y="6.8" width="18.4" height="18.4" stroke={line} strokeWidth="1.5" />
      <circle cx="16" cy="16" r="4.5" fill={dot} />
    </svg>
  );
}

export default function Logo({
  href = '/',
  onDark = false,
  suffix,
}: {
  href?: string;
  onDark?: boolean;
  suffix?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 no-underline ${onDark ? 'text-paper' : 'text-night'}`}
    >
      <LogoMark onDark={onDark} />
      <span className="text-[20px] sm:text-[22px] font-bold" style={{ letterSpacing: '-0.01em' }}>
        Садака
      </span>
      {suffix && (
        <span className={`hidden sm:inline text-sm font-medium ${onDark ? 'text-mist' : 'text-muted'}`}>
          {suffix}
        </span>
      )}
    </Link>
  );
}
