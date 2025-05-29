from fastapi import FastAPI, Query
import yfinance as yf
import pandas as pd
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 實際上建議改成 ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/backtest")
def backtest(symbol: str = "AAPL", short_window: int = 20, long_window: int = 50):
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
