import Link from 'next/link';
import { IconMoon } from '@/components/icons';
import { getI18n } from '@/lib/i18n/server';
import { fetchSavobMode, multiplierText, savobEventName } from '@/lib/savob';

/**
 * Полоса «Рамадан: Савоб ×2» на главной и в сборах — только пока Комитет держит
 * праздничный режим включённым. В обычные дни ничего не показывает.
 */
export default async function SavobBanner({ link = true }: { link?: boolean }) {
  const mode = await fetchSavobMode();
  if (!mode?.active) return null;
  const { t, fmt } = getI18n();
  const name = savobEventName(mode, t);
  return (
    <section
      aria-label={t('Праздничный Савоб')}
      className="rounded-card bg-primary-600 text-white px-4 py-3.5 md:px-6 md:py-4 flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      <span className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0" aria-hidden="true">
        <IconMoon size={22} />
      </span>
      <div className="flex-[1_1_220px] min-w-0">
        <p className="text-[17px] leading-6 font-semibold">
          {t('{event}: Савоб за пожертвования ×{n}', { event: name, n: multiplierText(mode.effective_multiplier) })}
        </p>
        <p className="text-sm leading-5 text-white/85">
          {mode.ends_at
            ? t('Каждое пожертвование до {date} приносит больше баллов.', { date: fmt.lastDay(mode.ends_at) })
            : t('Каждое пожертвование приносит больше баллов.')}
        </p>
      </div>
      {link && (
        <Link href="/campaigns" className="btn bg-white text-ink hover:bg-white/90 hover:text-ink max-sm:w-full">
          {t('Выбрать сбор')}
        </Link>
      )}
    </section>
  );
}
