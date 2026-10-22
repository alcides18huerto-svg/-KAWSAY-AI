# PR preparado: entrenamiento e inferencia offline de IA

Base: `main` · Head: `feature/entrenamiento-ia`.

## Resumen

- Pipeline CSV/JSON reproducible, TF-IDF + comparación LR/NB, métricas y baseline con test reservado.
- Release JSON versionado de 20.560 bytes, metadatos y checksum; inferencia Python sin red ni pickle.
- Endpoints IA autenticados y acotados; gateway existente con trazabilidad, validación y revisión docente.
- Recomendaciones transparentes sobre historial real y guía de tutor sobre actividades aprobadas.
- Corrección docente, conflictos de sincronización y primer intento inmediato corregidos.
- 39 tests backend pasan; Ruff del módulo IA sin errores; documentación de operación y Flutter.

## Evidencia

Ver [verification.md](verification.md) y [test-results.xml](test-results.xml).
Test sintético: accuracy 0,667; F1 macro 0,656; baseline accuracy 0,333.
Abstención 9/9 con umbral 0,65. Sin datos reales autorizados, calibración ni validación pedagógica.

## Revisión necesaria

- Validar con docentes etiquetas, corpus autorizado y umbrales antes de uso educativo.
- Ejecutar integración PostgreSQL, build Docker Linux y comprobaciones Flutter/Android.
- UI contextual de tutor/recomendaciones y segregación de caché/colas entre cuentas móviles pendientes.
- El modelo sintético queda identificado y no gobierna ajustes automáticos del nivel del alumno.

## Git y publicación

Trabajo local exclusivo en `feature/entrenamiento-ia`; estado inicial limpio.
`gh auth status`: sin autenticación. No se puede crear PR remoto con gh en este estado.
Commit de implementación: `e3439ff` — Implementar entrenamiento e inferencia offline de IA.
Se revisó el diff respecto de `main`, que inicialmente apuntaba al mismo commit de base.
Se intentó `git push -u origin feature/entrenamiento-ia` sin interacción y GitHub respondió
`No anonymous write access` / `Authentication failed`. La rama no se publicó y no se creó PR remoto.
No se cambiaron credenciales ni configuración Git para sortear ese bloqueo.
Este archivo contiene el cuerpo listo para publicar al disponer de acceso:

```sh
git push -u origin feature/entrenamiento-ia
gh pr create --base main --head feature/entrenamiento-ia --title "Implementar entrenamiento e inferencia offline de IA" --body-file docs/ai/pull-request.md
```

No hacer merge automático.
