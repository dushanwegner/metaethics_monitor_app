'use client';

import { useCallback, useEffect, useState } from 'react';
import { TbRefresh } from 'react-icons/tb';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

interface LoopEntry {
  id: number;
  kind: string;
  message: string;
  run_uid: string;
  score: number | null;
  details: Record<string, unknown>;
  created_at: string;
}

const PAGE_SIZE = 10;

const KIND_LABELS: Record<string, string> = {
  run: 'Run',
  eval: 'Eval',
  adjust: 'Adjust',
  create: 'Create',
  note: 'Note',
};

const KIND_CLASSES: Record<string, string> = {
  run: 'loop-kind--run',
  eval: 'loop-kind--eval',
  adjust: 'loop-kind--adjust',
  create: 'loop-kind--create',
  note: 'loop-kind--note',
};

export default function LoopLogTab() {
  const { handleError } = useAuth();
  const [entries, setEntries] = useState<LoopEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [articleText, setArticleText] = useState<Record<string, string>>({});

  const fetchEntries = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = await apiGet(`/api/v1/loop-log/?limit=${PAGE_SIZE}&offset=${offset}`) as any;
      const newEntries = data.entries || [];
      setEntries(prev => append ? [...prev, ...newEntries] : newEntries);
      setTotal(data.total || 0);
    } catch (e) { handleError(e); }

    setLoading(false);
    setLoadingMore(false);
  }, [handleError]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Load article text for eval entries that reference a run
  const toggleExpand = useCallback(async (id: number, runUid: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (runUid && !articleText[runUid]) {
      try {
        const data = await apiGet(`/api/v1/runs/${runUid}/`) as any;
        const wm = data.working_material || {};
        const article = wm.formatter || wm.magazine_writer || '(no article)';
        setArticleText(prev => ({ ...prev, [runUid]: article }));
      } catch {
        setArticleText(prev => ({ ...prev, [runUid]: '(error loading)' }));
      }
    }
  }, [expanded, articleText]);

  const hasMore = entries.length < total;

  return (
    <div className="tab-content">
      <header className="tab-header">
        <h1>Loop Log</h1>
        <button className="tab-header__action" onClick={() => fetchEntries()} aria-label="Refresh">
          <TbRefresh size={20} className={loading ? 'spin' : ''} />
        </button>
      </header>

      <div className="monitor-stats">
        <span className="monitor-stat">{total} entries</span>
      </div>

      {loading && entries.length === 0 ? (
        <p className="tab-empty">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="tab-empty">No loop entries yet. The autonomous loop will log its actions here.</p>
      ) : (
        <div className="loop-list">
          {entries.map(entry => (
            <div key={entry.id} className="loop-item">
              <div
                className="loop-item__header"
                onClick={() => toggleExpand(entry.id, entry.run_uid)}
              >
                <div className="loop-item__left">
                  <span className={`loop-kind ${KIND_CLASSES[entry.kind] || ''}`}>
                    {KIND_LABELS[entry.kind] || entry.kind}
                  </span>
                  {entry.score !== null && (
                    <span className={`loop-score ${entry.score >= 7 ? 'loop-score--good' : entry.score >= 5 ? 'loop-score--ok' : 'loop-score--bad'}`}>
                      {entry.score}/10
                    </span>
                  )}
                  {/* Show first line as title, rest is detail */}
                  <span className="loop-item__message">
                    {entry.message.split('\n')[0]}
                  </span>
                </div>
                <span className="loop-item__time">
                  {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {expanded === entry.id && (
                <div className="loop-item__body">
                  {/* Full message as paragraphs (skip first line — it's in the header) */}
                  {entry.message.includes('\n') && (
                    <div className="loop-item__narrative">
                      {entry.message.split('\n').slice(1).map((line, i) => (
                        line.trim() ? <p key={i}>{line}</p> : null
                      ))}
                    </div>
                  )}

                  {/* Structured details — render lists nicely */}
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <div className="loop-item__details">
                      {Object.entries(entry.details).map(([key, val]) => (
                        <div key={key} className="loop-detail">
                          <span className="loop-detail__key">{key}:</span>
                          <span className="loop-detail__val">
                            {Array.isArray(val)
                              ? val.map((item, i) => <span key={i} className="loop-detail__tag">{String(item)}</span>)
                              : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Article preview for entries with a run */}
                  {entry.run_uid && articleText[entry.run_uid] && (
                    <div className="loop-item__article">
                      <pre>{articleText[entry.run_uid].slice(0, 1000)}{articleText[entry.run_uid].length > 1000 ? '\n...' : ''}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              className="loop-load-more"
              onClick={() => fetchEntries(entries.length, true)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : `Load more (${total - entries.length} remaining)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
