import yfinance as yf
import pandas as pd
from app.models.schema import BacktestResponse

def run_backtest(symbol: str, short_window: int, long_window: int) -> BacktestResponse:
    data = yf.download(symbol, period="1y")
    if data.empty:
        return {"error": "No data found."}
    
    data["SMA_short"] = data["Close"].rolling(window=short_window).mean()
    data["SMA_long"] = data["Close"].rolling(window=long_window).mean()

    data["position"] = 0
    data.loc[data["SMA_short"] > data["SMA_long"], "position"] = 1
    data.loc[data["SMA_short"] < data["SMA_long"], "position"] = -1

    data["daily_return"] = data["Close"].pct_change()
    data["strategy_return"] = data["daily_return"] * data["position"].shift(1)

    cumulative_return = (1 + data["strategy_return"].fillna(0)).cumprod()

    return {
        "symbol": symbol,
        "short_window": short_window,
        "long_window": long_window,
        "final_return": cumulative_return.iloc[-1],
        "history": cumulative_return.tail(30).tolist()
    }
