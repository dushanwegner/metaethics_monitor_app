'use client';

import { useCallback, useEffect, useState } from 'react';
import { TbRefresh } from 'react-icons/tb';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

interface RunSummary {
  uid: string;
  scenario_slug: string;
  scenario_name: string;
  created_at: string;
  total_elapsed_ms: number;
  model_set: string | null;
  actors: string[];
  steps: { skill: string; elapsed: number }[];
  auto_article?: { voice?: string; pitch_chosen?: string };
}

export default function LoopLogTab() {
  const { handleError } = useAuth();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [articleText, setArticleText] = useState<Record<string, string>>({});

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/v1/runs/?limit=50') as any;
      setRuns(data.runs || []);
    } catch (e) { handleError(e); }
    setLoading(false);
  }, [handleError]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // Load article on expand
  const toggleExpand = useCallback(async (uid: string) => {
    if (expanded === uid) { setExpanded(null); return; }
    setExpanded(uid);
    if (!articleText[uid]) {
      try {
        const data = await apiGet(`/api/v1/runs/${uid}/`) as any;
        const wm = data.working_material || {};
        const article = wm.formatter || wm.magazine_writer || '(no article)';
        setArticleText(prev => ({ ...prev, [uid]: article }));
      } catch { setArticleText(prev => ({ ...prev, [uid]: '(error loading)' })); }
    }
  }, [expanded, articleText, handleError]);

  const getVoice = (run: RunSummary) => {
    const tc = run as any;
    return tc.auto_article?.voice || '(default)';
  };

  return (
    <div className="tab-content">
      <header className="tab-header">
        <h1>Loop Log</h1>
        <button className="tab-header__action" onClick={fetchRuns} aria-label="Refresh">
          <TbRefresh size={20} className={loading ? 'spin' : ''} />
        </button>
      </header>

      <div className="monitor-stats">
        <span className="monitor-stat">{runs.length} runs</span>
      </div>

      {loading && runs.length === 0 ? (
        <p className="tab-empty">Loading...</p>
      ) : runs.length === 0 ? (
        <p className="tab-empty">No runs yet.</p>
      ) : (
        <div className="loop-list">
          {runs.map(run => (
            <div key={run.uid} className="loop-item">
              <div className="loop-item__header" onClick={() => toggleExpand(run.uid)}>
                <div className="loop-item__left">
                  <span className="loop-item__scenario">{run.scenario_name}</span>
                  <span className="loop-item__meta">
                    <span className={`voice-badge voice-badge--${getVoice(run)}`}>
                      {getVoice(run)}
                    </span>
                    <span>{run.actors?.length || 0} actors</span>
                    <span>{Math.round(run.total_elapsed_ms)}s</span>
                  </span>
                </div>
                <span className="loop-item__time">
                  {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {expanded === run.uid && (
                <div className="loop-item__body">
                  <div className="loop-item__steps">
                    {run.steps?.map((s, i) => (
                      <span key={i} className="loop-step">
                        {s.skill} ({s.elapsed.toFixed(1)}s)
                      </span>
                    ))}
                  </div>
                  {articleText[run.uid] && (
                    <div className="loop-item__article">
                      <pre>{articleText[run.uid].slice(0, 1000)}{articleText[run.uid].length > 1000 ? '\n...' : ''}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
