# stock-backtest

A stock analysis app with two independent projects:

- [`stock-backtest/`](stock-backtest/) — FastAPI backend (Python, Poetry) serving fundamentals, backtest, and watchlist APIs on `:8000`
- [`stock-backtest-frontend/`](stock-backtest-frontend/) — React + TypeScript frontend (Vite) on `:5173`

The frontend calls the backend over HTTP at `http://localhost:8000`, so both must be running for the app to work.

## Prerequisites

- Python >= 3.11 and [Poetry](https://python-poetry.org/)
- Node.js and npm

## Setup (first time only)

```sh
# backend
cd stock-backtest
poetry install
cd ..

# frontend
cd stock-backtest-frontend
npm install
cd ..
```

## Running everything with one command

From the repo root:

```sh
./start.sh
```

On Windows PowerShell:

```powershell
.\start.ps1
```

This starts the backend on http://localhost:8000 and the frontend on http://localhost:5173 together. Press `Ctrl+C` to stop both.

## Running backend/frontend separately

<details>
<summary>Backend</summary>

```sh
cd stock-backtest
poetry install                        # install dependencies
uvicorn app.main:app --reload         # run dev server on :8000
```
</details>

<details>
<summary>Frontend</summary>

```sh
cd stock-backtest-frontend
npm install
npm run dev        # Vite dev server on :5173
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # preview production build
```
</details>

---

If you have any questions, please contact the project maintainer.
