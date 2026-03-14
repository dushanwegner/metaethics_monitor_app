'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TbRefresh, TbSearch, TbChevronLeft, TbChevronRight,
  TbChartBar, TbBell, TbChartLine,
} from 'react-icons/tb';
import { apiGet, apiPost } from '../lib/api';
import { cacheGet, cacheSet } from '../lib/cache';
import { useAuth } from '../lib/AuthProvider';
import { useData } from '../lib/DataProvider';
import type {
  StockFavorite,
  StockCatalogItem, StocksCatalogResponse, StocksRefreshResponse,
  AlarmItem, AlarmsResponse,
  PatternSummary, PatternsSummaryResponse,
} from '../lib/types';
import StockTile from '../components/StockTile';
import TabMenu from '../components/TabMenu';

// ---------------------------------------------------------------------------
// Sub-view IDs
// ---------------------------------------------------------------------------
type SubView = 'all-stocks' | 'alarms' | 'patterns';

const MENU_SECTIONS = [
  {
    items: [
      { id: 'all-stocks' as const, label: 'All Stocks', Icon: TbChartBar },
      { id: 'alarms' as const, label: 'Alarms', Icon: TbBell },
      { id: 'patterns' as const, label: 'Patterns', Icon: TbChartLine },
    ],
  },
];

