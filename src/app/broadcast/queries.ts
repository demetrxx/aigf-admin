import { useMutation } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { BroadcastDto } from '@/common/types';

import { createBroadcast } from './broadcastApi';

export function useCreateBroadcast() {
  return useMutation({
    mutationFn: (payload: BroadcastDto) => createBroadcast(payload),
    onSuccess: () => {
      notifySuccess('Broadcast sent.', 'Broadcast sent.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to send broadcast.');
    },
  });
}
