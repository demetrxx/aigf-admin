import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { BroadcastDto } from '@/common/types';

const createFallbackError = 'Unable to send broadcast.';

export async function createBroadcast(payload: BroadcastDto) {
  const res = await apiFetch('/admin/broadcast', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
}
