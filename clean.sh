#!/usr/bin/env bash
# ============================================================================
# KAWSAY AI — clean.sh
# Limpieza fail-safe de caches, artefactos de compilacion y logs.
# Por defecto NO toca node_modules, .venv, .git ni codigo fuente.
#   ./clean.sh --dry-run   modo auditoria (no borra nada)
#   ./clean.sh             limpieza segura (recomendado)
#   ./clean.sh --deep      tambien node_modules/.venv/build (reinstalar deps)
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=false
DEEP=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --deep) DEEP=true ;;
    *) echo "uso: $0 [--dry-run] [--deep]"; exit 1 ;;
  esac
done

TARGET_DIRS=(__pycache__ .pytest_cache .mypy_cache .ruff_cache .dart_tool .next dist build)
TARGET_EXTS=(pyc pyo log tsbuildinfo tmp bak)
removed_dirs=0
removed_files=0

if [ "$DEEP" = true ]; then
  SKIP_EXPR='-name .git'
else
  SKIP_EXPR='-name node_modules -o -name .venv -o -name venv -o -name .git'
fi

log()  { local kind="$1" rel="$2"
  if $DRY_RUN; then printf 'DRY-RUN %s : %s\n' "$kind" "$rel"
  else printf 'removido %-5s: %s\n' "$kind" "$rel"; fi; }

# --- directorios objetivo ---
while IFS= read -r -d '' d; do
  base="$(basename "$d")"
  for t in "${TARGET_DIRS[@]}"; do
    if [ "$base" = "$t" ]; then
      rel="${d#"$ROOT"/}"
      if $DRY_RUN; then log dir "$rel"; else
        rm -rf -- "$d" && removed_dirs=$((removed_dirs+1)); log dir "$rel"
      fi
      break
    fi
  done
done < <(find "$ROOT" \( $SKIP_EXPR \) -prune -o -type d -print0 2>/dev/null)

# --- archivos objetivo ---
while IFS= read -r -d '' f; do
  ext="${f##*.}"
  for t in "${TARGET_EXTS[@]}"; do
    if [ "$ext" = "$t" ]; then
      rel="${f#"$ROOT"/}"
      if $DRY_RUN; then log file "$rel"; else
        rm -f -- "$f" && removed_files=$((removed_files+1)); log file "$rel"
      fi
      break
    fi
  done
done < <(find "$ROOT" \( $SKIP_EXPR \) -prune -o -type f -print0 2>/dev/null)

echo ""
echo "===== Resumen ====="
echo "dirs  eliminados : $removed_dirs"
echo "files eliminados : $removed_files"
if $DRY_RUN; then echo "Modo DryRun: no se borro nada. Repite sin --dry-run para limpiar."
elif [ "$DEEP" = true ]; then echo "Limpieza DEEP. Re-instala con: ./setup.sh"; fi