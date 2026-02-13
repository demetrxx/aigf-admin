import { useQuery } from '@tanstack/react-query';

import type { PaginatedResponse } from '@/app/paginated-response.type';
import type {
  IChatResponseLog,
  IErrorLog,
  IImageGenLog,
  ILlmCallLog,
} from '@/common/types';

import {
  getChatResponseLogs,
  getErrorLogs,
  getImageGenLogs,
  getLlmCalls,
  type ChatResponseLogsParams,
  type ErrorLogsParams,
  type ImageGenLogsParams,
  type LlmCallsParams,
} from './logsApi';

const logsKeys = {
  chatResponse: (params: ChatResponseLogsParams) =>
    ['logs', 'chat-response', params] as const,
  llmCalls: (params: LlmCallsParams) => ['logs', 'llm-calls', params] as const,
  imageGen: (params: ImageGenLogsParams) =>
    ['logs', 'img-gen', params] as const,
  errors: (params: ErrorLogsParams) => ['logs', 'errors', params] as const,
};

const DEFAULT_STALE_TIME = 30 * 1000;

type LogsQueryOptions<T> = {
  enabled?: boolean;
  placeholderData?: (previous: T | undefined) => T | undefined;
  staleTime?: number;
};

export function useChatResponseLogs(
  params: ChatResponseLogsParams,
  options: LogsQueryOptions<PaginatedResponse<IChatResponseLog>> = {},
) {
  return useQuery({
    queryKey: logsKeys.chatResponse(params),
    queryFn: () => getChatResponseLogs(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useLlmCalls(
  params: LlmCallsParams,
  options: LogsQueryOptions<PaginatedResponse<ILlmCallLog>> = {},
) {
  return useQuery({
    queryKey: logsKeys.llmCalls(params),
    queryFn: () => getLlmCalls(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useImageGenLogs(
  params: ImageGenLogsParams,
  options: LogsQueryOptions<PaginatedResponse<IImageGenLog>> = {},
) {
  return useQuery({
    queryKey: logsKeys.imageGen(params),
    queryFn: () => getImageGenLogs(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useErrorLogs(
  params: ErrorLogsParams,
  options: LogsQueryOptions<PaginatedResponse<IErrorLog>> = {},
) {
  return useQuery({
    queryKey: logsKeys.errors(params),
    queryFn: () => getErrorLogs(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}
