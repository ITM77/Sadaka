'use client';

import { notFound, useRouter } from 'next/navigation';
import MosqueForm from '@/components/cabinet/MosqueForm';
import { MosqueChecklist } from '@/components/cabinet/MosqueChecklist';
import { Alert, CabinetPage, Loading } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';
import { useI18n } from '@/lib/i18n/client';

export default function EditMosquePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { t } = useI18n();
  const { data, error, notFound: missing } = useMosqueCabinet(params.id);
  if (missing) notFound();

  const checklist = data && data.mosque.status !== 'approved';

  return (
    <CabinetPage
      title={t('Данные мечети')}
      crumbs={[
        { href: '/cabinet', label: t('Кабинет') },
        { href: `/cabinet/mosques/${params.id}`, label: data?.mosque.name ?? t('Мечеть') },
      ]}
      current={t('Изменить данные')}
    >
      {error && <Alert>{t(error)}</Alert>}
      {!data && !error && <Loading />}
      {data && data.mosque.status === 'blocked' && (
        <Alert>{t('Мечеть заблокирована Комитетом — данные изменить нельзя.')}</Alert>
      )}
      {data && data.mosque.status !== 'blocked' && (
        <div className="flex flex-col gap-3">
          {data.mosque.status === 'rejected' && (
            <Alert tone="warn">
              {data.mosque.moderation_note ? `${t('Комитет: «{note}».', { note: data.mosque.moderation_note })} ` : ''}
              {t('После сохранения заявка снова уйдёт на рассмотрение Комитету.')}
            </Alert>
          )}
          <div className={checklist ? 'layout-aside' : 'max-w-[760px]'}>
            <MosqueForm mosque={data.mosque} onSaved={() => router.replace(`/cabinet/mosques/${params.id}`)} />
            {checklist && <MosqueChecklist />}
          </div>
        </div>
      )}
    </CabinetPage>
  );
}
