import { getApiUrl } from '@/app/env';
import { refreshAccessToken } from '@/app/auth/authApi';
import { getAccessToken, setAccessToken } from '@/app/auth/tokens';

export async function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  const token = getAccessToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${getApiUrl()}${input}`, {
    ...init,
    headers,
  });

  if (res.status !== 401) {
    return res;
  }

  const newToken = await refreshAccessToken();
  if (!newToken) {
    setAccessToken(null);
    return res;
  }

  setAccessToken(newToken);
  const retryHeaders = new Headers(init.headers ?? {});
  retryHeaders.set('Authorization', `Bearer ${newToken}`);

  return fetch(`${getApiUrl()}${input}`, {
    ...init,
    headers: retryHeaders,
  });
}
