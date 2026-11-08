'use client';

import { useSearchParams } from 'next/navigation';
import { ReactNode, Suspense, useEffect, useMemo, useState } from 'react';
import { IconLandmark } from '@/components/icons';
import { useAdminStats } from '@/components/admin/AdminStats';
import {
  AdminTitle,
  DecisionNote,
  ListSkeleton,
  matches,
  ModAction,
  ModerationActions,
  MOSQUE_BADGE,
  Notice,
  StatusBadge,
} from '@/components/admin/Moderation';
import MosqueHistory from '@/components/admin/MosqueHistory';
import { PanelBlock, PhotoLinks, QueueLayout, useSorted } from '@/components/admin/Queue';
import { useAdminList } from '@/components/admin/useAdminList';
import { Mosque } from '@/lib/api';
import { canBlock, canModerate, useAdmin } from '@/lib/adminAuth';
import { useI18n } from '@/lib/i18n/client';

type AdminMosque = Mosque & { created_at: string; updated_at: string; owner_id: string };

const EMPTY: Record<string, string> = {
  pending: 'Новых заявок нет — все мечети рассмотрены.',
  rejected: 'Отклонённых заявок нет.',
  '': 'Мечети ещё не подавали заявок.',
};

/** Памятка проверки из 12c — подсказка сотруднику, отметки не сохраняются. */
const CHECKLIST = [
  'Адрес есть в указанном городе',
  'Координаты совпадают с адресом',
  'Имам известен Комитету',
  'Телефоны имама и мечети отвечают',
  'В описании нет рекламы и чужих реквизитов',
];

export default function AdminMosques() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Queue />
    </Suspense>
  );
}

function Queue() {
  const params = useSearchParams();
  const status = params.get('status') ?? 'pending';
  const { admin } = useAdmin();
  const { t, fmt } = useI18n();
  const { stats, refresh } = useAdminStats();
  const { items, total, error, reload, call } = useAdminList<AdminMosque>(
    `/admin/mosques?limit=100${status ? `&status=${status}` : ''}`,
    'mosques',
  );
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState(params.get('q') ?? ''); // ?q= — переход из журнала и реестра
  const [sort, setSort] = useState<'old' | 'new'>(status === 'pending' ? 'old' : 'new');

  const filtered = useMemo(
    () => items?.filter((m) => matches(query, m.name, m.city, m.address, m.imam_name, m.phone)) ?? null,
    [items, query],
  );
  const rows = useSorted(filtered, (m) => m.created_at, sort);

  const tabs = [
    { value: 'pending', label: 'Новые', count: stats?.mosques_pending },
    { value: 'rejected', label: 'Отклонённые' },
    { value: '', label: 'Все' },
  ].map((t) => (t.value === status && items ? { ...t, count: total } : t));

  const actionsFor = (m: AdminMosque): ModAction[] => {
    const base = `/admin/mosques/${m.id}`;
    const list: ModAction[] = [];
    if (canModerate(admin) && m.status === 'pending') {
      list.push({ key: 'approve', label: 'Одобрить', path: `${base}/approve`, tone: 'primary', done: 'заявка одобрена' });
      list.push({
        key: 'reject',
        label: 'Отклонить',
        path: `${base}/reject`,
        tone: 'secondary',
        done: 'заявка отклонена',
        needsReason: true,
        reasonLabel: 'Причина отказа — её увидит мечеть',
        confirmLabel: 'Отклонить заявку',
        reasonPlaceholder: 'Например: адрес не подтверждается, уточните номер телефона',
      });
    }
    if (canBlock(admin) && m.status === 'blocked') {
      list.push({ key: 'unblock', label: 'Снять блокировку', path: `${base}/unblock`, tone: 'secondary', done: 'блокировка снята' });
    }
    return list;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <AdminTitle
        over={t(status === 'pending' ? 'Очередь проверки' : 'Реестр')}
        sub={t('Одобряйте мечеть, только когда уверены, что она существует и заявку подал её представитель')}
        aside={stats ? t('{n} ждут решения', { n: stats.mosques_pending }) : undefined}
      >
        {t('Заявки мечетей')}
      </AdminTitle>

      <QueueLayout<AdminMosque>
        base="/admin/mosques"
        current={status}
        tabs={tabs}
        items={rows}
        error={error}
        caption="Заявки мечетей"
        sort={sort}
        onSort={setSort}
        search={{ value: query, onChange: setQuery, label: 'Поиск заявки', placeholder: 'Мечеть, город, имам' }}
        empty={{ icon: <IconLandmark size={26} />, text: EMPTY[status] ?? EMPTY[''] }}
        notice={<Notice text={notice} onClose={() => setNotice('')} />}
        columns={[
          {
            key: 'name',
            label: 'Мечеть',
            cell: (m) => (
              <>
                <span className="block font-medium truncate">{m.name}</span>
                <span className="block caption truncate">{m.city}</span>
              </>
            ),
          },
          { key: 'imam', label: 'Имам', width: 'w-[22%]', wide: true, cell: (m) => <span className="block truncate">{m.imam_name || '—'}</span> },
          { key: 'phone', label: 'Телефон', width: 'w-[150px]', wide: true, cell: (m) => <span className="tabular text-[13px]">{m.phone || '—'}</span> },
          { key: 'date', label: 'Подана', width: 'w-[100px]', cell: (m) => <span className="text-[13px] tabular">{fmt.daysAgo(m.created_at)}</span> },
          { key: 'status', label: 'Статус', width: 'w-[140px]', cell: (m) => <StatusBadge status={MOSQUE_BADGE[m.status]} /> },
        ]}
        card={(m) => ({
          title: m.name,
          badge: <StatusBadge status={MOSQUE_BADGE[m.status]} />,
          meta: `${m.city} · ${m.imam_name || t('имам не указан')} · ${t('подана {when}', { when: fmt.daysAgo(m.created_at) })}`,
        })}
        panel={(m, pos, n) => ({
          over: t('Заявка мечети · {pos} из {n}', { pos, n }),
          title: m.name,
          badge: <StatusBadge status={MOSQUE_BADGE[m.status]} />,
          meta: t('Подана {date} · {ago}', { date: fmt.date(m.created_at), ago: fmt.daysAgo(m.created_at) }),
          body: <MosquePanel m={m} />,
          footer: (
            <ModerationActions
              actions={actionsFor(m)}
              call={call}
              onDone={(done) => {
                setNotice(`«${m.name}» — ${t(done)}.`);
                reload();
                refresh();
              }}
            />
          ),
        })}
      />
    </div>
  );
}

