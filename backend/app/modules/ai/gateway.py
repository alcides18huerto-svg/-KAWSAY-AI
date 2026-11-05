"""AI Gateway: el dominio educativo NUNCA habla con un proveedor concreto; solo con esta interfaz.

En esta fase el único proveedor activo es el motor local (`app.ai_core`), que no
usa red ni claves. Un proveedor caído no debe afectar login, offline, sync ni reglas.
"""
import time
from collections.abc import Mapping
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any, Protocol

from app.ai_core import LocalProvider
from app.core.config import get_settings


class AIProviderError(Exception):
    pass


class AIUnavailable(AIProviderError):  # noqa: N818
    pass


class AITimeout(AIProviderError):  # noqa: N818
    pass


@dataclass(frozen=True)
class AIRequest:
    system: str
    user: str
    max_tokens: int = 2000
    task: str = "generic"
    payload: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AIResponse:
    text: str
    provider: str
    model: str


class AIProvider(Protocol):
    name: str
    model: str

    def generate(self, req: AIRequest) -> AIResponse: ...


class DisabledProvider:
    name, model = "disabled", ""

    def generate(self, req: AIRequest) -> AIResponse:
        raise AIUnavailable("No hay proveedor de IA configurado (AI_PROVIDER=disabled)")


class AIGateway:
    """Reintentos acotados + circuit breaker (evita tormentas de reintentos si el proveedor está caído)."""

    def __init__(self, provider: AIProvider, max_retries: int = 1, fail_threshold: int = 3, open_seconds: float = 30.0):
        self.provider, self.max_retries = provider, max_retries
        self._fails, self._open_until, self._threshold, self._open_seconds = 0, 0.0, fail_threshold, open_seconds

    @property
    def enabled(self) -> bool:
        return not isinstance(self.provider, DisabledProvider)

    def generate(self, req: AIRequest) -> AIResponse:
        if time.monotonic() < self._open_until:
            raise AIUnavailable("Circuito abierto: proveedor de IA temporalmente deshabilitado")
        last: Exception | None = None
        for _ in range(self.max_retries + 1):
            try:
                out = self.provider.generate(req)
                self._fails = 0
                return out
            except (AIUnavailable, AITimeout) as exc:
                last = exc
        self._fails += 1
        if self._fails >= self._threshold:
            self._open_until = time.monotonic() + self._open_seconds
        assert last is not None
        raise last


@lru_cache
def get_gateway() -> AIGateway:
    s = get_settings()
    if s.ai_provider == "local":
        return AIGateway(LocalProvider())
    return AIGateway(DisabledProvider())
