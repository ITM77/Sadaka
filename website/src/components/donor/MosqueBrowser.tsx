'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { IconInfo, IconPin } from '@/components/icons';
import { Mosque } from '@/lib/api';
import { useI18n } from '@/lib/i18n/client';
import MosqueMap, { distanceKm, Point, pointOf } from './MosqueMap';
import MosqueRow from './MosqueRow';

type Geo = 'idle' | 'asking' | 'on' | 'denied' | 'error';

/**
 * Список мечетей с картой и кнопкой «Рядом со мной».
 * Без JS остаётся обычный список (его отдаёт сервер), кнопка геолокации появляется после загрузки.
 * Карта — дополнение: текстовый список под ней доступен всегда.
 */
export default function MosqueBrowser({
  mosques,
  activeIds,
  view,
  header,
  switcher,
}: {
  mosques: Mosque[];
  activeIds: string[];
  view: 'list' | 'map';
  /** Счётчик «Найдено …» слева */
  header: ReactNode;
  /** Переключатель «Списком / На карте» (ссылки с сервера) */
  switcher: ReactNode;
}) {
  const { t, fmt } = useI18n();
  const [canGeo, setCanGeo] = useState(false);
  const [geo, setGeo] = useState<Geo>('idle');
  const [me, setMe] = useState<Point | null>(null);

  useEffect(() => setCanGeo(typeof navigator !== 'undefined' && 'geolocation' in navigator), []);

  const active = useMemo(() => new Set(activeIds), [activeIds]);
  const withoutPoint = useMemo(() => mosques.filter((m) => !pointOf(m)).length, [mosques]);

  // С местоположением — сначала ближайшие, мечети без точки в конце
  const sorted = useMemo(() => {
    if (!me) return mosques.map((m) => ({ m, d: null as number | null }));
    return mosques
      .map((m) => {
        const p = pointOf(m);
        return { m, d: p ? distanceKm(me, p) : null };
      })
      .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity));
  }, [mosques, me]);
  const nearest = me ? sorted.filter((x) => x.d !== null).slice(0, 3) : [];

  const km = (d: number) => t('{n} км', { n: fmt.number(d < 10 ? Math.round(d * 10) / 10 : Math.round(d)) });

  const locate = () => {
    if (geo === 'on') {
      setGeo('idle');
      setMe(null);
      return;
    }
    setGeo('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeo('on');
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
        {header}
        <div className="flex flex-wrap gap-2 max-sm:w-full">
          {canGeo && (
            <button
              type="button"
              onClick={locate}
              disabled={geo === 'asking'}
              aria-pressed={geo === 'on'}
              className={`btn btn-sm !min-h-11 !px-4 max-sm:flex-1 ${
                geo === 'on' ? 'bg-accent-100 text-accent-700 hover:bg-accent-100 hover:text-accent-800' : 'btn-white'
              }`}
            >
              <IconPin size={18} />
              {geo === 'asking' ? t('Определяем…') : t('Рядом со мной')}
            </button>
          )}
          {switcher}
        </div>
      </div>

      {(geo === 'denied' || geo === 'error') && (
        <div className="infobox" role="status">
          <IconInfo size={18} className="shrink-0 mt-px" />
          <span>
            {geo === 'denied'
              ? t('Браузер не дал доступ к местоположению. Его можно разрешить в настройках сайта — или просто выберите город.')
              : t('Не получилось определить местоположение. Попробуйте ещё раз чуть позже.')}
          </span>
        </div>
      )}

      {view === 'map' && (
        <section aria-label={t('Карта мечетей')} className="flex flex-col gap-2">
          <MosqueMap
            mosques={mosques}
            activeIds={activeIds}
            userLocation={me}
            selectedId={nearest[0]?.m.id ?? null}
            label={t('Карта мечетей')}
            className="h-[60vh] min-h-[320px] lg:h-[560px] rounded-card overflow-hidden"
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 caption">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-accent-500 border-2 border-white" aria-hidden="true" />
              {t('Идёт сбор')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-accent-500" aria-hidden="true" />
              {t('Без активного сбора')}
            </span>
            {me && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-sec border-2 border-white" aria-hidden="true" />
                {t('Вы здесь')}
              </span>
            )}
            {withoutPoint > 0 && (
              <span>
                {t('{n} {what} ещё без точки на карте', {
                  n: withoutPoint,
                  what: fmt.plural(withoutPoint, ['мечеть', 'мечети', 'мечетей']),
                })}
              </span>
            )}
          </div>
        </section>
      )}

      {me && (
        <section aria-labelledby="nearest-title" className="panel" aria-live="polite">
          <h2 id="nearest-title" className="overtitle">
            {t('Ближайшие к вам')}
          </h2>
          {nearest.length === 0 ? (
            <p className="body-text mt-2">
              {t('У найденных мечетей пока нет точки на карте — расстояние посчитать не из чего.')}
            </p>
          ) : (
            <>
              <ul className="mt-1.5">
                {nearest.map(({ m, d }) => (
                  <li key={m.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/mosques/${m.id}`}
                      className="flex items-center gap-3 min-h-[56px] py-2 text-ink hover:text-ink group"
                    >
                      <span className="icon-tile" aria-hidden="true">
                        <IconPin />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm leading-5 font-medium group-hover:text-accent-700 transition-colors">
                          {m.name}
                        </span>
                        <span className="block caption truncate">
                          {m.city}
                          {active.has(m.id) && ` · ${t('Идёт сбор')}`}
                        </span>
                      </span>
                      <span className="text-sm leading-5 font-semibold tabular whitespace-nowrap">{km(d!)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="caption mt-1">{t('Расстояние по прямой. Список ниже тоже начинается с ближайших.')}</p>
            </>
          )}
        </section>
      )}

      <section aria-label={t('Мечети')} className="bg-white rounded-card px-4 py-1 lg:px-5">
        {sorted.map(({ m }) => (
          <MosqueRow key={m.id} mosque={m} hasActive={active.has(m.id)} large />
        ))}
      </section>
    </div>
  );
}
