# start-all.ps1
# Levanta el backend (FastAPI) y ambos frontends (admin + docente).
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\start-all.ps1
#
# El backend escucha en 0.0.0.0:8000 (accesible desde la red local).
# Los frontends corren con host:true, por lo que también son accesibles
# desde otros dispositivos de la misma red (usa la IP de tu PC).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step($msg) { Write-Host ">> $msg" -ForegroundColor Cyan }

# --- Backend -----------------------------------------------------------
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
  Write-Host "No se encontró el entorno virtual en backend\.venv" -ForegroundColor Red
  Write-Host "Créalo con: python -m venv .venv ; .\.venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
  exit 1
}

Write-Step "Iniciando backend en http://0.0.0.0:8000"
Start-Process -FilePath $python `
  -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" `
  -WorkingDirectory $backend `
  -RedirectStandardOutput (Join-Path $backend "uvicorn.out.log") `
  -RedirectStandardError (Join-Path $backend "uvicorn.err.log") `
  -WindowStyle Hidden

# --- Frontends ---------------------------------------------------------
foreach ($app in @(@{Name = "admin-web"; Port = 5173 }, @{Name = "teacher-web"; Port = 5174 })) {
  $dir = Join-Path $root ("apps\" + $app.Name)
  if (-not (Test-Path $dir)) { continue }
  if (-not (Test-Path (Join-Path $dir "node_modules"))) {
    Write-Step "Instalando dependencias de $($app.Name)…"
    Start-Process -FilePath "npm" -ArgumentList "install", "--no-audit", "--no-fund" -WorkingDirectory $dir -Wait -WindowStyle Hidden
  }
  Write-Step "Iniciando $($app.Name) en http://localhost:$($app.Port)"
  Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "--host", "0.0.0.0" -WorkingDirectory $dir `
    -RedirectStandardOutput (Join-Path $dir "dev.log") `
    -RedirectStandardError (Join-Path $dir "dev.err.log") `
    -WindowStyle Hidden
}

Start-Sleep -Seconds 6
Write-Host ""
Write-Host "Servicios iniciados:" -ForegroundColor Green
Write-Host "  Backend        -> http://localhost:8000/docs"
Write-Host "  Panel Admin    -> http://localhost:5173"
Write-Host "  Panel Docente  -> http://localhost:5174"
Write-Host ""
Write-Host "Para detenerlos:  powershell -ExecutionPolicy Bypass -File .\stop-all.ps1" -ForegroundColor Yellow
