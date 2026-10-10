<#
.SYNOPSIS
  KAWSAY AI - setup.ps1
  Bootstrap del entorno de desarrollo local (Windows / PowerShell 5.1+).
  Backend : FastAPI + PostgreSQL 16 (Docker) + entorno virtual Python
  Web     : Teacher-Web y Admin-Web (Vite/React) + npm
  Mobile  : Student-App (Flutter) -> flutter pub get

  FAIL-FAST: ante el primer error, el script se detiene con un mensaje claro.
  Versiones fijas/minimas: Python >=3.11 | Node >=20 LTS | Docker+Compose v2 |
  PostgreSQL 16 (imagen) | Flutter 3.x stable.

  NOTA: archivo en ASCII puro para no depender del encoding del editor/PowerShell.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# ------------------------------- configuracion -------------------------------
$PythonMinMajor  = 3
$PythonMinMinor  = 11
$NodeMinMajor    = 20
$BackendPort     = 8000
$PostgresPort    = 5432
$PgAdminPort     = 5050
$TeacherWebPort  = 5173
$AdminWebPort    = 5174
$PgHealthRetries = 30

$RootDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir 'backend'
$AppsDir    = Join-Path $RootDir 'apps'

# script-scope helpers
$Script:PythonBin   = ''
$Script:PythonMajor = 0
$Script:PythonMinor = 0
$Script:ComposeV2   = $false

# --------------------------------- utilidades ---------------------------------
function Fail([string]$Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}
function Success([string]$Message) { Write-Host "[INFO]  $Message" -ForegroundColor Green }
function Note([string]$Message)    { Write-Host "[WARN]  $Message" -ForegroundColor Yellow }

function Test-PortFree([int]$Port) {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    try { $listener.Start() } catch { return $false } finally { try { $listener.Stop() } catch {} }
    return $true
}

# ------------------------------- cheques de version ---------------------------
function Resolve-Python {
    foreach ($candidate in @('python', 'py')) {
        if (-not (Get-Command $candidate -ErrorAction SilentlyContinue)) { continue }
        if ($candidate -eq 'py') { $raw = (& py -3 --version 2>&1 | Out-String) }
        else                     { $raw = (& python --version  2>&1 | Out-String) }
        if ($LASTEXITCODE -eq 0 -and $raw -match 'Python (\d+)\.(\d+)') {
            $Script:PythonBin   = $candidate
            $Script:PythonMajor = [int]$Matches[1]
            $Script:PythonMinor = [int]$Matches[2]
            return
        }
    }
    Fail "Python no encontrado o no ejecutable (alias de Microsoft Store?). Instala Python $PythonMinMajor.$PythonMinMinor+ desde python.org y reintenta."
}

function Check-Python {
    Resolve-Python
    if ($Script:PythonMajor -lt $PythonMinMajor -or
        ($Script:PythonMajor -eq $PythonMinMajor -and $Script:PythonMinor -lt $PythonMinMinor)) {
        Fail "Python detectado: $($Script:PythonMajor).$($Script:PythonMinor) (minimo $PythonMinMajor.$PythonMinMinor)."
    }
    Success "Python $($Script:PythonMajor).$($Script:PythonMinor) - OK ($($Script:PythonBin))"
}

function Check-Node {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js no instalado. Instala Node $NodeMinMajor+ LTS: https://nodejs.org" }
    if (-not (Get-Command npm  -ErrorAction SilentlyContinue)) { Fail "npm no encontrado (acompana a Node.js)." }
    $raw   = (& node --version 2>&1 | Out-String).Trim()
    $major = 0
    if ($raw -match '^v?(\d+)') { $major = [int]$Matches[1] }
    if ($major -lt $NodeMinMajor) { Fail "Node detectado: $raw (minimo $NodeMinMajor). Actualiza Node." }
    $npmVer = (& npm --version 2>&1 | Out-String).Trim()
    Success "Node $raw / npm $npmVer - OK"
}

function Check-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail "Docker no instalado. Instala Docker Desktop y habilita WSL2/Hyper-V: https://docs.docker.com/desktop/setup/install/windows-install/" }
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) { Fail "El daemon de Docker no esta corriendo. Inicia Docker Desktop, espera a que este 'Engine running' y reintenta." }

    & docker compose version *> $null
    if ($LASTEXITCODE -eq 0) {
        $Script:ComposeV2 = $true
    } elseif (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $Script:ComposeV2 = $false
    } else {
        Fail "No se encontro 'docker compose' v2 ni 'docker-compose'. Instala el plugin de Compose."
    }
    $dockerVer = (& docker --version 2>&1 | Out-String).Trim()
    Success "Docker $dockerVer - daemon OK, compose disponible"
}

function Check-Flutter {
    if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) { Fail "Flutter SDK no encontrado. Instala Flutter 3.x stable: https://docs.flutter.dev/get-started/install/windows" }
    & flutter --version *> $null
    if ($LASTEXITCODE -ne 0) { Fail "El SDK de Flutter no responde. Ejecuta 'flutter --version' para diagnosticar." }
    $flutterVer = (& flutter --version 2>&1 | Select-Object -First 1).ToString().Trim()
    Success "Flutter $flutterVer - OK"
}

# ------------------------------- puertos --------------------------------------
function Check-Ports {
    foreach ($port in @($BackendPort, $PostgresPort, $PgAdminPort, $TeacherWebPort, $AdminWebPort)) {
        if (Test-PortFree $port) { Success "Puerto $port - libre" }
        else { Note "Puerto $port en uso. Si ya corre un servicio de KAWSAY, ignorable; si no, libera el puerto." }
    }
}

