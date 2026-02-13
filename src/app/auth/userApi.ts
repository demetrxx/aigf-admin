import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { IUser } from '@/common/types/user.type';

const fallbackError = 'Unable to load your profile.';

export async function getCurrentUser() {
  const res = await apiFetch('/admin/admins/me');
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as IUser;
}

type UpdateUserPayload = {
  firstName: string;
  lastName: string;
};

export async function updateUser(payload: UpdateUserPayload) {
  const res = await apiFetch('/admin/admins/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as { success: boolean };
}