// ---------------------------------------------------------------------------
// Cache keys & TTLs
// ---------------------------------------------------------------------------
const PAGE_SIZE = 30;
const CATALOG_KEY = 'stocks:catalog';
const CATALOG_TTL = 24 * 60 * 60 * 1000; // 24h — catalog rarely changes

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function StocksTab() {
  const [subView, setSubView] = useState<SubView>('all-stocks');

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h1 className="tab-header__title">Stocks</h1>
        <div className="tab-header__right">
          <TabMenu sections={MENU_SECTIONS} activeId={subView} onSelect={(id) => setSubView(id as SubView)} />
        </div>
      </div>

      {subView === 'all-stocks' && <AllStocksView />}
      {subView === 'alarms' && <AlarmsView />}
      {subView === 'patterns' && <PatternsView />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// All Stocks sub-view (favorites from shared context + catalog with search/pagination)
// ---------------------------------------------------------------------------
function AllStocksView() {
  const router = useRouter();
  const { handleError } = useAuth();
  const { favorites, favoritesLoading, refreshFavorites, toggleFavorite } = useData();

  // Catalog is Stocks-tab specific (big list, long TTL, not shared)
  const [catalog, setCatalog] = useState<StockCatalogItem[]>([]);
  const [prices, setPrices] = useState<Map<string, StockFavorite>>(new Map());
  const [query, setQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [catLoading, setCatLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priceEpoch, setPriceEpoch] = useState(0); // bump to force price re-fetch
  const refreshingRef = useRef(false);

  const fetchCatalog = useCallback(async () => {
    const cached = cacheGet<StockCatalogItem[]>(CATALOG_KEY, CATALOG_TTL);
    if (cached) { setCatalog(cached); setCatLoading(false); return; }
    setCatLoading(true);
    try {
      const data = await apiGet<StocksCatalogResponse>('/api/stocks/');
      setCatalog(data.stocks);
      cacheSet(CATALOG_KEY, data.stocks);
    } catch (err) { handleError(err); }
    finally { setCatLoading(false); }
  }, [handleError]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  const refresh = async () => {
    setRefreshing(true);
    setPrices(new Map()); // clear cached prices
    setPriceEpoch(e => e + 1); // trigger re-fetch for current page
    await refreshFavorites();
    setRefreshing(false);
  };

  // Exchange counts for filter pills
  const exchangeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: catalog.length };
    for (const s of catalog) {
      counts[s.exchange] = (counts[s.exchange] || 0) + 1;
    }
    return counts;
  }, [catalog]);

  // Filter by search query + exchange
  const filtered = useMemo(() => {
    let items = catalog;
    if (exchangeFilter !== 'all') {
      items = items.filter(s => s.exchange === exchangeFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    return items;
  }, [catalog, query, exchangeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Keep a ref to prices so the effect can check without depending on it
  const pricesRef = useRef(prices);
  pricesRef.current = prices;

  // Refresh prices for visible page — skip if we already have all of them
  useEffect(() => {
    if (pageItems.length === 0 || refreshingRef.current) return;
    const symbols = pageItems.map(s => s.symbol);
    const missing = symbols.filter(s => !pricesRef.current.has(s));
    if (missing.length === 0) return; // all prices already loaded
    refreshingRef.current = true;
    apiPost<StocksRefreshResponse>('/api/stocks/refresh/', { symbols })
      .then(data => {
        setPrices(prev => {
          const next = new Map(prev);
          for (const s of data.stocks) next.set(s.symbol, s);
          return next;
        });
      })
      .catch(() => {})
      .finally(() => { refreshingRef.current = false; });
  }, [safePage, filtered.length, pageItems.length, priceEpoch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh visible page prices when app resumes from background
  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState === 'visible') {
        setPrices(new Map());
        setPriceEpoch(e => e + 1);
      }
    };
    document.addEventListener('visibilitychange', onResume);
    return () => document.removeEventListener('visibilitychange', onResume);
  }, []);

  useEffect(() => { setPage(0); }, [query, exchangeFilter]);

  // Build a set of favorite symbols for quick lookup in catalog
  const favSymbols = useMemo(
    () => new Set(favorites.map(f => f.symbol)),
    [favorites],
  );

  const handleToggleFavorite = async (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nowFav = await toggleFavorite(symbol);
    if (nowFav === null) return; // failed — don't update catalog
    // Also update the catalog's is_favorite flag (catalog is local state)
    setCatalog(prev => {
      const updated = prev.map(s => s.symbol === symbol ? { ...s, is_favorite: nowFav } : s);
      cacheSet(CATALOG_KEY, updated);
      return updated;
    });
  };

  function toStockFavorite(item: StockCatalogItem): StockFavorite {
    const p = prices.get(item.symbol);
    return p ?? { symbol: item.symbol, name: item.name, current_price: null, price_change: null, price_change_percent: null, volume: null, last_updated: null };
  }

  const loading = favoritesLoading && catLoading;

  if (loading) {
    return (
      <div className="skeleton-list">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-card" />)}
      </div>
    );
  }

  return (
    <>
      {/* Refresh button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="tab-header__action" onClick={refresh} disabled={refreshing} aria-label="Refresh prices">
          <TbRefresh size={18} className={refreshing ? 'tab-header__action--spinning' : ''} />
        </button>
      </div>

      {/* Favorites — from shared context */}
      {favorites.length > 0 && (
        <section className="home-section">
          <div className="stock-tiles">
            {favorites.map(stock => (
              <StockTile
                key={stock.symbol}
                stock={stock}
                isFavorite
                onToggleFavorite={e => handleToggleFavorite(stock.symbol, e)}
                onClick={() => router.push(`/stock?symbol=${stock.symbol}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Search + catalog */}
      <section className="home-section">
        <div className="all-stocks__search">
          <TbSearch size={18} className="all-stocks__search-icon" />
          <input
            className="all-stocks__search-input"
            type="text"
            placeholder="Search symbol or name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Exchange filter pills */}
        <div className="exchange-filter">
          {(['all', 'NASDAQ', 'NYSE'] as const).map(ex => (
            <button
              key={ex}
              className={`exchange-filter__pill${exchangeFilter === ex ? ' exchange-filter__pill--active' : ''}`}
              onClick={() => setExchangeFilter(ex)}
            >
              {ex === 'all' ? 'All' : ex}
              <span className="exchange-filter__count">{exchangeCounts[ex] || 0}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="tab-empty"><p>No stocks found.</p></div>
        ) : (
          <>
            <div className="stock-tiles">
              {pageItems.map(item => (
                <StockTile
                  key={item.symbol}
                  stock={toStockFavorite(item)}
                  isFavorite={favSymbols.has(item.symbol)}
                  onToggleFavorite={e => handleToggleFavorite(item.symbol, e)}
                  onClick={() => router.push(`/stock?symbol=${item.symbol}`)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="all-stocks__pagination">
                <button className="all-stocks__page-btn" disabled={safePage === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
                  <TbChevronLeft size={20} />
                </button>
                <span className="all-stocks__page-info">{safePage + 1} / {totalPages}</span>
                <button className="all-stocks__page-btn" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page">
                  <TbChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Alarms sub-view (inline, no outer tab-content wrapper)
// ---------------------------------------------------------------------------
function formatCondition(alarm: AlarmItem): string {
  const t = parseFloat(alarm.price_threshold);
  const price = isNaN(t) ? alarm.price_threshold : `$${t.toFixed(2)}`;
  if (alarm.price_condition === 'near') return `Near ${price} (${alarm.near_percent}%)`;
  return `${alarm.price_condition === 'above' ? 'Above' : 'Below'} ${price}`;
}

function AlarmsView() {
  const router = useRouter();
  const { handleError } = useAuth();
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlarms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<AlarmsResponse>('/api/alarms/');
      setAlarms(data.alarms);
    } catch (err) { handleError(err); }
    finally { setLoading(false); }
  }, [handleError]);

  useEffect(() => { fetchAlarms(); }, [fetchAlarms]);

  if (loading && alarms.length === 0) {
    return (
      <div className="skeleton-list">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-card" />)}
      </div>
    );
  }

  if (alarms.length === 0) {
    return (
      <div className="tab-empty">
        <p>No active alarms.</p>
        <p>Create alarms on stx.wgnr.es.</p>
      </div>
    );
  }

  return (
    <div className="tab-list">
      {alarms.map(alarm => (
        <div
          key={alarm.id}
          className={`alarm-card${alarm.triggered ? ' alarm-card--triggered' : ''}`}
          onClick={() => router.push(`/stock?symbol=${alarm.symbol}`)}
        >
          <div className="alarm-card__header">
            <span className="alarm-card__name">{alarm.summary}</span>
            {alarm.triggered && <span className="alarm-card__badge">Triggered</span>}
          </div>
          <div className="alarm-card__condition">{formatCondition(alarm)}</div>
          {alarm.hot_score > 0 && !alarm.triggered && (
            <div className="alarm-card__hot">
              <div className="alarm-card__hot-bar">
                <div className="alarm-card__hot-fill" style={{ width: `${alarm.hot_score}%` }} />
              </div>
              <span className="alarm-card__hot-label">{alarm.hot_score}%</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patterns sub-view — detected chart patterns across all stocks
// ---------------------------------------------------------------------------
function PatternsView() {
  const router = useRouter();
  const { handleError } = useAuth();
  const [patterns, setPatterns] = useState<PatternSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet<PatternsSummaryResponse>('/api/patterns/')
      .then(data => setPatterns(data.patterns))
      .catch(err => handleError(err))
      .finally(() => setLoading(false));
  }, [handleError]);

  if (loading) {
    return (
      <div className="skeleton-list">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-card" />)}
      </div>
    );
  }

  if (patterns.length === 0) {
    return <div className="tab-empty"><p>No patterns detected yet.</p></div>;
  }

  // Group by stock
  const grouped = new Map<string, PatternSummary[]>();
  for (const p of patterns) {
    const key = p.stock_symbol;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  return (
    <div className="patterns-groups">
      {[...grouped.entries()].map(([symbol, items]) => (
        <div key={symbol} className="patterns-group" onClick={() => router.push(`/stock?symbol=${symbol}`)}>
          <div className="patterns-group__header">
            <span className="patterns-group__symbol">{symbol}</span>
            <span className="patterns-group__meta">{items.length} pattern{items.length > 1 ? 's' : ''}</span>
          </div>
          <div className="patterns-group__list">
            {items.map(p => (
              <div key={p.id} className="patterns-group__item">
                <span className="patterns-group__type">{p.pattern_display}</span>
                <span className="patterns-group__confidence">{Math.round(p.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
