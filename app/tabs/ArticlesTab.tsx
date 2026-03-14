'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TbRefresh, TbSend } from 'react-icons/tb';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

interface RunSummary {
  uid: string;
  scenario_name: string;
  voice: string;
  score: number | null;
  eval_summary: string | null;
  created_at: string;
  actors: string[];
  published: { post_url?: string };
}

const PAGE_SIZE = 10;

export default function ArticlesTab() {
  const { handleError } = useAuth();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [articleText, setArticleText] = useState<Record<string, string>>({});
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const fetchRuns = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await apiGet(`/api/v1/runs/?limit=${PAGE_SIZE}&offset=${offset}`) as any;
      const newRuns = (data.runs || []).filter((r: any) => r.scenario_name);
      setRuns(prev => append ? [...prev, ...newRuns] : newRuns);
      setTotal(data.count || 0);
    } catch (e) { handleError(e); }
    setLoading(false);
    setLoadingMore(false);
  }, [handleError]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const toggleExpand = useCallback(async (uid: string) => {
    if (expanded === uid) { setExpanded(null); return; }
    setExpanded(uid);
    setCommentText('');
    if (!articleText[uid]) {
      try {
        const data = await apiGet(`/api/v1/runs/${uid}/`) as any;
        const wm = data.working_material || {};
        const article = wm.formatter || wm.magazine_writer || '(no article produced)';
        setArticleText(prev => ({ ...prev, [uid]: article }));
      } catch {
        setArticleText(prev => ({ ...prev, [uid]: '(error loading)' }));
      }
    }
  }, [expanded, articleText]);

  const voiceLabel = (v: string) => v ? v.replace('the-', '').replace(/^\w/, c => c.toUpperCase()) : '';
  const hasMore = runs.length < total;

  return (
    <div className="tab-content">
      <header className="tab-header">
        <h1>Articles</h1>
        <button className="tab-header__action" onClick={() => fetchRuns()} aria-label="Refresh">
          <TbRefresh size={20} className={loading ? 'spin' : ''} />
        </button>
      </header>

      {loading && runs.length === 0 ? (
        <p className="tab-empty">Loading...</p>
      ) : runs.length === 0 ? (
        <p className="tab-empty">No articles yet. The loop will produce them.</p>
      ) : (
        <div className="articles-list">
          {runs.map(run => (
            <div key={run.uid} className="art-card">
              <div className="art-card__header" onClick={() => toggleExpand(run.uid)}>
                <div className="art-card__left">
                  <span className="art-card__title">{run.scenario_name}</span>
                  <div className="art-card__meta">
                    {run.voice && (
                      <span className={`voice-badge voice-badge--${run.voice}`}>
                        {voiceLabel(run.voice)}
                      </span>
                    )}
                    {run.score !== null && (
                      <span className={`loop-score ${run.score >= 7 ? 'loop-score--good' : run.score >= 5 ? 'loop-score--ok' : 'loop-score--bad'}`}>
                        {run.score}/10
                      </span>
                    )}
                    <span className="art-card__actors">
                      {run.actors?.length || 0} actors
                    </span>
                    {run.published?.post_url && (
                      <span className="art-card__published">WP</span>
                    )}
                  </div>
                </div>
                <span className="art-card__time">
                  {new Date(run.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {expanded === run.uid && (
                <div className="art-card__body">
                  {/* Evaluation summary */}
                  {run.eval_summary && (
                    <p className="art-card__eval">{run.eval_summary}</p>
                  )}

                  {/* Article text */}
                  {articleText[run.uid] && (
                    <div className="loop-item__article">
                      <pre>{articleText[run.uid]}</pre>
                    </div>
                  )}

                  {/* Feedback */}
                  <div className="loop-comment-box">
                    <textarea
                      className="loop-comment-input"
                      placeholder="Feedback on this article..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                    />
                    <button
                      className="loop-comment-send"
                      disabled={commenting || !commentText.trim()}
                      onClick={async () => {
                        if (!commentText.trim()) return;
                        setCommenting(true);
                        try {
                          await apiPost('/api/v1/loop-log/add/', {
                            kind: 'feedback',
                            message: commentText.trim(),
                            run_uid: run.uid,
                          });
                          setCommentText('');
                        } catch {}
                        setCommenting(false);
                      }}
                    >
                      <TbSend size={16} /> Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              className="loop-load-more"
              onClick={() => fetchRuns(runs.length, true)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
