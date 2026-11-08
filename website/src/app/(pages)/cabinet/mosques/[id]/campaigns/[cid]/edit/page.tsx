'use client';

import { notFound, useRouter } from 'next/navigation';
import CampaignForm from '@/components/cabinet/CampaignForm';
import { Alert, CabinetPage, Loading } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';

export default function EditCampaignPage({ params }: { params: { id: string; cid: string } }) {
  const router = useRouter();
  const { data, error, notFound: missing } = useMosqueCabinet(params.id);
  const campaign = data?.campaigns.find((c) => c.id === params.cid);
  if (missing || (data && !campaign)) notFound();
  const back = `/cabinet/mosques/${params.id}`;
  const editable = campaign && (campaign.status === 'draft' || campaign.status === 'rejected');

  return (
    <CabinetPage
      title={campaign ? `Сбор «${campaign.title}»` : 'Сбор'}
      crumbs={[
        { href: '/cabinet', label: 'Кабинет' },
        { href: back, label: data?.mosque.name ?? 'Мечеть' },
      ]}
      current="Редактирование"
    >
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Loading />}
      {campaign && !editable && (
        <Alert>Править можно только черновик или отклонённый сбор. Этот сбор уже на проверке или запущен.</Alert>
      )}
      {campaign && editable && (
        <div className="flex flex-col gap-3">
          {campaign.status === 'rejected' && (
            <Alert tone="warn" title="Комитет отклонил сбор.">
              {campaign.moderation_note ? `«${campaign.moderation_note}». ` : ''}После сохранения он станет черновиком —
              отправьте его на одобрение снова.
            </Alert>
          )}
          <CampaignForm
            mosqueId={params.id}
            mosque={data?.mosque}
            campaign={campaign}
            onSaved={() => router.replace(back)}
          />
        </div>
      )}
    </CabinetPage>
  );
}
