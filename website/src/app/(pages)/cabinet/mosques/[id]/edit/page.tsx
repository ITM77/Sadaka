'use client';

import { notFound, useRouter } from 'next/navigation';
import MosqueForm from '@/components/cabinet/MosqueForm';
import { MosqueChecklist } from '@/components/cabinet/MosqueChecklist';
import { Alert, CabinetPage, Loading } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';

export default function EditMosquePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, error, notFound: missing } = useMosqueCabinet(params.id);
  if (missing) notFound();

  return (
    <CabinetPage
      wide
      title="Данные мечети"
      crumbs={[
        { href: '/cabinet', label: 'Кабинет' },
        { href: `/cabinet/mosques/${params.id}`, label: data?.mosque.name ?? 'Мечеть' },
      ]}
      current="Изменить данные"
    >
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Loading />}
      {data && data.mosque.status === 'blocked' && <Alert>Мечеть заблокирована Комитетом — данные изменить нельзя.</Alert>}
      {data && data.mosque.status !== 'blocked' && (
        <div className="flex flex-col gap-5">
          {data.mosque.status === 'rejected' && (
            <Alert tone="warn">
              {data.mosque.moderation_note ? `Комитет: «${data.mosque.moderation_note}». ` : ''}После сохранения заявка
              снова уйдёт на рассмотрение Комитету.
            </Alert>
          )}
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-7">
            <MosqueForm mosque={data.mosque} onSaved={() => router.replace(`/cabinet/mosques/${params.id}`)} />
            {data.mosque.status !== 'approved' && <MosqueChecklist />}
          </div>
        </div>
      )}
    </CabinetPage>
  );
}
