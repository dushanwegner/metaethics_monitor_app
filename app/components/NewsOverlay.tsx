'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TbX, TbChevronLeft, TbChevronRight, TbExternalLink,
  TbEyeOff, TbPinned, TbPinnedFilled, TbSearch, TbPencil, TbNote,
  TbArticle,
} from 'react-icons/tb';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { apiGet, apiPost } from '../lib/api';
import { timeAgo } from '../lib/format';
import { newsItemPayload } from './NewsCard';
import PrecedentsPanel from './PrecedentsPanel';
import type {
  NewsItem, NewsActionResponse, NewsAnalyzeResponse, NewsAnalysis, NewsPrecedent,
} from '../lib/types';

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
        rows={3}
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

/* ---------- helpers ---------- */

async function openArticle(url: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url, presentationStyle: 'popover' });
      return;
    } catch { /* fall through */ }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/* ---------- main overlay ---------- */

interface NewsOverlayProps {
  items: NewsItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onUpdate: (key: string, updates: Partial<NewsItem>) => void;
}

export default function NewsOverlay({ items, currentIndex, onNavigate, onClose, onUpdate }: NewsOverlayProps) {
  const item = items[currentIndex];
  const [showNote, setShowNote] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const [precedents, setPrecedents] = useState<NewsPrecedent[] | null>(item?.precedents || null);
  const [precStatus, setPrecStatus] = useState<string | undefined>();
  const bodyRef = useRef<HTMLDivElement>(null);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Reset local state on navigation
  useEffect(() => {
    setShowNote(false);
    setAnalyzing(false);
    setProgress('');
    setPrecedents(item?.precedents || null);
    setPrecStatus(undefined);
    bodyRef.current?.scrollTo(0, 0);
  }, [currentIndex, item?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < items.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, items.length, onClose, onNavigate]);

  if (!item) return null;

  // --- Actions ---

  const handleHide = async () => {
    onUpdate(item.key, { _hidden: true } as unknown as Partial<NewsItem>);
    if (currentIndex < items.length - 1) {
      // stay at index — next item slides in
    } else if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onClose();
    }
    try {
      await apiPost<NewsActionResponse>('/api/news/hide/', newsItemPayload(item));
    } catch { /* ignore */ }
  };

  const handlePin = async () => {
    try {
      const r = await apiPost<NewsActionResponse>('/api/news/pin/', newsItemPayload(item));
      onUpdate(item.key, { is_pinned: r.is_pinned });
    } catch { /* ignore */ }
  };

  const handleAnalyze = async () => {
    if (item.analysis) return;
    setAnalyzing(true);
    setProgress('Starting...');
    try {
      const r = await apiPost<NewsAnalyzeResponse>('/api/news/analyze/', newsItemPayload(item));
      if (r.analysis) {
        onUpdate(item.key, { analysis: r.analysis, is_analyzed: true });
        setAnalyzing(false);
        if (r.precedents && r.precedents.length) {
          setPrecedents(r.precedents);
          setPrecStatus('done');
        }
        return;
      }
      if (r.task_id) pollAnalysis(r.task_id);
    } catch {
      setProgress('Failed');
      setAnalyzing(false);
    }
  };

  const pollAnalysis = useCallback((taskId: string) => {
    let analysisShown = false;
    const interval = setInterval(async () => {
      try {
        const r = await apiGet<NewsAnalyzeResponse>(`/api/news/analyze-status/${taskId}/`);
        if (r.status === 'done' && r.analysis && !analysisShown) {
          analysisShown = true;
          onUpdate(item.key, { analysis: r.analysis, is_analyzed: true });
        }
        if (r.status === 'done') {
          const ps = r.precedents_status || '';
          if (ps) setPrecStatus(ps);
          if (ps === 'done' || ps === '' || ps.startsWith('error')) {
            clearInterval(interval);
            setAnalyzing(false);
            setProgress('');
            if (r.precedents && r.precedents.length) setPrecedents(r.precedents);
          } else {
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
  }, [item.key, onUpdate]);

  const handleNoteSaved = (note: string) => {
    setShowNote(false);
    onUpdate(item.key, { note, has_note: !!note });
  };

  const badgeLabel = item.category === 'stock' ? item.symbol || 'Stock' : item.category;
  const badgeClass = item.category === 'stock' ? 'stock' : 'cat';
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  return (
    <div className="news-overlay" onClick={onClose}>
      <div className="news-overlay__panel" onClick={e => e.stopPropagation()}>

        {/* Header: close + counter + nav */}
        <div className="news-overlay__header">
          <button className="news-overlay__close" onClick={onClose} aria-label="Close">
            <TbX size={22} />
          </button>
          <span className="news-overlay__counter">
            {currentIndex + 1} / {items.length}
          </span>
          <div className="news-overlay__nav">
            <button className="news-overlay__nav-btn" disabled={!hasPrev} onClick={() => onNavigate(currentIndex - 1)}>
              <TbChevronLeft size={22} />
            </button>
            <button className="news-overlay__nav-btn" disabled={!hasNext} onClick={() => onNavigate(currentIndex + 1)}>
              <TbChevronRight size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="news-overlay__body" ref={bodyRef}>

          {/* Meta */}
          <div className="news-overlay__meta">
            <span className={`news-card__badge news-card__badge--${badgeClass}`}>{badgeLabel}</span>
            {item.is_pinned && <TbPinnedFilled size={13} className="news-card__pin-icon" />}
            <span className="news-overlay__source">{item.source}</span>
            <span className="news-overlay__time">{timeAgo(item.published_dt || item.published)}</span>
          </div>

          {/* Title */}
          <h2 className="news-overlay__title">{item.title}</h2>

          {/* Read Article — opens in-app browser */}
          <button className="news-overlay__read-btn" onClick={() => openArticle(item.url)}>
            <TbArticle size={20} />
            <span>Read Article</span>
          </button>

          {/* Action buttons */}
          <div className="news-overlay__actions">
            <button className="news-action" onClick={handleHide}>
              <TbEyeOff size={16} /> <span>Hide</span>
            </button>
            <button className={`news-action${item.is_pinned ? ' news-action--active' : ''}`} onClick={handlePin}>
              {item.is_pinned ? <TbPinnedFilled size={16} /> : <TbPinned size={16} />}
              <span>{item.is_pinned ? 'Unpin' : 'Pin'}</span>
            </button>
            <button
              className={`news-action${item.is_analyzed ? ' news-action--active' : ''}`}
              onClick={handleAnalyze}
              disabled={analyzing || !!item.analysis}
            >
              <TbSearch size={16} /> <span>{item.analysis ? 'Analyzed' : 'Analyze'}</span>
            </button>
            <button
              className={`news-action${item.has_note ? ' news-action--active' : ''}`}
              onClick={() => setShowNote(prev => !prev)}
            >
              {item.has_note ? <TbNote size={16} /> : <TbPencil size={16} />}
              <span>Note</span>
            </button>
            <button className="news-action" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}>
              <TbExternalLink size={16} /> <span>Safari</span>
            </button>
          </div>

          {/* Note editor */}
          {showNote && <NoteEditor item={item} onSaved={handleNoteSaved} />}

          {/* Saved note */}
          {item.note && !showNote && (
            <div className="news-card__note" onClick={() => setShowNote(true)}>
              {item.note}
            </div>
          )}

          {/* Analysis progress */}
          {analyzing && <div className="news-card__progress">{progress}</div>}

          {/* Analysis result */}
          {item.analysis && <AnalysisPanel analysis={item.analysis} />}

          {/* Precedents */}
          {(precedents || precStatus) && (
            <PrecedentsPanel precedents={precedents} status={precStatus} />
          )}
        </div>
      </div>
    </div>
  );
}
