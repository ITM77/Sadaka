'use client';

import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useMemo, useTransition } from 'react';
import { DEFAULT_LANG, I18n, Lang, LANG_COOKIE, LANG_LABELS, LANGS, makeI18n } from './core';

const Ctx = createContext<I18n>(makeI18n(DEFAULT_LANG));

/** Корневой провайдер: язык приходит с сервера (из cookie), чтобы разметка совпала при гидратации. */
export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => makeI18n(lang), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Переводчик для клиентских компонентов. */
export const useI18n = () => useContext(Ctx);

/** Смена языка: cookie на год и перерисовка серверных страниц. */
export function useSetLang() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = useCallback(
    (lang: Lang) => {
      document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = lang;
      start(() => router.refresh());
    },
    [router],
  );
  return { set, pending };
}

/** Переключатель «ТҶ / РУ» — сегмент из двух кнопок. */
export function LangSwitch({ className = '', tone = 'app' }: { className?: string; tone?: 'app' | 'white' }) {
  const { lang } = useI18n();
  const { set, pending } = useSetLang();
  return (
    <div
      role="group"
      aria-label="Забон / Язык"
      className={`inline-flex gap-0.5 p-1 rounded-full ${tone === 'white' ? 'bg-white' : 'bg-app'} ${className}`}
      aria-busy={pending || undefined}
    >
      {LANGS.map((l) => {
        const on = l === lang;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={on}
            title={LANG_LABELS[l].name}
            onClick={() => !on && set(l)}
            className={`min-w-[40px] min-h-[36px] px-2.5 rounded-full text-[13px] font-semibold transition-colors ${
              on ? 'bg-white text-accent-700 shadow-xs' : 'text-ink hover:text-accent-700'
            } ${tone === 'white' && on ? '!bg-accent-100' : ''}`}
          >
            <span aria-hidden="true">{LANG_LABELS[l].short}</span>
            <span className="sr-only">{LANG_LABELS[l].name}</span>
          </button>
        );
      })}
    </div>
  );
}
