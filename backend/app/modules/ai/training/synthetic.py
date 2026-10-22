"""Explicit technical fixture, authored for this project. No real student records."""
import argparse
import csv
from pathlib import Path

TASKS = {
    "BASIC": [
        "Cuenta las semillas de una mazorca y escribe el número observado",
        "Identifica el personaje principal de un cuento sobre la comunidad",
        "Nombra tres animales que observas cerca de la escuela",
        "Reconoce el círculo entre las figuras dibujadas en tu cuaderno",
        "Señala la palabra que empieza con la misma letra que papa",
        "Enumera los objetos que hay sobre la mesa del aula",
        "Copia una oración breve sobre el río de tu comunidad",
        "Dibuja una planta y nombra sus partes visibles",
        "Ordena de menor a mayor los números de las tarjetas",
        "Describe el color y la forma de una hoja del huerto",
        "Lee en voz alta una frase breve sobre la cosecha",
        "Ubica arriba y abajo los objetos de una imagen",
        "Relaciona cada dibujo de un animal con su nombre",
        "Completa una serie sencilla de números consecutivos",
        "Suma dos cantidades pequeñas usando piedras como apoyo",
    ],
    "INTERMEDIATE": [
        "Compara dos formas de regar el huerto y explica sus diferencias",
        "Resuelve un problema de reparto de semillas mostrando tu procedimiento",
        "Resume las ideas principales de una lectura sobre la cosecha",
        "Organiza los datos de lluvia en una tabla y explica el resultado",
        "Relaciona la alimentación de los animales con su hábitat y explica",
        "Calcula el perímetro del huerto y representa los pasos realizados",
        "Explica por qué una planta necesita luz usando un ejemplo observado",
        "Escribe un párrafo con conectores para explicar una costumbre local",
        "Interpreta un gráfico de producción de papa y compara cantidades",
        "Clasifica residuos según sus propiedades y explica el criterio usado",
        "Aplica la multiplicación para calcular cajas y explica tu estrategia",
        "Deduce la intención de un personaje usando pistas de una lectura",
        "Compara fracciones mediante dibujos y explica cuál representa más",
        "Describe causas y consecuencias del desperdicio de agua en la escuela",
        "Ordena las etapas del ciclo del agua y explica su relación",
    ],
    "ADVANCED": [
        "Evalúa dos propuestas para conservar el agua y justifica con evidencias sus limitaciones",
        "Diseña una investigación sobre erosión controlando variables y fundamenta tus conclusiones",
        "Argumenta una postura sobre el uso de fertilizantes contrastando fuentes y contraargumentos",
        "Formula un modelo para distribuir recursos escasos y justifica sus supuestos",
        "Contrasta interpretaciones de un relato y sustenta tu juicio crítico con evidencias",
        "Propón una solución al desperdicio de alimentos evaluando costos y consecuencias",
        "Analiza datos de cosechas y evalúa hipótesis alternativas justificando tu elección",
        "Diseña un experimento de germinación y discute las limitaciones de la evidencia",
        "Demuestra dos estrategias para un problema de proporcionalidad y evalúa su eficiencia",
        "Elabora una propuesta argumentada de convivencia considerando perspectivas contradictorias",
        "Evalúa la fiabilidad de dos fuentes sobre contaminación y fundamenta una conclusión",
        "Generaliza un patrón numérico y demuestra cuándo se cumple mediante contraejemplos",
        "Construye un argumento sobre biodiversidad y revisa objeciones con datos contrastados",
        "Diseña un plan de prevención de inundaciones justificando prioridades e incertidumbres",
        "Investiga relaciones entre clima y producción y distingue correlación de causalidad",
    ],
}


def create_fixture(path: Path):
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["text", "label", "family_id", "origin", "source"])
        writer.writeheader()
        for label, tasks in TASKS.items():
            for i, text in enumerate(tasks):
                writer.writerow({"text": text, "label": label, "family_id": f"{label.lower()}-{i:02}",
                                 "origin": "synthetic", "source": "KAWSAY technical fixture v1; no pedagogical approval"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    create_fixture(parser.parse_args().output)
