import { Toaster, toast } from 'sonner';

import { isApiRequestError } from '@/app/api/apiErrors';

export { Toaster, toast };

export function notifyError(error: unknown, fallback: string) {
  const codeMessages: Record<string, string> = {
    CONFLICT: 'That already exists.',
    FORBIDDEN: 'You do not have access to do that.',
    UNAUTHORIZED: 'Please sign in again.',
    NOT_FOUND: 'We could not find that.',
  };

  if (isApiRequestError(error)) {
    const mapped = error.code ? codeMessages[error.code] : null;
    if (mapped && (!error.message || error.message === fallback)) {
      toast.error(mapped);
      return;
    }
    if (error.status >= 500) {
      toast.error('Server error. Please try again.');
      return;
    }
  }

  if (error instanceof Error && error.message) {
    toast.error(error.message);
    return;
  }
  if (typeof error === 'string' && error.trim()) {
    toast.error(error);
    return;
  }
  toast.error(fallback);
}

export function notifySuccess(message: string | undefined, fallback: string) {
  if (typeof message === 'string' && message.trim()) {
    toast.success(message);
    return;
  }
  toast.success(fallback);
}
