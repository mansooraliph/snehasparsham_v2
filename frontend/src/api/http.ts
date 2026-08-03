import axios, { AxiosError } from 'axios';

/** localStorage key holding the access token. */
export const TOKEN_KEY = 'access_token';

/**
 * Shared axios instance. Vite proxies `/api` → the NestJS backend (see
 * vite.config.ts), so a relative baseURL works in dev and prod. The refresh
 * token lives in an HttpOnly cookie (never touched from JS) — `withCredentials`
 * lets the browser send/receive it.
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  },
);

interface ApiErrorEnvelope {
  error?: { code?: string; message?: string };
}

/** Extracts a human-readable message from an axios/API error. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorEnvelope | undefined;
    return data?.error?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
