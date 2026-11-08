import { cookies } from 'next/headers';
import { DEFAULT_LANG, isLang, LANG_COOKIE, makeI18n } from './core';

/** Язык и переводчик для серверных компонентов: язык берётся из cookie. */
export function getI18n() {
  const v = cookies().get(LANG_COOKIE)?.value;
  return makeI18n(isLang(v) ? v : DEFAULT_LANG);
}
