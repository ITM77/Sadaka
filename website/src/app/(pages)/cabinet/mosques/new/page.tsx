'use client';

import { useRouter } from 'next/navigation';
import MosqueForm from '@/components/cabinet/MosqueForm';
import { MosqueChecklist } from '@/components/cabinet/MosqueChecklist';
import { CabinetPage } from '@/components/cabinet/ui';

const STAGES = ['Данные мечети', 'Проверка Комитетом', 'Открытие сборов'];

export default function NewMosquePage() {
  const router = useRouter();
  return (
    <CabinetPage
      wide
      title="Заявка на регистрацию мечети"
      crumbs={[{ href: '/cabinet', label: 'Кабинет' }]}
      current="Заявка"
    >
      <ol aria-label="Этапы" className="-mt-2 mb-6 sm:mb-8 flex flex-wrap gap-2">
        {STAGES.map((s, i) => {
          const on = i === 0;
          return (
            <li
              key={s}
              aria-current={on ? 'step' : undefined}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[15px] font-semibold ${
                on ? 'bg-primary-600 text-white' : 'bg-white border border-line text-muted'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[13px] ${
                  on ? 'bg-white text-primary-600' : 'bg-paper'
                }`}
              >
                {i + 1}
              </span>
              {s}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-7">
        <MosqueForm onSaved={(m) => router.replace(`/cabinet/mosques/${m.id}`)} />
        <MosqueChecklist />
      </div>
    </CabinetPage>
  );
}
