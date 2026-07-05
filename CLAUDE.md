# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This repo contains two independent projects with no shared build/package config:

- `stock-backtest/` — FastAPI backend (Python, Poetry)
- `stock-backtest-frontend/` — React + TypeScript frontend (Vite)

They communicate over HTTP; the frontend hardcodes the backend base URL as `http://localhost:8000` in [App.tsx](stock-backtest-frontend/src/App.tsx).

## Commands

### Backend (`stock-backtest/`)

```sh
poetry install                        # install dependencies
poetry shell                          # activate venv (optional)
uvicorn app.main:app --reload         # run dev server on :8000
```

There is no test suite or linter configured for the backend currently.

### Frontend (`stock-backtest-frontend/`)

```sh
npm install
npm run dev        # Vite dev server on :5173
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # preview production build
```

There is no test suite configured for the frontend currently.

## Architecture

### Backend (FastAPI)

Entry point [app/main.py](stock-backtest/app/main.py) creates the FastAPI app, adds CORS (currently only allows `http://localhost:5173`), and mounts a single router from [app/api/routes.py](stock-backtest/app/api/routes.py). All request/response shapes are Pydantic models in [app/models/schema.py](stock-backtest/app/models/schema.py) — this is the source of truth for API contracts; keep it in sync with `stock-backtest-frontend/src/types/types.ts` when changing either side.

Three route groups, each backed by a service module under `app/services/`:

- **`GET /backtest`** → [services/backtest.py](stock-backtest/app/services/backtest.py): pulls 1y of daily OHLC via `yfinance`, computes SMA-crossover long/short positions (short SMA > long SMA → long, else short), and returns cumulative strategy return plus the last 30 days of history.
- **`GET /fundamentals`** → [services/fundamentals.py](stock-backtest/app/services/fundamentals.py): pulls `yfinance` `Ticker.info` and grades each fundamental metric (P/E, P/B, P/S, PEG, ROE, margins, D/E, current ratio, growth rates) into `excellent/good/fair/poor/unknown` buckets via private `_grade_*` heuristics modeled on Buffett/Lynch style value-investing rules. Grades map to points (`_compute_score`) which sum into an `overall_score` (`strong_buy` → `strong_sell`). All labels/hints returned to the frontend are in Traditional Chinese. When adding a new metric, add a `_grade_*` function, wire it into `_make(...)` for formatting, and include its grade in `_compute_score`'s input list.
- **`GET/POST /watchlist`, `DELETE /watchlist/{symbol}`** → [services/watchlist.py](stock-backtest/app/services/watchlist.py): watchlist symbols persist as JSON at `stock-backtest/watchlist.json` (not a database — flat file read/written wholesale on every mutation). Adding a symbol does one `yfinance` lookup to cache the company name at add-time. Fetching the watchlist re-fetches live prices for every symbol in parallel via `ThreadPoolExecutor` and also calls [services/disposition.py](stock-backtest/app/services/disposition.py) per symbol.
  - **Disposition status**: for `.TW`/`.TWO` symbols only, scrapes TWSE's `TWTB4U` (處置/disposition) and `TWTB8U` (注意/warning) endpoints, caching the resulting code sets in module-level globals for 15 minutes (`_ensure_fresh`). Non-Taiwan symbols always return `"n_a"`.

### Frontend (React + Vite + Tailwind v4)

Single-page app with two tabs managed by local state in [App.tsx](stock-backtest-frontend/src/App.tsx) (`activeTab: "analysis" | "watchlist"`) — no router.

- **Analysis tab**: symbol search → fetches `/fundamentals`, rendered by [components/FundamentalsPanel.tsx](stock-backtest-frontend/src/components/FundamentalsPanel.tsx); optional backtest run → fetches `/backtest`, charted with `recharts`.
- **Watchlist tab**: [components/WatchlistPanel.tsx](stock-backtest-frontend/src/components/WatchlistPanel.tsx) manages add/remove/select, calling back into `App`'s `handleWatchlistSelect` to jump to the analysis tab for a given symbol.
- Shared API response types live in [src/types/types.ts](stock-backtest-frontend/src/types/types.ts) and must mirror the backend Pydantic models in `app/models/schema.py`.
- UI primitives (`button`, `card`, `input`, `label`) under `src/components/ui/` are shadcn/ui components (`components.json`: style `new-york`, no RSC); path alias `@/*` → `src/*` (configured in both `vite.config.ts` and `tsconfig.app.json`). Most of `App.tsx`'s layout uses inline styles rather than Tailwind classes/shadcn components — Tailwind v4 is wired in via `@tailwindcss/vite` but is not the dominant styling approach yet.
