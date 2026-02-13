import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { CreatePromptDto, UpdatePromptDto } from '@/common/types';

import {
  createPrompt,
  deletePrompt,
  getPromptDetails,
  getPrompts,
  type PromptsListParams,
  updatePrompt,
} from './promptsApi';

const promptKeys = {
  list: (params: PromptsListParams) => ['prompts', params] as const,
  detail: (id: string) => ['prompts', 'detail', id] as const,
};

export function usePrompts(params: PromptsListParams) {
  return useQuery({
    queryKey: promptKeys.list(params),
    queryFn: () => getPrompts(params),
    placeholderData: (previousData) => previousData,
  });
}

export function usePromptDetails(id: string | null, enabled = true) {
  return useQuery({
    queryKey: promptKeys.detail(id ?? 'unknown'),
    queryFn: () => getPromptDetails(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePromptDto) => createPrompt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      notifySuccess('Prompt created.', 'Prompt created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the prompt.');
    },
  });
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePromptDto }) =>
      updatePrompt(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({
        queryKey: promptKeys.detail(variables.id),
      });
      notifySuccess('Prompt updated.', 'Prompt updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the prompt.');
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePrompt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      notifySuccess('Prompt deleted.', 'Prompt deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the prompt.');
    },
  });
}
