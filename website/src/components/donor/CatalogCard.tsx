import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import { IconMosque } from '@/components/icons';
import { Campaign, CATEGORY_LABELS, daysLeft, formatTJS, progress, timeLeftLabel } from '@/lib/api';

/** Цвета обложек по кругу: лазурит, глубокая бирюза, латунь. */
const COVERS = ['bg-primary-600', 'bg-[#1B4D63]', 'bg-brass-700'];

/**
 * Карточка сбора в каталоге: обложка с орнаментом сверху,
 * на телефоне — компактная строка с квадратной обложкой слева.
 */
export default function CatalogCard({ campaign: c, index }: { campaign: Campaign; index: number }) {
  const pct = progress(c);
  const urgent = c.status === 'active' && daysLeft(c.end_date) <= 5;

  return (
    <Link
      href={`/campaigns/${c.id}`}
      className="card-hover overflow-hidden flex flex-row items-center gap-3.5 p-3 rounded-[18px] md:flex-col md:items-stretch md:gap-0 md:p-0 md:rounded-card text-ink group"
    >
      <div
        className={`girih girih-faint ${COVERS[index % COVERS.length]} text-gold flex items-center justify-center shrink-0 w-[84px] h-[84px] rounded-[14px] md:w-auto md:h-[120px] md:rounded-none`}
        aria-hidden="true"
      >
        <IconMosque size={48} strokeWidth={1.25} className="w-[34px] h-[34px] md:w-12 md:h-12" />
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-2 md:gap-3.5 md:pt-[22px] md:px-6 md:pb-6">
        <div className="flex justify-between items-center gap-2">
          <span className="badge badge-primary hidden md:inline-flex">{CATEGORY_LABELS[c.category] ?? c.category}</span>
          <span className={`text-[13px] md:text-sm ${urgent ? 'font-semibold text-[#8A4B00]' : 'text-muted'}`}>
            {timeLeftLabel(c)}
          </span>
        </div>
        <div>
          <h2 className="text-base md:text-xl leading-snug font-bold mb-0.5 md:mb-1.5 group-hover:text-primary-700 transition-colors">
            {c.title}
          </h2>
          {c.mosque && (
            <p className="text-[13px] md:text-[15px] text-muted truncate md:whitespace-normal">
              {c.mosque.name} · {c.mosque.city}
            </p>
          )}
        </div>
        <div className="mt-auto flex flex-col gap-2 md:gap-2.5">
          <ProgressBar value={pct} />
          <div className="flex justify-between items-baseline gap-2 flex-wrap">
            <span className="text-[15px] md:text-lg font-bold text-primary-600">{formatTJS(c.current_amount)}</span>
            <span className="text-[13px] md:text-sm text-muted">
              {pct}% из {formatTJS(c.goal_amount)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
