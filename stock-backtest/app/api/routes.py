from fastapi import APIRouter, HTTPException, Query
from app.models.schema import (
    AddSymbolRequest,
    BacktestResponse,
    FundamentalsResponse,
    WatchlistResponse,
)
from app.services.backtest import run_backtest
from app.services.fundamentals import get_fundamentals
from app.services import watchlist as wl_svc

router = APIRouter()


# ── Backtest ──────────────────────────────────────────────────────────────────

@router.get("/backtest", response_model=BacktestResponse)
def backtest(symbol: str = Query(...), short_window: int = 20, long_window: int = 50):
    return run_backtest(symbol, short_window, long_window)


# ── Fundamentals ──────────────────────────────────────────────────────────────

@router.get("/fundamentals", response_model=FundamentalsResponse)
def fundamentals(symbol: str = Query(...)):
    return get_fundamentals(symbol)


# ── Watchlist ─────────────────────────────────────────────────────────────────

@router.get("/watchlist", response_model=WatchlistResponse)
def get_watchlist():
    return wl_svc.get_watchlist_with_prices()


@router.post("/watchlist", response_model=WatchlistResponse)
def add_to_watchlist(body: AddSymbolRequest):
    if not body.symbol.strip():
        raise HTTPException(status_code=400, detail="Symbol cannot be empty")
    wl_svc.add_symbol(body.symbol)
    return wl_svc.get_watchlist_with_prices()


@router.delete("/watchlist/{symbol}", response_model=WatchlistResponse)
def remove_from_watchlist(symbol: str):
    wl_svc.remove_symbol(symbol)
    return wl_svc.get_watchlist_with_prices()
