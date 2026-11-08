'use client';

import { useRouter } from 'next/navigation';
import MosqueForm from '@/components/cabinet/MosqueForm';
import { MosqueChecklist } from '@/components/cabinet/MosqueChecklist';
import { CabinetPage } from '@/components/cabinet/ui';
import { useI18n } from '@/lib/i18n/client';

const STAGES = ['Данные мечети', 'Проверка Комитетом', 'Открытие сборов'];

export default function NewMosquePage() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <CabinetPage
      title={t('Заявка на регистрацию мечети')}
      crumbs={[{ href: '/cabinet', label: t('Кабинет') }]}
      current={t('Заявка')}
    >
      <ol aria-label={t('Этапы')} className="flex flex-wrap gap-1.5">
        {STAGES.map((s, i) => {
          const on = i === 0;
          return (
            <li
              key={s}
              aria-current={on ? 'step' : undefined}
              className={`inline-flex items-center gap-2 min-h-[36px] pl-1.5 pr-3.5 rounded-full bg-white text-[13px] leading-[18px] font-medium ${
                on ? 'text-ink' : 'text-muted'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold tabular ${
                  on ? 'bg-accent-100 text-accent-700' : 'bg-app text-muted'
                }`}
              >
                {i + 1}
              </span>
              {t(s)}
            </li>
          );
        })}
      </ol>
      <div className="layout-aside">
        <MosqueForm onSaved={(m) => router.replace(`/cabinet/mosques/${m.id}`)} />
        <MosqueChecklist />
      </div>
    </CabinetPage>
  );
}
