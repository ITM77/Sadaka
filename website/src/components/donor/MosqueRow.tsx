'use client';

import Link from 'next/link';
import { IconMosque } from '@/components/icons';
import { Mosque } from '@/lib/api';
import { useI18n } from '@/lib/i18n/client';

/**
 * Строка мечети в белой панели («Стиль 2»): фото или иконка, название, город · адрес, метка статуса.
 * hasActive — у мечети идёт одобренный сбор.
 */
export default function MosqueRow({
  mosque: m,
  hasActive,
  large = false,
}: {
  mosque: Mosque;
  hasActive?: boolean;
  large?: boolean;
}) {
  const { t } = useI18n();
  const photo = m.photo_urls?.[0] || m.logo_url;
  const box = large ? 'w-12 h-12 lg:w-14 lg:h-14' : 'w-11 h-11';
  return (
    <Link
      href={`/mosques/${m.id}`}
      className={`flex items-center gap-3 border-b border-line last:border-b-0 text-ink hover:text-ink group ${
        large ? 'min-h-[72px] py-2.5 lg:min-h-[80px] lg:py-3' : 'min-h-[64px] py-2'
      }`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" loading="lazy" className={`${box} rounded-xl object-cover bg-app shrink-0`} />
      ) : (
        <span className={`icon-tile ${box}`} aria-hidden="true">
          <IconMosque />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span
          className={`block group-hover:text-accent-700 transition-colors ${
            large ? 'text-sm leading-5 font-medium lg:text-base lg:leading-[22px] lg:font-semibold' : 'text-sm leading-5 font-medium'
          }`}
        >
          {m.name}
        </span>
        <span className="block caption truncate">
          {m.city}
          {m.address && ` · ${m.address}`}
        </span>
      </span>
      {hasActive ? (
        <span className="badge badge-sec shrink-0">{t('Идёт сбор')}</span>
      ) : (
        <span className="badge badge-success shrink-0">{t('Проверена')}</span>
      )}
    </Link>
  );
}
