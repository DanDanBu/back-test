from pydantic import BaseModel
from typing import List, Optional


class BacktestResponse(BaseModel):
    symbol: str
    short_window: int
    long_window: int
    final_return: float
    history: List[float]


class FundamentalMetric(BaseModel):
    value: Optional[float] = None
    formatted: str = "N/A"
    grade: str = "unknown"
    label: str
    hint: str = ""


class FundamentalsResponse(BaseModel):
    symbol: str
    company_name: str
    sector: str
    industry: str
    current_price: Optional[float] = None
    market_cap: Optional[float] = None

    pe_ratio: FundamentalMetric
    pb_ratio: FundamentalMetric
    ps_ratio: FundamentalMetric
    peg_ratio: FundamentalMetric

    roe: FundamentalMetric
    operating_margin: FundamentalMetric
    profit_margin: FundamentalMetric
    roic: FundamentalMetric

    debt_to_equity: FundamentalMetric
    current_ratio: FundamentalMetric
    interest_coverage: FundamentalMetric

    earnings_growth: FundamentalMetric
    revenue_growth: FundamentalMetric

    eps: Optional[float] = None
    dividend_yield: Optional[float] = None
    free_cashflow: Optional[float] = None
    target_mean_price: Optional[float] = None

    overall_score: str = "hold"
    score_points: int = 0


# ── Watchlist ────────────────────────────────────────────────────────────────

class WatchlistItem(BaseModel):
    symbol: str
    company_name: str
    added_at: str


class WatchlistEntry(BaseModel):
    symbol: str
    company_name: str
    current_price: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    # "normal" | "warning" | "disposition" | "n_a" | "unknown"
    disposition_status: str = "unknown"


class WatchlistResponse(BaseModel):
    items: List[WatchlistEntry]
    updated_at: str


class AddSymbolRequest(BaseModel):
    symbol: str
