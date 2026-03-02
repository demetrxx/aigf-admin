import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { ChatSearchParams, IChat, IChatDetails } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type ChatsListParams = ChatSearchParams & {
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load chats.';
const detailsFallbackError = 'Unable to load chat.';

export async function getChats(params: ChatsListParams) {
  const query = new URLSearchParams();
  if (params.userId) query.set('userId', params.userId);
  if (params.characterId) query.set('characterId', params.characterId);
  if (params.scenarioId) query.set('scenarioId', params.scenarioId);
  if (params.stage) query.set('stage', params.stage);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/chats${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IChat>;
}

export async function getChatDetails(id: string) {
  const res = await apiFetch(`/admin/chats/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }
  return (await res.json()) as IChatDetails;
}
