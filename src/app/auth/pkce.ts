const PKCE_STORAGE_KEY = 'echo_pkce_verifier';

function base64UrlEncode(input: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

function randomVerifier(length = 64) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

export function savePkceVerifier(verifier: string) {
  sessionStorage.setItem(PKCE_STORAGE_KEY, verifier);
}

export function readPkceVerifier() {
  return sessionStorage.getItem(PKCE_STORAGE_KEY);
}

export function clearPkceVerifier() {
  sessionStorage.removeItem(PKCE_STORAGE_KEY);
}

export async function buildGoogleAuthUrl({
  clientId,
  redirectUri,
  scope = 'openid email profile',
}: {
  clientId: string;
  redirectUri: string;
  scope?: string;
}) {
  const codeVerifier = randomVerifier();
  const codeChallenge = await sha256(codeVerifier);

  savePkceVerifier(codeVerifier);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');

  return url.toString();
}
