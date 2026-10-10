#!/usr/bin/env bash
#
# ============================================================================
# KAWSAY AI — setup.sh
# Bootstrap del entorno de desarrollo local (Linux / macOS).
#   Backend : FastAPI + PostgreSQL 16 (Docker) + entorno virtual Python
#   Web     : Teacher-Web y Admin-Web (Vite/React) + npm
#   Mobile  : Student-App (Flutter) -> flutter pub get
#
# FAIL-FAST: ante el primer error, el script se detiene con un mensaje claro.
# Versiones fijas/mínimas: Python >=3.11 · Node >=20 LTS · Docker+Compose v2 ·
# PostgreSQL 16 (imagen) · Flutter 3.x stable.
# ============================================================================
set -euo pipefail

# ------------------------------- configuración ------------------------------
PYTHON_MIN_MAJOR=3
PYTHON_MIN_MINOR=11
NODE_MIN_MAJOR=20
BACKEND_PORT=8000
POSTGRES_PORT=5432
PGADMIN_PORT=5050
TEACHER_WEB_PORT=5173
ADMIN_WEB_PORT=5174
PG_HEALTH_RETRIES=30

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
APPS_DIR="$ROOT_DIR/apps"

# --------------------------------- utilidades -------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info(){ printf "${GREEN}[INFO]${NC} %s\n" "$*"; }
warn(){ printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
fail(){ printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; exit 1; }
require_cmd(){ command -v "$1" >/dev/null 2>&1 || fail "No se encontró '$1' — $2"; }

# ------------------------------- cheques de versión --------------------------
python_bin=""
resolve_python(){
  if command -v python3 >/dev/null 2>&1; then python_bin="$(command -v python3)"
  elif command -v python >/dev/null 2>&1; then python_bin="$(command -v python)"
  else fail "Python no encontrado. Instala Python ${PYTHON_MIN_MAJOR}.${PYTHON_MIN_MINOR}+ y reintenta."
  fi
}

check_python(){
  resolve_python
  local ver major minor
  ver="$( "$python_bin" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null )" \
    || fail "Python '$python_bin' no responde correctamente (¿alias roto?)."
  major="${ver%%.*}"; minor="${ver##*.}"
  if [ "$major" -lt "$PYTHON_MIN_MAJOR" ] \
     || { [ "$major" -eq "$PYTHON_MIN_MAJOR" ] && [ "$minor" -lt "$PYTHON_MIN_MINOR" ]; }; then
    fail "Python detectado: $ver (mínimo ${PYTHON_MIN_MAJOR}.${PYTHON_MIN_MINOR}). Actualiza o usa una versión válida."
  fi
  info "Python $ver — OK ($python_bin)"
}

check_node(){
  require_cmd node "Instala Node.js ${NODE_MIN_MAJOR}+ LTS: https://nodejs.org"
  require_cmd npm "npm se instala junto con Node.js."
  local ver major
  ver="$(node --version)"                    # v20.x.y
  major="${ver#v}"; major="${major%%.*}"
  if [ "${major:-0}" -lt "$NODE_MIN_MAJOR" ]; then
    fail "Node detectado: $ver (mínimo $NODE_MIN_MAJOR). Actualiza Node."
  fi
  info "Node $ver / npm $(npm --version) — OK"
}

check_docker(){
  require_cmd docker "Instala Docker Engine/Docker Desktop: https://docs.docker.com/engine/install/"
  docker info >/dev/null 2>&1 \
    || fail "El daemon de Docker no está corriendo. Inicia Docker (Docker Desktop o 'systemctl start docker') y reintenta."
  if docker compose version >/dev/null 2>&1; then
    compose_cmd="docker compose"
  elif docker-compose --version >/dev/null 2>&1; then
    compose_cmd="docker-compose"
  else
    fail "No se encontró el plugin 'docker compose' v2 ni 'docker-compose'."
  fi
  info "Docker $(docker --version | sed 's/^[^ ]* //') — daemon OK (${compose_cmd} disponible)"
}

check_flutter(){
  require_cmd flutter "Instala el SDK de Flutter 3.x stable: https://docs.flutter.dev/get-started/install"
  flutter --version >/dev/null 2>&1 || fail "El SDK de Flutter no responde ('flutter' en PATH?)."
  info "$(flutter --version | head -n1) — OK"
}

# ------------------------------- puertos ------------------------------------
port_is_free(){
  "$python_bin" - "$1" <<'PY'
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.bind(("127.0.0.1", int(sys.argv[1])))
except OSError:
    sys.exit(1)          # puerto en uso
else:
    s.close()
    sys.exit(0)          # puerto libre
PY
}

check_ports(){
  local p
  for p in "$BACKEND_PORT" "$POSTGRES_PORT" "$PGADMIN_PORT" "$TEACHER_WEB_PORT" "$ADMIN_WEB_PORT"; do
    if port_is_free "$p"; then info "Puerto $p — libre"
    else warn "Puerto $p en uso. Si ya corre un servicio de KAWSAY, ignorable; si no, libera el puerto."
    fi
  done
}

# ------------------------------ variables de entorno -------------------------
setup_env(){
  local src dst
  src="$BACKEND_DIR/.env.example"; dst="$BACKEND_DIR/.env"
  if [ ! -f "$dst" ]; then
    cp "$src" "$dst"; info "Creado backend/.env a partir de backend/.env.example"
  else
    warn "backend/.env ya existe; no se sobrescribe"
  fi
  for app in teacher-web admin-web; do
    src="$APPS_DIR/$app/.env.example"; dst="$APPS_DIR/$app/.env"
    if [ ! -f "$dst" ]; then
      cp "$src" "$dst"; info "Creado apps/$app/.env"
    fi
  done
}

# --------------------------------- backend ----------------------------------
setup_python(){
  local vdir="$BACKEND_DIR/.venv" vbin
  vbin="$vdir/bin/python"
  if [ -d "$vdir" ] && [ -x "$vbin" ]; then
    if "$vbin" -c 'raise SystemExit(0)' >/dev/null 2>&1; then
      info "Entorno virtual backend/.venv — OK"
    else
      warn "backend/.venv está roto; se recreará."
      rm -rf "$vdir"
    fi
  fi
  if [ -d "$vdir" ]; then :; else
    "$python_bin" -m venv "$vdir" || fail "No se pudo crear backend/.venv (¿falta python3-venv?)."
    info "Entorno virtual creado en backend/.venv"
  fi
  "$vbin" -m pip install --disable-pip-version-check -r "$BACKEND_DIR/requirements.txt" \
    || fail "Falló la instalación de dependencias Python."
  info "Dependencias backend instaladas (requirements.txt)"
}

setup_postgres(){
  (cd "$BACKEND_DIR" && $compose_cmd up -d postgres) \
    || fail "Docker Compose falló al levantar el contenedor postgres."
  local status="" i
  for i in $(seq 1 "$PG_HEALTH_RETRIES"); do
    status="$(docker inspect -f '{{.State.Health.Status}}' kawsay_postgres 2>/dev/null || true)"
    case "$status" in
      healthy)   info "PostgreSQL 16 — healthy"; return 0 ;;
      unhealthy) fail "PostgreSQL entró en 'unhealthy'. Logs: docker logs kawsay_postgres" ;;
    esac
    sleep 2
  done
  fail "PostgreSQL no se puso 'healthy' tras $((PG_HEALTH_RETRIES * 2))s. Logs: docker logs kawsay_postgres"
}

