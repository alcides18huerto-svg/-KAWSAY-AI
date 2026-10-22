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
    subject: str = Field(min_length=2, max_length=120)
    title: str = Field(min_length=3, max_length=180)
    base_content: str = Field(min_length=5, max_length=12000)
    grades: list[int] = Field(min_length=1, max_length=6)

class VariantUpdate(BaseModel):
    content: str = Field(min_length=5, max_length=12000)

class AttemptCreate(BaseModel):
    id: str = Field(min_length=8, max_length=36)
    assignment_id: Optional[str] = None
    question_key: str = Field(min_length=1, max_length=100)
    answer: str = Field(max_length=12000)
    is_correct: bool
    hints_used: int = Field(default=0, ge=0, le=1000)
    response_time_seconds: float = Field(default=0, ge=0, le=604800, allow_inf_nan=False)

class InterventionCreate(BaseModel):
    student_id: str
    strategy: str
    notes: Optional[str] = None

class TutorRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    subject: Optional[str] = Field(default=None, max_length=120)
    topic: Optional[str] = Field(default=None, max_length=180)
    assignment_id: Optional[str] = Field(default=None, max_length=36)
    hint_level: int = Field(default=0, ge=0, le=2)
