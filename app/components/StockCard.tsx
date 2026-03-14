import type { StockFavorite } from '../lib/types';
import { formatPrice, formatChange, timeAgoLong } from '../lib/format';

export default function StockCard({ stock, onClick }: { stock: StockFavorite; onClick?: () => void }) {
  const { text: changeText, direction } = formatChange(stock.price_change, stock.price_change_percent);

  return (
    <div className="stock-card" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="stock-card__info">
        <div className="stock-card__symbol">{stock.symbol}</div>
        <div className="stock-card__name">{stock.name}</div>
      </div>
      <div className="stock-card__price-block">
        <div className="stock-card__price">${formatPrice(stock.current_price)}</div>
        <div className={`stock-card__change stock-card__change--${direction}`}>
          {changeText}
        </div>
        {stock.last_updated && (
          <div className="stock-card__updated">{timeAgoLong(stock.last_updated)}</div>
        )}
      </div>
    </div>
  );
}
