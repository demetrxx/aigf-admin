import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import { AdminStatus } from '@/common/types';

import {
  type AdminsListParams,
  getAdmins,
  inviteAdmin,
  updateAdminStatus,
} from './adminsApi';

const adminKeys = {
  list: (params: AdminsListParams) => ['admins', params] as const,
};

export function useAdmins(params: AdminsListParams) {
  return useQuery({
    queryKey: adminKeys.list(params),
    queryFn: () => getAdmins(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateAdminStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminStatus }) =>
      updateAdminStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      notifySuccess(
        variables.status === AdminStatus.Active
          ? 'Admin activated.'
          : 'Admin deactivated.',
        'Admin status updated.',
      );
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the admin status.');
    },
  });
}

export function useInviteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      notifySuccess('Invite sent.', 'Invite sent.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to invite the admin.');
    },
  });
}
