"""AI Gateway: provider selection, timeout control and heuristic fallback."""
from __future__ import annotations

import asyncio
import logging

from app.core.config import settings
from app.modules.ai.content_validation import validate_generated_content
from app.modules.ai.gateway.base import AI_TIMEOUT_SECONDS, AIProviderError, BaseAIProvider
from app.modules.ai.gateway.providers.fallback_provider import HeuristicFallbackProvider
from app.modules.ai.gateway.providers.openai_provider import OpenAIProvider
from app.modules.ai.inference import classify_activity
from app.modules.ai.schemas import AdaptedActivitySchema, ClassificationRequest
from app.modules.ai.training.preprocessing import has_obvious_identifier

logger = logging.getLogger("kawsay.ai.gateway")

_DEFAULT_MODEL = "gpt-4o-mini"
_FALLBACK = HeuristicFallbackProvider()


def get_provider() -> BaseAIProvider:
    name = (settings.ai_provider or "").strip().lower()
    if name == "openai" and settings.ai_api_key:
        try:
            model = getattr(settings, "ai_model", None) or _DEFAULT_MODEL
            return OpenAIProvider(api_key=settings.ai_api_key, model=model)
        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo inicializar OpenAIProvider (%s); usando fallback", type(exc).__name__, extra={"request_id": "ai"})
    return _FALLBACK


class AIGateway:
    def __init__(self, provider: BaseAIProvider | None = None, timeout: float = AI_TIMEOUT_SECONDS):
        self.provider = provider or get_provider()
        self.timeout = timeout
        self.fallback = _FALLBACK

    async def adapt_activity(
        self, *, base_content: str, grade: int, subject: str
    ) -> AdaptedActivitySchema:
        if has_obvious_identifier(base_content) or has_obvious_identifier(subject):
            # Do not send likely identifiers to the external provider.
            result = await self.fallback.adapt_activity(base_content="Actividad pendiente de anonimización docente", grade=grade, subject="Actividad educativa")
            result.classification = None
            result.adaptation_strategy = "teacher_anonymization_required"
            return result
        classification = classify_activity(ClassificationRequest(text=base_content, grade=grade, subject=subject))
        try:
            result = await asyncio.wait_for(
                self.provider.adapt_activity(
                    base_content=base_content, grade=grade, subject=subject
                ),
                timeout=self.timeout,
            )
            if result.grade != grade or result.subject != subject:
                raise AIProviderError("provider_context_mismatch")
            validate_generated_content(result)
            return self._annotate(result, classification)
        except (TimeoutError, AIProviderError) as exc:
            logger.warning(
                "AI provider '%s' falló (%s); usando heurística", self.provider.name, type(exc).__name__, extra={"request_id": "ai"}
            )
        except Exception:  # noqa: BLE001
            logger.warning(
                "Error inesperado del AI provider '%s'; usando heurística", self.provider.name, extra={"request_id": "ai"}
            )
        result = await self.fallback.adapt_activity(
            base_content=base_content, grade=grade, subject=subject
        )
        return self._annotate(result, classification)

    @staticmethod
    def _annotate(result, classification):
        result.classification = classification
        if classification.abstained or classification.dataset_origin != "authorized":
            result.adaptation_strategy = "teacher_review_insufficient_evidence"
        else:
            result.adaptation_strategy = {"BASIC": "guided_practice", "INTERMEDIATE": "worked_steps",
                                          "ADVANCED": "justify_and_compare"}[classification.difficulty]
            # Deterministic scaffolding preserves the original provider objective/content.
            result.instructions = [{
                "guided_practice": "Representa la situación con objetos o dibujos antes de resolver.",
                "worked_steps": "Divide la actividad en pasos y comprueba cada resultado.",
                "justify_and_compare": "Justifica tu estrategia y compárala con otra posible.",
            }[result.adaptation_strategy]] + result.instructions[:11]
        return result


async def adapt_activity(
    base_content: str, grade: int, subject: str
) -> AdaptedActivitySchema:
    return await AIGateway().adapt_activity(
        base_content=base_content, grade=grade, subject=subject
    )


def adapt_activity_sync(
    base_content: str, grade: int, subject: str
) -> AdaptedActivitySchema:
    return asyncio.run(adapt_activity(base_content, grade, subject))


def tutor_reply(message: str, grade: int | None, subject: str | None, topic: str | None,
                approved_content: str | None = None, hint_level: int = 0) -> str:
    """Limited offline guide over teacher-approved tasks, not a conversational LLM."""
    if not approved_content:
        return ("Soy una guía offline limitada. No tengo contenido aprobado para explicar este tema "
                "con certeza. Selecciona una actividad publicada o consulta a tu docente.")
    # Never echo the student's free-form message (may contain personal information).
    from app.modules.ai.training.preprocessing import tokens
    words = set(tokens(message))
    if words & {"suicidio", "suicidarme", "abuso", "violencia", "lastimarme"}:
        return "Busca apoyo de tu docente o de una persona adulta de confianza. No compartas datos personales aquí."
    import re
    steps = re.split(r"\n|(?=\b\d+[)])", approved_content)
    steps = [s.strip() for s in steps if len(s.strip()) > 10]
    selected = max(steps, key=lambda s: len(words & set(tokens(s)))) if steps else approved_content
    excerpt = selected[:500]
    context = f"grado {grade}" if grade else "tu nivel"
    if hint_level == 0:
        return f"Guía limitada para {context}. En tu actividad aprobada: «{excerpt}». ¿Qué pide hacer y qué información tienes?"
    if hint_level == 1:
        return f"Volvamos a esta parte: «{excerpt}». Represéntala con un dibujo o con objetos de tu entorno. ¿Qué relación encuentras entre los datos?"
    return f"Revisa este paso: «{excerpt}». Explica tu procedimiento y compruébalo de otra forma. Si aún necesitas una explicación del concepto, solicita apoyo docente."
