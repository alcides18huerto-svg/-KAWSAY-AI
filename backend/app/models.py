"""Aggregated ORM models.

Core entities are defined in their feature modules (``app.modules.*``) and
re-exported here so existing imports (``from app.models import User``) keep
working while a single ``Base.metadata`` is shared with Alembic.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.modules.classrooms.models import Classroom, ClassroomStudent
from app.modules.users.models import School, StudentProfile, TeacherProfile, User

__all__ = [
    "User",
    "StudentProfile",
    "TeacherProfile",
    "School",
    "Classroom",
    "ClassroomStudent",
    "Subject",
    "Competency",
    "Assignment",
    "AssignmentGrade",
    "AssignmentVariant",
    "LearningAttempt",
    "StudentProgress",
    "SupportFlag",
    "TeacherIntervention",
]


def uid():
    return str(uuid.uuid4())


class Subject(Base):
    __tablename__ = "subjects"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(120), index=True)
    grade: Mapped[int] = mapped_column(Integer, index=True)


class Competency(Base):
    __tablename__ = "competencies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))


class Assignment(Base):
    __tablename__ = "assignments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    classroom_id: Mapped[str] = mapped_column(ForeignKey("classrooms.id"), index=True)
    subject: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(180))
    base_content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AssignmentGrade(Base):
    __tablename__ = "assignment_grades"
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"), primary_key=True)
    grade: Mapped[int] = mapped_column(Integer, primary_key=True)


class AssignmentVariant(Base):
    __tablename__ = "assignment_variants"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"), index=True)
    grade: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    generated_by: Mapped[str] = mapped_column(String(20), default="AI")
    approval_status: Mapped[str] = mapped_column(String(20), default="PENDING")
    version: Mapped[int] = mapped_column(Integer, default=1)
    __table_args__ = (UniqueConstraint("assignment_id", "grade", "version"),)


class LearningAttempt(Base):
    __tablename__ = "learning_attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    assignment_id: Mapped[str | None] = mapped_column(ForeignKey("assignments.id"), nullable=True)
    question_key: Mapped[str] = mapped_column(String(100))
    answer: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)
    response_time_seconds: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudentProgress(Base):
    __tablename__ = "student_progress"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    subject: Mapped[str] = mapped_column(String(120), index=True)
    mastery_level: Mapped[float] = mapped_column(Float, default=0)
    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    correct_attempts: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SupportFlag(Base):
    __tablename__ = "support_flags"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    reason: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="OPEN")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TeacherIntervention(Base):
    __tablename__ = "teacher_interventions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    strategy: Mapped[str] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
