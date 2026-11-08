'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { IconClose } from '@/components/icons';

/**
 * Окно поверх панели на нативном <dialog>: фокус остаётся внутри, Esc закрывает.
 * Телефон — шторка снизу; веб — по центру (modal) или боковая панель 480 (drawer, как 12l и 12r).
 */
export default function Dialog({
  open,
  onClose,
  title,
  overtitle,
  sub,
  variant = 'modal',
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  overtitle?: ReactNode;
  sub?: ReactNode;
  variant?: 'modal' | 'drawer';
  footer?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const place =
    variant === 'drawer'
      ? 'md:inset-y-0 md:right-0 md:left-auto md:top-0 md:bottom-0 md:h-full md:max-h-none md:w-[480px] md:rounded-none md:rounded-l-card'
      : 'md:inset-0 md:m-auto md:h-fit md:max-h-[min(860px,calc(100vh-48px))] md:w-[560px] md:rounded-card';

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // клик по затемнению
      }}
      className={`fixed inset-x-0 bottom-0 top-auto m-0 p-0 border-0 w-full max-w-none max-h-[92vh] rounded-t-card bg-white text-ink
        shadow-[0_8px_24px_-12px_rgba(20,24,30,.18)] backdrop:bg-[rgba(20,24,30,0.45)] open:flex flex-col overflow-hidden ${place}`}
    >
      {open && (
        <>
          <div className="w-10 h-1 rounded-sm bg-dark-200 mx-auto mt-2.5 md:hidden" aria-hidden="true" />
          <header className="flex items-start gap-3 px-4 md:px-6 pt-3 md:pt-6 pb-3">
            <div className="min-w-0 flex-1">
              {overtitle && <p className="overtitle">{overtitle}</p>}
              <h2 id={titleId} className="title-sm mt-0.5 break-words">
                {title}
              </h2>
              {sub && <p className="caption mt-1 break-words">{sub}</p>}
            </div>
            <button type="button" onClick={onClose} className="btn-icon shrink-0 -mr-1.5" aria-label="Закрыть">
              <IconClose size={20} />
            </button>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-4 flex flex-col gap-4">{children}</div>
          {footer && (
            <footer className="px-4 md:px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] md:pb-6 flex flex-wrap gap-2 border-t border-line">
              {footer}
            </footer>
          )}
        </>
      )}
    </dialog>
  );
}
