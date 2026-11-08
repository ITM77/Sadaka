'use client';

import { FormEvent, useState } from 'react';
import { IconLock } from '@/components/icons';
import { ApiError, apiFetch, Mosque } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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

export default function MosqueForm({ mosque, onSaved }: { mosque?: Mosque; onSaved: (m: Mosque) => void }) {
  const { token } = useAuth();
  const [v, setV] = useState<Values>(() => initial(mosque));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof Values) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const lat = v.latitude.trim() ? Number(v.latitude.replace(',', '.')) : null;
    const lng = v.longitude.trim() ? Number(v.longitude.replace(',', '.')) : null;
    if ((lat === null) !== (lng === null) || (lat !== null && (Number.isNaN(lat) || Number.isNaN(lng)))) {
      setError('Укажите и широту, и долготу числами — или оставьте оба поля пустыми.');
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
      <FormCard as="fieldset" title="Основное">
        <Field id="m-name" label="Название мечети">
          <input id="m-name" className="input" required value={v.name} onChange={set('name')} placeholder="Масҷиди Ҷомеъ" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="m-city" label="Город">
            <input id="m-city" className="input" required value={v.city} onChange={set('city')} placeholder="Душанбе" />
          </Field>
          <Field id="m-address" label="Адрес">
            <input id="m-address" className="input" required value={v.address} onChange={set('address')} />
          </Field>
        </div>
        <Field id="m-desc" label="О мечети" hint="Коротко: история, сколько прихожан, чем живёт община. Видят жертвователи.">
          <textarea id="m-desc" className="input resize-y" rows={4} value={v.description} onChange={set('description')} />
        </Field>
      </FormCard>

      <FormCard as="fieldset" title="Имам и контакты">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="m-imam" label="Имам">
            <input id="m-imam" className="input" value={v.imam_name} onChange={set('imam_name')} />
          </Field>
          <Field
            id="m-imam-phone"
            label="Телефон имама"
            hint={
              <>
                <IconLock size={14} />
                Видит только Комитет улемов
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
        <Field id="m-phone" label="Телефон мечети" hint="Публикуется на странице мечети.">
          <input id="m-phone" className="input" type="tel" value={v.phone} onChange={set('phone')} placeholder="+992 …" />
        </Field>
      </FormCard>

      <FormCard as="fieldset" title="Место на карте" description="Необязательно. Чтобы прихожане нашли мечеть рядом.">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Field id="m-lat" label="Широта">
            <input
              id="m-lat"
              className="input tabular"
              inputMode="decimal"
              value={v.latitude}
              onChange={set('latitude')}
              placeholder="38.5598"
            />
          </Field>
          <Field id="m-lng" label="Долгота">
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

      {error && <FormError>{error}</FormError>}

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:px-1">
        {!mosque && (
          <p className="caption md:order-2 px-1 md:px-0">
            Комитет улемов проверит заявку. После одобрения вы сможете открывать сборы.
          </p>
        )}
        <StickyAction>
          <button type="submit" className="btn btn-primary btn-lg btn-block md:w-auto" disabled={busy}>
            {busy ? 'Сохраняем…' : mosque ? 'Сохранить' : 'Отправить заявку'}
          </button>
        </StickyAction>
      </div>
    </form>
  );
}
