'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TbChevronLeft, TbRefresh, TbStar, TbStarFilled } from 'react-icons/tb';
import { apiGet, apiPost } from '../lib/api';
import { cacheGet, cacheSet, cacheDel } from '../lib/cache';
import { formatPrice, formatChange } from '../lib/format';
import { useAuth } from '../lib/AuthProvider';
import { useData } from '../lib/DataProvider';
import type { Pattern, PatternsResponse, StockDetail } from '../lib/types';
import PriceChart from '../components/PriceChart';
import PatternList from '../components/PatternList';
import ScrollHeader from '../components/ScrollHeader';
import EthicalScanPanel from '../components/EthicalScanPanel';
import CompanyInfoPanel from '../modules/company-info/CompanyInfoPanel';
import StockNewsPanel from '../modules/stock-news/StockNewsPanel';
import TabBar, { type TabId, loadActiveTab, saveActiveTab } from '../components/TabBar';

function StockDetailContent() {
  const router = useRouter();
  const { handleError } = useAuth();
  const { toggleFavorite: ctxToggleFavorite } = useData();
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol');
  const patternParam = searchParams.get('pattern');

  const [stock, setStock] = useState<StockDetail | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab] = useState<TabId>(loadActiveTab);

  const navigateTab = useCallback((tab: TabId) => {
    saveActiveTab(tab);
    router.push('/');
  }, [router]);

  const toggleFavorite = useCallback(async () => {
    if (!symbol) return;
    // Use shared context — updates all tabs + invalidates caches
    const nowFav = await ctxToggleFavorite(symbol);
    if (nowFav === null) return; // failed — don't update UI
    setIsFavorite(nowFav);
    // Also invalidate this stock's detail cache (is_favorite changed)
    cacheDel(`stock:${symbol}`);
  }, [symbol, ctxToggleFavorite]);

  const refreshStock = useCallback(async () => {
    if (!symbol || refreshing) return;
    setRefreshing(true);
    try {
      const data = await apiPost<StockDetail>(`/api/stock/${symbol}/refresh/`, {});
      setStock(data);
      setIsFavorite(data.is_favorite);
      cacheSet(`stock:${symbol}`, data); // update cache with fresh data
    } catch { /* ignore */ }
    finally { setRefreshing(false); }
  }, [symbol, refreshing]);

  const fetchDetail = useCallback(async () => {
    if (!symbol) return;

    // Try cache first
    const cachedDetail = cacheGet<StockDetail>(`stock:${symbol}`);
    const cachedPatterns = cacheGet<Pattern[]>(`stock:${symbol}:patterns`);
    if (cachedDetail) {
      setStock(cachedDetail);
      setIsFavorite(cachedDetail.is_favorite);
      const list = cachedPatterns || [];
      setPatterns(list);
      if (patternParam) {
        const match = list.find(p => p.id === Number(patternParam));
        if (match) setSelectedPattern(match);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [detail, patternsData] = await Promise.all([
        apiGet<StockDetail>(`/api/stock/${symbol}/`),
        apiGet<PatternsResponse>(`/api/stock/${symbol}/patterns/`).catch(() => ({ patterns: [] })),
      ]);
      setStock(detail);
      setIsFavorite(detail.is_favorite);
      cacheSet(`stock:${symbol}`, detail);
      const list = patternsData.patterns || [];
      setPatterns(list);
      cacheSet(`stock:${symbol}:patterns`, list);
      if (patternParam) {
        const match = list.find(p => p.id === Number(patternParam));
        if (match) setSelectedPattern(match);
      }
    } catch (err) {
      handleError(err);
      return;
    } finally {
      setLoading(false);
    }
  }, [symbol, handleError, patternParam]);

  useEffect(() => {
    if (!symbol) {
      router.push('/');
      return;
    }
    fetchDetail();
  }, [symbol, fetchDetail]);

  if (loading || !stock) {
    return (
      <>
        <div className="stock-detail">
          <div className="stock-detail__header">
            <button className="stock-detail__back" onClick={() => router.back()} aria-label="Back">
              <TbChevronLeft size={22} />
            </button>
            <div className="stock-detail__header-info">
              <div className="stock-detail__symbol">{symbol}</div>
            </div>
          </div>
          <div className="stock-detail__skeleton-price" />
          <div className="stock-detail__skeleton-chart" />
          <div className="stock-detail__skeleton-info" />
        </div>
        <TabBar active={activeTab} onSelect={navigateTab} />
      </>
    );
  }

  const { text: changeText, direction } = formatChange(stock.price_change, stock.price_change_percent);

  return (
    <>
    <div className="stock-detail">
      <ScrollHeader
        autoThreshold
        expandedContent={
          <>
            <div className="stock-detail__header">
              <button className="stock-detail__back" onClick={() => router.back()} aria-label="Back">
                <TbChevronLeft size={22} />
              </button>
              <div className="stock-detail__header-info">
                <div className="stock-detail__symbol">{stock.symbol}</div>
                <div className="stock-detail__name">{stock.name}</div>
              </div>
              <button
                className="stock-detail__header-btn"
                onClick={refreshStock}
                disabled={refreshing}
                aria-label="Refresh"
              >
                <TbRefresh size={20} className={refreshing ? 'stock-detail__header-btn--spinning' : ''} />
              </button>
              <button
                className={`stock-detail__fav${isFavorite ? ' stock-detail__fav--active' : ''}`}
                onClick={toggleFavorite}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? <TbStarFilled size={22} /> : <TbStar size={22} />}
              </button>
            </div>

            <div className="stock-detail__price-hero">
              <div className="stock-detail__price">${formatPrice(stock.current_price)}</div>
              <div className={`stock-detail__change stock-detail__change--${direction}`}>
                {changeText}
              </div>
            </div>
          </>
        }
        condensedContent={
          <div className="stock-condensed">
            <button className="stock-condensed__back" onClick={() => router.back()} aria-label="Back">
              <TbChevronLeft size={18} />
            </button>
            <div className="stock-condensed__info">
              <span className="stock-condensed__symbol">{stock.symbol}</span>
              <span className="stock-condensed__sep">&middot;</span>
              <span className="stock-condensed__price">${formatPrice(stock.current_price)}</span>
              <span className={`stock-condensed__change stock-condensed__change--${direction}`}>
                {changeText}
              </span>
            </div>
            <button
              className="stock-detail__header-btn"
              onClick={refreshStock}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <TbRefresh size={18} className={refreshing ? 'stock-detail__header-btn--spinning' : ''} />
            </button>
            <button
              className={`stock-detail__fav${isFavorite ? ' stock-detail__fav--active' : ''}`}
              onClick={toggleFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? <TbStarFilled size={20} /> : <TbStar size={20} />}
            </button>
          </div>
        }
      />

      <PriceChart symbol={stock.symbol} direction={direction} pattern={selectedPattern} />
      <EthicalScanPanel symbol={stock.symbol} />
      <CompanyInfoPanel stock={stock} />
      <StockNewsPanel stock={stock} />
      <PatternList
        patterns={patterns}
        selectedId={selectedPattern?.id ?? null}
        onSelect={setSelectedPattern}
      />
    </div>
    <TabBar active={activeTab} onSelect={navigateTab} />
    </>
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={<StockDetailSkeleton />}>
      <StockDetailContent />
    </Suspense>
  );
}

function StockDetailSkeleton() {
  return (
    <div className="stock-detail">
      <div className="stock-detail__header">
        <div className="stock-detail__back"><TbChevronLeft size={22} /></div>
      </div>
      <div className="stock-detail__skeleton-price" />
      <div className="stock-detail__skeleton-chart" />
      <div className="stock-detail__skeleton-info" />
    </div>
  );
}
