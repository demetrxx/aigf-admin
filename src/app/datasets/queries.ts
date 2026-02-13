import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type {
  CreateDatasetDto,
  CreateDatasetItemDto,
  IDatasetDetails,
  UpdateDatasetDto,
} from '@/common/types';

import {
  createDataset,
  createDatasetItem,
  deleteDataset,
  getDatasetDetails,
  getDatasets,
  type DatasetsListParams,
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
) {
  return useQuery({
    queryKey: datasetKeys.detail(id ?? ''),
    queryFn: () => getDatasetDetails(id ?? ''),
    enabled: Boolean(id),
    initialData: initialData ?? undefined,
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
  payload: CreateDatasetItemDto;
};

export function useCreateDatasetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: DatasetItemCreateOptions) =>
      createDatasetItem(id, payload),
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
