'use client';

import { useTranslations } from 'next-intl';
import { useNotify } from '@/components/ui';
import { useBrands, useCreateBrand, useDeleteBrand, useUpdateBrand } from '@/features/catalog';
import { describeError } from '@/lib/api';
import { useManualRefresh } from '@/lib/hooks';
import {
  TaxonomyView,
  useTaxonomyCopy,
  type TaxonomyItem,
  type TaxonomyValues,
} from './TaxonomyView';

export function BrandsView() {
  const t = useTranslations('admin.brands');
  const tStates = useTranslations('common.states');

  const { data: brands = [], isPending, isError, refetch } = useBrands();
  const { refresh, isRefreshing } = useManualRefresh(refetch);
  const create = useCreateBrand();
  const update = useUpdateBrand();
  const remove = useDeleteBrand();
  const notify = useNotify();
  const copy = useTaxonomyCopy('admin.brands');

  const report = (error: unknown, title: string) =>
    notify('error', title, describeError(error, tStates('tryAgain')));

  return (
    <TaxonomyView
      copy={copy}
      items={brands}
      isPending={isPending}
      isError={isError}
      isSaving={create.isPending || update.isPending || remove.isPending}
      isRefreshing={isRefreshing}
      onRefresh={refresh}
      onCreate={async ({ name }: TaxonomyValues) => {
        try {
          await create.mutateAsync({ name });
          notify('success', t('notify.created'), t('notify.createdDescription', { name }));
        } catch (error) {
          report(error, t('notify.createFailed'));
        }
      }}
      onUpdate={async (id: string, { name }: TaxonomyValues) => {
        try {
          await update.mutateAsync({ id, input: { name } });
          notify('success', t('notify.saved'), t('notify.savedDescription', { name }));
        } catch (error) {
          report(error, t('notify.saveFailed'));
        }
      }}
      onDelete={async (item: TaxonomyItem) => {
        try {
          await remove.mutateAsync(item.id);
          notify(
            'success',
            t('notify.deleted'),
            t('notify.deletedDescription', { name: item.name }),
          );
        } catch (error) {
          report(error, t('notify.deleteFailed'));
        }
      }}
    />
  );
}
