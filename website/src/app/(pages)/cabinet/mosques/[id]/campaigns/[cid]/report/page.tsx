'use client';

import { notFound, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Alert, CabinetPage, Field, FormCard, FormError, Loading, StickyAction } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';
import { IconClose, IconPlus } from '@/components/icons';
import { ApiError, apiFetch, Campaign, formatMoney, Report } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isEnded } from '@/lib/cabinet';

export default function ReportPage({ params }: { params: { id: string; cid: string } }) {
  const { data, error, notFound: missing } = useMosqueCabinet(params.id);
  const campaign = data?.campaigns.find((c) => c.id === params.cid);
  if (missing || (data && !campaign)) notFound();
  const report = data?.reports.find((r) => r.campaign_id === params.cid);
  const back = `/cabinet/mosques/${params.id}`;
  const allowed = campaign && (campaign.status === 'completed' || isEnded(campaign));
  const open = !report || report.status === 'rejected';

  return (
    <CabinetPage
      title={campaign ? `Отчёт: ${campaign.title}` : 'Отчёт'}
      description="Отчёт увидят все жертвователи. Это главный механизм доверия Садаки."
      crumbs={[
        { href: '/cabinet', label: 'Кабинет' },
        { href: back, label: data?.mosque.name ?? 'Мечеть' },
      ]}
      current="Отчёт"
    >
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Loading />}
      {campaign && !allowed && <Alert>Отчёт можно опубликовать после завершения сбора.</Alert>}
      {campaign && allowed && !open && (
        <Alert tone="info">
          Отчёт уже опубликован и {report?.status === 'approved' ? 'принят Комитетом' : 'проверяется Комитетом'}.
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
  const [title, setTitle] = useState(previous?.title ?? `Отчёт по сбору «${campaign.title}»`);
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
        <Alert title="Комитет отклонил прошлый отчёт.">
          {previous.moderation_note ? `«${previous.moderation_note}». ` : ''}Исправьте и отправьте снова.
        </Alert>
      )}

      <div className="layout-aside">
        <form id="report-form" onSubmit={onSubmit} className="min-w-0 flex flex-col gap-3">
          <FormCard title="Что сделано">
            <Field id="r-title" label="Заголовок">
              <input id="r-title" className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field id="r-desc" label="Описание" hint="Опишите, что купили или отремонтировали и какой результат.">
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

          <FormCard as="fieldset" title="Расходы">
            <div className="flex flex-col gap-2.5">
              <div
                aria-hidden="true"
                className="hidden sm:grid grid-cols-[minmax(0,1fr)_160px_44px] gap-2 px-0.5 caption"
              >
                <span>Статья</span>
                <span>Сумма, сомони</span>
                <span />
              </div>
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_44px] sm:grid-cols-[minmax(0,1fr)_160px_44px] gap-2 items-center pb-3 sm:pb-0 border-b border-line sm:border-0 last:border-0 last:pb-0"
                >
                  <input
                    aria-label={`Статья расходов ${i + 1}`}
                    className="input col-span-2 sm:col-span-1"
                    placeholder="Шифер, 40 листов"
                    value={r.item}
                    onChange={(e) => updateRow(i, { item: e.target.value })}
                  />
                  <input
                    aria-label={`Сумма ${i + 1}, сомони`}
                    className="input font-semibold tabular sm:text-right"
                    inputMode="decimal"
                    placeholder="Сумма, с."
                    value={r.cost}
                    onChange={(e) => updateRow(i, { cost: e.target.value.replace(/[^\d.,\s]/g, '') })}
                  />
                  <button
                    type="button"
                    className={DEL_BTN}
                    aria-label={`Удалить статью ${i + 1}`}
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
              Статья расходов
            </button>
          </FormCard>

          <FormCard
            as="fieldset"
            title="Фото чеков и работ"
            description="Ссылки на фото чеков и результата работ — минимум одна, лучше чек на каждую крупную статью. Загрузка файлов прямо на сайт появится позже."
          >
            <div className="flex flex-col gap-2">
              {photos.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    aria-label={`Ссылка на фото ${i + 1}`}
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
                    aria-label={`Удалить фото ${i + 1}`}
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
              Ещё фото
            </button>
          </FormCard>
        </form>

        <aside aria-labelledby="report-total" className="aside-sticky min-w-0 flex flex-col gap-3">
          <section className="panel">
            <h2 id="report-total" className="overtitle">
              Итог
            </h2>
            <dl className="mt-2 text-sm leading-5 tabular">
              <div className="flex justify-between gap-3 min-h-[32px] items-center">
                <dt className="text-body">Собрано</dt>
                <dd className="font-medium text-ink text-right whitespace-nowrap">{formatMoney(campaign.current_amount)}</dd>
              </div>
              <div className="flex justify-between gap-3 min-h-[32px] items-center">
                <dt className="text-body">Пожертвований</dt>
                <dd className="font-medium text-ink text-right">{campaign.donation_count}</dd>
              </div>
              <div className="flex justify-between gap-3 min-h-[32px] items-center">
                <dt className="text-body">Потрачено</dt>
                <dd className="font-medium text-ink text-right whitespace-nowrap">{formatMoney(spent)}</dd>
              </div>
              <div className="divider my-2" />
              <div className="flex justify-between gap-3 items-baseline" aria-live="polite">
                <dt className="title-sm">Остаток</dt>
                <dd className={`num-lg text-right whitespace-nowrap ${rest < 0 ? 'text-[#B42318]' : 'text-ink'}`}>
                  {formatMoney(rest)}
                </dd>
              </div>
            </dl>
            <p className={`mt-3 ${rest < 0 ? 'alert-error' : 'alert bg-app text-body'}`}>
              {rest < 0
                ? 'Расходы больше, чем собрано. Проверьте суммы или объясните разницу в описании.'
                : 'Объясните остаток в описании — например, «передан на следующий сбор».'}
            </p>

            {error && (
              <div className="mt-3">
                <FormError>{error}</FormError>
              </div>
            )}
            <div className="mt-4">
              <StickyAction>
                <button type="submit" form="report-form" className="btn btn-primary btn-lg btn-block" disabled={busy}>
                  {busy ? 'Публикуем…' : 'Опубликовать отчёт'}
                </button>
              </StickyAction>
            </div>
            <p className="caption mt-2 text-center md:text-left">Отчёт отправится Комитету улемов на проверку.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
