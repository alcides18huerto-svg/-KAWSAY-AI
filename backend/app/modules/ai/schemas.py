"""Structured output schemas for the KAWSAY AI Gateway."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.ai.training.preprocessing import has_obvious_identifier

Difficulty = Literal["BASIC", "INTERMEDIATE", "ADVANCED"]


class AdaptedActivityContent(BaseModel):
    """Rigid JSON schema the AI provider must return.

    All fields are required and ``extra="forbid"`` forces
    ``additionalProperties: false``, which makes this schema valid for OpenAI
    Structured Outputs (``strict: true``).
    """

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=3, max_length=180)
    grade: int = Field(ge=1, le=6)
    subject: str = Field(min_length=2, max_length=120)
    content: str = Field(min_length=1, max_length=16000)
    instructions: list[str] = Field(min_length=1, max_length=12)
    difficulty: Difficulty
    estimated_minutes: int = Field(ge=5, le=240)
    language: str = Field(min_length=2, max_length=10)


class AdaptedActivitySchema(AdaptedActivityContent):
    """Gateway response: validated AI content plus provenance metadata."""

    provider: str
    is_fallback: bool = False
    classification: ClassificationResult | None = None
    adaptation_strategy: str = "teacher_review"
    teacher_review_required: bool = True


class ClassificationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    text: str = Field(min_length=5, max_length=12000)
    grade: int | None = Field(default=None, ge=1, le=6)
    subject: str | None = Field(default=None, min_length=2, max_length=120)

    @field_validator("text", "subject")
    @classmethod
    def no_obvious_identifiers(cls, value):
        if value and has_obvious_identifier(value):
            raise ValueError("Anonimice posibles identificadores personales")
        return value


class ClassificationResult(BaseModel):
    difficulty: Difficulty | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    model_version: str | None = None
    method: Literal["trained_ml", "unavailable"]
    abstained: bool = True
    reason: str
    confidence_calibrated: bool = False
    teacher_review_required: bool = True
    dataset_origin: str | None = None
    input_sha256: str | None = None


AdaptedActivitySchema.model_rebuild()
