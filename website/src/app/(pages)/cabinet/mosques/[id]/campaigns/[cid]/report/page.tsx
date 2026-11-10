'use client';

import { notFound, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Alert, CabinetPage, Field, FormCard, FormError, Loading, StickyAction } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';
import { IconClose, IconPlus } from '@/components/icons';
import { ApiError, apiFetch, Campaign, Report } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isEnded } from '@/lib/cabinet';
import { useI18n } from '@/lib/i18n/client';
import { AID_KIND_LABELS, AidSummary } from '@/lib/needy';

export default function ReportPage({ params }: { params: { id: string; cid: string } }) {
  const { data, error, notFound: missing } = useMosqueCabinet(params.id);
  const { t } = useI18n();
  const campaign = data?.campaigns.find((c) => c.id === params.cid);
  if (missing || (data && !campaign)) notFound();
  const report = data?.reports.find((r) => r.campaign_id === params.cid);
  const back = `/cabinet/mosques/${params.id}`;
  const allowed = campaign && (campaign.status === 'completed' || isEnded(campaign));
  const open = !report || report.status === 'rejected';

  return (
    <CabinetPage
      title={campaign ? t('Отчёт: {title}', { title: campaign.title }) : t('Отчёт')}
      description={t('Отчёт увидят все жертвователи. Это главный механизм доверия Садаки.')}
      crumbs={[
        { href: '/cabinet', label: t('Кабинет') },
        { href: back, label: data?.mosque.name ?? t('Мечеть') },
      ]}
      current={t('Отчёт')}
    >
      {error && <Alert>{t(error)}</Alert>}
      {!data && !error && <Loading />}
      {campaign && !allowed && <Alert>{t('Отчёт можно опубликовать после завершения сбора.')}</Alert>}
      {campaign && allowed && !open && (
        <Alert tone="info">
          {report?.status === 'approved'
            ? t('Отчёт уже опубликован и принят Комитетом.')
            : t('Отчёт уже опубликован и проверяется Комитетом.')}
        </Alert>
      )}
      {campaign && allowed && open && <ReportForm campaign={campaign} previous={report} back={back} />}
    </CabinetPage>
  );
}

type Row = { item: string; cost: string };

/** Пунктирная кнопка «добавить» из макета: белая, рамка 1.5px dashed, текст #B34A12. */
const ADD_BTN =
  'w-full inline-flex items-center justify-center gap-2 min-h-[52px] px-4 rounded-tile border-[1.5px] border-dashed border-[#C6D6D5] bg-white text-sm font-semibold text-accent-700 hover:bg-accent-100 transition-colors';

const DEL_BTN = 'btn-icon disabled:opacity-40 disabled:pointer-events-none';

