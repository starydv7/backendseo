import { supabase } from '../lib/supabase';

export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const msg =
      typeof body === 'object' &&
      body &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
        ? (body as { message: string }).message
        : `Request failed (${status})`;
    super(msg);
    this.status = status;
    this.body = body;
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = await getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(0, {
      message: `Failed to reach API (${API_URL}). If using Render, the service is Suspended — open Render Dashboard and click Resume.`,
    });
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    if (res.status === 503) {
      throw new ApiError(503, {
        message: `API returned 503 (Suspended/Unavailable) at ${API_URL}. Resume the Render service, then refresh.`,
      });
    }
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File, field = 'file') => {
    const form = new FormData();
    form.append(field, file);
    return request<T>(path, { method: 'POST', body: form });
  },
};

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
