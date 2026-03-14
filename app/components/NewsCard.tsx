'use client';

import { useEffect, useRef, useState } from 'react';
import {
  TbExternalLink, TbEyeOff, TbPinned, TbPinnedFilled,
  TbSearch, TbPencil, TbNote, TbChevronDown, TbChevronUp,
} from 'react-icons/tb';
import { apiGet, apiPost } from '../lib/api';
import { timeAgo } from '../lib/format';
import type {
  NewsItem, NewsActionResponse, NewsAnalyzeResponse, NewsAnalysis, NewsPrecedent,
} from '../lib/types';
import PrecedentsPanel from './PrecedentsPanel';

/* ---------- helpers ---------- */

export function newsItemPayload(item: NewsItem) {
  return {
    item_key: item.key,
    title: item.title,
    url: item.url,
    source: item.source,
    published_dt: item.published_dt || item.published || '',
    category: item.category,
    symbol: item.symbol || '',
  };
}

/* ---------- sub-components ---------- */

function AnalysisPanel({ analysis }: { analysis: NewsAnalysis }) {
  return (
    <div className="news-analysis">
      {analysis.summary && (
        <p className="news-analysis__summary">{analysis.summary}</p>
      )}
      {analysis.stocks && analysis.stocks.length > 0 && (
        <div className="news-analysis__stocks">
          {analysis.stocks.map(s => (
            <span key={s.symbol} className="news-analysis__ticker">{s.symbol}</span>
          ))}
        </div>
      )}
      {analysis.ethical_dimensions && analysis.ethical_dimensions.length > 0 && (
        <div className="news-analysis__tensions">
          {analysis.ethical_dimensions.map((d, i) => (
            <div key={i} className="news-analysis__tension">
              <strong>{d.tension}</strong> {d.explanation}
            </div>
          ))}
        </div>
      )}
      {analysis.metaethics_angle && (
        <p className="news-analysis__angle">{analysis.metaethics_angle}</p>
      )}
    </div>
  );
}

