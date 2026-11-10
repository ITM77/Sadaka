'use client';

import 'leaflet/dist/leaflet.css';
import type { LatLngExpression, Map as LeafletMap, Marker } from 'leaflet';
import { useRouter } from 'next/navigation';
import { RefObject, useEffect, useRef, useState } from 'react';
import { Mosque } from '@/lib/api';
import { useI18n } from '@/lib/i18n/client';

/**
 * Карта мечетей на Leaflet (без react-leaflet). Leaflet грузится только в браузере —
 * на сервере остаётся пустой блок нужной высоты. Метки — divIcon в цветах сайта:
 * белая с оранжевой иконкой — мечеть, оранжевая и крупнее — у мечети идёт сбор.
 */

type Leaflet = typeof import('leaflet');
export type Point = { lat: number; lng: number };

/** Центр Таджикистана — вид по умолчанию. */
export const TJ_CENTER: Point = { lat: 38.86, lng: 71.28 };
const TJ_ZOOM = 6;

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

let leafletPromise: Promise<Leaflet> | null = null;

/** Один импорт Leaflet на всю страницу. */
function loadLeaflet(): Promise<Leaflet> {
  leafletPromise ??= import('leaflet').then((m) => ((m as unknown as { default?: Leaflet }).default ?? m) as Leaflet);
  return leafletPromise;
}

/** Координаты мечети, если обе заданы. */
export function pointOf(m: Pick<Mosque, 'latitude' | 'longitude'>): Point | null {
  return m.latitude != null && m.longitude != null ? { lat: m.latitude, lng: m.longitude } : null;
}

/** Расстояние по прямой, км (формула гаверсинусов). */
export function distanceKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Иконка lucide landmark — та же, что IconMosque
const LANDMARK =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>';