setup_migrations(){
  (cd "$BACKEND_DIR" && "$BACKEND_DIR/.venv/bin/python" -m alembic upgrade head) \
    || fail "Falló 'alembic upgrade head'. Revisa DATABASE_URL en backend/.env y que postgres esté healthy."
  info "Migraciones de la base de datos aplicadas"
}

# ---------------------------------- web --------------------------------------
setup_web(){
  for app in teacher-web admin-web; do
    (cd "$APPS_DIR/$app" && npm install) || fail "Falló 'npm install' en $app."
    info "Dependencias de $app instaladas"
  done
}

setup_flutter(){
  (cd "$APPS_DIR/student-app" && flutter pub get) || fail "Falló 'flutter pub get'."
  info "Dependencias de student-app instaladas"
}

# ---------------------------------- main -------------------------------------
main(){
  info "=== KAWSAY AI — setup (root: $ROOT_DIR) ==="
  check_docker
  check_python
  check_node
  check_flutter
  check_ports
  setup_env
  setup_python
  setup_postgres
  setup_migrations
  setup_web
  setup_flutter
  info "=== Setup completado sin errores ==="
  cat <<'EOF'

Siguientes pasos — ejecutar en terminales separadas:

  Backend (local):    cd backend && ./.venv/bin/uvicorn app.main:app --reload --port 8000
  Backend (Docker):   (cd backend && docker compose up --build)
  Teacher-Web:        cd apps/teacher-web && npm run dev        -> http://localhost:5173
  Admin-Web:          cd apps/admin-web && npm run dev          -> http://localhost:5174
  Student-App:        cd apps/student-app && flutter run
  pgAdmin:            http://localhost:5050 (admin@kawsay.local / kawsay)

Guía completa: docs/00-setup-guide.md
EOF
}

main "$@"