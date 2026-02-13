import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { AdminStatus, IAdmin } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type AdminsListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load admins.';
const updateFallbackError = 'Unable to update the admin status.';

export async function getAdmins(params: AdminsListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/admins${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IAdmin>;
}

export async function updateAdminStatus(id: string, status: AdminStatus) {
  const res = await apiFetch(`/admin/admins/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as IAdmin;
}

export type InviteAdminPayload = {
  fullName: string;
  email: string;
  password: string;
  role: string;
};

export async function inviteAdmin(payload: InviteAdminPayload) {
  const res = await apiFetch('/admin/admins/invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to invite the admin.');
  }
  return (await res.json()) as { success: boolean };
}
