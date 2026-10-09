"""Structured output schemas for the KAWSAY AI Gateway."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

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
    content: str = Field(min_length=1)
    instructions: list[str] = Field(min_length=1)
    difficulty: Difficulty
    estimated_minutes: int = Field(ge=5, le=240)
    language: str = Field(min_length=2, max_length=10)


class AdaptedActivitySchema(AdaptedActivityContent):
    """Gateway response: validated AI content plus provenance metadata."""

    provider: str
    is_fallback: bool = False
