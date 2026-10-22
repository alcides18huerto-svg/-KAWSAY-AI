"""Endpoint del motor de sincronización cliente-servidor."""
from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models import LearningAttempt
from app.modules.sync.schemas import (
    RejectedEvent,
    SyncBatchPayload,
    SyncResponse,
)

logger = logging.getLogger("kawsay.sync")

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/push", response_model=SyncResponse)
def sync_push(
    payload: SyncBatchPayload,
    user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
) -> SyncResponse:
    """Recibe un lote de intentos y lo persiste de forma idempotente.

    - El ``client_event_id`` se usa como PK de ``learning_attempts``: si ya
      existe, se responde ACK como duplicado sin insertar de nuevo.
    - Cada inserción usa un SAVEPOINT, así un choque de idempotencia puntual no
      invalida el resto del lote.
    - Si la transacción no puede confirmarse, se revierte todo y se responde
      503; el cliente deja la cola en ``PENDING`` y reintenta.
    """
    events = payload.events
    event_ids = [event.client_event_id for event in events]

    already_synced = {
        attempt.id: attempt for attempt in
        db.scalars(
            select(LearningAttempt).where(LearningAttempt.id.in_(event_ids))
        ).all()
    }

    accepted: list[str] = []
    duplicates: list[str] = []
    rejected: list[RejectedEvent] = []
    seen: dict[str, dict] = {}

    for event in events:
        event_id = event.client_event_id
        values = event.model_dump(exclude={"client_event_id"})
        existing = already_synced.get(event_id)
        conflict = existing is not None and (
            existing.student_id != user.id or any(getattr(existing, key) != value for key, value in values.items())
        )
        if event_id in seen and seen[event_id] != values:
            conflict = True
        if conflict:
            rejected.append(RejectedEvent(client_event_id=event_id, reason="event_id_conflict"))
            continue
        if event_id in seen or existing is not None:
            if event_id not in accepted:
                duplicates.append(event_id)
                accepted.append(event_id)
            continue

        try:
            with db.begin_nested():
                db.add(
                    LearningAttempt(
                        id=event_id,
                        student_id=user.id,
                        assignment_id=event.assignment_id,
                        question_key=event.question_key,
                        answer=event.answer,
                        is_correct=event.is_correct,
                        hints_used=event.hints_used,
                        response_time_seconds=event.response_time_seconds,
                    )
                )
            accepted.append(event_id)
            seen[event_id] = values
        except IntegrityError:
            # FK violations are not successful duplicates. A concurrent duplicate
            # is retried on the next push and then checked against its payload.
            rejected.append(RejectedEvent(client_event_id=event_id, reason="integrity_conflict_retry"))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.warning(
            "No se pudo confirmar el lote %s; el cliente reintentará",
            payload.client_batch_id,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo confirmar el lote; la cola permanecerá pendiente",
        ) from None

    logger.info(
        "sync batch=%s accepted=%d duplicates=%d rejected=%d",
        payload.client_batch_id,
        len(accepted),
        len(duplicates),
        len(rejected),
    )
    return SyncResponse(
        batch_id=payload.client_batch_id,
        accepted=accepted,
        duplicates=duplicates,
        rejected=rejected,
        server_received_at=datetime.utcnow(),
    )
