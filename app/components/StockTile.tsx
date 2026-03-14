import { TbStar, TbStarFilled } from 'react-icons/tb';
import { formatPrice } from '../lib/format';
import SparklineSvg from './SparklineSvg';
import type { StockFavorite } from '../lib/types';

interface Props {
  stock: StockFavorite;
  isFavorite: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}

/** Format change direction from raw values */
function changeDirection(change: string | null | undefined): 'up' | 'down' | 'flat' {
  if (!change) return 'flat';
  const c = parseFloat(change);
  if (isNaN(c)) return 'flat';
  return c > 0 ? 'up' : c < 0 ? 'down' : 'flat';
}

/** Format dollar change: "+1.93" / "-6.17" / "—" */
function fmtChange(change: string | null | undefined): string {
  if (!change) return '—';
  const c = parseFloat(change);
  if (isNaN(c)) return '—';
  const sign = c >= 0 ? '+' : '';
  return `${sign}${c.toFixed(2)}`;
}

/** Format percent change: "+0.89%" / "-0.92%" / "—" */
function fmtPercent(percent: string | null | undefined): string {
  if (!percent) return '—';
  const p = parseFloat(percent);
  if (isNaN(p)) return '—';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(2)}%`;
}

/** Tension level for CSS class: high (>0.35), medium (>0.15), or low */
function tensionLevel(score: number | undefined): string {
  if (score === undefined) return '';
  if (score >= 0.35) return 'high';
  if (score >= 0.15) return 'medium';
  return 'low';
}

/** Square tile: ticker, price, change, sparkline background, tension border, star. */
export default function StockTile({ stock, isFavorite, onToggleFavorite, onClick }: Props) {
  const direction = changeDirection(stock.price_change);
  const tension = tensionLevel(stock.tension_score);

  return (
    <button
      className={`stock-tile${tension ? ` stock-tile--tension-${tension}` : ''}`}
      onClick={onClick}
    >
      {/* Sparkline background */}
      {stock.sparkline && stock.sparkline.length >= 2 && (
        <SparklineSvg data={stock.sparkline} className="stock-tile__sparkline" />
      )}

      {onToggleFavorite && (
        <span
          className={`stock-tile__star${isFavorite ? ' stock-tile__star--active' : ''}`}
          onClick={onToggleFavorite}
          role="button"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? <TbStarFilled size={14} /> : <TbStar size={14} />}
        </span>
      )}
      <span className="stock-tile__symbol">{stock.symbol}</span>
      <span className="stock-tile__price">
        {stock.current_price ? `$${formatPrice(stock.current_price)}` : '—'}
      </span>
      <span className={`stock-tile__change stock-tile__change--${direction}`}>
        {fmtChange(stock.price_change)}
      </span>
      <span className={`stock-tile__change stock-tile__change--${direction}`}>
        {fmtPercent(stock.price_change_percent)}
      </span>
    </button>
  );
}
