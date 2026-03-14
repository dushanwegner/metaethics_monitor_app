'use client';

import { useCallback, useEffect, useState } from 'react';
import { TbExternalLink } from 'react-icons/tb';
import { apiGet } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import type { NewsItem, NewsResponse } from '../../lib/types';
import type { ModulePanelProps } from '../types';

export default function StockNewsPanel({ stock }: ModulePanelProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<NewsResponse>(`/api/stock/${stock.symbol}/news/`);
      setItems(data.items);
    } catch { /* ignore */ }
    finally {
      setLoading(false);
      setFetched(true);
    }
  }, [stock.symbol]);

  // Fetch on first open
  useEffect(() => {
    if (open && !fetched) fetchNews();
  }, [open, fetched, fetchNews]);

  return (
    <div className="company-info">
      <button className="company-info__header" onClick={() => setOpen(!open)}>
        <h2 className="company-info__title">
          News
          {fetched && items.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
              ({items.length})
            </span>
          )}
        </h2>
        <span className={`company-info__chevron${open ? ' company-info__chevron--open' : ''}`}>&#x25B8;</span>
      </button>

      {open && (
        <div className="stock-news-list">
          {loading && !fetched && (
            <div className="stock-news-list__loading">Loading...</div>
          )}
          {fetched && items.length === 0 && (
            <div className="stock-news-list__empty">No news for {stock.symbol}.</div>
          )}
          {items.map(item => (
            <a
              key={item.key}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="stock-news-item"
            >
              <span className="stock-news-item__title">{item.title}</span>
              <div className="stock-news-item__meta">
                <span>{item.source}</span>
                <span>{timeAgo(item.published_dt || item.published)}</span>
                <TbExternalLink size={12} />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
