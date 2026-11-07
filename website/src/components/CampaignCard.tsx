import Link from 'next/link';
import { Campaign, CATEGORY_LABELS, formatTJS, progress, timeLeftLabel } from '@/lib/api';
import ProgressBar from './ProgressBar';

export default function CampaignCard({ campaign, showMosque = true }: { campaign: Campaign; showMosque?: boolean }) {
  const pct = progress(campaign);

  return (
    <Link href={`/campaigns/${campaign.id}`} className="card-hover p-5 sm:p-6 flex flex-col gap-4 text-ink group">
      <div className="flex items-center justify-between gap-2">
        <span className="badge badge-primary">{CATEGORY_LABELS[campaign.category] ?? campaign.category}</span>
        <span className="text-sm text-muted">{timeLeftLabel(campaign)}</span>
      </div>

      <div>
        <h3 className="text-lg sm:text-xl leading-snug font-bold mb-1.5 group-hover:text-primary-700 transition-colors">
          {campaign.title}
        </h3>
        {showMosque && campaign.mosque && (
          <p className="text-[15px] text-muted">
            {campaign.mosque.name} · {campaign.mosque.city}
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2.5">
        <ProgressBar value={pct} />
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-bold text-primary-600">{formatTJS(campaign.current_amount)}</span>
          <span className="text-sm text-muted">из {formatTJS(campaign.goal_amount)}</span>
        </div>
      </div>
    </Link>
  );
}
