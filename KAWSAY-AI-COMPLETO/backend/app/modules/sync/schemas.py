"""Schemas del motor de sincronización offline-first.

El móvil agrupa los eventos locales en lotes y los envía a ``POST /sync/push``.
Cada evento lleva un ``client_event_id`` (UUIDv4) que actúa como clave de
idempotencia: reenviar el mismo evento nunca duplica filas en PostgreSQL.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

MAX_BATCH_SIZE = 50


class SyncEvent(BaseModel):
    """Un intento local generado en el dispositivo del estudiante."""

    client_event_id: str = Field(min_length=8, max_length=64)
    assignment_id: str | None = None
    question_key: str = Field(min_length=1, max_length=100)
    answer: str
    is_correct: bool
    hints_used: int = Field(default=0, ge=0)
    response_time_seconds: float = Field(default=0, ge=0)


class SyncBatchPayload(BaseModel):
    """Lote enviado por el cliente (máximo 50 eventos por petición)."""

    client_batch_id: str | None = Field(default=None, max_length=64)
    events: list[SyncEvent] = Field(min_length=1, max_length=MAX_BATCH_SIZE)


class RejectedEvent(BaseModel):
    client_event_id: str
    reason: str


class SyncResponse(BaseModel):
    """ACK del servidor.

    ``accepted`` incluye tanto eventos nuevos como duplicados confirmados, de
    modo que el cliente puede marcarlos como ``done`` en ambos casos.
    """

    batch_id: str | None = None
    accepted: list[str] = Field(default_factory=list)
    duplicates: list[str] = Field(default_factory=list)
    rejected: list[RejectedEvent] = Field(default_factory=list)
    server_received_at: datetime
