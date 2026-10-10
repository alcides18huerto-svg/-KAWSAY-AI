import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_current_user
from app.main import app
from app.models import (
    Classroom,
    ClassroomStudent,
    School,
    StudentProfile,
    StudentProgress,
    User,
)


@pytest.fixture
def teacher_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine, expire_on_commit=False)
    db = test_session()

    teacher = User(
        email="teacher@example.com",
        password_hash="not-used",
        role="TEACHER",
        full_name="Test Teacher",
    )
    student = User(
        email="student@example.com",
        password_hash="not-used",
        role="STUDENT",
        full_name="Class Student",
    )
    outside_student = User(
        email="outside@example.com",
        password_hash="not-used",
        role="STUDENT",
        full_name="Outside Student",
    )
    school = School(name="Test School")
    db.add_all([teacher, student, outside_student, school])
    db.flush()
    classroom = Classroom(
        school_id=school.id,
        teacher_id=teacher.id,
        name="Room 1",
    )
    db.add(classroom)
    db.flush()
    db.add_all([
        ClassroomStudent(classroom_id=classroom.id, student_id=student.id),
        StudentProfile(user_id=student.id, grade=3),
        StudentProgress(
            student_id=student.id,
            subject="Matemática",
            mastery_level=75,
            total_attempts=4,
            correct_attempts=3,
        ),
    ])
    db.commit()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: teacher
    with TestClient(app) as client:
        yield client, classroom.id, student.id, outside_student.id

    app.dependency_overrides.clear()
    db.close()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_teacher_reads_only_students_from_owned_classrooms(teacher_client):
    client, _, student_id, _ = teacher_client

    response = client.get("/api/v1/teacher/students")
    assert response.status_code == 200
    assert [student["id"] for student in response.json()] == [student_id]

    progress_response = client.get("/api/v1/teacher/progress")
    assert progress_response.status_code == 200
    assert progress_response.json()[0]["progress"][0]["mastery_level"] == 75


def test_teacher_cannot_create_intervention_for_student_outside_own_class(teacher_client):
    client, _, _, outside_student_id = teacher_client

    response = client.post(
        "/api/v1/teacher/interventions",
        json={"student_id": outside_student_id, "strategy": "Provide guided practice"},
    )
    assert response.status_code == 404


def test_teacher_enrolls_student_by_email_idempotently(teacher_client):
    client, classroom_id, _, outside_student_id = teacher_client

    first = client.post(
        f"/api/v1/classrooms/{classroom_id}/students/by-email",
        json={"email": "outside@example.com"},
    )
    second = client.post(
        f"/api/v1/classrooms/{classroom_id}/students/by-email",
        json={"email": "outside@example.com"},
    )
    assert first.status_code == 200
    assert first.json()["student_id"] == outside_student_id
    assert second.status_code == 200

    students = client.get("/api/v1/teacher/students").json()
    assert {student["email"] for student in students} == {
        "student@example.com",
        "outside@example.com",
    }


def test_teacher_generates_ai_variants_per_grade(teacher_client):
    client, classroom_id, _, _ = teacher_client

    created = client.post(
        "/api/v1/teacher/assignments",
        json={
            "classroom_id": classroom_id,
            "subject": "Matemática",
            "title": "Multiplicación",
            "base_content": "Resuelve problemas de multiplicación",
            "grades": [1, 3, 6],
        },
    )
    assert created.status_code == 200
    assignment_id = created.json()["id"]

    for attempt in (1, 2):
        generated = client.post(
            f"/api/v1/teacher/assignments/{assignment_id}/generate-variants"
        )
        assert generated.status_code == 200
        payload = generated.json()
        assert payload["teacher_review_required"] is True
        variants = payload["variants"]
        assert {v["grade"] for v in variants} == {1, 3, 6}
        by_grade = {v["grade"]: v["content"] for v in variants}
        # Contenido distinto por grado (IA/fallback) y con profundidad real.
        assert by_grade[1] != by_grade[3] != by_grade[6]
        assert all(len(v["content"]) > 40 for v in variants)