function ReportForm({ campaign, previous, back }: { campaign: Campaign; previous?: Report; back: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const { t, fmt } = useI18n();
  const [title, setTitle] = useState(previous?.title ?? t('Отчёт по сбору «{title}»', { title: campaign.title }));
  const [description, setDescription] = useState(previous?.description ?? '');
  const [rows, setRows] = useState<Row[]>(
    previous?.expenses.map((e) => ({ item: e.item, cost: String(e.cost) })) ?? [{ item: '', cost: '' }],
  );
  const [photos, setPhotos] = useState<string[]>(previous?.photo_urls.length ? previous.photo_urls : ['']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const parse = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'));
  const spent = rows.reduce((sum, r) => sum + (Number.isFinite(parse(r.cost)) ? parse(r.cost) : 0), 0);
  const rest = campaign.current_amount - spent;
  const updateRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  // Сбор «Помощь нуждающимся»: статьи расходов из записанных выдач семьям, по строке на вид помощи
  const welfare = campaign.category === 'welfare';
  const [aidBusy, setAidBusy] = useState(false);
  const [aidMsg, setAidMsg] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null);
  const prefillAid = async () => {
    setAidBusy(true);
    setAidMsg(null);
    try {
      const { aid } = await apiFetch<{ aid: AidSummary }>(`/me/campaigns/${campaign.id}/aid`, { token });
      if (aid.by_kind.length === 0) {
        setAidMsg({ tone: 'info', text: t('Из этого сбора ещё не записано ни одной выдачи помощи.') });
        return;
      }
      const aidRows: Row[] = aid.by_kind.map((k) => ({
        item: `${t(AID_KIND_LABELS[k.kind] ?? k.kind)} — ${k.families} ${fmt.plural(k.families, ['семья', 'семьи', 'семей'])}`,
        cost: String(k.amount),
      }));
      const typed = rows.filter((r) => r.item.trim() || r.cost.trim());
      // Уже введённые статьи не трогаем: выдачи добавляются в конец, и только с согласия
      if (
        typed.length > 0 &&
        !confirm(t('Добавить выдачи помощи в конец списка расходов? Уже введённые статьи останутся.'))
      )
        return;
      setRows([...typed, ...aidRows]);
      setAidMsg({
        tone: 'success',
        text: t('Подставлено выдач: {n} на {sum} — {families} {word}. Проверьте суммы.', {
          n: aid.count,
          sum: fmt.money(aid.amount),
          families: aid.families,
          word: fmt.plural(aid.families, ['семья', 'семьи', 'семей']),
        }),
      });
    } catch (err) {
      setAidMsg({ tone: 'error', text: t(err instanceof ApiError ? err.message : 'Не удалось загрузить выдачи помощи') });
    } finally {
      setAidBusy(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const expenses = rows
      .filter((r) => r.item.trim() || r.cost.trim())
      .map((r) => ({ item: r.item.trim(), cost: Math.round(parse(r.cost) * 100) / 100 }));
    if (expenses.length === 0) return setError('Добавьте хотя бы одну статью расходов');
    if (expenses.some((x) => !x.item || !Number.isFinite(x.cost) || x.cost <= 0))
      return setError('У каждой статьи должны быть название и сумма больше нуля');
    const photoUrls = photos.map((p) => p.trim()).filter(Boolean);
    if (photoUrls.length === 0) return setError('Приложите хотя бы одну ссылку на фото подтверждения');
    if (photoUrls.some((u) => !/^https?:\/\//i.test(u))) return setError('Ссылки на фото должны начинаться с https://');

    setBusy(true);
    try {
      await apiFetch(`/campaigns/${campaign.id}/report`, {
        method: 'POST',
        token,
        body: { title, description, expenses, photo_urls: photoUrls },
      });
      router.replace(back);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось опубликовать отчёт');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {previous?.status === 'rejected' && (
        <Alert title={t('Комитет отклонил прошлый отчёт.')}>
          {previous.moderation_note ? `«${previous.moderation_note}». ` : ''}
          {t('Исправьте и отправьте снова.')}
        </Alert>
      )}

      <div className="layout-aside">
        <form id="report-form" onSubmit={onSubmit} className="min-w-0 flex flex-col gap-3">
          <FormCard title={t('Что сделано')}>
            <Field id="r-title" label={t('Заголовок')}>
              <input id="r-title" className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field
              id="r-desc"
              label={t('Описание')}
              hint={t('Опишите, что купили или отремонтировали и какой результат.')}
            >
              <textarea
                id="r-desc"
                className="input resize-y"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </FormCard>

          <FormCard as="fieldset" title={t('Расходы')}>
            {welfare && (
              <div className="tile flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="flex-1 min-w-0 text-[13px] leading-[18px] text-ink">
                  {t('Выдачи семьям из этого сбора можно подставить в расходы — по строке на каждый вид помощи. Имён в отчёте не будет.')}
                </p>
                <button
                  type="button"
                  className="btn btn-white btn-sm !min-h-11 shrink-0"
                  disabled={aidBusy}
                  onClick={prefillAid}
                >
                  {aidBusy ? t('Загружаем…') : t('Подставить выдачи помощи')}
                </button>
              </div>
            )}
            {aidMsg && <Alert tone={aidMsg.tone}>{aidMsg.text}</Alert>}
            <div className="flex flex-col gap-2.5">
              <div
                aria-hidden="true"
                className="hidden sm:grid grid-cols-[minmax(0,1fr)_160px_44px] gap-2 px-0.5 caption"
              >
                <span>{t('Статья')}</span>
                <span>{t('Сумма, сомони')}</span>
                <span />
              </div>
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_44px] sm:grid-cols-[minmax(0,1fr)_160px_44px] gap-2 items-center pb-3 sm:pb-0 border-b border-line sm:border-0 last:border-0 last:pb-0"
                >
                  <input
                    aria-label={t('Статья расходов {n}', { n: i + 1 })}
                    className="input col-span-2 sm:col-span-1"
                    placeholder={t('Шифер, 40 листов')}
                    value={r.item}
                    onChange={(e) => updateRow(i, { item: e.target.value })}
                  />
                  <input
                    aria-label={t('Сумма {n}, сомони', { n: i + 1 })}
                    className="input font-semibold tabular sm:text-right"
                    inputMode="decimal"
                    placeholder={t('Сумма, с.')}
                    value={r.cost}
                    onChange={(e) => updateRow(i, { cost: e.target.value.replace(/[^\d.,\s]/g, '') })}
                  />
                  <button
                    type="button"
                    className={DEL_BTN}
                    aria-label={t('Удалить статью {n}', { n: i + 1 })}
                    disabled={rows.length === 1}
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                  >
                    <IconClose size={18} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className={ADD_BTN} onClick={() => setRows((rs) => [...rs, { item: '', cost: '' }])}>
              <IconPlus size={16} />
              {t('Статья расходов')}
            </button>
          </FormCard>

          <FormCard
            as="fieldset"
            title={t('Фото чеков и работ')}
            description={t(
              'Ссылки на фото чеков и результата работ — минимум одна, лучше чек на каждую крупную статью. Загрузка файлов прямо на сайт появится позже.',
            )}
          >
            <div className="flex flex-col gap-2">
              {photos.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    aria-label={t('Ссылка на фото {n}', { n: i + 1 })}
                    className="input"
                    type="url"
                    inputMode="url"
                    placeholder="https://…"
                    value={p}
                    onChange={(e) => setPhotos((ps) => ps.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <button
                    type="button"
                    className={DEL_BTN}
                    aria-label={t('Удалить фото {n}', { n: i + 1 })}
                    disabled={photos.length === 1}
                    onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                  >
                    <IconClose size={18} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className={ADD_BTN} onClick={() => setPhotos((ps) => [...ps, ''])}>
              <IconPlus size={16} />
              {t('Ещё фото')}
            </button>
          </FormCard>
        </form>

        <aside aria-labelledby="report-total" className="aside-sticky min-w-0 flex flex-col gap-3">
          <section className="panel">
            <h2 id="report-total" className="overtitle">
              {t('Итог')}
            </h2>
            <dl className="mt-2 text-sm leading-5 tabular">
              <div className="flex justify-between gap-3 min-h-[32px] items-center">
                <dt className="text-body">{t('Собрано')}</dt>
                <dd className="font-medium text-ink text-right whitespace-nowrap">{fmt.money(campaign.current_amount)}</dd>
              </div>
              <div className="flex justify-between gap-3 min-h-[32px] items-center">
                <dt className="text-body">{t('Пожертвований')}</dt>
                <dd className="font-medium text-ink text-right">{campaign.donation_count}</dd>
              </div>
              <div className="flex justify-between gap-3 min-h-[32px] items-center">
                <dt className="text-body">{t('Потрачено')}</dt>
                <dd className="font-medium text-ink text-right whitespace-nowrap">{fmt.money(spent)}</dd>
              </div>
              <div className="divider my-2" />
              <div className="flex justify-between gap-3 items-baseline" aria-live="polite">
                <dt className="title-sm">{t('Остаток')}</dt>
                <dd className={`num-lg text-right whitespace-nowrap ${rest < 0 ? 'text-[#B42318]' : 'text-ink'}`}>
                  {fmt.money(rest)}
                </dd>
              </div>
            </dl>
            <p className={`mt-3 ${rest < 0 ? 'alert-error' : 'alert bg-app text-body'}`}>
              {rest < 0
                ? t('Расходы больше, чем собрано. Проверьте суммы или объясните разницу в описании.')
                : t('Объясните остаток в описании — например, «передан на следующий сбор».')}
            </p>

            {error && (
              <div className="mt-3">
                <FormError>{t(error)}</FormError>
              </div>
            )}
            <div className="mt-4">
              <StickyAction>
                <button type="submit" form="report-form" className="btn btn-primary btn-lg btn-block" disabled={busy}>
                  {busy ? t('Публикуем…') : t('Опубликовать отчёт')}
                </button>
              </StickyAction>
            </div>
            <p className="caption mt-2 text-center md:text-left">{t('Отчёт отправится Комитету улемов на проверку.')}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
