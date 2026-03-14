/**
 * Simple localStorage cache with TTL.
 *
 * Usage:
 *   const cached = cacheGet<MyType>('stocks:favorites');
 *   if (cached) return cached;
 *   const fresh = await fetchFresh();
 *   cacheSet('stocks:favorites', fresh);
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/** Read a cached value. Returns null if missing, expired, or unparseable. */
export function cacheGet<T>(key: string, ttl = DEFAULT_TTL): T | null {
  try {
    const ts = localStorage.getItem(`${key}:ts`);
    if (!ts || Date.now() - Number(ts) > ttl) return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Write a value to cache with current timestamp. */
export function cacheSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(`${key}:ts`, String(Date.now()));
  } catch {}
}

/** Remove a cached value and its timestamp. */
export function cacheDel(key: string): void {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}:ts`);
  } catch {}
}
