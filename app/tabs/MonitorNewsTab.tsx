'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TbRefresh, TbPlus } from 'react-icons/tb';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

interface Headline {
  item_key: string;
  title: string;
  source: string;
  category: string;
  analyzed_at: string | null;
  scenario_slug: string | null;
  scenario_score: number | null;
}

export default function MonitorNewsTab() {
  const { handleError } = useAuth();
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addText, setAddText] = useState('');
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchHeadlines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/v1/headlines/?limit=50&status=all') as any;
      setHeadlines(data.headlines || []);
    } catch (e) { handleError(e); }
    setLoading(false);
  }, [handleError]);

  useEffect(() => { fetchHeadlines(); }, [fetchHeadlines]);

  const handleAdd = useCallback(async () => {
    const text = addText.trim();
    if (!text) return;
    setAdding(true);

    try {
      // Send as a custom idea — the backend creates a NewsItemAction
      // and runs the analysis pipeline in the background.
      await apiPost('/briefing/add-idea/', {
        headline: text,
        summary: '',
      });
      setStatus('Added. Analysis running in background.');
      setAddText('');
      setShowAdd(false);
      // Refresh after a short delay to show the new item
      setTimeout(fetchHeadlines, 2000);
    } catch {
      setStatus('Error adding idea.');
    }
    setAdding(false);
    setTimeout(() => setStatus(''), 5000);
  }, [addText, fetchHeadlines]);

  const analyzed = headlines.filter(h => h.analyzed_at);
  const unanalyzed = headlines.filter(h => !h.analyzed_at);

  return (
    <div className="tab-content">
      <header className="tab-header">
        <h1>News</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tab-header__action" onClick={() => { setShowAdd(!showAdd); if (!showAdd) setTimeout(() => inputRef.current?.focus(), 100); }} aria-label="Add">
            <TbPlus size={20} />
          </button>
          <button className="tab-header__action" onClick={fetchHeadlines} aria-label="Refresh">
            <TbRefresh size={20} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* Add input — for headlines, ideas, fragments, tweets, anything */}
      {showAdd && (
        <div className="news-add-box">
          <textarea
            ref={inputRef}
            className="news-add-input"
            placeholder="A headline, an idea, a tweet, a fragment — anything that should feed the loop..."
            value={addText}
            onChange={e => setAddText(e.target.value)}
            rows={3}
          />
          <div className="news-add-actions">
            <button className="news-add-btn" onClick={handleAdd} disabled={adding || !addText.trim()}>
              {adding ? 'Adding...' : 'Add & Analyze'}
            </button>
            <button className="news-add-cancel" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {status && <div className="news-status">{status}</div>}

      <div className="monitor-stats">
        <span className="monitor-stat">{headlines.length} headlines</span>
        <span className="monitor-stat monitor-stat--good">{analyzed.length} analyzed</span>
        <span className="monitor-stat monitor-stat--pending">{unanalyzed.length} pending</span>
      </div>

      {loading && headlines.length === 0 ? (
        <p className="tab-empty">Loading...</p>
      ) : (
        <div className="monitor-list">
          {headlines.map(h => (
            <div key={h.item_key} className={`monitor-item ${h.analyzed_at ? 'monitor-item--analyzed' : ''}`}>
              <div className="monitor-item__title">{h.title}</div>
              <div className="monitor-item__meta">
                <span>{h.source || '—'}</span>
                {h.category && <span className="monitor-item__cat">{h.category}</span>}
                {h.scenario_slug && (
                  <span className="monitor-item__scenario">
                    scenario:{h.scenario_score}
                  </span>
                )}
                {h.analyzed_at ? (
                  <span className="monitor-item__status monitor-item__status--done">analyzed</span>
                ) : (
                  <span className="monitor-item__status">pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