function mosqueIcon(L: Leaflet, active: boolean, selected: boolean) {
  const size = active ? 36 : 30;
  const tone = active ? 'bg-accent-500 text-ink' : 'bg-white text-accent-700';
  const ring = selected ? 'border-ink' : active ? 'border-white' : 'border-accent-500';
  return L.divIcon({
    className: '',
    html: `<span class="flex items-center justify-center w-full h-full rounded-full border-2 ${ring} ${tone} shadow-[0_1px_4px_rgba(20,24,30,0.35)]">${LANDMARK}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function userIcon(L: Leaflet) {
  return L.divIcon({
    className: '',
    html: '<span class="block w-full h-full rounded-full bg-sec border-[3px] border-white ring-[6px] ring-sec/25"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// Стили Leaflet перебиваем: шрифт сайта, кнопки масштаба 44 px, ссылки в цвет сайта
const CONTAINER =
  'isolate z-0 bg-app !font-sans [&_.leaflet-bar_a]:!w-11 [&_.leaflet-bar_a]:!h-11 [&_.leaflet-bar_a]:!leading-[44px] [&_.leaflet-bar_a]:!text-ink [&_.leaflet-popup-content-wrapper]:!rounded-tile [&_.leaflet-popup-content]:!my-3 [&_.leaflet-popup-content]:!mx-3.5';

/** Создаёт карту в контейнере; вернёт null, если компонент уже размонтирован. */
function useLeafletMap(
  ref: RefObject<HTMLDivElement>,
  options: (L: Leaflet) => import('leaflet').MapOptions,
) {
  const [state, setState] = useState<{ L: Leaflet; map: LeafletMap } | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    let observer: ResizeObserver | null = null;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { center: [TJ_CENTER.lat, TJ_CENTER.lng], zoom: TJ_ZOOM, ...optionsRef.current(L) });
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
      // Контейнер может поменять размер без resize окна (раскладка, шрифты)
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(ref.current);
      setState({ L, map });
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
      setState(null);
    };
  }, [ref]);
  return state;
}

type MapProps = {
  mosques: Mosque[];
  /** id мечетей, у которых идёт сбор */
  activeIds?: string[];
  selectedId?: string | null;
  userLocation?: Point | null;
  /** Без перетаскивания, масштаба и подсказок — для страницы мечети. */
  staticView?: boolean;
  label: string;
  className?: string;
};

export default function MosqueMap({
  mosques,
  activeIds = [],
  selectedId,
  userLocation,
  staticView = false,
  label,
  className = '',
}: MapProps) {
  const { t } = useI18n();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const fitted = useRef<{ map: LeafletMap | null; key: string }>({ map: null, key: '' });
  const leaflet = useLeafletMap(ref, () =>
    staticView
      ? {
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          zoomControl: false,
        }
      : { scrollWheelZoom: false },
  );

  // Колёсико масштабирует только после клика по карте — иначе мешает прокрутке страницы
  useEffect(() => {
    if (!leaflet || staticView) return;
    const { map } = leaflet;
    const on = () => map.scrollWheelZoom.enable();
    const off = () => map.scrollWheelZoom.disable();
    map.on('click focus', on);
    map.on('blur mouseout', off);
    return () => {
      map.off('click focus', on);
      map.off('blur mouseout', off);
    };
  }, [leaflet, staticView]);

  useEffect(() => {
    if (!leaflet) return;
    const { L, map } = leaflet;
    const active = new Set(activeIds);
    const layer = L.layerGroup().addTo(map);
    const markers = new Map<string, Marker>();
    const located: { m: Mosque; p: Point }[] = [];
    for (const m of mosques) {
      const p = pointOf(m);
      if (p) located.push({ m, p });
    }

    for (const { m, p } of located) {
      const isActive = active.has(m.id);
      const marker = L.marker([p.lat, p.lng], {
        icon: mosqueIcon(L, isActive, m.id === selectedId),
        title: m.name,
        alt: m.name,
        keyboard: !staticView,
        interactive: !staticView,
        zIndexOffset: m.id === selectedId ? 1000 : isActive ? 500 : 0,
      }).addTo(layer);
      if (!staticView) marker.bindPopup(() => popup(m, isActive));
      markers.set(m.id, marker);
    }

    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon(L),
        title: t('Вы здесь'),
        alt: t('Вы здесь'),
        keyboard: false,
        zIndexOffset: 2000,
      })
        .bindTooltip(t('Вы здесь'))
        .addTo(layer);
    }

    // Подгоняем вид только при смене набора точек, а не при выборе метки
    const key = located.map((x) => x.m.id).join(',') + (userLocation ? `|${userLocation.lat},${userLocation.lng}` : '');
    if (key !== fitted.current.key || map !== fitted.current.map) {
      fitted.current = { map, key };
      let pts: LatLngExpression[] = located.map((x) => [x.p.lat, x.p.lng]);
      if (userLocation) {
        // Рядом со мной: пользователь и три ближайшие мечети
        const near = [...located].sort((a, b) => distanceKm(userLocation, a.p) - distanceKm(userLocation, b.p)).slice(0, 3);
        pts = [[userLocation.lat, userLocation.lng], ...near.map((x): LatLngExpression => [x.p.lat, x.p.lng])];
      }
      if (pts.length === 1) map.setView(pts[0], staticView ? 15 : 14, { animate: false });
      else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15, animate: false });
      else map.setView([TJ_CENTER.lat, TJ_CENTER.lng], TJ_ZOOM, { animate: false });
    }

    if (selectedId && !staticView) markers.get(selectedId)?.openPopup();

    return () => {
      layer.remove();
    };

    // Содержимое всплывающей подсказки: название-ссылка, город, «Идёт сбор»
    function popup(m: Mosque, isActive: boolean) {
      const box = document.createElement('div');
      box.className = 'flex flex-col items-start gap-1 min-w-[150px] max-w-[220px] font-sans';
      const a = document.createElement('a');
      a.href = `/mosques/${m.id}`;
      a.textContent = m.name;
      a.className = 'text-sm leading-5 font-semibold !text-accent-700 hover:!text-accent-800';
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        router.push(`/mosques/${m.id}`);
      });
      box.appendChild(a);
      if (m.city || m.address) {
        const city = document.createElement('span');
        city.className = 'text-xs leading-[17px] text-muted';
        city.textContent = [m.city, m.address].filter(Boolean).join(' · ');
        box.appendChild(city);
      }
      if (isActive) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-sec mt-1';
        badge.textContent = t('Идёт сбор');
        box.appendChild(badge);
      }
      return box;
    }
  }, [leaflet, mosques, activeIds, selectedId, userLocation, staticView, t, router]);

  return <div ref={ref} role="region" aria-label={label} className={`${CONTAINER} ${className}`} />;
}

/**
 * Выбор точки на карте для формы мечети: клик ставит метку, метку можно перетащить.
 * value — текущая точка (или null), onChange получает координаты с точностью ~10 см.
 */
export function PointPicker({
  value,
  onChange,
  label,
  className = '',
}: {
  value: Point | null;
  onChange: (p: Point) => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const marker = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const leaflet = useLeafletMap(ref, () => ({ scrollWheelZoom: false }));

  // Клик по карте — поставить метку
  useEffect(() => {
    if (!leaflet) return;
    const { map } = leaflet;
    const onClick = (e: import('leaflet').LeafletMouseEvent) => {
      map.scrollWheelZoom.enable();
      onChangeRef.current(round(e.latlng));
    };
    const off = () => map.scrollWheelZoom.disable();
    map.on('click', onClick);
    map.on('mouseout', off);
    return () => {
      map.off('click', onClick);
      map.off('mouseout', off);
    };
  }, [leaflet]);

  // Метка следует за значением; если точку задали снаружи (поля, геолокация) — показываем её
  const lat = value?.lat;
  const lng = value?.lng;
  useEffect(() => {
    if (!leaflet) return;
    const { L, map } = leaflet;
    if (lat == null || lng == null) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = L.marker([lat, lng], { icon: mosqueIcon(L, true, false), draggable: true, autoPan: true })
        .on('dragend', (e) => onChangeRef.current(round((e.target as Marker).getLatLng())))
        .addTo(map);
      map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: false });
      return;
    }
    const cur = marker.current.getLatLng();
    if (cur.lat === lat && cur.lng === lng) return;
    marker.current.setLatLng([lat, lng]);
    if (!map.getBounds().pad(-0.1).contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [leaflet, lat, lng]);

  useEffect(() => () => void (marker.current = null), [leaflet]);

  return <div ref={ref} role="region" aria-label={label} className={`${CONTAINER} !cursor-crosshair ${className}`} />;
}

function round(p: { lat: number; lng: number }): Point {
  const r = (n: number) => Math.round(n * 1e6) / 1e6;
  // Долготу приводим к −180..180: карту можно прокрутить за линию перемены дат
  let lng = ((((p.lng + 180) % 360) + 360) % 360) - 180;
  if (lng === -180 && p.lng > 0) lng = 180;
  return { lat: r(Math.max(-90, Math.min(90, p.lat))), lng: r(lng) };
}
