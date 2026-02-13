import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { CreateCharacterImageDto } from '@/common/types';

import {
  createCharacterImage,
  getCharacterImageDetails,
  getCharacterImages,
  type CharacterImagesListParams,
} from './characterImagesApi';

const characterImageKeys = {
  list: (params: CharacterImagesListParams) =>
    ['character-images', params] as const,
  detail: (id: string) => ['character-images', 'detail', id] as const,
};

export function useCharacterImages(params: CharacterImagesListParams) {
  return useQuery({
    queryKey: characterImageKeys.list(params),
    queryFn: () => getCharacterImages(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCharacterImageDetails(id: string | null) {
  return useQuery({
    queryKey: characterImageKeys.detail(id ?? ''),
    queryFn: () => getCharacterImageDetails(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateCharacterImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCharacterImageDto) =>
      createCharacterImage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character-images'] });
      notifySuccess('Image created.', 'Image created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the image.');
    },
  });
}
