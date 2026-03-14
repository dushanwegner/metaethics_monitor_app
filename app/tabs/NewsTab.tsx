'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TbRefresh } from 'react-icons/tb';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';
import NewsCard from '../components/NewsCard';
import NewsOverlay from '../components/NewsOverlay';
import TabMenu from '../components/TabMenu';
import type { TabMenuSection } from '../components/TabMenu';
import type { NewsItem, NewsResponse } from '../lib/types';

export default function NewsTab() {
  const { handleError } = useAuth();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(() => {
    try { return localStorage.getItem('newsFilter') || 'all'; } catch { return 'all'; }
  });
  // Overlay: index into visibleItems, or null when closed
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null);

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await apiGet<NewsResponse>('/api/news/');
      setItems(data.items);
      setCategories(data.categories || []);
      setHiddenCount(data.hidden_count || 0);
    } catch (err) {
      handleError(err);
      return;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [handleError]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const selectFilter = (cat: string) => {
    setActiveFilter(cat);
    try { localStorage.setItem('newsFilter', cat); } catch {}
  };

  const handleUpdate = useCallback((key: string, updates: Partial<NewsItem>) => {
    setItems(prev => {
      if ('_hidden' in updates) {
        setHiddenCount(c => c + 1);
        return prev.filter(i => i.key !== key);
      }
      return prev.map(i => i.key === key ? { ...i, ...updates } : i);
    });
  }, []);

  // Filter by category
  const visibleItems = activeFilter === 'all'
    ? items
    : items.filter(i => i.category === activeFilter);

  // Category counts
  const counts: Record<string, number> = {};
  items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
  const totalCount = items.length;

  // Build hamburger menu sections from categories
  const menuSections: TabMenuSection[] = useMemo(() => {
    const catItems = [
      { id: 'all', label: `All (${totalCount})` },
      ...categories.filter(c => counts[c]).map(c => ({
        id: c,
        label: `${c} (${counts[c]})`,
      })),
    ];
    return [{ items: catItems }];
  }, [categories, counts, totalCount]);

  /** Tap headline → open overlay (which opens the native webview) */
  const handleOpen = useCallback((idx: number) => {
    setOverlayIndex(idx);
  }, []);

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h1 className="tab-header__title">News</h1>
        <div className="tab-header__right">
          {hiddenCount > 0 && (
            <span className="news-hidden-badge">{hiddenCount} hidden</span>
          )}
          <TabMenu sections={menuSections} activeId={activeFilter} onSelect={selectFilter} />
          <button
            className="tab-header__action"
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <TbRefresh size={20} className={refreshing ? 'tab-header__action--spinning' : ''} />
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="skeleton-list">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="tab-empty">
          <p>No news available.</p>
        </div>
      ) : (
        <div className="tab-list">
          {visibleItems.map((item, idx) => (
            <NewsCard
              key={item.key}
              item={item}
              onUpdate={handleUpdate}
              onOpen={() => handleOpen(idx)}
            />
          ))}
        </div>
      )}

      {/* Action overlay — sits behind the native browser on iOS */}
      {overlayIndex !== null && visibleItems[overlayIndex] && (
        <NewsOverlay
          items={visibleItems}
          currentIndex={overlayIndex}
          onNavigate={setOverlayIndex}
          onClose={() => setOverlayIndex(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
