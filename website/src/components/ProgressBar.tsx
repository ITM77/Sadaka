export default function ProgressBar({
  value,
  label,
  size = 'md',
}: {
  value: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const pct = Math.max(0, Math.min(100, value));
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  return (
    <div
      className={`progress-track ${h}`}
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
