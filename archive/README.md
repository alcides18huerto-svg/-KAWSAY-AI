# Archivo de módulos fuera del núcleo

Estos módulos se conservan por trazabilidad, pero **no forman parte del producto
de tres paneles** (Administrador, Docente, Estudiante) ni del despliegue en Render.

| Módulo | Motivo del archivo | Recuperación |
|---|---|---|
| `mobile/` | Cliente Flutter duplicaba el panel de Estudiante. El panel web ya cubre ese rol. | Mover de vuelta a la raíz si se retoma la app móvil. |
| `automation/` | Workflow n8n experimental. El backend mantiene su módulo de eventos/outbox; solo se archiva el workflow externo. | Importar el JSON en n8n y reactivar `AUTOMATION_WEBHOOK_*`. |
| `infrastructure/` | Notas de infraestructura ya cubiertas por `docs/17-deployment.md` y los Dockerfiles. | Documentación histórica. |
| `database/` | Nota breve sobre SQLite; el diseño vigente está en `docs/06-database-design.md`. | Documentación histórica. |

Nada de este directorio se compila, se prueba en CI ni se copia a la imagen de
Render. Para reactivar un módulo, muévelo de nuevo a la raíz y restaura su job de
CI correspondiente.