function MosquePanel({ m }: { m: AdminMosque }) {
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map(() => false));
  useEffect(() => setChecked(CHECKLIST.map(() => false)), [m.id]);
  const done = checked.filter(Boolean).length;
  const hasGeo = m.latitude != null && m.longitude != null;
  const { t } = useI18n();

  return (
    <>
      <dl className="kv">
        <Row label={t('Адрес')}>{m.address}</Row>
        <Row label={t('Город')}>{m.city}</Row>
        <Row label={t('Координаты')}>
          {hasGeo ? (
            <span className="flex flex-col items-end">
              <span className="tabular">
                {m.latitude!.toFixed(4)}, {m.longitude!.toFixed(4)}
              </span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${m.latitude}&mlon=${m.longitude}#map=18/${m.latitude}/${m.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-medium"
              >
                {t('Открыть на карте')}<span className="sr-only"> {t('(OpenStreetMap, откроется в новой вкладке)')}</span>
              </a>
            </span>
          ) : (
            t('не указаны')
          )}
        </Row>
        <Row label={t('Имам')}>{m.imam_name || t('не указан')}</Row>
        <Row label={t('Телефон имама')}>{m.imam_phone ? <a href={`tel:${m.imam_phone}`} className="tabular">{m.imam_phone}</a> : t('не указан')}</Row>
        <Row label={t('Телефон мечети')}>{m.phone ? <a href={`tel:${m.phone}`} className="tabular">{m.phone}</a> : t('не указан')}</Row>
      </dl>

      {m.description && (
        <PanelBlock title={t('Описание')}>
          <p className="body-text whitespace-pre-line break-words">{m.description}</p>
        </PanelBlock>
      )}

      <PanelBlock title={`${t('Фото')} · ${m.photo_urls?.length ?? 0}`}>
        <PhotoLinks urls={m.photo_urls ?? []} />
      </PanelBlock>

      {m.status === 'pending' && (
        <fieldset className="flex flex-col">
          <legend className="flex items-center justify-between gap-2 w-full mb-1">
            <span className="overtitle">{t('Проверка {done} из {n}', { done, n: CHECKLIST.length })}</span>
            <span className="caption">{t('памятка, не сохраняется')}</span>
          </legend>
          {CHECKLIST.map((c, i) => (
            <label key={c} className="flex items-center gap-3 min-h-[44px] border-b border-line last:border-b-0 cursor-pointer text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                className="w-5 h-5 accent-[#03676C] shrink-0 cursor-pointer"
              />
              {t(c)}
            </label>
          ))}
        </fieldset>
      )}

      <DecisionNote note={m.moderation_note} />
      <MosqueHistory mosqueId={m.id} />
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="!items-start py-2.5">
      <dt className="text-body shrink-0">{label}</dt>
      <dd className="font-medium text-ink text-right min-w-0 break-words">{children}</dd>
    </div>
  );
}
