"""Abstract AI provider interface for the KAWSAY AI Gateway."""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.modules.ai.schemas import AdaptedActivitySchema

AI_TIMEOUT_SECONDS = 8.0
MAX_RETRIES = 1


class AIProviderError(RuntimeError):
    """Raised when a provider fails; the gateway then uses the heuristic fallback."""


class BaseAIProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def adapt_activity(
        self, *, base_content: str, grade: int, subject: str
    ) -> AdaptedActivitySchema:
        raise NotImplementedError

    def is_available(self) -> bool:
        return True