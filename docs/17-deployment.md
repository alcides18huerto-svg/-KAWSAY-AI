# 17 · Despliegue

## En tu computadora (VS Code) — lo recomendado
Ver `docs/GUIA_VSCODE.md`. Resumen: `python scripts/dev.py setup` → `python scripts/dev.py demo` → `python scripts/dev.py web`.

## Con Docker (opcional, no verificado en el entorno de desarrollo)
`cp .env.example .env` (define `JWT_SECRET`) → `docker compose up --build`. La base vive en el volumen `kawsay_data`.
Panel en `http://127.0.0.1:8080` (nginx con CSP, proxy `/api` al backend). `--profile automation` añade el despachador de eventos.

## Render (Docker, listo para demo)
1. Sube el repositorio a GitHub y en Render crea un **Web Service** con runtime **Docker**, `dockerfilePath=./render.Dockerfile` y `dockerContext=.`.
2. Define `JWT_SECRET` como secreto (32+ caracteres) y `APP_ENV=production`; `AI_PROVIDER=local` no necesita claves.
3. `render.yaml` ya declara `healthCheckPath=/health`, `DATABASE_URL=sqlite:////srv/data/kawsay.db` y `CORS_ORIGINS` vacío (mismo origen).
4. El contenedor escucha en `$PORT` (Render lo inyecta; por defecto 10000) y ejecuta `alembic upgrade head` antes de Uvicorn.
5. **Limitación de Render Free:** el disco es efímero; la base SQLite se pierde en cada redeploy. Para datos reales usa un disco persistente o PostgreSQL (ADR-010).

## Producción (propuesta mínima para un piloto)
1. Un solo servidor (SQLite: **un único proceso de backend**, sin réplicas) detrás de un proxy con HTTPS.
2. `APP_ENV=production`, `JWT_SECRET` aleatorio, `CORS_ORIGINS` exacto, sin `/docs`.
3. Cifrado de disco del volumen de datos; permisos de `data/` solo para el usuario del servicio.
4. Respaldos programados (`python -m app.cli backup`) a un destino cifrado y **prueba de restauración**; `python -m app.cli check-db`.
5. Monitoreo de `/health` y `/ready`, logs JSON centralizados, rotación de logs.
6. Cambiar las credenciales DEMO o partir de una base vacía (`python scripts/dev.py admin`).
7. Plan de migración a PostgreSQL si se supera el piloto (ver ADR-010).
