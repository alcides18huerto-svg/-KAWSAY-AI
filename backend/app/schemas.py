from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SchoolCreate(BaseModel):
    name: str
    country: str = "Perú"
    region: Optional[str] = None
    community: Optional[str] = None

class ClassroomCreate(BaseModel):
    school_id: str
    name: str
    school_year: int = 2026

class StudentEnrollmentRequest(BaseModel):
    email: EmailStr

class StudentProfileCreate(BaseModel):
    grade: int = Field(ge=1, le=6)
    native_language: str
    preferred_language: str
    interests: Optional[str] = None
    school_id: Optional[str] = None

class AssignmentCreate(BaseModel):
    classroom_id: str
    subject: str
    title: str
    base_content: str
    grades: list[int]

class AttemptCreate(BaseModel):
    id: str
    assignment_id: Optional[str] = None
    question_key: str
    answer: str
    is_correct: bool
    hints_used: int = 0
    response_time_seconds: float = 0

class InterventionCreate(BaseModel):
    student_id: str
    strategy: str
    notes: Optional[str] = None

class TutorRequest(BaseModel):
    message: str
    subject: Optional[str] = None
    topic: Optional[str] = None
