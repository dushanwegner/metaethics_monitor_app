'use client';

import { useCallback, useEffect, useState } from 'react';
import { TbRefresh } from 'react-icons/tb';
import { apiGet } from '../lib/api';
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

  const fetchHeadlines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/v1/headlines/?limit=50&status=all') as any;
      setHeadlines(data.headlines || []);
    } catch (e) { handleError(e); }
    setLoading(false);
  }, [handleError]);

  useEffect(() => { fetchHeadlines(); }, [fetchHeadlines]);

  const analyzed = headlines.filter(h => h.analyzed_at);
  const unanalyzed = headlines.filter(h => !h.analyzed_at);

  return (
    <div className="tab-content">
      <header className="tab-header">
        <h1>News Monitor</h1>
        <button className="tab-header__action" onClick={fetchHeadlines} aria-label="Refresh">
          <TbRefresh size={20} className={loading ? 'spin' : ''} />
        </button>
      </header>

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
