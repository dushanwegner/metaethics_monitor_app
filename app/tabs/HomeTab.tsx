'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TbRefresh, TbLogout } from 'react-icons/tb';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';
import { useData } from '../lib/DataProvider';
import ApiTokenPanel from '../components/ApiTokenPanel';
import NewsCard from '../components/NewsCard';
import SignalsCard from '../components/SignalsCard';
import StockTile from '../components/StockTile';
import type { DashboardResponse, RunItem, NewsItem } from '../lib/types';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/** Format ms remaining as "4m 30s" */
function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

/** Short relative: "just now", "12s ago", "3m ago" */
function syncAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export default function HomeTab() {
  const router = useRouter();
  const { handleError, logout } = useAuth();
  const { favorites, favoritesLoading, refreshFavorites, updateFavorites } = useData();

  const [runs, setRuns] = useState<RunItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const nextSyncRef = useRef(0);
  const syncedAtRef = useRef<string | null>(null);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Delta sync: send `since` on refresh so server only returns changed sections
      const since = isRefresh && syncedAtRef.current
        ? `?since=${encodeURIComponent(syncedAtRef.current)}`
        : '';
      const data = await apiGet<DashboardResponse>(`/api/dashboard/${since}`);

      // Merge: only update sections present in the response
      // Favorites go into the shared context so all tabs see them
      if (data.favorites) updateFavorites(data.favorites);
      if (data.runs) setRuns(data.runs);
      if (data.news) setNews(data.news);

      syncedAtRef.current = data.synced_at;
      const now = Date.now();
      setLastSync(new Date(now));
      nextSyncRef.current = now + REFRESH_INTERVAL;
    } catch (err) {
      handleError(err);
      return;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [handleError, updateFavorites]);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh every REFRESH_INTERVAL
  useEffect(() => {
    const id = setInterval(() => fetchDashboard(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchDashboard]);

  // Tick every 1s to update "ago" and countdown display
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  // Refresh dashboard when app resumes from background
  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard(true);
      }
    };
    document.addEventListener('visibilitychange', onResume);
    return () => document.removeEventListener('visibilitychange', onResume);
  }, [fetchDashboard]);

  // On manual refresh, also refresh favorites from the dedicated endpoint
  // so the shared context has the freshest data (with sparklines, etc.)
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchDashboard(true),
      refreshFavorites(),
    ]);
  }, [fetchDashboard, refreshFavorites]);

  const handleNewsUpdate = useCallback((key: string, updates: Partial<NewsItem>) => {
    setNews(prev => {
      if ('_hidden' in updates) return prev.filter(i => i.key !== key);
      return prev.map(i => i.key === key ? { ...i, ...updates } : i);
    });
  }, []);

  const remaining = nextSyncRef.current - Date.now();
  const showLoading = loading && favoritesLoading;

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h1 className="tab-header__title">Home</h1>
        <div className="tab-header__right">
          {lastSync && (
            <div className="sync-info">
              <span className="sync-info__line">updated {syncAgo(lastSync)}</span>
              <span className="sync-info__line">next in {fmtCountdown(remaining)}</span>
            </div>
          )}
          <button
            className="tab-header__action"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <TbRefresh size={20} className={refreshing ? 'tab-header__action--spinning' : ''} />
          </button>
        </div>
      </div>

      {showLoading ? (
        <div className="skeleton-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : (
        <>
          {/* Favorites section — reads from shared context */}
          {favorites.length > 0 && (
            <section className="home-section">
              <div className="stock-tiles">
                {favorites.map((s) => (
                  <StockTile
                    key={s.symbol}
                    stock={s}
                    isFavorite
                    onClick={() => router.push(`/stock?symbol=${s.symbol}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Signals: appears when resolution data exists */}
          <SignalsCard />

          {/* Latest runs section */}
          {runs.length > 0 && (
            <section className="home-section">
              <h2 className="home-section__title">Latest Runs</h2>
              <div className="tab-list">
                {runs.map((r) => (
                  <div key={r.uid} className="home-run">
                    <div className="home-run__top">
                      <span className="home-run__name">{r.scenario_name}</span>
                      <span className="home-run__date">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="home-run__bottom">
                      <span className="home-run__uid">{r.uid}</span>
                      <span className="home-run__elapsed">{Math.round(r.total_elapsed)}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* News preview section */}
          {news.length > 0 && (
            <section className="home-section">
              <h2 className="home-section__title">News</h2>
              <div className="tab-list">
                {news.map((item) => (
                  <NewsCard key={item.key || item.url} item={item} onUpdate={handleNewsUpdate} />
                ))}
              </div>
            </section>
          )}

          {/* Footer: settings + logout */}
          <section className="home-footer">
            <ApiTokenPanel />
            <button className="home-footer__btn" onClick={logout}>
              <TbLogout size={18} />
              <span>Log out</span>
            </button>
          </section>
        </>
      )}
    </div>
  );
}
