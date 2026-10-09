"""Shared SQLAlchemy 2.0 declarative base and helpers for KAWSAY AI.

``Base`` is the single ``DeclarativeBase`` that backs ``Base.metadata`` for
both the application (``app.core.database``) and Alembic
(``migrations/env.py``). It is re-exported here so feature modules depend on
``app.shared.models`` instead of importing the database layer directly.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from app.core.database import Base

__all__ = ["Base", "uuid_str", "utcnow"]


def uuid_str() -> str:
    """Return a RFC 4122 UUID4 as a 36-char string.

    Stored as ``String(36)`` (instead of the native ``UUID`` type) so the exact
    same metadata works on PostgreSQL and on the in-memory SQLite engine used by
    the test suite, matching migration ``0001_initial`` and ``app/api.py``.
    """
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """Naive UTC timestamp consistent with the existing ``created_at`` columns."""
    return datetime.utcnow()
