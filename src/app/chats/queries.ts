import { useQuery } from '@tanstack/react-query';

import { getChatDetails, getChats, type ChatsListParams } from './chatsApi';

const chatKeys = {
  list: (params: ChatsListParams) => ['chats', params] as const,
  details: (id: string) => ['chat', id] as const,
};

export function useChats(params: ChatsListParams, enabled = true) {
  return useQuery({
    queryKey: chatKeys.list(params),
    queryFn: () => getChats(params),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useChatDetails(id: string | null) {
  return useQuery({
    queryKey: chatKeys.details(id ?? ''),
    queryFn: () => getChatDetails(id ?? ''),
    enabled: Boolean(id),
  });
}
