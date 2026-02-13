import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { CreateGiftDto, UpdateGiftDto } from '@/common/types';

import {
  createGift,
  deleteGift,
  getGiftDetails,
  getGifts,
  type GiftsListParams,
  updateGift,
} from './giftsApi';

const giftKeys = {
  list: (params: GiftsListParams) => ['gifts', params] as const,
  detail: (id: string) => ['gifts', 'detail', id] as const,
};

export function useGifts(params: GiftsListParams) {
  return useQuery({
    queryKey: giftKeys.list(params),
    queryFn: () => getGifts(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useGiftDetails(id: string | null) {
  return useQuery({
    queryKey: giftKeys.detail(id ?? ''),
    queryFn: () => getGiftDetails(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateGiftDto) => createGift(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      notifySuccess('Gift created.', 'Gift created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the gift.');
    },
  });
}

type GiftUpdateOptions = {
  id: string;
  payload: UpdateGiftDto;
};

export function useUpdateGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: GiftUpdateOptions) => updateGift(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      queryClient.invalidateQueries({
        queryKey: ['gifts', 'detail', variables.id],
      });
      notifySuccess('Gift updated.', 'Gift updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the gift.');
    },
  });
}

export function useDeleteGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGift(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      queryClient.invalidateQueries({ queryKey: ['gifts', 'detail', id] });
      notifySuccess('Gift deleted.', 'Gift deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the gift.');
    },
  });
}
