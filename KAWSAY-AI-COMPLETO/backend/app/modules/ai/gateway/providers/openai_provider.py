"""OpenAI provider using Structured Outputs (JSON schema) via httpx."""
from __future__ import annotations

import asyncio

import httpx
from pydantic import ValidationError

from app.modules.ai.gateway.base import (
    AI_TIMEOUT_SECONDS,
    MAX_RETRIES,
    AIProviderError,
    BaseAIProvider,
)
from app.modules.ai.schemas import AdaptedActivityContent, AdaptedActivitySchema

DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_BASE_URL = "https://api.openai.com/v1"

_SYSTEM_PROMPT = (
    "Eres un diseñador instruccional de KAWSAY AI. Adapta la actividad base al "
    "grado indicado manteniendo el objetivo pedagógico y usando lenguaje "
    "apropiado a la edad. Responde ÚNICAMENTE con el JSON del esquema."
)


class OpenAIProvider(BaseAIProvider):
    name = "openai"

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = AI_TIMEOUT_SECONDS,
    ):
        if not api_key:
            raise ValueError("OpenAIProvider requiere una API key")
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def is_available(self) -> bool:
        return bool(self.api_key)

    def _payload(self, base_content: str, grade: int, subject: str) -> dict:
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Materia: {subject}\n"
                        f"Grado destino: {grade}\n"
                        f"Actividad base:\n{base_content}"
                    ),
                },
            ],
            "temperature": 0.2,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "AdaptedActivity",
                    "strict": True,
                    "schema": AdaptedActivityContent.model_json_schema(),
                },
            },
        }

    async def adapt_activity(
        self, *, base_content: str, grade: int, subject: str
    ) -> AdaptedActivitySchema:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self.base_url}/chat/completions"
        last_error: Exception | None = None

        for attempt in range(MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        json=self._payload(base_content, grade, subject),
                    )
                    response.raise_for_status()
                    data = response.json()
                raw = data["choices"][0]["message"]["content"]
                parsed = AdaptedActivityContent.model_validate_json(raw)
                return AdaptedActivitySchema(**parsed.model_dump(), provider=self.name)
            except (httpx.HTTPError, ValidationError, KeyError, IndexError, TypeError) as exc:
                last_error = exc
                if attempt >= MAX_RETRIES:
                    break
                await asyncio.sleep(0.5)

        raise AIProviderError(f"OpenAI provider falló: {last_error!r}")
