'use client';

import type { NewsPrecedent } from '../lib/types';

function QualityBadge({ quality }: { quality?: number }) {
  if (!quality) return null;
  const pct = Math.round(quality * 100);
  const cls = quality >= 0.7 ? 'prec-quality--high'
    : quality >= 0.4 ? 'prec-quality--mid'
    : 'prec-quality--low';
  const label = quality >= 0.7 ? 'Strong' : quality >= 0.4 ? 'Partial' : 'Weak';
  return <span className={`prec-quality ${cls}`} title={`Data quality: ${pct}%`}>{label}</span>;
}

function PctBadge({ label, pct }: { label: string; pct: number }) {
  const cls = pct >= 0 ? 'prec-badge--up' : 'prec-badge--down';
  const sign = pct >= 0 ? '+' : '';
  return <span className={`prec-badge ${cls}`}>{label}: {sign}{pct.toFixed(1)}%</span>;
}

function PrecedentCard({ p }: { p: NewsPrecedent }) {
  const prices = p.prices || {};

  return (
    <div className="prec-card">
      <div className="prec-card__header">
        <strong className="prec-card__ticker">{p.ticker}</strong>
        <span className="prec-card__company">{p.company}</span>
        <span className="prec-card__date">{p.event_date}</span>
        <QualityBadge quality={p.quality} />
      </div>
      <div className="prec-card__desc">{p.event_description}</div>
      <div className="prec-card__similarity">{p.similarity}</div>
      {p.data_available && prices.event ? (
        <div className="prec-card__reactions">
          <span className="prec-card__event-price">${prices.event.toFixed(2)}</span>
          {prices['1d_pct'] !== undefined && <PctBadge label="1d" pct={prices['1d_pct']} />}
          {prices['5d_pct'] !== undefined && <PctBadge label="5d" pct={prices['5d_pct']} />}
          {prices['30d_pct'] !== undefined && <PctBadge label="30d" pct={prices['30d_pct']} />}
        </div>
      ) : (
        <div className="prec-card__no-data">Price data unavailable</div>
      )}
    </div>
  );
}

export default function PrecedentsPanel({ precedents, status }: {
  precedents?: NewsPrecedent[] | null;
  status?: string;
}) {
  // Still loading
  if (status && status !== 'done' && !status.startsWith('error')) {
    return <div className="prec-loading">{status}</div>;
  }

  // Error
  if (status?.startsWith('error')) {
    return null; // silently skip — precedent errors aren't critical
  }

  if (!precedents || precedents.length === 0) return null;

  return (
    <div className="prec-panel">
      <div className="prec-panel__header">
        Precedents ({precedents.length})
      </div>
      {precedents.map((p, i) => (
        <PrecedentCard key={`${p.ticker}-${p.event_date}-${i}`} p={p} />
      ))}
    </div>
  );
}
