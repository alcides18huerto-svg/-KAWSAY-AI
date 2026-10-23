"""Regression checks for dependencies needed by the real server startup/login."""
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from app.core.security import hash_password, verify_password


def test_password_hashing_and_login_verification():
    password = "technical-test-password-not-a-real-account"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("incorrect-password", hashed)


def test_alembic_revision_history_can_be_loaded():
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "migrations"))
    scripts = ScriptDirectory.from_config(config)
    assert len(scripts.get_heads()) == 1
    assert list(scripts.walk_revisions())
