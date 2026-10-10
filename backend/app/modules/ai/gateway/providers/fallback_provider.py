"""Fallback heurístico: genera ejercicios diferenciados por grado sin APIs externas."""
from __future__ import annotations

from app.modules.ai.gateway.base import BaseAIProvider
from app.modules.ai.schemas import AdaptedActivitySchema

_DIFFICULTY = {
    1: "BASIC",
    2: "BASIC",
    3: "INTERMEDIATE",
    4: "INTERMEDIATE",
    5: "ADVANCED",
    6: "ADVANCED",
}
_MINUTES = {1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35}

_GRADE_LABEL = {
    1: "1.º",
    2: "2.º",
    3: "3.º",
    4: "4.º",
    5: "5.º",
    6: "6.º",
}

_INSTRUCTIONS = {
    1: [
        "Lee el tema en voz alta con ayuda de un adulto.",
        "Observa el ejemplo paso a paso.",
        "Resuelve el primer punto y comenta tu respuesta.",
    ],
    2: [
        "Lee el tema y subraya las palabras clave.",
        "Sigue el ejemplo y resuelve un ejercicio parecido.",
        "Anota qué parte te resultó difícil.",
    ],
    3: [
        "Lee el tema y explica con tus palabras de qué se trata.",
        "Resuelve los ejercicios en orden.",
        "Revisa tus respuestas antes de continuar.",
    ],
    4: [
        "Lee el tema y relaciona lo que ya sabes con lo nuevo.",
        "Resuelve los ejercicios y muestra tu procedimiento.",
        "Compara dos respuestas y verifica cuál es correcta.",
    ],
    5: [
        "Analiza el tema y plantea un ejemplo propio.",
        "Resuélvelo aplicando la estrategia del área.",
        "Explica tu razonamiento en dos o tres oraciones.",
    ],
    6: [
        "Plantea el problema y descompón los pasos.",
        "Resuélvelo y verifica con una estrategia diferente.",
        "Reflexiona: ¿qué aprendiste y cómo lo aplicarías a otra situación?",
    ],
}


def _detect_area(subject: str) -> str:
    s = subject.lower()
    if any(k in s for k in
           ("matem", "aritm", "algebr", "geometr", "núm", "num", "fracc", "conteo", "multiplic", "divis", "suma", "resta")):
        return "matematicas"
    if any(k in s for k in ("lengua", "comunic", "lectu", "escrit", "castell", "comprens", "gram")):
        return "lenguaje"
    if any(k in s for k in ("ciencia", "ambiente", "naturalez", "biolog", "salud", "cuerpo")):
        return "ciencias"
    if any(k in s for k in ("personal", "ciudadan", "social", "historia", "geograf", "convivenc")):
        return "sociales"
    if any(k in s for k in ("ingl", "english", "idioma")):
        return "ingles"
    return "general"


def _math(topic: str, grade: int) -> str:
    core = f"sobre «{topic}»"
    if grade == 1:
        return (
            f"Problema de inicio {core}.\n"
            "1) Cuenta de 1 en 1 hasta 20 y escribe los números.  "
            "2) Completa la serie: 5, 6, __, 8, __.  "
            "3) Junta 2 grupos de 3 objetos y responde: ¿cuántos hay en total?"
        )
    if grade == 2:
        return (
            f"Problema de práctica {core}.\n"
            "1) Resuelve: 27 + 15.  "
            "2) Resuelve: 43 − 18 y comprueba con la suma.  "
            "3) Mónica tiene 12 canicas y gana 8 más. ¿Cuántas tiene ahora?"
        )
    if grade == 3:
        return (
            f"Problema de razonamiento {core}.\n"
            "1) Resuelve aplicando la multiplicación: 4 × 6.  "
            "2) Representa 3 × 5 con un dibujo de grupos iguales.  "
            "3) En un salón hay 4 filas con 6 sillas cada una. ¿Cuántas sillas hay?"
        )
    if grade == 4:
        return (
            f"Problema de aplicación {core}.\n"
            "1) Resuelve 34 × 7 y explica la propiedad que usaste.  "
            "2) Estima el resultado de 423 × 6 antes de calcularlo exacto.  "
            "3) Un bus lleva 45 pasajeros y hace 8 viajes. ¿Cuántos pasajeros transporta?"
        )
    if grade == 5:
        return (
            f"Problema de comparación y operaciones {core}.\n"
            "1) Convierte 3/4 a fracción equivalente y compárala con 2/3.  "
            "2) Resuelve 48 × 23 mostrando todo el procedimiento.  "
            "3) Una receta usa 1,5 kg de harina por torta. ¿Cuánto se necesita para 4 tortas?"
        )
    return (
        f"Problema de desafío {core}.\n"
        "1) Calcula qué porcentaje de 200 es 36 y explica el procedimiento.  "
        "2) Resuelve 1/2 ÷ 3/4 y verifica con la multiplicación inversa.  "
        "3) Reparte S/ 120 entre tres personas en la razón 1:2:3 y justifica tu reparto."
    )


