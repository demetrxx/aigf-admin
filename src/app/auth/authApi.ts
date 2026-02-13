import { apiFetch } from '@/app/api';
import { getApiUrl } from '@/app/env';

import { clearPkceVerifier, readPkceVerifier } from './pkce';
import { setAccessToken } from './tokens';

let refreshPromise: Promise<string | null> | null = null;

type AuthResponse = {
  accessToken?: string;
};

type RegisterResponse = {
  accessToken: string | null;
  requiresEmailConfirmation?: boolean;
};

type AuthError = {
  message?: string | string[];
  error?: {
    message?: string | string[];
  };
};

export class AuthRequestError extends Error {
  status: number;
  rawMessage: string | null;

  constructor(status: number, message: string, rawMessage: string | null) {
    super(message);
    this.status = status;
    this.rawMessage = rawMessage;
  }
}

function normalizeError(message?: string | string[]) {
  if (!message) {
    return 'Something went wrong. Please try again.';
  }
  if (Array.isArray(message)) {
    return message.join(' ');
  }
  return message;
}

function mapErrorMessage(message: string | null) {
  if (!message) return null;
  const normalized = message.toLowerCase();

  if (normalized.includes('email is not confirmed')) {
    return 'Please confirm your email to continue.';
  }
  if (normalized.includes('already exists')) {
    return 'Account already exists. Try signing in instead.';
  }
  if (
    normalized.includes('invalid credentials') ||
    normalized.includes('incorrect password') ||
    normalized.includes('wrong password')
  ) {
    return 'Incorrect email or password.';
  }
  if (normalized.includes('token') && normalized.includes('expired')) {
    return 'This link has expired. Request a new one.';
  }
  if (normalized.includes('token') && normalized.includes('invalid')) {
    return 'This link is invalid. Request a new one.';
  }

  return null;
}

async function parseError(res: Response) {
  try {
    const data = (await res.json()) as AuthError;
    const rawMessage = data?.message ?? data?.error?.message;
    const normalizedRaw = Array.isArray(rawMessage)
      ? rawMessage.join(' ')
      : rawMessage ?? null;
    return {
      rawMessage: normalizedRaw,
      message: mapErrorMessage(normalizedRaw) ?? normalizeError(normalizedRaw!),
    };
  } catch (error) {
    return {
      rawMessage: null,
      message: `Request failed with status ${res.status}.`,
    };
  }
}

async function buildAuthError(res: Response) {
  const { message, rawMessage } = await parseError(res);
  return new AuthRequestError(res.status, message, rawMessage);
}

async function parseAuthResponse(res: Response) {
  if (!res.ok) {
    throw await buildAuthError(res);
  }
  const data = (await res.json()) as AuthResponse;
  const token = data?.accessToken ?? null;
  setAccessToken(token);
  return token;
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${getApiUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          return null;
        }
        const data = (await res.json()) as AuthResponse;
        return data?.accessToken ?? null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${getApiUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  return parseAuthResponse(res);
}

export async function register({
  email,
  password,
  fullName,
}: {
  email: string;
  password: string;
  fullName: string;
}) {
  const res = await fetch(`${getApiUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, fullName }),
  });

  if (!res.ok) {
    throw await buildAuthError(res);
  }
  const data = (await res.json()) as RegisterResponse;
  const token = data?.accessToken ?? null;
  if (token) {
    setAccessToken(token);
  }
  return {
    accessToken: token,
    requiresEmailConfirmation: Boolean(data?.requiresEmailConfirmation),
  };
}

export async function logout() {
  const res = await fetch(`${getApiUrl()}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw await buildAuthError(res);
  }

  setAccessToken(null);
}

export async function confirmEmail({ token }: { token: string }) {
  const res = await fetch(`${getApiUrl()}/auth/confirm-email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token }),
  });

  return parseAuthResponse(res);
}

export async function resendConfirmation({ email }: { email: string }) {
  const res = await fetch(`${getApiUrl()}/auth/resend-confirmation`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw await buildAuthError(res);
  }

  return (await res.json()) as { success: boolean };
}

export async function requestPasswordReset({ email }: { email: string }) {
  const res = await fetch(`${getApiUrl()}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw await buildAuthError(res);
  }

  return (await res.json()) as { success: boolean };
}

export async function confirmPasswordReset({
  token,
  newPassword,
}: {
  token: string;
  newPassword: string;
}) {
  const res = await fetch(`${getApiUrl()}/auth/confirm-forgot-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!res.ok) {
    throw await buildAuthError(res);
  }

  return (await res.json()) as { success: boolean };
}

export async function changePassword({
  oldPassword,
  newPassword,
}: {
  oldPassword: string;
  newPassword: string;
}) {
  const res = await apiFetch('/auth/change-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword }),
  });

  if (!res.ok) {
    throw await buildAuthError(res);
  }

  return (await res.json()) as { success: boolean };
}

export async function exchangeGoogleCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}) {
  const codeVerifier = readPkceVerifier();
  if (!codeVerifier) {
    throw new Error('Missing PKCE verifier. Please try again.');
  }

  const res = await fetch(`${getApiUrl()}/auth/google/exchange`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code, codeVerifier, redirectUri }),
  });

  clearPkceVerifier();

  return parseAuthResponse(res);
}