# ------------------------------ variables de entorno --------------------------
function Set-UpEnv {
    $src = Join-Path $BackendDir '.env.example'; $dst = Join-Path $BackendDir '.env'
    if (-not (Test-Path -LiteralPath $dst)) {
        Copy-Item -LiteralPath $src -Destination $dst
        Success "Creado backend\.env a partir de backend\.env.example"
    } else {
        Note "backend\.env ya existe; no se sobrescribe"
    }
    foreach ($app in @('teacher-web', 'admin-web')) {
        $aSrc = Join-Path $AppsDir "$app\.env.example"; $aDst = Join-Path $AppsDir "$app\.env"
        if (-not (Test-Path -LiteralPath $aDst)) {
            Copy-Item -LiteralPath $aSrc -Destination $aDst
            Success "Creado apps\$app\.env"
        }
    }
}

# --------------------------------- backend -----------------------------------
function Set-UpPython {
    $venvDir = Join-Path $BackendDir '.venv'
    $venvPy  = Join-Path $venvDir 'Scripts\python.exe'

    if (Test-Path -LiteralPath $venvPy) {
        & $venvPy -c 'raise SystemExit(0)' *> $null
        if ($LASTEXITCODE -eq 0) {
            Success "Entorno virtual backend\.venv - OK"
        } else {
            Note "backend\.venv esta roto; se recreara."
            Remove-Item -LiteralPath $venvDir -Recurse -Force
        }
    }
    if (-not (Test-Path -LiteralPath $venvPy)) {
        if ($Script:PythonBin -eq 'py') { & py -3 -m venv $venvDir } else { & python -m venv $venvDir }
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $venvPy)) {
            Fail "No se pudo crear el entorno virtual backend\.venv."
        }
        Success "Entorno virtual creado en backend\.venv"
    }
    & $venvPy -m pip install --disable-pip-version-check --requirement (Join-Path $BackendDir 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { Fail "Fallo la instalacion de dependencias Python." }
    Success "Dependencias backend instaladas (requirements.txt)"
}

function Set-UpPostgres {
    Push-Location $BackendDir
    try {
        if ($Script:ComposeV2) { & docker compose -f (Join-Path $BackendDir 'docker-compose.yml') up -d postgres }
        else                   { & docker-compose  -f (Join-Path $BackendDir 'docker-compose.yml') up -d postgres }
        if ($LASTEXITCODE -ne 0) { Fail "Docker Compose fallo al levantar el contenedor postgres." }
    } finally { Pop-Location }

    for ($i = 0; $i -lt $PgHealthRetries; $i++) {
        $status = (& docker inspect -f '{{.State.Health.Status}}' kawsay_postgres 2>$null | Out-String).Trim()
        if ($status -eq 'healthy')   { Success "PostgreSQL 16 - healthy"; return }
        if ($status -eq 'unhealthy') { Fail "PostgreSQL entro en 'unhealthy'. Logs: docker logs kawsay_postgres" }
        Start-Sleep -Seconds 2
    }
    Fail "PostgreSQL no se puso 'healthy' tras $($PgHealthRetries * 2)s. Logs: docker logs kawsay_postgres"
}

function Invoke-AlembicUpgrade {
    Push-Location $BackendDir
    try {
        & (Join-Path $BackendDir '.venv\Scripts\python.exe') -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) { Fail "Fallo 'alembic upgrade head'. Revisa DATABASE_URL en backend\.env y que postgres este healthy." }
    } finally { Pop-Location }
    Success "Migraciones de la base de datos aplicadas"
}

# ---------------------------------- web ---------------------------------------
function Set-UpWeb {
    foreach ($app in @('teacher-web', 'admin-web')) {
        Push-Location (Join-Path $AppsDir $app)
        try {
            & npm install 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { Fail "Fallo 'npm install' en $app." }
        } finally { Pop-Location }
        Success "Dependencias de $app instaladas"
    }
}

function Set-UpFlutter {
    Push-Location (Join-Path $AppsDir 'student-app')
    try {
        & flutter pub get 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { Fail "Fallo 'flutter pub get'." }
    } finally { Pop-Location }
    Success "Dependencias de student-app instaladas"
}

# ---------------------------------- main --------------------------------------
Write-Host "=== KAWSAY AI - setup (root: $RootDir) ===" -ForegroundColor Cyan
Check-Docker
Check-Python
Check-Node
Check-Flutter
Check-Ports
Set-UpEnv
Set-UpPython
Set-UpPostgres
Invoke-AlembicUpgrade
Set-UpWeb
Set-UpFlutter
Write-Host "=== Setup completado sin errores ===" -ForegroundColor Green

Write-Host @'

Siguientes pasos - ejecutar en terminales separadas:

  Backend (local):    cd backend; .\.venv\Scripts\uvicorn app.main:app --reload --port 8000
  Backend (Docker):   (cd backend; docker compose up --build)
  Teacher-Web:        cd apps\teacher-web; npm run dev        -> http://localhost:5173
  Admin-Web:          cd apps\admin-web; npm run dev          -> http://localhost:5174
  Student-App:        cd apps\student-app; flutter run
  pgAdmin:            http://localhost:5050 (admin@kawsay.local / kawsay)

Guia completa: docs\00-setup-guide.md
'@