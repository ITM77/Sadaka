/** Прогресс «Стиля 2»: 6px, заливка sec. onTile — белая дорожка (для плитки #E9F1F0). */
export default function ProgressBar({
  value,
  label,
  size = 'md',
  onTile = false,
}: {
  value: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  onTile?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const h = size === 'lg' ? 'h-2' : 'h-1.5';
  return (
    <div
      className={`${onTile ? 'progress-track-white' : 'progress-track'} ${h}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Собрано от цели'}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
