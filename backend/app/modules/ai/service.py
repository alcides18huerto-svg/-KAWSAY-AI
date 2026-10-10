"""AI Gateway: provider selection, timeout control and heuristic fallback."""
from __future__ import annotations

import asyncio
import logging

from app.core.config import settings
from app.modules.ai.gateway.base import AI_TIMEOUT_SECONDS, AIProviderError, BaseAIProvider
from app.modules.ai.gateway.providers.fallback_provider import HeuristicFallbackProvider
from app.modules.ai.gateway.providers.openai_provider import OpenAIProvider
from app.modules.ai.schemas import AdaptedActivitySchema

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
            logger.warning("No se pudo inicializar OpenAIProvider (%s); usando fallback", exc)
    return _FALLBACK


class AIGateway:
    def __init__(self, provider: BaseAIProvider | None = None, timeout: float = AI_TIMEOUT_SECONDS):
        self.provider = provider or get_provider()
        self.timeout = timeout
        self.fallback = _FALLBACK

    async def adapt_activity(
        self, *, base_content: str, grade: int, subject: str
    ) -> AdaptedActivitySchema:
        try:
            return await asyncio.wait_for(
                self.provider.adapt_activity(
                    base_content=base_content, grade=grade, subject=subject
                ),
                timeout=self.timeout,
            )
        except (AIProviderError, asyncio.TimeoutError) as exc:
            logger.warning(
                "AI provider '%s' falló (%s); usando heurística", self.provider.name, exc
            )
        except Exception:  # noqa: BLE001
            logger.exception(
                "Error inesperado del AI provider '%s'; usando heurística", self.provider.name
            )
        return await self.fallback.adapt_activity(
            base_content=base_content, grade=grade, subject=subject
        )


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


def tutor_reply(message: str, grade: int | None, subject: str | None, topic: str | None) -> str:
    context = f"grado {grade}" if grade else "tu nivel actual"
    area = subject or "el tema elegido"
    return (
        f"Trabajaremos {area} considerando {context}. "
        "Primero intenta explicarme qué parte entiendes. "
        "Luego avanzaremos con una pista o un ejemplo, sin darte toda la respuesta de inmediato."
    )