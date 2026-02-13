import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';

import {
  deleteLora,
  getLoras,
  type LorasListParams,
  updateLoraSeed,
} from './lorasApi';

const loraKeys = {
  list: (params: LorasListParams) => ['loras', params] as const,
};

export function useLoras(params: LorasListParams) {
  return useQuery({
    queryKey: loraKeys.list(params),
    queryFn: () => getLoras(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateLoraSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, seed }: { id: string; seed: number }) =>
      updateLoraSeed(id, seed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loras'] });
      notifySuccess('Seed updated.', 'Seed updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the seed.');
    },
  });
}

export function useDeleteLora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLora(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loras'] });
      notifySuccess('LoRA deleted.', 'LoRA deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the LoRA.');
    },
  });
}
