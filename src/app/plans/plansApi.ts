import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { IPlan, PlanCreateDto, PlanUpdateDto } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type PlansListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load plans.';
const createFallbackError = 'Unable to create the plan.';
const updateFallbackError = 'Unable to update the plan.';

export async function getPlans(params: PlansListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/plans${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IPlan>;
}

export async function createPlan(payload: PlanCreateDto) {
  const res = await apiFetch('/admin/plans', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as IPlan;
}

export async function updatePlan(id: string, payload: PlanUpdateDto) {
  const res = await apiFetch(`/admin/plans/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as IPlan;
}
