<#
.SYNOPSIS
  KAWSAY AI — clean.ps1
  Elimina caches, artefactos de compilacion y logs temporales del repo.

.DESCRIPTION
  Fail-safe: por defecto NO toca node_modules, .venv, .git, codigo fuente,
  migraciones, modelos SQLAlchemy ni esquemas de BD.
  Usa -Deep SOLO si quieres borrar tambien node_modules/.venv/build
  (implica re-instalar dependencias despues con setup.ps1 / setup.sh).

.PARAMETER DryRun
  Lista lo que se borraria sin borrar nada (modo auditoria).

.PARAMETER Deep
  Ademas elimina node_modules, .venv y caches que requieren reinstalar deps.

.EXAMPLE
  .\clean.ps1 -DryRun          # auditar
  .\clean.ps1                  # limpieza segura (recomendado)
  .\clean.ps1 -Deep            # limpieza total + reinstalar deps despues
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$Deep
)

$ErrorActionPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- nombres objetivo (directorios y extensiones de archivo) ---
$targetDirs  = @('__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache',
                 '.dart_tool', '.next', 'dist', 'build')
$targetExts  = @('.pyc', '.pyo', '.log', '.tsbuildinfo', '.tmp', '.bak')
$skipDirs    = @('.git', 'node_modules', '.venv', 'venv')
if ($Deep) { $skipDirs = @('.git') }

$removedDirs = 0
$removedFiles = 0

function Test-SkipDir([string]$full) {
  foreach ($s in $skipDirs) {
    if ($full.Contains("\$s\") -or $full.EndsWith("\$s")) { return $true }
  }
  return $false
}

# --- directorios objetivo (no se recorre el contenido de dirs ignorados) ---
Get-ChildItem -LiteralPath $Root -Directory -Recurse -Force | Where-Object {
  -not (Test-SkipDir $_.FullName)
} | Where-Object { $targetDirs -contains $_.Name } | ForEach-Object {
  $rel = $_.FullName.Substring($Root.Length + 1)
  if ($DryRun) {
    Write-Host "DRY-RUN dir  : $rel" -ForegroundColor Cyan
  } else {
    try {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
      $removedDirs++
      Write-Host "removido dir : $rel" -ForegroundColor DarkGray
    } catch {
      Write-Warning "no se pudo borrar $rel : $($_.Exception.Message)"
    }
  }
}

# --- archivos objetivo ---
Get-ChildItem -LiteralPath $Root -File -Recurse -Force | Where-Object {
  -not (Test-SkipDir $_.DirectoryName)
} | Where-Object { $targetExts -contains $_.Extension.ToLowerInvariant() } | ForEach-Object {
  $rel = $_.FullName.Substring($Root.Length + 1)
  if ($DryRun) {
    Write-Host "DRY-RUN file : $rel" -ForegroundColor Cyan
  } else {
    try {
      Remove-Item -LiteralPath $_.FullName -Force -ErrorAction Stop
      $removedFiles++
      Write-Host "removido file: $rel" -ForegroundColor DarkGray
    } catch {
      Write-Warning "no se pudo borrar $rel : $($_.Exception.Message)"
    }
  }
}

Write-Host ""
Write-Host "===== Resumen =====" -ForegroundColor Green
Write-Host ("dirs eliminados : {0}" -f $removedDirs)
Write-Host ("files eliminados: {0}" -f $removedFiles)
if ($DryRun) { Write-Host "Modo DryRun: no se borro nada. Ejecuta sin -DryRun para limpiar." -ForegroundColor Yellow }
elseif ($Deep) {
  Write-Host "Limpieza DEEP. Re-instala dependencias:" -ForegroundColor Yellow
  Write-Host "   PowerShell: .\setup.ps1"
  Write-Host "   bash      : ./setup.sh"
}