function NoteEditor({ item, onSaved }: {
  item: NewsItem;
  onSaved: (note: string) => void;
}) {
  const [text, setText] = useState(item.note || '');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiPost<NewsActionResponse>('/api/news/note/', {
        ...newsItemPayload(item),
        note: text.trim(),
      });
      onSaved(text.trim());
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div className="news-note-editor">
      <textarea
        ref={ref}
        className="news-note-editor__input"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a note..."
        rows={2}
      />
      <div className="news-note-editor__actions">
        <button
          className="news-note-editor__btn news-note-editor__btn--save"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

export default function NewsCard({ item, onUpdate, onOpen }: {
  item: NewsItem;
  onUpdate: (key: string, updates: Partial<NewsItem>) => void;
  onOpen?: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(!!item.analysis);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  // Precedent state — auto-populated when analysis returns with precedents
  const [precedents, setPrecedents] = useState<NewsPrecedent[] | null>(item.precedents || null);
  const [precStatus, setPrecStatus] = useState<string | undefined>();

  const handleHide = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const r = await apiPost<NewsActionResponse>('/api/news/hide/', newsItemPayload(item));
      if (r.is_hidden) {
        onUpdate(item.key, { _hidden: true } as unknown as Partial<NewsItem>);
      }
    } catch { /* ignore */ }
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const r = await apiPost<NewsActionResponse>('/api/news/pin/', newsItemPayload(item));
      onUpdate(item.key, { is_pinned: r.is_pinned });
    } catch { /* ignore */ }
  };

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle collapse if already analyzed
    if (item.analysis) {
      setShowAnalysis(prev => !prev);
      return;
    }
    setAnalyzing(true);
    setShowAnalysis(true);
    setProgress('Starting...');
    try {
      const r = await apiPost<NewsAnalyzeResponse>('/api/news/analyze/', newsItemPayload(item));
      if (r.analysis) {
        onUpdate(item.key, { analysis: r.analysis, is_analyzed: true });
        setAnalyzing(false);
        // Cached precedents returned alongside analysis
        if (r.precedents && r.precedents.length) {
          setPrecedents(r.precedents);
          setPrecStatus('done');
        }
        return;
      }
      if (r.task_id) {
        pollAnalysis(r.task_id);
      }
    } catch {
      setProgress('Failed');
      setAnalyzing(false);
    }
  };

  const pollAnalysis = (taskId: string) => {
    let analysisShown = false;

    const interval = setInterval(async () => {
      try {
        const r = await apiGet<NewsAnalyzeResponse>(`/api/news/analyze-status/${taskId}/`);

        // Show analysis as soon as it's ready, even if precedents still loading
        if (r.status === 'done' && r.analysis && !analysisShown) {
          analysisShown = true;
          onUpdate(item.key, { analysis: r.analysis, is_analyzed: true });
        }

        if (r.status === 'done') {
          const ps = r.precedents_status || '';
          // Track precedent progress
          if (ps) setPrecStatus(ps);

          if (ps === 'done' || ps === '' || ps.startsWith('error')) {
            // All done — stop polling
            clearInterval(interval);
            setAnalyzing(false);
            setProgress('');
            if (r.precedents && r.precedents.length) {
              setPrecedents(r.precedents);
            }
          } else {
            // Analysis done, precedents still running
            setProgress(ps);
          }
        } else if (r.status?.startsWith('error')) {
          clearInterval(interval);
          setAnalyzing(false);
        } else {
          setProgress(r.status || 'Analyzing...');
        }
      } catch {
        clearInterval(interval);
        setProgress('Polling failed');
        setAnalyzing(false);
      }
    }, 2000);
  };

  const handleNoteSaved = (note: string) => {
    setShowNote(false);
    onUpdate(item.key, { note, has_note: !!note });
  };

  const badgeLabel = item.category === 'stock' ? item.symbol || 'Stock' : item.category;
  const badgeClass = item.category === 'stock' ? 'stock' : 'cat';

  return (
    <div className={`news-card${item.is_pinned ? ' news-card--pinned' : ''}`}>
      {/* Header: badge + source + time + toggle */}
      <div className="news-card__top">
        <div className="news-card__badges">
          <span className={`news-card__badge news-card__badge--${badgeClass}`}>
            {badgeLabel}
          </span>
          {item.is_pinned && <TbPinnedFilled size={12} className="news-card__pin-icon" />}
          <span className="news-card__source">{item.source}</span>
        </div>
        <div className="news-card__top-right">
          <span className="news-card__time">{timeAgo(item.published_dt || item.published)}</span>
          <button
            className="news-card__toggle"
            onClick={(e) => { e.preventDefault(); setShowActions(prev => !prev); }}
            aria-label="Actions"
          >
            {showActions ? <TbChevronUp size={16} /> : <TbChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Title — tap opens overlay (or falls back to external link) */}
      {onOpen ? (
        <button className="news-card__title-link" onClick={onOpen}>
          <span className="news-card__title">{item.title}</span>
        </button>
      ) : (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-card__title-link">
          <span className="news-card__title">{item.title}</span>
        </a>
      )}

      {/* Actions row */}
      {showActions && (
        <div className="news-card__actions">
          <button className="news-action" onClick={handleHide} title="Hide">
            <TbEyeOff size={16} /> <span>Hide</span>
          </button>
          <button className={`news-action${item.is_pinned ? ' news-action--active' : ''}`} onClick={handlePin} title="Pin">
            {item.is_pinned ? <TbPinnedFilled size={16} /> : <TbPinned size={16} />}
            <span>{item.is_pinned ? 'Unpin' : 'Pin'}</span>
          </button>
          <button
            className={`news-action${item.is_analyzed ? ' news-action--active' : ''}`}
            onClick={handleAnalyze}
            disabled={analyzing}
            title="Analyze"
          >
            <TbSearch size={16} /> <span>Analyze</span>
          </button>
          <button
            className={`news-action${item.has_note ? ' news-action--active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowNote(prev => !prev); }}
            title="Note"
          >
            {item.has_note ? <TbNote size={16} /> : <TbPencil size={16} />}
            <span>Note</span>
          </button>
        </div>
      )}

      {/* Saved note */}
      {item.note && !showNote && (
        <div className="news-card__note" onClick={() => setShowNote(true)}>
          {item.note}
        </div>
      )}

      {/* Note editor */}
      {showNote && <NoteEditor item={item} onSaved={handleNoteSaved} />}

      {/* Analysis progress */}
      {analyzing && <div className="news-card__progress">{progress}</div>}

      {/* Analysis result */}
      {showAnalysis && item.analysis && <AnalysisPanel analysis={item.analysis} />}

      {/* Precedents (auto-triggered after analysis) */}
      {showAnalysis && (precedents || precStatus) && (
        <PrecedentsPanel precedents={precedents} status={precStatus} />
      )}
    </div>
  );
}
