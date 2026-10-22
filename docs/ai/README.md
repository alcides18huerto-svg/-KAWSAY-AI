# Módulo IA de KAWSAY-AI

## Alcance implementado

- Pipeline interno CSV/JSON → validación → limpieza → partición agrupada 60/20/20 →
  comparación de TF-IDF + regresión logística y Multinomial Naive Bayes → reporte → release JSON.
- Inferencia local Python sin red, sin sklearn en tiempo de inferencia y sin deserialización ejecutable.
- Clasificación con versión, hash de entrada normalizada, origen de datos, probabilidad **no calibrada**,
  abstención y revisión docente obligatoria.
- Gateway existente conservado: diferencia `trained_ml`, proveedor `openai` y fallback `heuristic`.
  El resultado del clasificador es independiente de la dificultad heurística/generativa.
  Solo un modelo de origen autorizado, sin abstención, determina el andamiaje adicional.
  El fixture sintético nunca modifica automáticamente la estrategia ni el nivel del estudiante.
- Recomendaciones sobre historial real y actividades aprobadas accesibles al estudiante.
- Tutor offline limitado a orientación sobre una actividad aprobada; no se presenta como LLM.
- Corrección docente de variantes con nueva aprobación obligatoria antes de publicar.

La preparación técnica **no constituye validación pedagógica ni autorización de uso con menores**.

## Auditoría de arquitectura

Estado inicial: rama `feature/entrenamiento-ia`, árbol limpio. No existe AGENTS.md.

| Componente | Ubicación/contrato encontrado | Decisión |
| --- | --- | --- |
| Backend | `backend/app/main.py`, `api.py`, `models.py`, `schemas.py` | Routers existentes preservados; router IA adicional |
| Identidad y roles | `core/security.py`, `modules/auth`, JWT y `require_roles` | Reutilizar sin cambiar credenciales |
| Currículo | `Subject`, `Competency`, seeds SQL de materias/competencias | Referencias de contexto; no son ejercicios etiquetados |
| Actividades | Assignment/Grade/Variant, estados DRAFT/REVIEW/PUBLISHED y PENDING/APPROVED | Mantener circuito docente; añadir PATCH de corrección |
| IA | `modules/ai/service.py`, gateway base, OpenAI y fallback | Extender, sin segundo gateway |
| Tutor | `service.tutor_reply`, `/tutor/message` | Sustituir respuesta fija por guía limitada de contenido aprobado |
| Historial | LearningAttempt; progreso agregado por área/General | Consultar intentos reales, no inventar competencias |
| Sync | `/sync/push`, UUID por evento; cliente SQLite/cola de 50 | Detectar conflictos y propiedad del UUID |
| Web | teacher/admin React/TS, cliente HTTP y flujo de variantes | Campos y URLs previos compatibles, nuevos campos aditivos |
| Móvil | `mobile-app/student-app/lib`, SQLite y SyncEngine | Mantener actividades offline; arquitectura Python en servidor local |
| Operación | Docker Python 3.12, Render, CI backend pytest | Incluir artefacto en COPY; no entrenamiento en arranque |

Muchos directorios de features backend contienen únicamente `__init__.py`; los contratos efectivos
siguen centralizados en `api.py` y `models.py`. No se duplicaron esos modelos ni se añadieron migraciones.
No se encontró dataset real etiquetado con autorización verificable. Los archivos `fake_*` y seeds
curriculares no se usaron para entrenar. El fixture incluye 45 tareas sintéticas, 15 por clase,
en español y contexto rural peruano orientativo, sin aprobación MINEDU/UGEL.

### Defectos de integración corregidos

1. Sync confirmaba cualquier UUID existente, incluso con otro propietario o contenido.
   Ahora rechaza conflictos; una infracción de integridad no se confirma como duplicado.
2. `/learning/attempts` tenía el mismo problema y sumaba sobre contadores SQLAlchemy aún `None`
   en el primer intento. Se inicializan los contadores y se devuelve 409 ante conflicto.
3. `SyncService` Flutter utilizaba `ConflictAlgorithm` sin importar sqflite. Se añadió el import.
   Esta corrección fue revisada estáticamente; no se pudo compilar Flutter en este equipo.

Estas modificaciones fuera de IA son necesarias para el historial y el flujo offline que consume
el recomendador. No hay cambios en secretos, URLs de producción, base de datos ni Render.

## API

Prefijo existente `/api/v1`; autenticación Bearer JWT del backend.

| Ruta | Roles | Comportamiento |
| --- | --- | --- |
| GET `/ai/status` | Usuario autenticado | Estado, versión activa, modo del tutor; degrada sin impedir arranque |
| GET `/ai/models` | TEACHER, ADMIN | Release activo disponible, algoritmo, checksum, origen |
| POST `/ai/classify` | TEACHER, ADMIN | `{text, grade?, subject?}`; texto 5–12000; 503 sin artefacto válido |
| GET `/ai/recommendations?student_id=...&limit=5` | STUDENT propio; TEACHER de su aula; ADMIN | Hasta 10 sugerencias, reglas y evidencia sin respuestas privadas |
| POST `/tutor/message` | STUDENT | Contrato previo + `assignment_id?`, `hint_level` 0–2 |
| PATCH `/teacher/assignments/{id}/variants/{variant_id}` | TEACHER propietario | `{content}`; vuelve a PENDING/DRAFT |

Ejemplo de clasificación:

```json
{"text":"Compara dos maneras de distribuir semillas y explica tu estrategia","grade":3,"subject":"Matemática"}
```

