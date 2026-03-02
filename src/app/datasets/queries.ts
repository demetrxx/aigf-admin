import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type {
  CreateDatasetDto,
  IDatasetDetails,
  UpdateDatasetDto,
} from '@/common/types';

import {
  createDataset,
  createDatasetItem,
  type DatasetsListParams,
  deleteDataset,
  deleteDatasetItem,
  downloadDatasetZip,
  getDatasetDetails,
  getDatasets,
  regenerateDatasetItem,
  updateDataset,
} from './datasetsApi';

const datasetKeys = {
  list: (params: DatasetsListParams) => ['datasets', params] as const,
  detail: (id: string) => ['datasets', 'detail', id] as const,
};

export function useDatasets(params: DatasetsListParams) {
  return useQuery({
    queryKey: datasetKeys.list(params),
    queryFn: () => getDatasets(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useDatasetDetails(
  id: string | null,
  initialData?: IDatasetDetails | null,
  options: {
    enabled?: boolean;
    refetchInterval?:
      | number
      | false
      | ((data: IDatasetDetails | undefined) => number | false);
  } = {},
) {
  const resolvedRefetchInterval =
    typeof options.refetchInterval === 'function'
      ? (query: { state: { data: unknown } }) =>
          // @ts-expect-error: mismatch between Select and LogTab
          options.refetchInterval?.(
            query.state.data as IDatasetDetails | undefined,
          )
      : options.refetchInterval;

  return useQuery({
    queryKey: datasetKeys.detail(id ?? ''),
    queryFn: () => getDatasetDetails(id ?? ''),
    enabled: options.enabled ?? Boolean(id),
    initialData: initialData ?? undefined,
    refetchInterval: resolvedRefetchInterval,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDatasetDto) => createDataset(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      notifySuccess('Dataset created.', 'Dataset created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the dataset.');
    },
  });
}

type DatasetUpdateOptions = {
  id: string;
  payload: UpdateDatasetDto;
};

export function useUpdateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: DatasetUpdateOptions) =>
      updateDataset(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({
        queryKey: ['datasets', 'detail', variables.id],
      });
      notifySuccess('Dataset updated.', 'Dataset updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the dataset.');
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDataset(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['datasets', 'detail', id] });
      notifySuccess('Dataset deleted.', 'Dataset deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the dataset.');
    },
  });
}

type DatasetItemCreateOptions = {
  id: string;
};

export function useCreateDatasetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DatasetItemCreateOptions) => createDatasetItem(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({
        queryKey: ['datasets', 'detail', variables.id],
      });
      notifySuccess('Item added.', 'Dataset item added.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to add dataset item.');
    },
  });
}

type DatasetItemRegenerateOptions = {
  id: string;
  itemId: string;
};

export function useRegenerateDatasetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, itemId }: DatasetItemRegenerateOptions) =>
      regenerateDatasetItem(id, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({
        queryKey: ['datasets', 'detail', variables.id],
      });
      notifySuccess('Regenerating item...', 'Dataset item regenerated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to regenerate dataset item.');
    },
  });
}

type DatasetItemDeleteOptions = {
  id: string;
  itemId: string;
};

export function useDeleteDatasetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, itemId }: DatasetItemDeleteOptions) =>
      deleteDatasetItem(id, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({
        queryKey: ['datasets', 'detail', variables.id],
      });
      notifySuccess('Item deleted.', 'Dataset item deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete dataset item.');
    },
  });
}

type DatasetZipDownloadOptions = {
  id: string;
  fallbackName?: string;
};

export function useDownloadDatasetZip() {
  return useMutation({
    mutationFn: ({ id, fallbackName }: DatasetZipDownloadOptions) =>
      downloadDatasetZip(id, fallbackName),
    onSuccess: (isDownloaded) => {
      if (!isDownloaded) return;
      notifySuccess('ZIP downloaded.', 'Dataset ZIP downloaded.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to download dataset ZIP.');
    },
  });
}
