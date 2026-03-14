/**
 * Shared formatting utilities — single source of truth.
 * Replaces 5 duplicate timeAgo(), 3 formatPrice(), 2 formatChange().
 */

/** Compact relative time: "now", "3m", "2h", "5d" */
export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Verbose relative time: "just now", "3m ago", "2h ago", "5d ago" */
export function timeAgoLong(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const t = timeAgo(dateStr);
  if (!t) return '';
  if (t === 'now') return 'just now';
  return `${t} ago`;
}

/** Format price with 2 decimal places: "$1,234.56" */
export function formatPrice(price: string | null | undefined): string {
  if (!price) return '—';
  const n = parseFloat(price);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format change + percent, returns text and direction for coloring */
export function formatChange(
  change: string | null | undefined,
  percent: string | null | undefined,
): { text: string; direction: 'up' | 'down' | 'flat' } {
  if (!change || !percent) return { text: '—', direction: 'flat' };
  const c = parseFloat(change);
  const p = parseFloat(percent);
  if (isNaN(c) || isNaN(p)) return { text: '—', direction: 'flat' };
  const sign = c >= 0 ? '+' : '';
  const direction = c > 0 ? 'up' : c < 0 ? 'down' : 'flat';
  return { text: `${sign}${c.toFixed(2)} (${sign}${p.toFixed(2)}%)`, direction };
}
