'use client';

import { useState } from 'react';
import { IconChevronDown } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { ROLE_LABELS, useAdmin } from '@/lib/adminAuth';
import { actionOf, AuditEntry, formatDay, statusLabel, TONE_CLASS } from '@/lib/audit';

/** 12s: история решений по мечети — заявка, сборы, отчёты, блокировки. Сначала старые. */
export default function MosqueHistory({ mosqueId }: { mosqueId: string }) {
  const { call } = useAdmin();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState('');
  const panelId = `history-${mosqueId}`;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !entries) {
      try {
        const r = await call<{ entries: AuditEntry[] }>(`/admin/mosques/${mosqueId}/history`);
        setEntries(r.entries);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Не удалось загрузить историю');
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="btn btn-ghost self-start px-3 -ml-1"
      >
        История решений{entries ? ` · ${entries.length}` : ''}
        <IconChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="tile">
          {error && (
            <p className="alert-error" role="alert">
              {error}
            </p>
          )}
          {!entries && !error && <div className="skeleton h-20 rounded-tile bg-white" aria-busy="true" />}
          {entries && entries.length === 0 && (
            <p className="body-text">
              Событий пока нет. Журнал ведётся с момента его запуска — более ранние решения в нём не записаны.
            </p>
          )}
          {entries && entries.length > 0 && (
            <ol className="relative flex flex-col gap-4 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white">
              {entries.map((e) => {
                const a = actionOf(e.action);
                const dot =
                  a.tone === 'ok' ? 'bg-ok' : a.tone === 'bad' ? 'bg-[#B42318]' : a.tone === 'wait' ? 'bg-[#A35A00]' : 'bg-sec';
                return (
                  <li key={e.id} className="relative">
                    <span aria-hidden="true" className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-[3px] border-app ${dot}`} />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="font-medium text-ink">
                        {a.label}
                        {e.object_type !== 'mosque' && <span className="font-normal text-body"> · «{e.object_title}»</span>}
                      </p>
                      <time dateTime={e.created_at} className="caption tabular">
                        {formatDay(e.created_at)}
                      </time>
                    </div>
                    <p className="caption mt-0.5">
                      {e.actor_type === 'mosque' ? `Мечеть · ${e.actor_name}` : `${e.actor_name}${e.actor_role ? ` · ${ROLE_LABELS[e.actor_role].toLowerCase()}` : ''}`}
                      {e.details ? ` · ${e.details}` : ''}
                    </p>
                    {e.from_status && e.to_status && e.actor_type === 'admin' && (
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="badge badge-neutral">{statusLabel(e.object_type, e.from_status)}</span>
                        <span aria-hidden="true" className="text-body">→</span>
                        <span className="sr-only">стало</span>
                        <span className={TONE_CLASS[a.tone === 'neutral' ? 'neutral' : a.tone]}>{statusLabel(e.object_type, e.to_status)}</span>
                      </p>
                    )}
                    {e.reason && (
                      <p className="mt-1.5 text-sm leading-5 text-ink bg-white rounded-xl px-3 py-2 break-words">
                        <span className="text-body">Причина: </span>
                        {e.reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
