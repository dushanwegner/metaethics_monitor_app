export interface StockFavorite {
  symbol: string;
  name: string;
  current_price: string | null;
  price_change: string | null;
  price_change_percent: string | null;
  volume: number | null;
  last_updated: string | null;
  // Ethical scan (optional, included when available)
  tension_score?: number;
  dominant_structure?: string;
  sparkline?: number[];
}

export interface FavoritesResponse {
  favorites: StockFavorite[];
}

export interface EthicalScanSummary {
  scenario_title: string;
  structure_a: string;
  structure_b: string;
  tension_score: number;
  dominant_structure: string;
  scanned_at: string;
}

export interface EthicalScanActorResult {
  actor_name: string;
  actor_slug: string;
  chosen_structure: string;
  reasoning: string;
  ad_hoc?: boolean;
}

export interface EthicalScanFull {
  scenario_title: string;
  scenario_prompt: string;
  structure_a: string;
  structure_b: string;
  actor_results: EthicalScanActorResult[];
  tension_score: number;
  dominant_structure: string;
  summary: string;
  news_context: string[];
  model_used: string;
  scanned_at: string;
}

export interface StockDetail {
  symbol: string;
  name: string;
  current_price: string | null;
  price_change: string | null;
  price_change_percent: string | null;
  volume: number | null;
  last_updated: string | null;
  is_favorite: boolean;
  ceo: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  employees: number | null;
  headquarters: string | null;
  ethical_scan: EthicalScanSummary | null;
}

export interface StockHistoryResponse {
  labels: string[];
  prices: number[];
}

// All Stocks tab
export interface StockCatalogItem {
  symbol: string;
  name: string;
  exchange: 'NASDAQ' | 'NYSE' | 'OTHER';
  is_favorite: boolean;
}

export interface StocksCatalogResponse {
  stocks: StockCatalogItem[];
}

export interface StocksRefreshResponse {
  stocks: StockFavorite[];
}

export interface ToggleFavoriteResponse {
  symbol: string;
  is_favorite: boolean;
}

// Alarms tab
export interface AlarmItem {
  id: number;
  summary: string;
  is_active: boolean;
  symbol: string;
  stock_name: string;
  price_condition: string;
  price_threshold: string;
  near_percent: string;
  triggered: boolean;
  hot_score: number;
}

export interface AlarmsResponse {
  alarms: AlarmItem[];
}

// Patterns tab (lightweight, no geometry/price_series)
export interface PatternSummary {
  id: number;
  stock_symbol: string;
  stock_name: string;
  pattern_type: string;
  pattern_display: string;
  confidence: number;
  start_date: string;
  end_date: string | null;
}

export interface PatternsSummaryResponse {
  patterns: PatternSummary[];
}

export interface PatternKeyPoint {
  date: string;
  price: number;
  label: string;
}

export interface PatternGeometry {
  key_points?: PatternKeyPoint[];
  reference_line_price?: number;
  label_prefix?: string;
}

export interface Pattern {
  id: number;
  pattern_type: string;
  pattern_display: string;
  status: string;
  confidence: number;
  start_date: string;
  end_date: string | null;
  geometry: PatternGeometry;
  price_series: { date: string; price: number }[];
}

export interface PatternsResponse {
  patterns: Pattern[];
}

// Orchestrator — Scenarios & Runs
export interface ScenarioItem {
  slug: string;
  title: string;
  structure_a: string;
  structure_b: string;
  label_a: string;
  label_b: string;
}

export interface ScenariosResponse {
  scenarios: ScenarioItem[];
}

export interface ScenarioRelatedNews {
  title: string;
  url: string;
  source: string;
  analyzed_at: string | null;
  scenario_score: number | null;
  scenario_reason: string;
  summary: string;
  precedent_count: number;
  avg_quality_pct: number;
  dominant_direction: 'up' | 'down' | null;
  event_types: string[];
}

export interface PrecedentInsights {
  total_news: number;
  total_precedents: number;
  consensus?: {
    direction: 'up' | 'down';
    avg_pct: number;
    agreement: number;
  };
  event_types?: { type: string; label: string; count: number }[];
  tickers?: { ticker: string; avg_pct: number; direction: 'up' | 'down'; mentions: number }[];
}

export interface ScenarioDetail extends ScenarioItem {
  prompt_text: string;
  model_sets?: string[];
  related_news?: ScenarioRelatedNews[];
  precedent_insights?: PrecedentInsights | null;
}

export interface RunItem {
  uid: string;
  scenario_slug: string;
  scenario_name: string;
  created_at: string;
  total_elapsed: number;
  wp_post_url: string | null;
  tweet_url: string | null;
}

