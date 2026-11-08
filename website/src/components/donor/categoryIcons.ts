import { IconBook, IconBuilding, IconHammer, IconHandHeart, IconHeart, IconZap } from '@/components/icons';

/** Иконки Lucide для категорий сборов (ключи — как в CATEGORY_LABELS). */
export const CATEGORY_ICONS: Record<string, typeof IconHeart> = {
  repairs: IconHammer,
  construction: IconBuilding,
  education: IconBook,
  welfare: IconHandHeart,
  utilities: IconZap,
  other: IconHeart,
};

export function categoryIcon(category: string) {
  return CATEGORY_ICONS[category] ?? IconHeart;
}
