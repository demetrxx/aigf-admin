import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { CreateGiftDto, IGift, IGiftDetails, UpdateGiftDto } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type GiftsListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const listFallbackError = 'Unable to load gifts.';
const detailsFallbackError = 'Unable to load the gift details.';
const createFallbackError = 'Unable to create the gift.';
const updateFallbackError = 'Unable to update the gift.';
const deleteFallbackError = 'Unable to delete the gift.';

export async function getGifts(params: GiftsListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/gifts${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, listFallbackError);
  }
  return (await res.json()) as PaginatedResponse<IGift>;
}

export async function getGiftDetails(id: string) {
  const res = await apiFetch(`/admin/gifts/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }
  return (await res.json()) as IGiftDetails;
}

export async function createGift(payload: CreateGiftDto) {
  const res = await apiFetch('/admin/gifts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as IGiftDetails;
}

export async function updateGift(id: string, payload: UpdateGiftDto) {
  const res = await apiFetch(`/admin/gifts/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as IGiftDetails;
}

export async function deleteGift(id: string) {
  const res = await apiFetch(`/admin/gifts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}
