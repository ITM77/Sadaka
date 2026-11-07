import { IconCheck } from '@/components/icons';

/** Боковая колонка формы мечети: что проверяет Комитет и что будет при отказе. */
export function MosqueChecklist() {
  return (
    <aside className="lg:w-[340px] shrink-0 min-w-0 flex flex-col gap-4">
      <section className="bg-mint border border-primary-200 rounded-[20px] sm:rounded-[22px] p-5 sm:p-6 flex flex-col gap-3.5">
        <h2 className="text-lg font-bold text-primary-700">Что проверяет Комитет</h2>
        <ul className="flex flex-col gap-2.5 text-[15px] leading-normal text-[#2D4A46]">
          {['Мечеть существует по указанному адресу', 'Имам и представитель на связи', 'Нет прошлых нарушений'].map((t) => (
            <li key={t} className="flex gap-2.5">
              <IconCheck size={18} className="text-primary-600 shrink-0 mt-[3px]" />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <section className="bg-white border border-line rounded-[20px] sm:rounded-[22px] p-5 sm:p-6">
        <h2 className="text-lg font-bold mb-2">Если откажут</h2>
        <p className="text-[15px] leading-relaxed text-muted">
          В кабинете будет причина. Исправьте данные — заявка снова уйдёт на рассмотрение.
        </p>
      </section>
    </aside>
  );
}
