/**
 * API client — handles fetch, error classification, and configurable base URL.
 *
 * Error types:
 * - ApiError (status >= 400): server responded with an error
 * - NetworkError: fetch failed (offline, DNS, timeout)
 *
 * The base URL can be overridden at runtime via localStorage (dev only).
 */

const ENV_API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://stx.wgnr.es';
const API_BASE_KEY = 'api:base_url';

/** Returns the active API base URL. Dev override takes precedence. */
export function getApiBase(): string {
  try {
    const override = localStorage.getItem(API_BASE_KEY);
    if (override) return override;
  } catch {}
  return ENV_API_BASE;
}

/** Set a runtime API base URL override (persisted in localStorage). */
export function setApiBase(url: string) {
  try {
    if (url) localStorage.setItem(API_BASE_KEY, url);
    else localStorage.removeItem(API_BASE_KEY);
  } catch {}
}

/** Server responded with an HTTP error. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Fetch itself failed — device is offline, DNS failed, or request timed out. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Network error — check your connection');
    this.name = 'NetworkError';
    if (cause instanceof Error) this.cause = cause;
  }
}

/** True if the error is an auth failure (401/403). */
export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

/** True if the error is a network/connectivity issue. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof NetworkError;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // keep default
    }
    throw new ApiError(res.status, message);
  }
  return res.json();
}

export async function apiPost<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${getApiBase()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new NetworkError(err);
  }
  return handleResponse<T>(res);
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const url = `${getApiBase()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
  } catch (err) {
    throw new NetworkError(err);
  }
  return handleResponse<T>(res);
}
