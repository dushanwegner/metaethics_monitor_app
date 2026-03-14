'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TbArrowUpRight, TbArrowDownRight, TbMinus } from 'react-icons/tb';
import { apiGet } from '../lib/api';
import type { SignalsResponse, SignalTicker, SignalWatchItem } from '../lib/types';

/**
 * Investment signals card for the Home tab.
 * Shows ticker consensus direction and active watchlist items.
 * Renders nothing when no signal data exists — appears magically when ready.
 */
export default function SignalsCard() {
  const router = useRouter();
  const [data, setData] = useState<SignalsResponse | null>(null);

  useEffect(() => {
    apiGet<SignalsResponse>('/api/signals/')
      .then(setData)
      .catch(() => {}); // silently ignore — not critical
  }, []);

  // Don't render anything if no data or everything is empty
  if (!data) return null;
  const hasContent =
    data.ticker_signals.length > 0 ||
    data.watchlist.length > 0 ||
    data.results.length > 0;
  if (!hasContent) return null;

  return (
    <section className="home-section">
      <h2 className="home-section__title">Signals</h2>

      {/* Ticker consensus — the headline feature */}
      {data.ticker_signals.length > 0 && (
        <div className="signals-tickers">
          {data.ticker_signals.map((tc) => (
            <TickerSignal key={tc.ticker} signal={tc} router={router} />
          ))}
        </div>
      )}

      {/* Active watchlist */}
      {data.watchlist.length > 0 && (
        <div className="signals-section">
          <h3 className="signals-section__title">Watching</h3>
          {data.watchlist.map((w, i) => (
            <WatchItem key={i} item={w} />
          ))}
        </div>
      )}

      {/* Completed results */}
      {data.results.length > 0 && (
        <div className="signals-section">
          <h3 className="signals-section__title">Results</h3>
          {data.results.map((r, i) => (
            <ResultItem key={i} item={r} />
          ))}
        </div>
      )}

      {/* Event accuracy */}
      {data.event_accuracy.length > 0 && (
        <div className="signals-section">
          <h3 className="signals-section__title">Pattern Accuracy</h3>
          <div className="signals-accuracy">
            {data.event_accuracy.map((ea) => (
              <div key={ea.type} className="signals-accuracy__row">
                <span className="signals-accuracy__label">{ea.label}</span>
                <span className={`signals-accuracy__pct ${accuracyCls(ea.accuracy_pct)}`}>
                  {ea.accuracy_pct}%
                </span>
                <span className="signals-accuracy__sample">n={ea.sample_size}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function accuracyCls(pct: number): string {
  if (pct >= 70) return 'signals--good';
  if (pct >= 50) return 'signals--fair';
  return 'signals--poor';
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === 'up') return <TbArrowUpRight className="signals-dir--up" />;
  if (direction === 'down') return <TbArrowDownRight className="signals-dir--down" />;
  return <TbMinus className="signals-dir--neutral" />;
}

function TickerSignal({ signal, router }: { signal: SignalTicker; router: ReturnType<typeof useRouter> }) {
  return (
    <div
      className="signal-tile"
      onClick={signal.is_tracked ? () => router.push(`/stock?symbol=${signal.ticker}`) : undefined}
      style={signal.is_tracked ? { cursor: 'pointer' } : undefined}
    >
      <div className="signal-tile__top">
        <span className="signal-tile__ticker">{signal.ticker}</span>
        <DirectionIcon direction={signal.direction} />
        <span className="signal-tile__strength">{signal.strength}%</span>
      </div>
      {/* Green/red consensus bar */}
      <div className="signal-tile__bar">
        <div className="signal-tile__bar-fill" style={{ width: `${signal.pct_up}%` }} />
      </div>
      <div className="signal-tile__meta">
        {signal.signal_count} signal{signal.signal_count !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function WatchItem({ item }: { item: SignalWatchItem }) {
  const tickers = Object.entries(item.consensus);
  return (
    <div className="signal-watch">
      <div className="signal-watch__title">{item.title}</div>
      <div className="signal-watch__meta">
        {item.checks_done}/{item.checks_total} checks
        &middot; {item.precedent_count} precedent{item.precedent_count !== 1 ? 's' : ''}
      </div>
      <div className="signal-watch__tickers">
        {tickers.map(([ticker, cons]) => (
          <span key={ticker} className={`signal-watch__ticker signals-dir--${cons.direction}`}>
            {ticker} {cons.avg_pct > 0 ? '+' : ''}{cons.avg_pct}%
            <span className="signal-watch__agree">({cons.agreement}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ResultItem({ item }: { item: SignalWatchItem }) {
  return (
    <div className="signal-result">
      <div className="signal-result__title">{item.title}</div>
      <div className="signal-result__meta">
        <span className={accuracyCls(item.direction_pct ?? 0)}>
          {item.direction_pct}% accurate
        </span>
        &middot; {item.direction_matches}/{item.direction_total} matches
      </div>
    </div>
  );
}
