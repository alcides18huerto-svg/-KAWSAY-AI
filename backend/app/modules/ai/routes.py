"""Authenticated, bounded inference only. Training/publication remain internal CLI."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models import Classroom, ClassroomStudent, User
from app.modules.ai.inference import classify_activity, get_classifier
from app.modules.ai.recommendations import recommend
from app.modules.ai.schemas import ClassificationRequest, ClassificationResult

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger("kawsay.ai")
CurrentUser = Annotated[User, Depends(get_current_user)]
TeacherUser = Annotated[User, Depends(require_roles("TEACHER", "ADMIN"))]
RecommendationUser = Annotated[User, Depends(require_roles("STUDENT", "TEACHER", "ADMIN"))]
DBSession = Annotated[Session, Depends(get_db)]


@router.get("/status")
def status(user: CurrentUser):
    try:
        classifier = get_classifier()
        return {"status": "available", "offline_inference": True,
                "version": classifier.metadata["version"],
                "dataset_origin": classifier.metadata["dataset"]["origin"],
                "pedagogically_validated": False, "tutor_mode": "approved_content_guidance"}
    except (OSError, ValueError, KeyError, TypeError):
        return {"status": "unavailable", "offline_inference": False, "version": None,
                "reason": "model_missing_or_corrupt", "tutor_mode": "approved_content_guidance"}


@router.get("/models")
def models(user: TeacherUser):
    try:
        classifier = get_classifier()
        meta = classifier.metadata
        return {"models": [{"version": meta["version"], "sha256": meta["sha256"],
                            "algorithm": meta["algorithm"], "active": True,
                            "dataset_origin": meta["dataset"]["origin"],
                            "confidence_calibrated": False, "teacher_review_required": True}]}
    except (OSError, ValueError, KeyError, TypeError):
        return {"models": [], "reason": "model_missing_or_corrupt"}


@router.post("/classify", response_model=ClassificationResult)
def classify(payload: ClassificationRequest, user: TeacherUser):
    result = classify_activity(payload)
    logger.info("classification method=%s abstained=%s version=%s", result.method,
                result.abstained, result.model_version, extra={"request_id": "ai"})
    if result.method == "unavailable":
        raise HTTPException(503, "Modelo local no disponible")
    return result


@router.get("/recommendations")
def recommendations(
    user: RecommendationUser, db: DBSession,
    student_id: str | None = Query(default=None, max_length=36),
    limit: int = Query(default=5, ge=1, le=10),
):
    target = student_id or user.id
    if user.role == "STUDENT" and target != user.id:
        raise HTTPException(403, "No autorizado")
    if user.role == "TEACHER":
        enrolled = db.scalar(select(ClassroomStudent.student_id).join(Classroom).where(
            Classroom.teacher_id == user.id, ClassroomStudent.student_id == target).limit(1))
        if not enrolled:
            raise HTTPException(404, "Estudiante no encontrado")
    student = db.get(User, target)
    if not student or student.role != "STUDENT":
        raise HTTPException(404, "Estudiante no encontrado")
    return recommend(db, target, limit)
