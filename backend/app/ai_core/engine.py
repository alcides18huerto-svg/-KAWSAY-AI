"""Heurísticas locales de KAWSAY (sin APIs externas).

El motor es deliberadamente simple y determinista:
- `build_adaptation` produce un borrador JSON de actividad por grado.
- `build_tutor_hint` produce una pista breve que no revela la respuesta.

Ambas salidas pasan por los mismos validadores que cualquier proveedor externo
(`app.modules.ai.validators`), de modo que el dominio no confía en la fuente.
"""

from __future__ import annotations

import json
import re
from collections.abc import Mapping
from typing import Any

MAX_TITLE = 300
MAX_HINT = 400

_WORD_RE = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{4,}")


def _keywords(text: str) -> list[str]:
    """Palabras significativas en orden de aparición, sin duplicados."""
    found: list[str] = []
    for word in _WORD_RE.findall(text or ""):
        key = word.casefold()
        if key not in found:
            found.append(key)
    return found


def _topic_keyword(payload: Mapping[str, Any]) -> str:
    for field in ("topic", "objective", "subject"):
        words = _keywords(str(payload.get(field) or ""))
        if words:
            return words[0]
    return "aprender"


def _title(payload: Mapping[str, Any]) -> str:
    parts = [
        str(payload.get("topic") or "").strip(),
        str(payload.get("objective") or "").strip(),
        str(payload.get("base_title") or "").strip(),
    ]
    title = " · ".join(part for part in parts if part)
    return (title or "Actividad adaptada")[:MAX_TITLE]


def build_adaptation(payload: Mapping[str, Any]) -> str:
    """Genera un borrador de actividad adaptado al grado indicado en el payload."""
    grade_number = int(payload.get("grade_number") or 1)
    topic = str(payload.get("topic") or "").strip()
    keyword = _topic_keyword(payload)
    left, right = grade_number + 1, 2

    content = {
        "echo": {
            "grade": grade_number,
            "subject": str(payload.get("subject") or ""),
            "competency": str(payload.get("competency") or ""),
            "topic": topic,
        },
        "title": _title(payload),
        "instructions": (
            "Lee con calma. Hoy trabajamos este tema. "
            "Usa tus materiales. Elige una respuesta."
        ),
        "questions": [
            {
                "type": "MULTIPLE_CHOICE",
                "prompt": "Elige la opción correcta.",
                "options": [keyword.capitalize(), "Otra idea", "Ninguna de las anteriores"],
                "correct_answer": {"index": 0},
                "hints": ["Lee otra vez la pregunta.", "Descarta las opciones que no encajan."],
                "explanation": f"La opción correcta se relaciona con {topic or 'el tema'}.",
                "difficulty": 1,
            },
            {
                "type": "NUMERIC",
                "prompt": f"Resuelve: {left} + {right}.",
                "options": None,
                "correct_answer": {"value": left + right, "tolerance": 0},
                "hints": ["Cuenta con tus dedos.", "Suma primero las unidades."],
                "explanation": f"{left} más {right} son {left + right}.",
                "difficulty": 2,
            },
            {
                "type": "SHORT_TEXT",
                "prompt": "Escribe una idea con tus palabras.",
                "options": None,
                "correct_answer": {"accepted": [keyword]},
                "hints": ["Piensa en lo que aprendiste.", "Escribe una oración corta."],
                "explanation": "Puedes explicarlo con tus propias palabras.",
                "difficulty": 2,
            },
        ],
    }
    return json.dumps(content, ensure_ascii=False)


def build_tutor_hint(payload: Mapping[str, Any]) -> str:
    """Devuelve una pista corta y segura; nunca incluye la respuesta correcta."""
    step = max(0, min(int(payload.get("step") or 0), 3))
    topic = str(payload.get("topic") or "").strip()
    teacher_hint = str(payload.get("teacher_hint") or "").strip()

    if step >= 1 and teacher_hint:
        hint = teacher_hint
    elif step == 0:
        hint = "Antes de responder, lee con calma. ¿Qué te pide el ejercicio?"
    elif step == 1:
        hint = (f"Piensa en el tema: {topic}. ¿Qué datos tienes?" if topic
                else "Piensa en lo que ya sabes. ¿Qué datos te da el ejercicio?")
    elif step == 2:
        hint = "Mira cada opción y descarta la que no encaja. ¿Cuál te parece mejor?"
    else:
        hint = "Hazlo por partes. Resuelve primero una parte pequeña y luego une el resto."

    return hint[:MAX_HINT]


class LocalProvider:
    """Adaptador del motor local compatible con `AIProvider`."""

    name = "local"
    model = "kawsay-local-heuristic-v1"

    def generate(self, req: Any) -> Any:
        from app.modules.ai.gateway import AIProviderError, AIResponse

        try:
            task = getattr(req, "task", "generic")
            payload = getattr(req, "payload", {}) or {}
            if task == "adapt":
                text = build_adaptation(payload)
            elif task == "tutor":
                text = build_tutor_hint(payload)
            else:
                text = "Asistente local de KAWSAY disponible."
        except (KeyError, TypeError, ValueError) as exc:
            raise AIProviderError("No se pudo procesar la solicitud local") from exc
        return AIResponse(text=text, provider=self.name, model=self.model)
