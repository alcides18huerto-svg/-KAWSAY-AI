"""Arranque de producción: migraciones, cuentas DEMO y carga inicial."""
import logging
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

import httpx
from alembic import command
from alembic.config import Config

from app.demo_bootstrap import bootstrap_administrator, bootstrap_teacher

logger = logging.getLogger("kawsay.startup")


def _auto_migrate_enabled() -> bool:
    # En esta demo migramos por defecto en cualquier entorno: así nunca queda una
    # base sin tablas ("no such table") si falta la variable de entorno.
    return os.getenv("KAWSAY_AUTO_MIGRATE", "1") == "1"


def run_migrations() -> None:
    if not _auto_migrate_enabled():
        return
    alembic_ini = Path(__file__).resolve().parents[2] / "alembic.ini"
    logger.info("Aplicando migraciones Alembic desde %s", alembic_ini)
    command.upgrade(Config(str(alembic_ini)), "head")
    logger.info("Migraciones Alembic aplicadas")


def run_demo_bootstrap() -> None:
    bootstrap_teacher()
    bootstrap_administrator()


def _wait_ready(port: str, attempts: int = 120) -> bool:
    url = f"http://127.0.0.1:{port}/ready"
    for _ in range(attempts):
        try:
            if httpx.get(url, timeout=2).status_code == 200:
                return True
        except (httpx.HTTPError, OSError):
            pass
        time.sleep(0.5)
    return False


def _demo_seed_script() -> Path | None:
    candidates = (
        Path(__file__).resolve().parents[2] / "scripts" / "demo_e2e.py",
        Path(__file__).resolve().parents[3] / "scripts" / "demo_e2e.py",
    )
    return next((path for path in candidates if path.is_file()), None)


def _run_demo_seed(port: str) -> None:
    try:
        if not _wait_ready(port):
            logger.error("KAWSAY DEMO: el backend no respondio a tiempo; no se cargaron datos")
            return
        script = _demo_seed_script()
        if script is None:
            logger.error("KAWSAY DEMO: no se encontro scripts/demo_e2e.py")
            return
        env = os.environ.copy()
        env["KAWSAY_URL"] = f"http://127.0.0.1:{port}"
        env["DEMO_ALLOW_WRITES"] = "1"
        env["DEMO_ALLOW_REMOTE"] = "1"
        env["PYTHONUTF8"] = "1"
        env["PYTHONIOENCODING"] = "utf-8"
        logger.info("KAWSAY DEMO: cargando datos ficticios desde %s", script)
        result = subprocess.run([sys.executable, str(script)], env=env, check=False)  # noqa: S603
        if result.returncode == 0:
            logger.info("KAWSAY DEMO: datos ficticios cargados")
        else:
            logger.error("KAWSAY DEMO: la carga fallo con codigo %s", result.returncode)
    except Exception:
        logger.exception("KAWSAY DEMO: error inesperado durante la carga inicial")


def start_demo_seed_thread() -> None:
    if os.getenv("KAWSAY_DEMO_SEED", "0") != "1":
        return
    if os.getenv("KAWSAY_DEMO_SEED_IN_APP", "1") != "1":
        return
    port = os.getenv("PORT", "10000")
    threading.Thread(target=_run_demo_seed, args=(port,), name="kawsay-demo-seed", daemon=True).start()


def startup() -> None:
    run_migrations()
    run_demo_bootstrap()
    start_demo_seed_thread()
