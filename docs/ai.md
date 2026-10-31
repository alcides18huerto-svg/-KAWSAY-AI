# IA en KAWSAY — qué es real y qué no

**El proveedor activo es local y no usa APIs externas.** `AI_PROVIDER=local` por defecto; `disabled` apaga la asistencia sin afectar
login, tareas, sync, progreso ni alertas.

Real y probado: `app/ai_core` (heurísticas deterministas de adaptación y pistas, sin red ni claves), `AIGateway` (puerto `AIProvider`,
reintentos acotados, circuit breaker), `ContextBuilder` (solo grado, área, competencia, tema, objetivo y texto del docente entre
`<docente>…</docente>`; **sin datos de estudiantes**), `OutputValidator` (JSON/esquema, sin URLs, correos ni teléfonos, contenido
inapropiado, complejidad por grado), `CurriculumValidator` (área, competencia, tema y grado declarados deben coincidir; términos del tema
presentes; sin mencionar otras áreas → `NEEDS_REVIEW`), trazabilidad en `ai_generation_requests` (sin contenido).
Todo contenido generado entra como `AI_GENERATED`: **no se aprueba ni se publica sin revisión y aprobación docente** (servicio + CHECK en BD).
Un `NEEDS_REVIEW` exige confirmar las advertencias para aprobar. Si el motor local falla o se desactiva: 503 claro y variantes manuales;
el resto sigue. Tutor: pistas de reglas/docente; el motor local solo reformula y se descarta si filtra la respuesta; no recibe la respuesta
correcta ni texto libre.

La interfaz `AIProvider` permite añadir en el futuro otro adaptador (por ejemplo un modelo local más potente o un proveedor externo) sin
cambiar los servicios de dominio. Las pruebas usan `tests/fakes.py` (proveedores falsos exclusivos de pruebas). No se afirma calidad
pedagógica de las propuestas: hay que evaluarlas con docentes antes de usarlas.
