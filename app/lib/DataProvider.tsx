'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from './api';
import { cacheGet, cacheSet, cacheDel } from './cache';
import { useAuth } from './AuthProvider';
import type { StockFavorite, FavoritesResponse, ToggleFavoriteResponse } from './types';

// ---------------------------------------------------------------------------
// Cache config
// ---------------------------------------------------------------------------
const FAVORITES_KEY = 'stocks:favorites';
const FAVORITES_TTL = 5 * 60 * 1000; // 5 min
const REFRESH_INTERVAL = 5 * 60 * 1000; // auto-refresh every 5 min

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
interface DataContextValue {
  /** Current favorites list. Empty while loading. */
  favorites: StockFavorite[];
  /** True during initial load (no cached data available). */
  favoritesLoading: boolean;
  /** Refetch favorites from server (bypasses cache). */
  refreshFavorites: () => Promise<void>;
  /**
   * Toggle favorite for a symbol.
   * Optimistically updates local state, invalidates caches,
   * and notifies all consumers (Home, Stocks, StockDetail).
   */
  toggleFavorite: (symbol: string) => Promise<boolean | null>;
  /**
   * Replace the favorites list wholesale (used by HomeTab's dashboard delta sync
   * to push server-sourced favorites into the shared state).
   */
  updateFavorites: (items: StockFavorite[]) => void;
  /**
   * Monotonically increasing counter, bumped on every favorites mutation.
   * Components can use this as a dependency to know "something changed".
   */
  favoritesVersion: number;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export default function DataProvider({ children }: { children: React.ReactNode }) {
  const { authStatus, handleError } = useAuth();
  const [favorites, setFavorites] = useState<StockFavorite[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const fetchingRef = useRef(false);

  // ---- Fetch favorites (cache-first, bypassable) ----
  const fetchFavorites = useCallback(async (bypassCache = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!bypassCache) {
      const cached = cacheGet<StockFavorite[]>(FAVORITES_KEY, FAVORITES_TTL);
      if (cached) {
        setFavorites(cached);
        setFavoritesLoading(false);
        fetchingRef.current = false;
        return;
      }
    }

    setFavoritesLoading(true);
    try {
      const data = await apiGet<FavoritesResponse>('/api/favorites/');
      setFavorites(data.favorites);
      cacheSet(FAVORITES_KEY, data.favorites);
    } catch (err) {
      handleError(err);
    } finally {
      setFavoritesLoading(false);
      fetchingRef.current = false;
    }
  }, [handleError]);

  // ---- Refresh: always bypass cache ----
  const refreshFavorites = useCallback(async () => {
    await fetchFavorites(true);
    setFavoritesVersion(v => v + 1);
  }, [fetchFavorites]);

  // ---- Update favorites from external source (e.g. dashboard delta sync) ----
  const updateFavorites = useCallback((items: StockFavorite[]) => {
    setFavorites(items);
    cacheSet(FAVORITES_KEY, items);
    setFavoritesLoading(false);
  }, []);

  // ---- Toggle favorite ----
  const toggleFavorite = useCallback(async (symbol: string): Promise<boolean | null> => {
    try {
      const res = await apiPost<ToggleFavoriteResponse>(
        `/api/stock/${symbol}/toggle-favorite/`,
        {},
      );

      // Invalidate all related caches
      cacheDel(FAVORITES_KEY);
      cacheDel(`stock:${symbol}`);

      // Update local state
      if (res.is_favorite) {
        // Add to favorites — we may not have full price data yet,
        // so add a stub. Next refresh will fill it in.
        setFavorites(prev => {
          if (prev.some(s => s.symbol === symbol)) return prev;
          return [...prev, {
            symbol,
            name: symbol, // stub — will be replaced on next fetch
            current_price: null,
            price_change: null,
            price_change_percent: null,
            volume: null,
            last_updated: null,
          }];
        });
      } else {
        setFavorites(prev => prev.filter(s => s.symbol !== symbol));
      }

      setFavoritesVersion(v => v + 1);
      return res.is_favorite;
    } catch {
      return null; // null = failed, don't update UI
    }
  }, []);

  // ---- Initial fetch when authenticated ----
  // Always bypass cache on first load so we show fresh prices.
  // Cache is only useful for tab-switching within a session.
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (authStatus === 'authenticated' && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchFavorites(true);
    }
  }, [authStatus, fetchFavorites]);

  // ---- Periodic auto-refresh ----
  // Keeps prices fresh across all tabs without requiring manual refresh.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const id = setInterval(() => fetchFavorites(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [authStatus, fetchFavorites]);

  // ---- Refresh when app resumes from background ----
  // The visibilitychange event fires in Capacitor's WebView when the app
  // comes back from background. Bypass cache so we always get fresh data.
  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState === 'visible' && authStatus === 'authenticated') {
        fetchFavorites(true);
      }
    };
    document.addEventListener('visibilitychange', onResume);
    return () => document.removeEventListener('visibilitychange', onResume);
  }, [authStatus, fetchFavorites]);

  return (
    <DataContext.Provider value={{
      favorites,
      favoritesLoading,
      refreshFavorites,
      toggleFavorite,
      updateFavorites,
      favoritesVersion,
    }}>
      {children}
    </DataContext.Provider>
  );
}
