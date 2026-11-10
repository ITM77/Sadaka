// Уведомления на сайте: типы, запросы к API и тексты по виду уведомления.
import { apiFetch } from './api';
import type { Fmt, Vars } from './i18n/core';

export type Notification = {
  id: string;
  created_at: string;
  kind: string;
  mosque_id?: string;
  campaign_id?: string;
  object_title: string; // название сбора или мечети, для savob_event — название праздника
  reason?: string; // причина от Комитета (отклонение, блокировка)
  multiplier?: number;
  read_at: string | null;
};

export type NotificationList = { notifications: Notification[]; unread: number };

export type Tone = 'good' | 'bad' | 'info';

export type NotificationView = { title: string; body?: string; href: string; tone: Tone };

type T = (s: string, v?: Vars) => string;

/* ---------- API ---------- */

export function fetchNotifications(token: string, limit: number, offset = 0) {
  return apiFetch<NotificationList>(`/me/notifications?limit=${limit}&offset=${offset}`, { token });
}

export function fetchUnread(token: string) {
  return apiFetch<{ unread: number }>('/me/notifications/unread', { token }).then((r) => r?.unread ?? 0);
}

/** Без ids — отметить прочитанными все. Ответ 204 → null. */
export function markNotificationsRead(token: string, ids?: string[]) {
  return apiFetch<null>('/me/notifications/read', { method: 'POST', token, body: ids ? { ids } : {} });
}

/* ---------- Синхронизация колокольчика и страницы ---------- */

export const NOTIFY_EVENT = 'sadaka:notifications';

/** Сообщить колокольчику, что прочитанное изменилось: число — новый счётчик, без числа — перезапросить. */
export function emitNotificationsChanged(unread?: number) {
  window.dispatchEvent(new CustomEvent(NOTIFY_EVENT, { detail: unread }));
}

/* ---------- Тексты ---------- */

export function describeNotification(n: Notification, t: T): NotificationView {
  const title = n.object_title;
  const reason = n.reason?.trim();
  const mosque = n.mosque_id ? `/cabinet/mosques/${n.mosque_id}` : '/cabinet';
  const campaign = n.campaign_id ? `/campaigns/${n.campaign_id}` : '/campaigns';
  const cabinetCampaign = (page: 'edit' | 'report') =>
    n.mosque_id && n.campaign_id ? `/cabinet/mosques/${n.mosque_id}/campaigns/${n.campaign_id}/${page}` : mosque;
  // С причиной Комитета — одна фраза, без причины — другая
  const why = (withReason: string, without: string) => (reason ? t(withReason, { reason }) : t(without));

  switch (n.kind) {
    // Представителю мечети
    case 'mosque_approved':
      return {
        title: t('Мечеть «{title}» одобрена', { title }),
        body: t('Комитет улемов проверил заявку. Теперь можно открывать сборы.'),
        href: mosque,
        tone: 'good',
      };
    case 'mosque_rejected':
      return {
        title: t('Заявка мечети «{title}» отклонена', { title }),
        body: why(
          'Причина: «{reason}». Исправьте данные и отправьте заявку снова.',
          'Исправьте данные и отправьте заявку снова.',
        ),
        href: n.mosque_id ? `${mosque}/edit` : mosque,
        tone: 'bad',
      };
    case 'mosque_blocked':
      return {
        title: t('Мечеть «{title}» заблокирована', { title }),
        body: why('Причина: «{reason}». Пожертвования сейчас не принимаются.', 'Пожертвования сейчас не принимаются.'),
        href: mosque,
        tone: 'bad',
      };
    case 'mosque_unblocked':
      return {
        title: t('Мечеть «{title}» снова работает', { title }),
        body: t('Комитет улемов снял блокировку — пожертвования снова принимаются.'),
        href: mosque,
        tone: 'good',
      };
    case 'campaign_approved':
      return {
        title: t('Сбор «{title}» одобрен', { title }),
        body: t('Комитет улемов открыл сбор — его уже видят жертвователи.'),
        href: campaign,
        tone: 'good',
      };
    case 'campaign_rejected':
      return {
        title: t('Сбор «{title}» отклонён', { title }),
        body: why(
          'Причина: «{reason}». Исправьте сбор и отправьте на одобрение снова.',
          'Исправьте сбор и отправьте на одобрение снова.',
        ),
        href: cabinetCampaign('edit'),
        tone: 'bad',
      };
    case 'report_approved':
      return {
        title: t('Отчёт по сбору «{title}» принят', { title }),
        body: t('Отчёт опубликован, жертвователи видят расходы. Можно открывать новый сбор.'),
        href: n.campaign_id ? campaign : mosque,
        tone: 'good',
      };
    case 'report_rejected':
      return {
        title: t('Отчёт по сбору «{title}» отклонён', { title }),
        body: why('Причина: «{reason}». Исправьте отчёт и отправьте снова.', 'Исправьте отчёт и отправьте снова.'),
        href: cabinetCampaign('report'),
        tone: 'bad',
      };

    // Жертвователю
    case 'campaign_finished':
      return {
        title: t('Сбор «{title}» завершён', { title }),
        body: t('Спасибо, что поддержали! Мечеть готовит отчёт о расходах.'),
        href: campaign,
        tone: 'info',
      };
    case 'report_published':
      return {
        title: t('Мечеть отчиталась по сбору «{title}»', { title }),
        body: t('Посмотрите, на что ушли пожертвования.'),
        href: campaign,
        tone: 'good',
      };

    // Всем
    case 'savob_event':
      return {
        title: t('Начался {title}: Савоб за пожертвования ×{n}', { title: t(title), n: n.multiplier ?? 2 }),
        body: t('Каждое пожертвование приносит больше Савоба.'),
        href: '/campaigns',
        tone: 'info',
      };
  }

  return { title: title || t('Новое уведомление'), href: '/profile/notifications', tone: 'info' };
}

/* ---------- Даты ---------- */

const TZ = 'Asia/Dushanbe';
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const dayKey = (d: Date) => dayKeyFmt.format(d); // «2026-11-10» по Душанбе
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «09:20» по Душанбе. */
export const timeOf = (iso: string) => timeFmt.format(new Date(iso));

function recent(iso: string, now: Date) {
  const key = dayKey(new Date(iso));
  return key === dayKey(now) || key === dayKey(new Date(now.getTime() - 86_400_000));
}

/** Заголовок группы на странице: «Сегодня» / «Вчера» / «9 ноября» / «9 ноября 2025 г.». */
export function dayLabel(iso: string, fmt: Fmt, now = new Date()) {
  if (recent(iso, now)) return capitalize(fmt.daysAgo(iso));
  return dayKey(new Date(iso)).slice(0, 4) === dayKey(now).slice(0, 4) ? fmt.dayMonth(iso) : fmt.date(iso);
}

/** Подпись в выпадающем списке: «сегодня, 09:20» / «9 нояб., 09:20». */
export function whenLabel(iso: string, fmt: Fmt, now = new Date()) {
  return recent(iso, now) ? `${fmt.daysAgo(iso)}, ${timeOf(iso)}` : fmt.short(iso);
}
