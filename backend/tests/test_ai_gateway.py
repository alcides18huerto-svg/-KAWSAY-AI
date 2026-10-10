from app.modules.ai.gateway.providers.fallback_provider import HeuristicFallbackProvider
from app.modules.ai.service import adapt_activity_sync


def test_adapt_generates_differentiated_content_per_grade():
    low = adapt_activity_sync("Multiplicación", 1, "Matemática")
    high = adapt_activity_sync("Multiplicación", 6, "Matemática")

    assert low.grade == 1
    assert high.grade == 6
    assert low.provider == "heuristic"
    assert low.is_fallback is True
    assert low.content != high.content
    assert "1.º" in low.title or "grado" in low.title
    assert low.content and high.content


def test_fallback_detects_area_and_builds_concrete_content():
    math = adapt_activity_sync("Suma de números", 3, "Matemática")
    language = adapt_activity_sync("Cuento mi familia", 2, "Comunicación")

    assert "grupos iguales" in math.content or "multiplicación" in math.content
    assert math.difficulty == "INTERMEDIATE"
    assert len(math.instructions) >= 2
    assert language.content != math.content