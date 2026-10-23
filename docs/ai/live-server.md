# Ejecución local verificada con PostgreSQL

Esta comprobación posterior actualiza el bloqueo inicial de Docker/PostgreSQL descrito en
`verification.md`. Se ejecutó el backend real por HTTP, no mediante TestClient ni overrides.

## Servicios en ejecución

- FastAPI/Uvicorn: `http://127.0.0.1:8000`.
- Swagger: `http://127.0.0.1:8000/docs`.
- PostgreSQL 16: contenedor `kawsay_postgres`, servicio postgres del compose existente, healthy.
- Migración aplicada: `0001_initial (head)`.
- Entorno: development. No se modificó Render, URLs ni credenciales configuradas.

Docker Desktop estaba detenido; se inició la instalación existente y luego:

```sh
# Desde backend/
docker compose --progress quiet up -d postgres --wait
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

La primera descarga de PostgreSQL agotó el tiempo del comando; el reintento terminó correctamente.
Uvicorn se dejó ejecutándose en segundo plano en el entorno Python aislado de la sesión.

## Bloqueos reales corregidos

1. `backend/migrations/versions/0001_initial.py`: docstring inicial con comillas incorrectas causaba
   SyntaxError incluso al ejecutar `alembic heads`. Se corrigieron exclusivamente las comillas,
   sin cambiar operaciones de esquema ni el identificador de revisión.
2. `backend/requirements.txt`: Passlib 1.7.4 resolvía bcrypt 5.0.0, que fallaba durante su prueba
   interna de backend e impedía el hashing de cualquier contraseña. Se fijó bcrypt 4.0.1,
   compatible con la integración existente, y se reinició Uvicorn.
3. `backend/tests/test_runtime_prerequisites.py`: regresiones para hashing/verificación real de
   contraseñas y carga de historial Alembic. Las pruebas anteriores no ejecutaban estos caminos.

## Resultados de HTTP real

Se creó una cuenta docente técnica temporal con contraseña aleatoria en memoria y se inició sesión
por `/api/v1/auth/login`. El token no se imprimió ni se guardó. La cuenta se eliminó al terminar.

| Comprobación | Resultado |
| --- | --- |
| GET `/health` | 200, status ok |
| GET `/ready` | 200, status ready, database ok |
| GET `/docs` | 200 |
| GET `/api/v1/ai/status` sin token | 401 |
| POST `/api/v1/auth/register` docente técnico | Correcto |
| POST `/api/v1/auth/login` | JWT obtenido correctamente |
| GET `/api/v1/ai/status` con JWT | available; offline_inference true |
| GET `/api/v1/ai/models` con JWT | Release y checksum correctos |
| POST `/api/v1/ai/classify` con JWT | trained_ml, versión activa, abstención por baja confianza |

Entrada técnica: `Compara dos formas de repartir semillas y explica tu estrategia`, grado 3,
área Matemática. Resultado: confianza no calibrada `0.5636672081090831`, `difficulty=null`,
`abstained=true`, `teacher_review_required=true`.

Versión: `difficulty-v1-2be2a78c56b6`.
SHA-256: `e077f57a18f5ae31e3ba4d6db728ec99ee19f7186c73abac898925e0bdb014d2`.
El origen del modelo sigue siendo sintético; arrancar el servidor no cambia su validación pedagógica.

## Verificación posterior a las correcciones

- `python -m pytest -q`: **41 passed, 50 warnings in 12.57s**.
- `python -m pip check`: No broken requirements found.
- `python -m ruff check tests/test_runtime_prerequisites.py`: All checks passed.
- `python -m alembic current`: `0001_initial (head)` sobre PostgreSQL real.

La suite automatizada conserva SQLite in-memory para integración aislada; las comprobaciones HTTP
anteriores sí usaron el PostgreSQL real. El archivo `test-results.xml` conserva la ejecución inicial
de 39 pruebas; este documento registra la ejecución posterior con las dos regresiones adicionales.

El backend se dejó enlazado a loopback (127.0.0.1). Este resultado corresponde a ejecución local,
no a un despliegue remoto ni a un build del backend dentro de Docker. Flutter y Render permanecen
fuera de esta comprobación.