`difficulty` usa BASIC/INTERMEDIATE/ADVANCED por compatibilidad con el gateway
(Básico/Intermedio/Avanzado). Es `null` si hay abstención. `confidence` es una probabilidad del
clasificador, no certeza pedagógica. Umbral técnico fijo 0,65 y cobertura mínima de vocabulario 0,30.
`teacher_review_required=true` incluso si no hay abstención. Los hashes no anonimizan por sí solos
textos predecibles: tampoco se registran esos hashes en logs del servicio.

El POST existente de generación devuelve además proveedor, clasificación y estrategia. Una variante
ya almacenada se reutiliza y su actividad base se reclasifica con el modelo activo; ese dato describe
la **evaluación actual**, no reconstruye una ejecución histórica de generación. `generated_by` conserva
el proveedor original. No hay registro histórico persistente de predicciones en esta versión.

## Recomendaciones y tutor: capacidades y límites

Reglas `pedagogical_rules_v1`: hasta 500 intentos recientes y 100 candidatos publicados/aprobados
del grado y aulas del estudiante. Prioriza tareas no recientes/no realizadas y áreas a reforzar.
Exactitud <0,50 o media de pistas ≥2 → BASIC; ≥5 intentos, exactitud ≥0,85 y pistas <1 → ADVANCED;
resto INTERMEDIATE. Refuerzo si exactitud <0,65. Sin historial propone exploración de tareas aprobadas.
No se modifica una asignación ni se publica contenido automáticamente. El docente puede elegir otra
actividad. No hay modelo de recomendación entrenado.

El esquema actual no enlaza intentos con competencias, no tiene duración esperada confiable ni
etiquetas históricas de dificultad. Se informa esa ausencia; el tiempo se resume, no se interpreta
como déficit. `is_correct` proviene del cliente: no es una calificación validada. El ajuste fino
gradual por dificultad previa/competencia requiere esas señales y validación docente posteriores.

El tutor selecciona un fragmento de una actividad publicada/aprobada accesible al estudiante y guía
con preguntas y representación mediante objetos/dibujos. `hint_level` controla tres pasos; no mantiene
memoria de conversaciones ni pretende conocer respuestas. Sin `assignment_id` informa que no dispone
de contenido aprobado. No explica conceptos fuera de ese contenido, no resuelve problemas ni usa APIs
externas; puede remitir al docente. El cliente móvil actual debe adoptar los campos opcionales para
mostrar esa guía contextual (ver [Flutter](flutter.md)).

## Seguridad y privacidad

- Entrenar/publicar solo por CLI interno; no hay endpoints de ejecución ni carga de modelos.
- JSON numérico con límites de tamaño, dimensiones, valores finitos, algoritmo y versión; checksum
  antes de usar parámetros. La integridad no sustituye autenticidad: repositorio/release de confianza.
- Esquema de entrenamiento allowlist; rechaza columnas personales y patrones evidentes de
  correo/identificadores largos. Requiere revisión humana de nombres, procedencia y derechos.
- Nunca usar respuestas de alumnos, nombres, DNI o correos como features. Solo texto del ejercicio;
  campos curriculares opcionales se conservan pero aún no son features por falta de evidencia.
- El gateway evita enviar identificadores evidentes al proveedor, usa timeouts, limita tokens y
  valida estructura, contexto, markup ejecutable, enlaces y patrones de riesgo/PII en respuestas.
  Son filtros conservadores, no garantía de seguridad semántica; revisión docente obligatoria.
- Logs IA: método, versión y abstención; errores del proveedor sin cuerpo ni credenciales.
- Retención recomendada para datasets autorizados: fijar plazo y responsable antes de importar,
  guardar fuera de Git en almacenamiento controlado, eliminar copias temporales al cerrar la
  validación y retirar datasets/modelos derivados ante revocación de autorización. Conservar únicamente
  hash, autorización y métricas que el responsable permita. No se introduce una política automática
  de borrado sobre datos educativos existentes: debe aprobarla el titular de esos datos.

## Registro de archivos

- `backend/app/modules/ai/training/{dataset,preprocessing,train,evaluate,metrics,validate_data,synthetic}.py`:
  pipeline, CLI, comparación, evaluación y fixture reproducible; `__init__.py` del paquete.
- `backend/app/modules/ai/data/{README.md,synthetic.csv}`: procedencia y datos técnicos.
- `backend/app/modules/ai/models/`: active.json y release con model.json, metadata.json, evaluation.json.
  `.gitattributes` conserva LF para checksums idénticos en Windows/Linux.
- `backend/app/modules/ai/{inference,recommendations,routes,content_validation}.py`: runtime y endpoints.
- `backend/app/modules/ai/{schemas,service}.py` y `gateway/providers/openai_provider.py`: contratos,
  trazabilidad, scaffolding, privacidad y validación del proveedor.
- `backend/app/modules/ai/tests/test_*.py`: datos, fuga, entrenamiento, evaluación, offline, permisos,
  tutor, variantes, intentos y sincronización.
- `backend/app/{main,api,schemas}.py`: registrar router y conectar flujos existentes.
- `backend/app/modules/sync/{routes,schemas}.py`: conflictos y entradas acotadas.
- `backend/requirements.txt`: dependencias ML versionadas; el entorno de inferencia no las importa.
- `mobile-app/student-app/lib/core/sync/sync_service.dart`: import faltante de sqflite.
- `docs/ai/`: auditoría, operación, Flutter, evidencia y texto de PR.

## Pendientes explícitos

Datos autorizados y etiquetas revisadas por docentes; calibración y análisis por grado/área;
validación pedagógica externa; relación intento–competencia, corrección verificada e intervenciones
persistidas; explicaciones de conceptos mediante biblioteca aprobada; UI de tutor contextual;
historial persistente de inferencias; pruebas PostgreSQL real, contenedor Linux y dispositivos Android.
Estas capacidades no se declaran completadas. Ver [verificación](verification.md).
