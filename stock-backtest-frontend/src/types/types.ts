export interface BacktestResult {
  symbol: string;
  short_window: number;
  long_window: number;
  final_return: number;
  history: number[];
}

export type Grade = "excellent" | "good" | "fair" | "poor" | "unknown";
export type OverallScore = "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
export type DispositionStatus = "normal" | "warning" | "disposition" | "n_a" | "unknown";

export interface FundamentalMetric {
  value: number | null;
  formatted: string;
  grade: Grade;
  label: string;
  hint: string;
}

export interface FundamentalsData {
  symbol: string;
  company_name: string;
  sector: string;
  industry: string;
  current_price: number | null;
  market_cap: number | null;

  pe_ratio: FundamentalMetric;
  pb_ratio: FundamentalMetric;
  ps_ratio: FundamentalMetric;
  peg_ratio: FundamentalMetric;

  roe: FundamentalMetric;
  operating_margin: FundamentalMetric;
  profit_margin: FundamentalMetric;

  debt_to_equity: FundamentalMetric;
  current_ratio: FundamentalMetric;

  earnings_growth: FundamentalMetric;
  revenue_growth: FundamentalMetric;

  eps: number | null;
  dividend_yield: number | null;
  free_cashflow: number | null;
  target_mean_price: number | null;

  overall_score: OverallScore;
  score_points: number;
}

export interface WatchlistEntry {
  symbol: string;
  company_name: string;
  current_price: number | null;
  change: number | null;
  change_pct: number | null;
  disposition_status: DispositionStatus;
}

export interface WatchlistResponse {
  items: WatchlistEntry[];
  updated_at: string;
}
