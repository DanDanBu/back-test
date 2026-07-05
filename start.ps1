# Run backend (FastAPI) and frontend (Vite) together for local development.
# Usage: .\start.ps1   (Ctrl+C stops both)

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot

Write-Host "Starting backend on http://localhost:8000 ..."
$backend = Start-Process -FilePath "poetry" -ArgumentList "run", "uvicorn", "app.main:app", "--reload" `
    -WorkingDirectory (Join-Path $rootDir "stock-backtest") -NoNewWindow -PassThru

Write-Host "Starting frontend on http://localhost:5173 ..."
$frontend = Start-Process -FilePath "npm" -ArgumentList "run", "dev" `
    -WorkingDirectory (Join-Path $rootDir "stock-backtest-frontend") -NoNewWindow -PassThru

try {
    Wait-Process -Id $backend.Id, $frontend.Id
}
finally {
    Write-Host "`nStopping..."
    Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
}
