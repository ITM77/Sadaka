'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/client';

/** Абсолютный адрес страницы: на сервере — путь, в браузере — с доменом. */
export function usePageUrl(path: string) {
  const [url, setUrl] = useState(path);
  useEffect(() => setUrl(window.location.origin + path), [path]);
  return url;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Кнопка «Поделиться»: системное меню, если есть, иначе копирование ссылки. Подписи — по-русски, переводятся здесь. */
export function ShareButton({
  path,
  title,
  className,
  iconClassName,
  icon,
  copiedIcon,
  label = 'Поделиться',
  copiedLabel = 'Скопировано',
}: {
  path: string;
  title: string;
  className?: string;
  iconClassName?: string;
  icon: ReactNode;
  copiedIcon: ReactNode;
  label?: string;
  copiedLabel?: string;
}) {
  const { t } = useI18n();
  const url = usePageUrl(path);
  const [state, setState] = useState<'idle' | 'copied'>('idle');

  const onClick = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    if (await copy(url)) {
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  return (
    <button type="button" onClick={onClick} className={className}>
      <span className={iconClassName} aria-hidden="true">
        {state === 'copied' ? copiedIcon : icon}
      </span>
      {state === 'copied' ? t(copiedLabel) : t(label)}
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? t('Ссылка скопирована') : ''}
      </span>
    </button>
  );
}

/** Блок «Ссылка для QR-кода»: адрес страницы и кнопка копирования. */
export function QrLink({ path }: { path: string }) {
  const { t } = useI18n();
  const url = usePageUrl(path);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3 self-stretch">
      <label htmlFor="qr-link" className="sr-only">
        {t('Ссылка для QR-кода')}
      </label>
      <input
        id="qr-link"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="input text-sm font-medium text-body"
      />
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={async () => {
          if (await copy(url)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }
        }}
      >
        <span aria-live="polite">{copied ? t('Ссылка скопирована') : t('Скопировать ссылку')}</span>
      </button>
    </div>
  );
}
