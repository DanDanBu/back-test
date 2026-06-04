import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any

import yfinance as yf

from app.models.schema import WatchlistEntry, WatchlistItem, WatchlistResponse
from app.services.disposition import get_status

_STORAGE = os.path.join(os.path.dirname(__file__), "..", "..", "watchlist.json")


# ── Persistence ──────────────────────────────────────────────────────────────

def _load() -> list[WatchlistItem]:
    if not os.path.exists(_STORAGE):
        return []
    try:
        with open(_STORAGE, encoding="utf-8") as f:
            raw = json.load(f)
        return [WatchlistItem(**item) for item in raw]
    except Exception:
        return []


def _save(items: list[WatchlistItem]) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(_STORAGE)), exist_ok=True)
    with open(_STORAGE, "w", encoding="utf-8") as f:
        json.dump([item.model_dump() for item in items], f, ensure_ascii=False, indent=2)


# ── CRUD ─────────────────────────────────────────────────────────────────────

def list_symbols() -> list[WatchlistItem]:
    return _load()


def add_symbol(raw_symbol: str) -> list[WatchlistItem]:
    symbol = raw_symbol.strip().upper()
    items = _load()
    if any(i.symbol == symbol for i in items):
        return items

    # Fetch company name once when adding
    try:
        info = yf.Ticker(symbol).info
        company_name = info.get("shortName") or info.get("longName") or symbol
    except Exception:
        company_name = symbol

    items.append(
        WatchlistItem(
            symbol=symbol,
            company_name=company_name,
            added_at=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        )
    )
    _save(items)
    return items


def remove_symbol(symbol: str) -> list[WatchlistItem]:
    sym = symbol.strip().upper()
    items = [i for i in _load() if i.symbol != sym]
    _save(items)
    return items


# ── Price fetching ────────────────────────────────────────────────────────────

def _fetch_price(item: WatchlistItem) -> WatchlistEntry:
    try:
        fi = yf.Ticker(item.symbol).fast_info
        price: Any = getattr(fi, "last_price", None)
        prev: Any = getattr(fi, "previous_close", None) or getattr(fi, "regular_market_previous_close", None)

        price = float(price) if price is not None else None
        prev = float(prev) if prev is not None else None

        change = round(price - prev, 4) if price and prev else None
        change_pct = round((price - prev) / prev * 100, 2) if price and prev and prev != 0 else None
    except Exception:
        price = change = change_pct = None

    status = get_status(item.symbol)

    return WatchlistEntry(
        symbol=item.symbol,
        company_name=item.company_name,
        current_price=round(price, 2) if price is not None else None,
        change=change,
        change_pct=change_pct,
        disposition_status=status,
    )


def get_watchlist_with_prices() -> WatchlistResponse:
    items = _load()
    if not items:
        return WatchlistResponse(
            items=[],
            updated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        )

    entries: list[WatchlistEntry] = [None] * len(items)  # type: ignore
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(_fetch_price, item): idx for idx, item in enumerate(items)}
        for future in as_completed(futures):
            idx = futures[future]
            entries[idx] = future.result()

    return WatchlistResponse(
        items=entries,
        updated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    )
