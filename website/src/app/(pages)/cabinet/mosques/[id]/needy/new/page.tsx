'use client';

import { notFound, useRouter } from 'next/navigation';
import NeedyForm from '@/components/cabinet/NeedyForm';
import { Alert, CabinetPage, Loading } from '@/components/cabinet/ui';
import { useMosqueCabinet } from '@/components/cabinet/useMosqueCabinet';
import { useI18n } from '@/lib/i18n/client';

export default function NewNeedyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { t } = useI18n();
  const { data, error, notFound: missing } = useMosqueCabinet(params.id);
  if (missing) notFound();
  const base = `/cabinet/mosques/${params.id}`;

  return (
    <CabinetPage
      title={t('Новая семья')}
      crumbs={[
        { href: '/cabinet', label: t('Кабинет') },
        { href: base, label: data?.mosque.name ?? t('Мечеть') },
        { href: `${base}/needy`, label: t('Нуждающиеся') },
      ]}
      current={t('Новая семья')}
    >
      {error && <Alert>{t(error)}</Alert>}
      {!data && !error && <Loading />}
      {data && (
        <NeedyForm mosqueId={params.id} onSaved={(b) => router.replace(`${base}/needy/${b.id}`)} />
      )}
    </CabinetPage>
  );
}
