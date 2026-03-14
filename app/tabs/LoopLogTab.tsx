'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TbRefresh, TbSend } from 'react-icons/tb';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

interface LoopEntry {
  id: number;
  kind: string;
  message: string;
  run_uid: string;
  score: number | null;
  details: Record<string, any>;
  created_at: string;
}

type FilterKind = 'all' | 'article' | 'eval' | 'feedback';

const PAGE_SIZE = 15;

const KIND_LABELS: Record<string, string> = {
  run: 'Run', eval: 'Eval', article: 'Article', adjust: 'Adjust',
  create: 'Create', note: 'Note', feedback: 'You',
};
const KIND_CLASSES: Record<string, string> = {
  run: 'loop-kind--run', eval: 'loop-kind--eval', article: 'loop-kind--article',
  adjust: 'loop-kind--adjust', create: 'loop-kind--create',
  note: 'loop-kind--note', feedback: 'loop-kind--feedback',
};

export default function LoopLogTab() {
  const { handleError } = useAuth();
  const [entries, setEntries] = useState<LoopEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterKind>('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [articleText, setArticleText] = useState<Record<string, string>>({});
  const [showFullArticle, setShowFullArticle] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const buildUrl = useCallback((offset = 0) => {
    let url = `/api/v1/loop-log/?limit=${PAGE_SIZE}&offset=${offset}`;
    if (filter !== 'all') url += `&kind=${filter}`;
    return url;
  }, [filter]);

  const fetchEntries = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await apiGet(buildUrl(offset)) as any;
      setEntries(prev => append ? [...prev, ...data.entries] : data.entries || []);
      setTotal(data.total || 0);
    } catch (e) { handleError(e); }
    setLoading(false);
    setLoadingMore(false);
  }, [handleError, buildUrl]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const changeFilter = useCallback((f: FilterKind) => {
    setFilter(f);
    setExpanded(null);
    setEntries([]);
  }, []);

  const toggleExpand = useCallback(async (id: number, runUid: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    setCommentText('');
    setShowFullArticle(null);
    if (runUid && !articleText[runUid]) {
      try {
        const data = await apiGet(`/api/v1/runs/${runUid}/`) as any;
        const wm = data.working_material || {};
        const article = wm.formatter || wm.magazine_writer || '';
        setArticleText(prev => ({ ...prev, [runUid]: article }));
      } catch {
        setArticleText(prev => ({ ...prev, [runUid]: '(error loading)' }));
      }
    }
  }, [expanded, articleText]);

  const sendFeedback = useCallback(async (msg: string, runUid: string) => {
    if (!msg.trim()) return;
    setCommenting(true);
    try {
      await apiPost('/api/v1/loop-log/add/', {
        kind: 'feedback', message: msg.trim(), run_uid: runUid,
      });
      setCommentText('');
      fetchEntries();
    } catch {}
    setCommenting(false);
  }, [fetchEntries]);

  const voiceLabel = (v: string) => v ? v.replace('the-', '').replace(/-/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) : '';
  const hasMore = entries.length < total;

  return (
    <div className="tab-content">
      <header className="tab-header">
        <h1>The Loop</h1>
        <button className="tab-header__action" onClick={() => fetchEntries()} aria-label="Refresh">
          <TbRefresh size={20} className={loading ? 'spin' : ''} />
        </button>
      </header>

      {/* Filter bar */}
      <div className="loop-filters">
        {(['all', 'article', 'eval', 'feedback'] as FilterKind[]).map(f => (
          <button key={f} className={`loop-filter ${filter === f ? 'loop-filter--active' : ''}`}
                  onClick={() => changeFilter(f)}>
            {f === 'all' ? 'All' : f === 'article' ? 'Articles' : f === 'eval' ? 'Evals' : 'My Feedback'}
          </button>
        ))}
      </div>

      {loading && entries.length === 0 ? (
        <p className="tab-empty">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="tab-empty">No entries{filter !== 'all' ? ` of type "${filter}"` : ''}.</p>
      ) : (
        <div className="loop-list">
          {entries.map(entry => {
            const isArticle = entry.kind === 'article';
            const d = entry.details || {};
            const voice = d.voice || '';
            const titles = (d.titles as string[]) || [];
            const excerpts = (d.excerpts as string[]) || [];

            return (
              <div key={entry.id} className={`loop-item ${isArticle ? 'loop-item--article' : ''}`}>
                <div className="loop-item__header" onClick={() => toggleExpand(entry.id, entry.run_uid)}>
                  <div className="loop-item__left">
                    <span className={`loop-kind ${KIND_CLASSES[entry.kind] || ''}`}>
                      {KIND_LABELS[entry.kind] || entry.kind}
                    </span>
                    {entry.score !== null && (
                      <span className={`loop-score ${entry.score >= 7 ? 'loop-score--good' : entry.score >= 5 ? 'loop-score--ok' : 'loop-score--bad'}`}>
                        {entry.score}/10
                      </span>
                    )}
                    {isArticle && voice && (
                      <span className={`voice-badge voice-badge--${voice}`}>{voiceLabel(voice)}</span>
                    )}
                    <span className="loop-item__message">{entry.message.split('\n')[0]}</span>
                  </div>
                  <span className="loop-item__time">
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {expanded === entry.id && (
                  <div className="loop-item__body">
                    {/* Article: show titles + excerpts */}
                    {isArticle && titles.length > 0 && (
                      <div className="article-titles">
                        <div className="article-titles__label">Titles</div>
                        {titles.map((t, i) => (
                          <div key={i} className="article-title-option">{t}</div>
                        ))}
                      </div>
                    )}
                    {isArticle && excerpts.length > 0 && (
                      <div className="article-excerpts">
                        <div className="article-excerpts__label">Excerpts</div>
                        {excerpts.map((e, i) => (
                          <div key={i} className="article-excerpt-option">{e}</div>
                        ))}
                      </div>
                    )}
                    {isArticle && d.word_count && (
                      <div className="article-meta-line">
                        {d.word_count} words · {(d.actors as string[])?.join(', ') || 'no actors'} · {d.scenario || ''}
                      </div>
                    )}

                    {/* Non-article: narrative paragraphs */}
                    {!isArticle && entry.message.includes('\n') && (
                      <div className="loop-item__narrative">
                        {entry.message.split('\n').slice(1).map((line, i) => (
                          line.trim() ? <p key={i}>{line}</p> : null
                        ))}
                      </div>
                    )}

                    {/* Details for non-article entries */}
                    {!isArticle && d && Object.keys(d).length > 0 && (
                      <div className="loop-item__details">
                        {Object.entries(d).map(([key, val]) => (
                          <div key={key} className="loop-detail">
                            <span className="loop-detail__key">{key}:</span>
                            <span className="loop-detail__val">
                              {Array.isArray(val)
                                ? val.map((item, i) => <span key={i} className="loop-detail__tag">{String(item)}</span>)
                                : String(val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Article text */}
                    {entry.run_uid && articleText[entry.run_uid] && (
                      <div className="loop-item__article">
                        {showFullArticle === entry.run_uid ? (
                          <>
                            <pre>{articleText[entry.run_uid]}</pre>
                            <button className="loop-article-toggle" onClick={() => setShowFullArticle(null)}>Collapse</button>
                          </>
                        ) : (
                          <>
                            <pre>{articleText[entry.run_uid].slice(0, 600)}{articleText[entry.run_uid].length > 600 ? '\n...' : ''}</pre>
                            {articleText[entry.run_uid].length > 600 && (
                              <button className="loop-article-toggle" onClick={() => setShowFullArticle(entry.run_uid)}>
                                Show full article
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Publish to WP button (for articles) */}
                    {isArticle && entry.run_uid && (
                      <button className="loop-publish-btn" onClick={async () => {
                        await apiPost('/api/v1/loop-log/add/', {
                          kind: 'feedback',
                          message: `Publish to WordPress: ${entry.message}`,
                          run_uid: entry.run_uid,
                          details: { action: 'publish_wp', title: titles[0] || entry.message },
                        });
                        fetchEntries();
                      }}>
                        Publish to WordPress
                      </button>
                    )}

                    {/* Feedback box */}
                    <div className="loop-comment-box">
                      <textarea
                        className="loop-comment-input"
                        placeholder={isArticle ? 'Feedback on this article...' : 'Your thoughts...'}
                        value={expanded === entry.id ? commentText : ''}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                      />
                      <button className="loop-comment-send"
                              disabled={commenting || !commentText.trim()}
                              onClick={() => sendFeedback(commentText, entry.run_uid || '')}>
                        <TbSend size={16} /> Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button className="loop-load-more"
                    onClick={() => fetchEntries(entries.length, true)}
                    disabled={loadingMore}>
              {loadingMore ? 'Loading...' : `Load more (${total - entries.length} remaining)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
