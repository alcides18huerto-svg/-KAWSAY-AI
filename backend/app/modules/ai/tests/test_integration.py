import asyncio
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_current_user
from app.main import app
from app.models import (
    Assignment,
    AssignmentVariant,
    Classroom,
    ClassroomStudent,
    LearningAttempt,
    School,
    StudentProfile,
    User,
)
from app.modules.ai.gateway.base import BaseAIProvider
from app.modules.ai.gateway.providers.fallback_provider import HeuristicFallbackProvider
from app.modules.ai.service import AIGateway, tutor_reply


@pytest.fixture
def client_db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, expire_on_commit=False)() as db:
        student = User(id="student", email="s@example.com", full_name="Test", role="STUDENT", password_hash="unused")
        teacher = User(id="teacher", email="t@example.com", full_name="Test", role="TEACHER", password_hash="unused")
        school = School(id="school", name="School")
        db.add_all([student, teacher, school])
        db.flush()
        db.add(Classroom(id="class", school_id=school.id, teacher_id=teacher.id, name="Aula"))
        db.flush()
        db.add_all([ClassroomStudent(classroom_id="class", student_id=student.id), StudentProfile(user_id=student.id, grade=3)])
        for id_, status, approval in [("published", "PUBLISHED", "APPROVED"), ("draft", "DRAFT", "PENDING")]:
            db.add(Assignment(id=id_, teacher_id=teacher.id, classroom_id="class", subject="Matemática", title="Semillas", base_content="Cuenta las semillas y escribe el número", status=status))
            db.flush()
            db.add(AssignmentVariant(id=id_ + "-variant", assignment_id=id_, grade=3,
                                     content="Cuenta las semillas y explica cómo las agrupaste", approval_status=approval))
        db.commit()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: student
        with TestClient(app) as client:
            yield client, db, student, teacher
        app.dependency_overrides.clear()
    engine.dispose()


def test_auth_and_roles(client_db):
    client, _, _, teacher = client_db
    assert client.post("/api/v1/ai/classify", json={"text": "Un ejercicio nuevo"}).status_code == 403
    app.dependency_overrides[get_current_user] = lambda: teacher
    assert client.get("/api/v1/ai/models").json()["models"][0]["sha256"]
    response = client.post("/api/v1/ai/classify", json={"text": "Cuenta semillas y escribe el número"})
    assert response.status_code == 200 and response.json()["method"] == "trained_ml"
    assert client.post("/api/v1/ai/classify", json={"text": "x" * 12001}).status_code == 422
    del app.dependency_overrides[get_current_user]
    assert client.get("/api/v1/ai/status").status_code == 401


def test_recommendations_and_tutor_scope(client_db):
    client, db, student, teacher = client_db
    data = client.get("/api/v1/ai/recommendations").json()
    assert [i["assignment_id"] for i in data["items"]] == ["published"]
    assert data["history_window"] == 0
    assert client.get("/api/v1/ai/recommendations?student_id=other").status_code == 403
    assert client.post("/api/v1/tutor/message", json={"message": "ayuda", "assignment_id": "draft"}).status_code == 404
    response = client.post("/api/v1/tutor/message", json={"message": "semillas", "assignment_id": "published"})
    assert response.status_code == 200 and "semillas" in response.json()["reply"]
    app.dependency_overrides[get_current_user] = lambda: teacher
    assert client.get("/api/v1/ai/recommendations?student_id=other").status_code == 404
    db.add(LearningAttempt(id="attempt-1", student_id=student.id, assignment_id="published", question_key="q", answer="private", is_correct=False, hints_used=3, response_time_seconds=20))
    db.commit()
    result = client.get("/api/v1/ai/recommendations?student_id=student").json()
    assert result["evidence_by_subject"]["Matemática"]["needs_reinforcement"]
    assert "private" not in str(result)


def test_teacher_correction_requires_new_approval(client_db):
    client, _, _, teacher = client_db
    app.dependency_overrides[get_current_user] = lambda: teacher
    response = client.patch("/api/v1/teacher/assignments/published/variants/published-variant", json={"content": "Nueva actividad corregida por docente"})
    assert response.status_code == 200
    assert client.post("/api/v1/teacher/assignments/published/publish").status_code == 400
    assert client.post("/api/v1/teacher/assignments/published/approve").status_code == 200
    assert client.post("/api/v1/teacher/assignments/published/publish").status_code == 200


