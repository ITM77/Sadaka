'use client';

import { notFound, useRouter } from 'next/navigation';
import CampaignForm from '@/components/cabinet/CampaignForm';
import { Alert, CabinetPage, Loading } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';

export default function NewCampaignPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, error, notFound: missing } = useMosqueCabinet(params.id);
  if (missing) notFound();
  const back = `/cabinet/mosques/${params.id}`;

  return (
    <CabinetPage
      title="Новый сбор"
      crumbs={[
        { href: '/cabinet', label: 'Кабинет' },
        { href: back, label: data?.mosque.name ?? 'Мечеть' },
      ]}
      current="Новый сбор"
    >
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Loading />}
      {data && data.mosque.status !== 'approved' && (
        <Alert>Открывать сборы можно только после одобрения мечети Комитетом улемов.</Alert>
      )}
      {data && data.mosque.status === 'approved' && (
        <CampaignForm mosqueId={params.id} mosque={data.mosque} onSaved={() => router.replace(back)} />
      )}
    </CabinetPage>
  );
}
