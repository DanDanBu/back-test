from fastapi import APIRouter, Query
from app.services.backtest import run_backtest
from app.models.schema import BacktestResponse

router = APIRouter()

@router.get("/backtest", response_model=BacktestResponse)
def backtest(symbol: str = Query(...), short_window: int = 20, long_window: int = 50):
    return run_backtest(symbol, short_window, long_window)