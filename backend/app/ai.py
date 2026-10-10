def adapt_assignment(base_content: str, target_grade: int, subject: str) -> dict:
    # Adaptador determinista de desarrollo. Sustituible por AI Gateway real.
    scaffolding = {
        1: "Usa instrucciones muy breves, apoyo visual y un ejemplo guiado.",
        2: "Usa lenguaje simple, ejemplo y pocos pasos.",
        3: "Usa instrucciones claras y práctica progresiva.",
        4: "Incluye aplicación contextual y varios pasos.",
        5: "Incluye razonamiento, comparación y aplicación.",
        6: "Incluye desafío, explicación del procedimiento y reflexión."
    }
    return {
        "grade": target_grade,
        "content": f"{base_content}\n\nAdaptación sugerida para {target_grade}.º: {scaffolding.get(target_grade, '')}",
        "teacher_review_required": True,
        "generated_by": "AI_MOCK"
    }

def tutor_reply(message: str, grade: int | None, subject: str | None, topic: str | None) -> str:
    context = f"grado {grade}" if grade else "tu nivel actual"
    area = subject or "el tema elegido"
    return (
        f"Trabajaremos {area} considerando {context}. "
        "Primero intenta explicarme qué parte entiendes. "
        "Luego avanzaremos con una pista o un ejemplo, sin darte toda la respuesta de inmediato."
    )
