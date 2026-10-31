#!/bin/sh
set -eu

alembic -c alembic.ini upgrade head

python -m app.demo_bootstrap

uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-10000}" --proxy-headers &
api_pid=$!

cleanup() {
  kill "$api_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

python - <<'PY'
import os
import sys
import time
import urllib.error
import urllib.request

port = os.environ.get("PORT", "10000")
url = f"http://127.0.0.1:{port}/ready"
for _ in range(120):
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            if response.status == 200:
                break
    except (urllib.error.URLError, TimeoutError, OSError):
        time.sleep(0.5)
else:
    print("KAWSAY DEMO: el backend no respondio a tiempo", flush=True)
    sys.exit(1)
PY

if [ "${KAWSAY_DEMO_SEED:-1}" = "1" ]; then
  export KAWSAY_URL="http://127.0.0.1:${PORT:-10000}"
  export DEMO_ALLOW_WRITES=1
  export DEMO_ALLOW_REMOTE=1
  python scripts/demo_e2e.py || echo "KAWSAY DEMO: la carga de datos fallo; revisa el error anterior" >&2
fi

wait "$api_pid"
