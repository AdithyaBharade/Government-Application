import axios, { AxiosError } from 'axios';

const TOKEN_KEY = 'kadata.token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
  },
};

/** Single axios instance for the whole app. */
export const api = axios.create({
  baseURL: `${(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/api`,
  timeout: 60_000, // AI calls with documents can take a while
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      tokenStore.clear();
      window.dispatchEvent(new Event('kadata:logout'));
    }
    return Promise.reject(error);
  },
);

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: Record<string, string[]> };
}

/** Human-readable message from any API error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (!err.response) return 'NETWORK';
    const body = err.response.data?.error;
    if (body?.details) {
      const first = Object.entries(body.details)[0];
      if (first) return `${first[0]}: ${first[1][0]}`;
    }
    return body?.message ?? fallback;
  }
  return fallback;
}

export const errorCode = (err: unknown): string | undefined =>
  axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data?.error?.code : undefined;