def _language(topic: str, grade: int) -> str:
    core = f"sobre «{topic}»"
    if grade == 1:
        return (f"Primeras letras {core}.\n"
                "1) Nombra objetos de tu aula que empiecen con la letra del tema.  "
                "2) Completa la palabra que falta en: 'El ___ es mi amigo'.  "
                "3) Dibuja la escena y escribe la palabra principal.")
    if grade == 2:
        return (f"Lectura guiada {core}.\n"
                "1) Lee el texto una vez y cuenta con tus palabras qué pasa.  "
                "2) Subraya quién es el personaje principal.  "
                "3) Escribe 2 oraciones con una palabra nueva del tema.")
    if grade == 3:
        return (f"Comprensión de lectura {core}.\n"
                "1) Lee el texto y escribe la idea principal.  "
                "2) Responde: ¿qué sucedió primero y qué pasó al final?  "
                "3) Ordena 3 palabras del tema y forma una oración correcta.")
    if grade == 4:
        return (f"Análisis de texto {core}.\n"
                "1) Identifica la idea principal y una idea de apoyo.  "
                "2) Explica la intención del autor con el tema.  "
                "3) Escribe un párrafo de 4 oraciones defendiendo tu opinión.")
    if grade == 5:
        return (f"Textos argumentativos {core}.\n"
                "1) Plantea una postura frente al tema y da dos razones.  "
                "2) Redacta un párrafo argumentativo de 5 oraciones.  "
                "3) Revisa tu texto: usa conectores como 'por lo tanto' y 'además'.")
    return (f"Producción crítica {core}.\n"
            "1) Analiza el tema desde dos puntos de vista distintos.  "
            "2) Redacta una reflexión de 6 a 8 oraciones con estructura clara.  "
            "3) Autoevalúa tu texto: coherencia, vocabulario y ortografía.")


def _science(topic: str, grade: int) -> str:
    core = f"sobre «{topic}»"
    if grade == 1:
        return (f"Observación {core}.\n"
                "1) Observa el objeto o fenómeno del tema.  "
                "2) Describe qué ves usando tus 5 sentidos.  "
                "3) Dibuja lo observado y ponle un nombre.")
    if grade == 2:
        return (f"Explorando {core}.\n"
                "1) Observa y registra 2 características del tema.  "
                "2) Compara con algo parecido que conozcas.  "
                "3) Formula una pregunta que te gustaría investigar.")
    if grade == 3:
        return (f"Experimento guiado {core}.\n"
                "1) Escribe tu hipótesis: '¿qué crees que sucederá?'.  "
                "2) Realiza el procedimiento y anota lo observado.  "
                "3) Concluye si tu hipótesis se cumplió.")
    if grade == 4:
        return (f"Investigación {core}.\n"
                "1) Plantea una pregunta investigable sobre el tema.  "
                "2) Diseña un experimento con variables controladas.  "
                "3) Registra resultados en una tabla y escribe la conclusión.")
    if grade == 5:
        return (f"Método científico {core}.\n"
                "1) Formula hipótesis y predice resultados.  "
                "2) Diseña y ejecuta el experimento, midiendo variables.  "
                "3) Analiza datos y evalúa si la evidencia respalda tu hipótesis.")
    return (f"Proyecto científico {core}.\n"
            "1) Define el problema de investigación y sus variables.  "
            "2) Ejecuta el procedimiento, registra datos cuantitativos.  "
            "3) Elabora conclusiones y propón una nueva pregunta de investigación.")


