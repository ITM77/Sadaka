import { IconCheck, IconInfo } from '@/components/icons';

/** Правая колонка формы мечети: что проверяет Комитет и что будет при отказе. */
export function MosqueChecklist() {
  return (
    <aside className="aside-sticky min-w-0 flex flex-col gap-3">
      <section className="panel" aria-labelledby="checklist-title">
        <h2 id="checklist-title" className="overtitle">
          Что проверяет Комитет
        </h2>
        <ul className="kv mt-3">
          {['Мечеть существует по указанному адресу', 'Имам и представитель на связи', 'Нет прошлых нарушений'].map((t) => (
            <li key={t} className="!justify-start !gap-2.5 py-2.5 !items-start">
              <IconCheck size={18} className="text-sec shrink-0 mt-px" />
              <span className="text-ink">{t}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="infobox">
        <IconInfo size={18} className="shrink-0 mt-px" />
        <span>
          <strong className="font-semibold">Если откажут,</strong> в кабинете будет причина. Исправьте данные — заявка
          снова уйдёт на рассмотрение.
        </span>
      </div>
    </aside>
  );
}
