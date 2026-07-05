#!/usr/bin/env bash
# Run backend (FastAPI) and frontend (Vite) together for local development.
# Usage: ./start.sh   (Ctrl+C stops both)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo ""
  echo "Stopping..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:8000 ..."
(cd "$ROOT_DIR/stock-backtest" && poetry run uvicorn app.main:app --reload) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173 ..."
(cd "$ROOT_DIR/stock-backtest-frontend" && npm run dev) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
