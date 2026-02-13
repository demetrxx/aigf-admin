import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  CreatePromptDto,
  IPrompt,
  IPromptDetails,
  PromptType,
  UpdatePromptDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type PromptsListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
  isActive?: boolean;
  type?: PromptType;
};

const fallbackError = 'Unable to load prompts.';
const createFallbackError = 'Unable to create the prompt.';
const updateFallbackError = 'Unable to update the prompt.';
const detailsFallbackError = 'Unable to load the prompt details.';
const deleteFallbackError = 'Unable to delete the prompt.';

export async function getPrompts(params: PromptsListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));
  if (typeof params.isActive === 'boolean') {
    query.set('isActive', String(params.isActive));
  }
  if (params.type) query.set('type', params.type);

  const suffix = query.toString();
  const res = await apiFetch(`/admin/prompts${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IPrompt>;
}

export async function getPromptDetails(id: string) {
  const res = await apiFetch(`/admin/prompts/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }
  return (await res.json()) as IPromptDetails;
}

export async function createPrompt(payload: CreatePromptDto) {
  const res = await apiFetch('/admin/prompts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as IPromptDetails;
}

export async function updatePrompt(id: string, payload: UpdatePromptDto) {
  const res = await apiFetch(`/admin/prompts/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as IPromptDetails;
}

export async function deletePrompt(id: string) {
  const res = await apiFetch(`/admin/prompts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}