def test_sync_idempotence_and_conflicts(client_db):
    client, db, _, teacher = client_db
    event = {"client_event_id": "event-12345", "assignment_id": "published", "question_key": "q", "answer": "private", "is_correct": False}
    first = client.post("/api/v1/sync/push", json={"events": [event]}).json()
    second = client.post("/api/v1/sync/push", json={"events": [event]}).json()
    assert first["accepted"] == second["duplicates"] == [event["client_event_id"]]
    conflict = client.post("/api/v1/sync/push", json={"events": [{**event, "answer": "changed"}]}).json()
    assert not conflict["accepted"] and conflict["rejected"][0]["reason"] == "event_id_conflict"
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="other", role="STUDENT")
    foreign = client.post("/api/v1/sync/push", json={"events": [event]}).json()
    assert not foreign["accepted"]
    assert len(db.scalars(select(LearningAttempt)).all()) == 1


def test_tutor_honest_and_progressive():
    assert "No tengo contenido aprobado" in tutor_reply("álgebra", 3, None, None)
    replies = [tutor_reply("semillas", 3, "Matemática", None, "Cuenta las semillas del huerto", level) for level in range(3)]
    assert len(set(replies)) == 3
    assert all("semillas" in reply for reply in replies)


def test_gateway_timeout_and_invalid_content():
    class Slow(BaseAIProvider):
        async def adapt_activity(self, **kwargs):
            await asyncio.sleep(1)
    result = asyncio.run(AIGateway(Slow(), timeout=0.001).adapt_activity(base_content="Cuenta las semillas", grade=3, subject="Matemática"))
    assert result.is_fallback and result.classification.method == "trained_ml"

    class Unsafe(BaseAIProvider):
        async def adapt_activity(self, **kwargs):
            output = await HeuristicFallbackProvider().adapt_activity(**kwargs)
            output.content = "<script>malicious()</script>"
            output.provider = "unsafe"
            return output
    result = asyncio.run(AIGateway(Unsafe()).adapt_activity(base_content="Cuenta las semillas", grade=3, subject="Matemática"))
    assert result.provider == "heuristic" and "<script>" not in result.content


def test_unavailable_model_api(client_db, monkeypatch):
    from app.modules.ai import routes
    def unavailable():
        raise ValueError("corrupt")
    monkeypatch.setattr(routes, "get_classifier", unavailable)
    client, _, _, _ = client_db
    assert client.get("/api/v1/ai/status").json()["status"] == "unavailable"
    from app.modules.ai.schemas import ClassificationResult
    monkeypatch.setattr(routes, "classify_activity", lambda payload: ClassificationResult(method="unavailable", reason="missing"))
    _, _, _, teacher = client_db
    app.dependency_overrides[get_current_user] = lambda: teacher
    assert client.post("/api/v1/ai/classify", json={"text": "Cuenta las semillas"}).status_code == 503


def test_personal_identifiers_not_sent_to_provider():
    class NeverCall(BaseAIProvider):
        async def adapt_activity(self, **kwargs):
            raise AssertionError("Personal data must not reach provider")
    output = asyncio.run(AIGateway(NeverCall()).adapt_activity(base_content="Enviar a alumno@example.com", grade=3, subject="Matemática"))
    assert output.adaptation_strategy == "teacher_anonymization_required"
    assert "alumno@example.com" not in output.content


def test_immediate_attempt_sync_and_conflict(client_db):
    client, _, _, _ = client_db
    payload = {"id": "direct-attempt-123", "assignment_id": "published", "question_key": "q", "answer": "private", "is_correct": True}
    assert client.post("/api/v1/learning/attempts", json=payload).status_code == 200
    assert client.post("/api/v1/learning/attempts", json=payload).json()["status"] == "already_synced"
    assert client.post("/api/v1/learning/attempts", json={**payload, "answer": "changed"}).status_code == 409
    assert client.get("/api/v1/progress/me").json()[0]["attempts"] == 1
