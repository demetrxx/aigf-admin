import { useMutation, useQuery } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import { ImgGenerationStatus } from '@/common/types';

import {
  createImgGeneration,
  deleteImgGeneration,
  getImgGenerationDetails,
  getImgGenerations,
  type ImgGenerationsListParams,
} from './imgGenerationsApi';

const imgGenerationKeys = {
  list: (params: ImgGenerationsListParams) =>
    ['img-generations', params] as const,
  details: (id: string) => ['img-generation', id] as const,
};

export function useImgGenerations(params: ImgGenerationsListParams) {
  return useQuery({
    queryKey: imgGenerationKeys.list(params),
    queryFn: () => getImgGenerations(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useImgGenerationDetails(id: string | null) {
  return useQuery({
    queryKey: imgGenerationKeys.details(id ?? ''),
    queryFn: () => getImgGenerationDetails(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data &&
        data.status !== ImgGenerationStatus.Ready &&
        data.status !== ImgGenerationStatus.Failed
        ? 5000
        : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useCreateImgGeneration() {
  return useMutation({
    mutationFn: createImgGeneration,
    onSuccess: () => {
      notifySuccess('Generation created.', 'Generation created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to generate the image.');
    },
  });
}

export function useDeleteImgGeneration() {
  return useMutation({
    mutationFn: deleteImgGeneration,
    onSuccess: () => {
      notifySuccess('Generation deleted.', 'Generation deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the generation.');
    },
  });
}
