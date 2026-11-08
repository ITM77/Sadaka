'use client';

import { notFound, useRouter } from 'next/navigation';
import CampaignForm from '@/components/cabinet/CampaignForm';
import { Alert, CabinetPage, Loading } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';
import { useI18n } from '@/lib/i18n/client';

export default function NewCampaignPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { t } = useI18n();
  const { data, error, notFound: missing } = useMosqueCabinet(params.id);
  if (missing) notFound();
  const back = `/cabinet/mosques/${params.id}`;

  return (
    <CabinetPage
      title={t('Новый сбор')}
      crumbs={[
        { href: '/cabinet', label: t('Кабинет') },
        { href: back, label: data?.mosque.name ?? t('Мечеть') },
      ]}
      current={t('Новый сбор')}
    >
      {error && <Alert>{t(error)}</Alert>}
      {!data && !error && <Loading />}
      {data && data.mosque.status !== 'approved' && (
        <Alert>{t('Открывать сборы можно только после одобрения мечети Комитетом улемов.')}</Alert>
      )}
      {data && data.mosque.status === 'approved' && (
        <CampaignForm mosqueId={params.id} mosque={data.mosque} onSaved={() => router.replace(back)} />
      )}
    </CabinetPage>
  );
}
