'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiGet } from '../lib/api';
import type { Pattern, StockHistoryResponse } from '../lib/types';

const PERIODS = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '1Y', value: '1y' },
] as const;

const CHART_HEIGHT = 200;
const PADDING = { top: 16, bottom: 24, left: 16, right: 16 };

interface Props {
  symbol: string;
  direction: 'up' | 'down' | 'flat';
  pattern?: Pattern | null;
}

function formatAxisPrice(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  if (n >= 100) return n.toFixed(0);
  return n.toFixed(2);
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(iso: string): string {
  const end = new Date(iso + 'T00:00:00');
  const now = new Date();
  const days = Math.round((now.getTime() - end.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

function patternSpanLabel(start: string, end: string | null): string {
  const s = new Date(start + 'T00:00:00');
  const e = end ? new Date(end + 'T00:00:00') : s;
  const days = Math.round((e.getTime() - s.getTime()) / 86400000);
  if (days <= 7) return `${days}d span`;
  if (days < 60) return `${Math.round(days / 7)}w span`;
  return `${Math.round(days / 30)}mo span`;
}

export default function PriceChart({ symbol, direction, pattern }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState('1mo');
  const [fromZero, setFromZero] = useState(false);
  const [prices, setPrices] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(0);

  // Track container width
  useEffect(() => {
    if (!containerRef.current) return;
    setWidth(containerRef.current.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Fetch data (only when no pattern selected)
  const fetchHistory = useCallback(async () => {
    if (pattern) return;
    setLoading(true);
    try {
      const data = await apiGet<StockHistoryResponse>(`/api/stock/${symbol}/history/?period=${period}`);
      if (data.prices) {
        setPrices(data.prices.filter(p => p != null && !isNaN(p)));
      }
    } catch {
      // Chart data unavailable
    } finally {
      setLoading(false);
    }
  }, [symbol, period, pattern]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Determine data source
  const isPatternMode = !!pattern && pattern.price_series.length > 1;
  const chartPrices = isPatternMode
    ? pattern.price_series.map(p => p.price)
    : prices;
  const chartDates = isPatternMode
    ? pattern.price_series.map(p => p.date)
    : null;

  // Compute SVG paths
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  let linePath = '';
  let areaPath = '';
  let gridLines: { y: number; label: string }[] = [];
  let toX: (i: number) => number = () => 0;
  let toY: (v: number) => number = () => 0;
  let dataMin = 0;
  let dataMax = 0;

  if (chartPrices.length > 1 && plotW > 0) {
    dataMin = fromZero ? 0 : Math.min(...chartPrices);
    dataMax = Math.max(...chartPrices);
    const range = dataMax - dataMin || 1;

    toX = (i: number) => PADDING.left + (i / (chartPrices.length - 1)) * plotW;
    toY = (v: number) => PADDING.top + (1 - (v - dataMin) / range) * plotH;

    const points = chartPrices.map((p, i) => `${toX(i).toFixed(1)},${toY(p).toFixed(1)}`);
    linePath = `M${points.join('L')}`;
    areaPath = `${linePath}L${toX(chartPrices.length - 1).toFixed(1)},${(PADDING.top + plotH).toFixed(1)}L${PADDING.left},${(PADDING.top + plotH).toFixed(1)}Z`;

    const steps = [0.25, 0.5, 0.75];
    gridLines = steps.map(s => {
      const val = dataMin + range * (1 - s);
      return { y: PADDING.top + s * plotH, label: formatAxisPrice(val) };
    });
  }

  // Pattern overlay elements
  const keyPointElements: { cx: number; cy: number; label: string }[] = [];
  let refLineY: number | null = null;
  let skeletonPath = '';

  if (isPatternMode && chartDates && chartPrices.length > 1) {
    const geo = pattern.geometry;

    // Reference line
    if (geo.reference_line_price != null) {
      const ry = toY(geo.reference_line_price);
      if (ry >= PADDING.top && ry <= PADDING.top + plotH) {
        refLineY = ry;
      }
    }

    // Key points + skeleton connecting line
    if (geo.key_points) {
      for (const kp of geo.key_points) {
        const idx = chartDates.indexOf(kp.date);
        if (idx >= 0) {
          keyPointElements.push({
            cx: toX(idx),
            cy: toY(kp.price),
            label: kp.label,
          });
        }
      }
      if (keyPointElements.length > 1) {
        skeletonPath = keyPointElements
          .map((kp, i) => `${i === 0 ? 'M' : 'L'}${kp.cx.toFixed(1)},${kp.cy.toFixed(1)}`)
          .join('');
      }
    }
  }

  const lineColor = isPatternMode ? 'pattern' : direction;

  return (
    <div className="price-chart">
      {/* Pattern info bar */}
      {isPatternMode && pattern && (
        <div className="price-chart__pattern-info">
          <span className="price-chart__pattern-name">{pattern.pattern_display}</span>
          <span className="price-chart__pattern-meta">
            {formatDateShort(pattern.start_date)}
            {pattern.end_date ? ` – ${formatDateShort(pattern.end_date)}` : ''}
            {' \u00b7 '}
            {patternSpanLabel(pattern.start_date, pattern.end_date)}
            {pattern.end_date ? ` \u00b7 ${timeAgo(pattern.end_date)}` : ''}
          </span>
        </div>
      )}

      <div className="price-chart__container" ref={containerRef}>
        {!isPatternMode && loading && prices.length === 0 ? (
          <div className="price-chart__loading" />
        ) : chartPrices.length > 1 && width > 0 ? (
          <svg width={width} height={CHART_HEIGHT} className={`price-chart__svg${!isPatternMode && loading ? ' price-chart__svg--loading' : ''}`}>
            {/* Grid lines */}
            {gridLines.map((g, i) => (
              <g key={i}>
                <line x1={PADDING.left} y1={g.y} x2={width - PADDING.right} y2={g.y} className="price-chart__grid" />
                <text x={PADDING.left + 4} y={g.y - 4} className="price-chart__grid-label">{g.label}</text>
              </g>
            ))}
            {/* Reference line */}
            {refLineY != null && (
              <line
                x1={PADDING.left} y1={refLineY}
                x2={width - PADDING.right} y2={refLineY}
                className="price-chart__ref-line"
              />
            )}
            {/* Area fill */}
            <path d={areaPath} className={`price-chart__area price-chart__area--${lineColor}`} />
            {/* Line */}
            <path d={linePath} className={`price-chart__line price-chart__line--${lineColor}`} fill="none" />
            {/* Pattern skeleton line */}
            {skeletonPath && (
              <path d={skeletonPath} className="price-chart__skeleton" fill="none" />
            )}
            {/* Key points with label badges */}
            {keyPointElements.map((kp, i) => (
              <g key={i}>
                <circle cx={kp.cx} cy={kp.cy} r={5} className="price-chart__key-dot" />
                <rect
                  x={kp.cx - 10} y={kp.cy - 22}
                  width={20} height={14}
                  rx={4}
                  className="price-chart__key-badge"
                />
                <text
                  x={kp.cx}
                  y={kp.cy - 12}
                  className="price-chart__key-label"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {kp.label}
                </text>
              </g>
            ))}
          </svg>
        ) : null}
      </div>

      {/* Period controls — hidden in pattern mode */}
      {!isPatternMode && (
        <div className="price-chart__controls">
          <button
            className={`price-chart__period${fromZero ? ' price-chart__period--active' : ''}`}
            onClick={() => setFromZero(!fromZero)}
          >
            0
          </button>
          <div className="price-chart__periods">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                className={`price-chart__period${period === p.value ? ' price-chart__period--active' : ''}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
