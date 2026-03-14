'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'modules:enabled';

/** Read enabled module IDs from localStorage. Returns null if nothing stored (= all enabled). */
function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** SSR/hydration fallback — treat as "nothing stored". */
function getServerSnapshot(): string | null {
  return null;
}

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function readEnabledSet(raw: string | null, allIds: string[]): Set<string> {
  if (raw === null) return new Set(allIds);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed as string[]);
  } catch {
    // corrupted — treat as all enabled
  }
  return new Set(allIds);
}

/**
 * Hook to manage which modules are enabled.
 * Persists to localStorage and syncs across components.
 */
export function useModuleSettings(allModuleIds: string[]) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const enabled = readEnabledSet(raw, allModuleIds);

  const isEnabled = useCallback(
    (id: string) => enabled.has(id),
    [enabled],
  );

  const toggle = useCallback(
    (id: string) => {
      const current = readEnabledSet(localStorage.getItem(STORAGE_KEY), allModuleIds);
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
      emitChange();
    },
    [allModuleIds],
  );

  return { isEnabled, toggle };
}
