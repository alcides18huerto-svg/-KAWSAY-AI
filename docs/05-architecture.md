# 05 · Arquitectura

## Estilo
**Monolito modular** (FastAPI) + un único panel web con tres roles. Sin microservicios hasta que haya necesidad medida.

```
Panel web (React/TS)
  Administrador
  Docente          ── HTTPS /api/v1 ──► FastAPI
  Estudiante                              ├ auth + RBAC (3 roles)
                                          ├ education (curriculum, activities, assignments)
                                          ├ learning + adaptive engine (reglas)
                                          ├ analytics (progreso, flags, recomendaciones)
                                          ├ sync
                                          └ ai_gateway ──► ai_core (local, sin red)
                                          SQLite (archivo, WAL) ── respaldos
```

## Reglas de dependencia
- `route → service → repository → DB`. Reglas pedagógicas en `service`/`domain`, nunca en rutas.
- Módulos se comunican por interfaces de servicio, no por tablas ajenas.
- `ai_gateway` es un puerto (`AIProvider`) con adaptadores; el dominio no importa SDKs de proveedores.
  El adaptador activo es `app/ai_core` (heurísticas locales). Añadir otro modelo no cambia los servicios.
- React: `pages / components / features / services / hooks / types / utils`, TypeScript `strict`.

## Motor adaptativo y analítica
Paquete de dominio puro (sin I/O) con reglas versionadas en configuración. Se ejecuta en el backend al recibir intentos (síncrono en MVP; cola/worker cuando haya carga) y una **versión ligera de reglas** corre en el cliente para pistas/dificultad offline.

## Flujo de automatización (en backend, sin n8n)
intento recibido → validación/idempotencia → persistir → recalcular progreso de competencia → evaluar reglas → (support_flag) → recomendación → visible al docente.

## Repositorio
```
KAWSAY-AI/
├── backend/
│   ├── app/{ai_core,core,domain,modules/*,shared,workers}
│   ├── migrations/  tests/  Dockerfile  requirements.txt
├── teacher-web/{src/{app,pages,components,services,hooks,types,utils},Dockerfile}
├── ml/          (entrenamiento e inferencia experimental, local)
├── scripts/     (dev.py, demo_e2e.py, generadores)
├── shared/      (vectores de reglas)
├── docs/
├── archive/     (Flutter, n8n y notas fuera del núcleo; no se despliega)
├── docker-compose.yml  .env.example  .gitignore  README.md
```
Nota: `ai_core` se empaqueta como librería Python importada por el backend (no servicio aparte) hasta que se necesite escalar.

## Docker (Fase 1)
`backend` + `teacher-web` (+ `dispatcher` opcional). La base es un archivo SQLite en un volumen. Redis y almacenamiento de objetos: no se usan.
