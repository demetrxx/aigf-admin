export function getApiUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error('VITE_API_URL is required');
  }
  return apiUrl.replace(/\/$/, '');
}

export function getGoogleClientId() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is required');
  }
  return clientId;
}