export interface RunsResponse {
  runs: RunItem[];
}

export interface RunDetail extends RunItem {
  responses: RunResponse[];
  article: string;
  titles: string[];
  excerpts: string[];
}

export interface RunResponse {
  actor: string;
  model?: string;
  chosen_structure: string;
  reasoning: string;
}

export interface RunTriggerResponse {
  uid: string;
  status: string;
}

export interface RunStatusResponse {
  status: string;
  log: string[];
  scenario: string;
  result_uid: string | null;
}

// News
export interface NewsItem {
  key: string;
  title: string;
  url: string;
  source: string;
  published: string;
  published_dt?: string;
  fetched_at?: string;
  category: string;
  symbol?: string;
  // Action state
  is_pinned?: boolean;
  pinned_at?: string | null;
  is_analyzed?: boolean;
  has_note?: boolean;
  note?: string;
  analysis?: NewsAnalysis | null;
  precedents?: NewsPrecedent[] | null;
}

export interface NewsAnalysis {
  summary: string;
  stocks?: { symbol: string; name: string; relevance: string }[];
  ethical_dimensions?: { tension: string; explanation: string }[];
  stakeholders?: { who: string; interest: string }[];
  metaethics_angle?: string;
}

export interface NewsPrecedent {
  company: string;
  ticker: string;
  event_date: string;
  event_description: string;
  similarity: string;
  data_available: boolean;
  quality?: number;
  event_type?: string;
  prices: {
    event?: number;
    '1d'?: number; '1d_pct'?: number;
    '5d'?: number; '5d_pct'?: number;
    '30d'?: number; '30d_pct'?: number;
  };
  daily_prices?: { date: string; close: number }[];
}

export interface NewsResponse {
  items: NewsItem[];
  hidden_count?: number;
  categories?: string[];
}

export interface NewsActionResponse {
  ok: boolean;
  is_hidden?: boolean;
  is_pinned?: boolean;
  note?: string;
  noted_at?: string | null;
}

export interface NewsAnalyzeResponse {
  task_id?: string;
  status?: string;
  analysis?: NewsAnalysis;
  analyzed_at?: string;
  model?: string;
  // Auto-triggered precedents (come with analysis)
  precedents?: NewsPrecedent[];
  precedents_status?: string;
  precedents_model?: string;
}

export interface NewsNoteItem {
  item_key: string;
  title: string;
  url: string;
  source: string;
  category: string;
  symbol?: string;
  note: string;
  noted_at: string;
}

export interface NewsNotesResponse {
  notes: NewsNoteItem[];
}

// AI API Token
export interface TokenResponse {
  token: string;
  created_at: string;
  last_used_at: string | null;
}

// Academy / Docs
export interface AcademyArticleItem {
  slug: string;
  title: string;
}

export interface AcademySection {
  name: string;
  articles: AcademyArticleItem[];
}

export interface AcademyListResponse {
  sections: AcademySection[];
}

export interface AcademyArticleResponse {
  slug: string;
  title: string;
  section: string;
  html: string;
}

// Dashboard (delta sync: sections are optional on refresh, only changed data is sent)
export interface DashboardResponse {
  synced_at: string;
  favorites?: StockFavorite[];
  runs?: RunItem[];
  news?: NewsItem[];
}

// Investment Signals (from precedent resolution tracking)
export interface SignalTickerHeadline {
  title: string;
  avg_pct: number;
  direction: 'up' | 'down';
}

export interface SignalTicker {
  ticker: string;
  is_tracked: boolean;
  direction: 'up' | 'down' | 'neutral';
  strength: number;
  pct_up: number;
  signal_count: number;
  headlines: SignalTickerHeadline[];
}

export interface SignalConsensus {
  avg_pct: number;
  direction: 'up' | 'down';
  agreement: number;
  count: number;
  baseline_price: number | null;
  is_tracked: boolean;
}

export interface SignalWatchItem {
  title: string;
  url: string;
  source: string;
  precedent_count: number;
  consensus: Record<string, SignalConsensus>;
  checks_done: number;
  checks_total: number;
  direction_pct: number | null;
  direction_matches: number;
  direction_total: number;
}

export interface SignalEventAccuracy {
  type: string;
  label: string;
  accuracy_pct: number;
  sample_size: number;
  checks: number;
}

export interface SignalsResponse {
  ticker_signals: SignalTicker[];
  watchlist: SignalWatchItem[];
  results: SignalWatchItem[];
  event_accuracy: SignalEventAccuracy[];
}
