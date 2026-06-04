"""
Fetches Taiwan Stock Exchange (TWSE) disposition/warning lists.

TWSE 處置股票 → trading-restricted stocks (高風險，交易限制)
TWSE 注意股票 → surveillance stocks (即將處置的警示)

Results are cached for 15 minutes to avoid hammering the API.
"""
import requests
from datetime import datetime, timedelta

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.twse.com.tw/",
}

_TWSE_DISPOSITION_URL = "https://www.twse.com.tw/rwd/zh/trading/TWTB4U"
_TWSE_WARNING_URL = "https://www.twse.com.tw/rwd/zh/trading/TWTB8U"

_cache_expires: datetime | None = None
_disposition_codes: set[str] = set()
_warning_codes: set[str] = set()


def _fetch_codes(url: str) -> set[str]:
    try:
        r = requests.get(
            url,
            params={"response": "json"},
            headers=_HEADERS,
            timeout=8,
        )
        r.raise_for_status()
        data = r.json()
        if data.get("stat") == "OK":
            return {str(row[0]).strip() for row in data.get("data", [])}
    except Exception:
        pass
    return set()


def _refresh() -> None:
    global _cache_expires, _disposition_codes, _warning_codes
    _disposition_codes = _fetch_codes(_TWSE_DISPOSITION_URL)
    _warning_codes = _fetch_codes(_TWSE_WARNING_URL)
    _cache_expires = datetime.now() + timedelta(minutes=15)


def _ensure_fresh() -> None:
    if _cache_expires is None or datetime.now() >= _cache_expires:
        _refresh()


def get_status(symbol: str) -> str:
    """
    Returns the disposition status for a stock symbol.

    - "disposition" : currently under TWSE trading restrictions (處置)
    - "warning"     : currently on TWSE surveillance list (注意)
    - "normal"      : TW-listed stock with no restrictions
    - "n_a"         : non-TW stock (US, etc.) — concept not applicable
    - "unknown"     : TW stock but TWSE API unreachable
    """
    sym_upper = symbol.upper()

    if not (sym_upper.endswith(".TW") or sym_upper.endswith(".TWO")):
        return "n_a"

    code = sym_upper.split(".")[0]

    try:
        _ensure_fresh()
    except Exception:
        return "unknown"

    if code in _disposition_codes:
        return "disposition"
    if code in _warning_codes:
        return "warning"

    # If both sets are empty the API probably failed
    if not _disposition_codes and not _warning_codes:
        return "unknown"

    return "normal"