def _social(topic: str, grade: int) -> str:
    core = f"sobre «{topic}»"
    if grade == 1:
        return (f"Situaciones cotidianas {core}.\n"
                "1) Cuenta una situación del tema que conozcas.  "
                "2) Dibuja el aula, la familia o tu comunidad.  "
                "3) Explica una norma que ayude a convivir mejor.")
    if grade == 2:
        return (f"Mi comunidad {core}.\n"
                "1) Identifica personas o lugares del tema y descríbelos.  "
                "2) Explica por qué son importantes para la convivencia.  "
                "3) Propón una acción que ayude a tu comunidad.")
    if grade == 3:
        return (f"Convivencia {core}.\n"
                "1) Describe el tema y qué leyes o normas lo regulan.  "
                "2) Da un ejemplo real de cumplimiento y otro de incumplimiento.  "
                "3) Propón 2 acuerdos para mejorar la convivencia del aula.")
    if grade == 4:
        return (f"Análisis social {core}.\n"
                "1) Explica el tema con datos de tu entorno.  "
                "2) Compara dos puntos de vista sobre el tema.  "
                "3) Fundamenta tu opinión con un argumento y un ejemplo.")
    if grade == 5:
        return (f"Ciudadanía {core}.\n"
                "1) Relaciona el tema con derechos y deberes ciudadanos.  "
                "2) Analiza una situación real usando el marco del tema.  "
                "3) Redacta una propuesta de mejora justificada.")
    return (f"Debate y propuesta {core}.\n"
            "1) Analiza causas y consecuencias del tema.  "
            "2) Contrasta fuentes o perspectivas diferentes.  "
            "3) Elabora una propuesta argumentada de 6 oraciones.")


def _english(topic: str, grade: int) -> str:
    core = f"about \"{topic}\""
    if grade == 1:
        return (f"Start {core}.\n1) Listen and repeat the key word.  "
                "2) Point to and name 3 objects.  3) Sing or say a short phrase.")
    if grade == 2:
        return (f"Practice {core}.\n1) Complete the sentence: 'This is a ___'.  "
                "2) Match the picture to the word.  3) Ask a classmate a simple question.")
    if grade == 3:
        return (f"Basic communication {core}.\n1) Write 2 sentences about the topic.  "
                "2) Answer questions using 'it is' / 'they are'.  3) Prepare a short dialogue.")
    if grade == 4:
        return (f"Use of English {core}.\n1) Write a 3-sentence paragraph.  "
                "2) Use the present simple correctly.  3) Describe a picture using the topic.")
    if grade == 5:
        return (f"Production {core}.\n1) Write a short text about the topic.  "
                "2) Use past simple and connectives.  3) Present your opinion in English.")
    return (f"Critical task {core}.\n1) Write a structured paragraph (intro, body, conclusion).  "
            "2) Use varied vocabulary and linkers.  3) Summarise the main idea in your own words.")


def _general(topic: str, grade: int) -> str:
    core = f"«{topic}»"
    steps = {
        1: ["Observa el tema y comenta qué reconoce.", "Marca la respuesta con apoyo.",
            "Inventa una pregunta sobre lo aprendido."],
        2: ["Vuelve a leer el tema transcurrido un momento.", "Resuelve la parte central del ejercicio.",
            "Explica con una palabra qué fue lo más fácil."],
        3: ["Lee el tema y destaca las ideas clave.", "Resuelve el ejercicio y comprueba.",
            "Escribe una conclusión de 2 oraciones."],
        4: ["Analiza el tema y completa el ejercicio.", "Explica el procedimiento que usaste.",
            "Relaciona lo aprendido con un ejemplo de tu vida."],
        5: ["Estudia el tema y resuelve el desafío.", "Justifica tu respuesta con una razón.",
            "Propón una variante y resuélvela."],
        6: ["Domina el tema y resuelve la tarea completa.", "Demuestra tu razonamiento en pasos.",
            "Diseña un ejercicio similar para un compañero."],
    }
    pasos = "\n".join(f"{i}) {s}" for i, s in enumerate(steps[grade], 1))
    return f"Actividad adaptada {core}.\n{pasos}"


_AREA_BUILDERS = {
    "matematicas": _math,
    "lenguaje": _language,
    "ciencias": _science,
    "sociales": _social,
    "ingles": _english,
    "general": _general,
}


class HeuristicFallbackProvider(BaseAIProvider):
    name = "heuristic"

    async def adapt_activity(
        self, *, base_content: str, grade: int, subject: str
    ) -> AdaptedActivitySchema:
        grade = max(1, min(6, int(grade)))
        area = _detect_area(subject)
        topic = base_content.strip() or subject.strip()
        content = _AREA_BUILDERS[area](topic, grade)
        label = _GRADE_LABEL[grade]
        return AdaptedActivitySchema(
            title=f"{subject} · {label} grado — {topic[:60]}",
            grade=grade,
            subject=subject,
            content=content,
            instructions=_INSTRUCTIONS[grade],
            difficulty=_DIFFICULTY[grade],
            estimated_minutes=_MINUTES[grade],
            language="es",
            provider=self.name,
            is_fallback=True,
        )