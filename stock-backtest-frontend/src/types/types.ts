// src/types.ts
export interface BacktestResult {
  symbol: string;
  short_window: number;
  long_window: number;
  final_return: number;
  history: number[];
}
