'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PointPicker, type Point } from '@/components/donor/MosqueMap';
import { IconLock, IconPin } from '@/components/icons';
import { ApiError, apiFetch, Mosque } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/client';
import { Field, FormCard, FormError, StickyAction } from './ui';

type Values = {
  name: string;
  city: string;
  address: string;
  description: string;
  phone: string;
  imam_name: string;
  imam_phone: string;
  latitude: string;
  longitude: string;
};

function initial(m?: Mosque): Values {
  return {
    name: m?.name ?? '',
    city: m?.city ?? '',
    address: m?.address ?? '',
    description: m?.description ?? '',
    phone: m?.phone ?? '',
    imam_name: m?.imam_name ?? '',
    imam_phone: m?.imam_phone ?? '', // владельцу API отдаёт номер имама, публике — нет
    latitude: m?.latitude != null ? String(m.latitude) : '',
    longitude: m?.longitude != null ? String(m.longitude) : '',
  };
}

const num = (s: string) => (s.trim() ? Number(s.trim().replace(',', '.')) : null);

/** Точка из полей формы — только если обе координаты числа в допустимых пределах. */
function parsePoint(lat: string, lng: string): Point | null {
  const a = num(lat);
  const b = num(lng);
  if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lng: b };
}

export default function MosqueForm({ mosque, onSaved }: { mosque?: Mosque; onSaved: (m: Mosque) => void }) {
  const { token } = useAuth();
  const { t } = useI18n();
  const [v, setV] = useState<Values>(() => initial(mosque));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof Values) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  // Точка на карте: карта и поля широты/долготы меняют одни и те же значения
  const point = parsePoint(v.latitude, v.longitude);
  const setPoint = (p: Point | null) =>
    setV((prev) => ({ ...prev, latitude: p ? String(p.lat) : '', longitude: p ? String(p.lng) : '' }));
  const [canGeo, setCanGeo] = useState(false);
  const [geo, setGeo] = useState<'idle' | 'asking' | 'denied' | 'error'>('idle');
  useEffect(() => setCanGeo('geolocation' in navigator), []);

  const locate = () => {
    setGeo('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const r = (n: number) => Math.round(n * 1e6) / 1e6;
        setPoint({ lat: r(pos.coords.latitude), lng: r(pos.coords.longitude) });
        setGeo('idle');
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const lat = num(v.latitude);
    const lng = num(v.longitude);
    if ((lat === null) !== (lng === null) || (lat !== null && (Number.isNaN(lat) || Number.isNaN(lng)))) {
      setError('Укажите и широту, и долготу числами — или оставьте оба поля пустыми.');
      return;
    }
    if (lat !== null && lng !== null && (Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
      setError('Широта — от −90 до 90, долгота — от −180 до 180.');
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: v.name,
        city: v.city,
        address: v.address,
        description: v.description,
        phone: v.phone,
        imam_name: v.imam_name,
        imam_phone: v.imam_phone,
        latitude: lat,
        longitude: lng,
        photo_urls: mosque?.photo_urls ?? [],
        logo_url: mosque?.logo_url ?? '',
      };
      const res = mosque
        ? await apiFetch<{ mosque: Mosque }>(`/mosques/${mosque.id}`, { method: 'PUT', body, token })
        : await apiFetch<{ mosque: Mosque }>('/mosques', { method: 'POST', body, token });
      onSaved(res.mosque);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="min-w-0 flex flex-col gap-3">
      <FormCard as="fieldset" title={t('Основное')}>
        <Field id="m-name" label={t('Название мечети')}>
          <input id="m-name" className="input" required value={v.name} onChange={set('name')} placeholder="Масҷиди Ҷомеъ" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="m-city" label={t('Город')}>
            <input id="m-city" className="input" required value={v.city} onChange={set('city')} placeholder="Душанбе" />
          </Field>
          <Field id="m-address" label={t('Адрес')}>
            <input id="m-address" className="input" required value={v.address} onChange={set('address')} />
          </Field>
        </div>
        <Field
          id="m-desc"
          label={t('О мечети')}
          hint={t('Коротко: история, сколько прихожан, чем живёт община. Видят жертвователи.')}
        >
          <textarea id="m-desc" className="input resize-y" rows={4} value={v.description} onChange={set('description')} />
        </Field>
      </FormCard>

      <FormCard as="fieldset" title={t('Имам и контакты')}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="m-imam" label={t('Имам')}>
            <input id="m-imam" className="input" value={v.imam_name} onChange={set('imam_name')} />
          </Field>
          <Field
            id="m-imam-phone"
            label={t('Телефон имама')}
            hint={
              <>
                <IconLock size={14} />
                {t('Видит только Комитет улемов')}
              </>
            }
          >
            <input
              id="m-imam-phone"
              className="input"
              type="tel"
              value={v.imam_phone}
              onChange={set('imam_phone')}
              placeholder="+992 …"
            />
          </Field>
        </div>
        <Field id="m-phone" label={t('Телефон мечети')} hint={t('Публикуется на странице мечети.')}>
          <input id="m-phone" className="input" type="tel" value={v.phone} onChange={set('phone')} placeholder="+992 …" />
        </Field>
      </FormCard>

      <FormCard
        as="fieldset"
        title={t('Место на карте')}
        description={t('Необязательно. Чтобы прихожане нашли мечеть рядом.')}
      >
        <div className="min-w-0">
          <p id="m-point" className="label">
            {t('Точка на карте')}
          </p>
          <PointPicker
            value={point}
            onChange={setPoint}
            label={t('Точка на карте: нажмите, чтобы поставить метку')}
            className="h-[260px] md:h-[320px] rounded-tile overflow-hidden"
          />
          <p className="hint">
            {t('Нажмите на карту или перетащите метку. Если вы сейчас в мечети — нажмите «Моё местоположение».')}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            {canGeo && (
              <button
                type="button"
                onClick={locate}
                disabled={geo === 'asking'}
                className="btn btn-secondary btn-sm !min-h-11"
              >
                <IconPin size={18} />
                {geo === 'asking' ? t('Определяем…') : t('Моё местоположение')}
              </button>
            )}
            {(v.latitude || v.longitude) && (
              <button type="button" onClick={() => setPoint(null)} className="link-action min-h-11 px-1">
                {t('Убрать точку')}
              </button>
            )}
          </div>
          {(geo === 'denied' || geo === 'error') && (
            <p className="hint" role="status">
              {geo === 'denied'
                ? t('Браузер не дал доступ к местоположению. Поставьте точку на карте вручную.')
                : t('Не получилось определить местоположение. Попробуйте ещё раз чуть позже.')}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Field id="m-lat" label={t('Широта')}>
            <input
              id="m-lat"
              className="input tabular"
              inputMode="decimal"
              value={v.latitude}
              onChange={set('latitude')}
              placeholder="38.5598"
            />
          </Field>
          <Field id="m-lng" label={t('Долгота')}>
            <input
              id="m-lng"
              className="input tabular"
              inputMode="decimal"
              value={v.longitude}
              onChange={set('longitude')}
              placeholder="68.7870"
            />
          </Field>
        </div>
      </FormCard>

      {error && <FormError>{t(error)}</FormError>}

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:px-1">
        {!mosque && (
          <p className="caption md:order-2 px-1 md:px-0">
            {t('Комитет улемов проверит заявку. После одобрения вы сможете открывать сборы.')}
          </p>
        )}
        <StickyAction>
          <button type="submit" className="btn btn-primary btn-lg btn-block md:w-auto" disabled={busy}>
            {busy ? t('Сохраняем…') : mosque ? t('Сохранить') : t('Отправить заявку')}
          </button>
        </StickyAction>
      </div>
    </form>
  );
}
