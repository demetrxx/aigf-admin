import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { UpdateTgUser } from '@/common/types';

import { getUsers, type UsersListParams, updateUser } from './usersApi';

const userKeys = {
  list: (params: UsersListParams) => ['users', params] as const,
};

export function useUsers(params: UsersListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUsers(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTgUser }) =>
      updateUser(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (variables.payload.isBlocked !== undefined) {
        notifySuccess(
          variables.payload.isBlocked ? 'User blocked.' : 'User unblocked.',
          'User status updated.',
        );
        return;
      }
      if (variables.payload.subscribedUntil !== undefined) {
        notifySuccess('Subscription updated.', 'Subscription updated.');
        return;
      }
      if (variables.payload.fuel !== undefined) {
        notifySuccess('Fuel updated.', 'Fuel updated.');
        return;
      }
      notifySuccess('User updated.', 'User updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the user.');
    },
  });
}
