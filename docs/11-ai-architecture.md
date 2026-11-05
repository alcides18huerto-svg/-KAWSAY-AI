# 11 · Arquitectura de IA

```
Route → Service (dominio) → AIGateway(port) → Provider adapter (local | futuro)
```
- Fase actual: **solo motor local** (`backend/app/ai_core`), sin red, sin claves y sin APIs de pago. El frontend nunca habla con proveedores.
- `AIProvider` (interfaz): `generate(request) -> response`, con timeouts, reintentos limitados, circuit breaker y presupuesto/cuotas por docente.
- Para escalar a otro modelo se implementa un nuevo `AIProvider` y se selecciona por configuración; los servicios de dominio no cambian.
- `ContextBuilder` arma el contexto **minimizado** (grado, competencia, objetivo, idioma; **sin nombres ni datos personales** del estudiante).
- `OutputValidator`: valida esquema JSON, longitud, vocabulario por grado, temas prohibidos, que mantenga competencia/objetivo y respuestas verificables. Si falla → reintento acotado → si persiste, estado `failed` y el docente edita manualmente.
- Todo resultado entra como `draft`; **nunca** se publica sin aprobación docente.
- Trazabilidad: `ai_generation_requests` (modelo, versión de prompt, hash, latencia, estado, costo estimado).
- Prompts versionados en `ai/` con tests de contrato (golden tests con proveedor falso, solo en tests).

## Componentes (`ai/`)
`GradeAdapter`, `DifficultyAdapter`, `TutorService`, `ContextBuilder`, `LearningAnalyzer`, `PatternDetector`, `RecommendationEngine`, `MotivationEngine`, `OutputValidator`.
Separación importante: **PatternDetector, RecommendationEngine básico y MotivationEngine son deterministas** (reglas); el LLM solo redacta/adapta contenido o explicaciones.

## Degradación
Proveedor caído → `adapt` devuelve 503 con mensaje claro y opción de variante manual; el resto del sistema no se entera.

## Idiomas
No se genera quechua/aimara con IA para publicar al estudiante salvo estado `verified` por revisor humano. La IA puede producir **borradores** marcados `draft`.

## Seguridad IA
Mitigación de prompt injection (el contenido docente se trata como datos, no instrucciones), filtrado de salida, límites de tasa, sin logs de contenido sensible.
