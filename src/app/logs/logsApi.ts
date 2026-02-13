import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { PaginatedResponse } from '@/app/paginated-response.type';
import type {
  ErrorCode,
  IChatResponseLog,
  IErrorLog,
  IImageGenLog,
  ILlmCallLog,
  LlmCallType,
  LogOrder,
  LogOrderBy,
} from '@/common/types';

type BaseLogsParams = {
  startAt?: string;
  endAt?: string;
  skip?: number;
  take?: number;
  orderBy?: LogOrderBy;
  order?: LogOrder;
};

export type ChatResponseLogsParams = BaseLogsParams & {
  chatId?: string;
};

export type LlmCallsParams = BaseLogsParams & {
  chatId?: string;
  type?: LlmCallType;
  model?: string;
};

export type ImageGenLogsParams = BaseLogsParams & {
  chatId?: string;
};

export type ErrorLogsParams = BaseLogsParams & {
  code?: ErrorCode;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    query.set(key, String(value));
  });
  return query.toString();
}

export async function getChatResponseLogs(params: ChatResponseLogsParams) {
  const query = buildQuery(params);
  const res = await apiFetch(
    `/admin/logs/chat-response${query ? `?${query}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load chat response logs.');
  }
  return (await res.json()) as PaginatedResponse<IChatResponseLog>;
}

export async function getLlmCalls(params: LlmCallsParams) {
  const query = buildQuery(params);
  const res = await apiFetch(
    `/admin/logs/llm-calls${query ? `?${query}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load LLM calls.');
  }
  return (await res.json()) as PaginatedResponse<ILlmCallLog>;
}

export async function getImageGenLogs(params: ImageGenLogsParams) {
  const query = buildQuery(params);
  const res = await apiFetch(
    `/admin/logs/img-gen${query ? `?${query}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load image generation logs.');
  }
  return (await res.json()) as PaginatedResponse<IImageGenLog>;
}

export async function getErrorLogs(params: ErrorLogsParams) {
  const query = buildQuery(params);
  const res = await apiFetch(
    `/admin/logs/errors${query ? `?${query}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load error logs.');
  }
  return (await res.json()) as PaginatedResponse<IErrorLog>;
}
