import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { ITgUser, UpdateTgUser } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type UsersListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load users.';
const updateFallbackError = 'Unable to update the user.';

export async function getUsers(params: UsersListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/users${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<ITgUser>;
}

export async function updateUser(id: string, payload: UpdateTgUser) {
  const res = await apiFetch(`/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as ITgUser;
}
