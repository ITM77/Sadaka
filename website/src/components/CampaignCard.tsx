'use client';

import Link from 'next/link';
import { Campaign, CATEGORY_LABELS, progress } from '@/lib/api';
import { useI18n } from '@/lib/i18n/client';
import ProgressBar from './ProgressBar';

/**
 * Карточка сбора «Стиля 2»: плитка #E9F1F0 r20 внутри белой панели.
 * onWhite=false — если карточка стоит прямо на фоне приложения (тогда она белая).
 */
export default function CampaignCard({
  campaign,
  showMosque = true,
  onWhite = true,
}: {
  campaign: Campaign;
  showMosque?: boolean;
  onWhite?: boolean;
}) {
  const { t, fmt } = useI18n();
  const pct = progress(campaign);

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className={`${onWhite ? 'bg-app hover:bg-[#DDE7E6]' : 'bg-white hover:bg-white/80'} rounded-tile p-3.5 flex flex-col gap-2 text-ink hover:text-ink transition-colors`}
    >
      <span className="flex justify-between items-baseline gap-2.5">
        <span className="min-w-0 break-words text-base leading-[22px] font-semibold">{campaign.title}</span>
        <span className="text-[15px] leading-[21px] font-semibold tabular whitespace-nowrap">{pct}%</span>
      </span>
      <span className="text-xs leading-[17px] text-body">
        {showMosque && campaign.mosque ? `${campaign.mosque.name} · ` : ''}
        {t(CATEGORY_LABELS[campaign.category] ?? campaign.category)} · {fmt.timeLeft(campaign)}
      </span>
      <ProgressBar value={pct} onTile={onWhite} />
      <span className="flex flex-wrap justify-between gap-x-2 text-[13px] leading-[18px] font-medium tabular">
        <span className="whitespace-nowrap">{fmt.money(campaign.current_amount)}</span>
        <span className="font-normal text-body whitespace-nowrap">
          {t('из {sum}', { sum: fmt.money(campaign.goal_amount) })}
        </span>
      </span>
    </Link>
  );
}
