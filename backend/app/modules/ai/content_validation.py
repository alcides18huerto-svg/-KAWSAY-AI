"""Conservative structural/content checks; teacher approval remains mandatory."""
import re

from app.modules.ai.gateway.base import AIProviderError


def validate_generated_content(result):
    text = "\n".join([result.title, result.content, *result.instructions])
    if any(len(instruction) > 2000 for instruction in result.instructions):
        raise AIProviderError("instruction_too_long")
    # Reject executable markup, external links and obvious personal identifiers.
    if re.search(r"<\s*(script|iframe|object)|javascript:|https?://|[\w.+-]+@[\w.-]+\.\w+|\b\d{8,}\b", text, re.I):
        raise AIProviderError("unsafe_or_personal_content")
    if re.search(r"\b(pornograf\w*|suicid\w*|fabricar explosivos)\b", text, re.I):
        raise AIProviderError("age_inappropriate_content")
    return result
