"""Heuristic fallback provider: never calls an external API."""
from __future__ import annotations

from app.modules.ai.gateway.base import BaseAIProvider
from app.modules.ai.schemas import AdaptedActivitySchema

_SCAFFOLDING = {
    1: "Usa instrucciones muy breves, apoyo visual y un ejemplo guiado.",
    2: "Usa lenguaje simple, un ejemplo y pocos pasos.",
    3: "Usa instrucciones claras y práctica progresiva.",
    4: "Incluye aplicación contextual y varios pasos.",
    5: "Incluye razonamiento, comparación y aplicación.",
    6: "Incluye desafío, explicación del procedimiento y reflexión.",
}
_DIFFICULTY = {1: "BASIC", 2: "BASIC", 3: "INTERMEDIATE", 4: "INTERMEDIATE", 5: "ADVANCED", 6: "ADVANCED"}
_MINUTES = {1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35}


class HeuristicFallbackProvider(BaseAIProvider):
    name = "heuristic"

    async def adapt_activity(
        self, *, base_content: str, grade: int, subject: str
    ) -> AdaptedActivitySchema:
        grade = max(1, min(6, int(grade)))
        note = _SCAFFOLDING[grade]
        content = f"{base_content}\n\nAdaptación sugerida para {grade}.º: {note}"
        return AdaptedActivitySchema(
            title=f"Actividad adaptada ({subject}, {grade}.º)",
            grade=grade,
            subject=subject,
            content=content,
            instructions=[
                "Lee con atención la actividad base.",
                note,
                "Resuelve la actividad y anota tus dudas para el docente.",
            ],
            difficulty=_DIFFICULTY[grade],
            estimated_minutes=_MINUTES[grade],
            language="es",
            provider=self.name,
            is_fallback=True,
        )
