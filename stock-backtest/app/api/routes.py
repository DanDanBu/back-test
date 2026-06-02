from fastapi import APIRouter, Query
from app.services.backtest import run_backtest
from app.services.fundamentals import get_fundamentals
from app.models.schema import BacktestResponse, FundamentalsResponse

router = APIRouter()


@router.get("/backtest", response_model=BacktestResponse)
def backtest(symbol: str = Query(...), short_window: int = 20, long_window: int = 50):
    return run_backtest(symbol, short_window, long_window)


@router.get("/fundamentals", response_model=FundamentalsResponse)
def fundamentals(symbol: str = Query(...)):
    return get_fundamentals(symbol)
