# 17 · Despliegue

## En tu computadora (VS Code) — lo recomendado
Ver `docs/GUIA_VSCODE.md`. Resumen: `python scripts/dev.py setup` → `python scripts/dev.py demo` → `python scripts/dev.py web`.

## Con Docker (opcional, no verificado en el entorno de desarrollo)
`cp .env.example .env` (define `JWT_SECRET`) → `docker compose up --build`. La base vive en el volumen `kawsay_data`.
Panel en `http://127.0.0.1:8080` (nginx con CSP, proxy `/api` al backend). `--profile automation` añade el despachador de eventos.

## Render (Docker, listo para demo)
1. Sube el repositorio a GitHub y en Render crea un **Web Service** con runtime **Docker**, `dockerfilePath=./render.Dockerfile` y `dockerContext=.` (o usa el Blueprint `render.yaml`).
2. Define `JWT_SECRET` como secreto (32+ caracteres) y `APP_ENV=production`; `AI_PROVIDER=local` no necesita claves.
3. `render.yaml` ya declara `healthCheckPath=/health`, `DATABASE_URL=sqlite:////srv/data/kawsay.db`, `CORS_ORIGINS` vacío (mismo origen) y las variables DEMO.
4. El contenedor escucha en `$PORT` (Render lo inyecta; por defecto 10000). Al iniciar la aplicación se ejecuta `alembic upgrade head` (con `APP_ENV=production`), se crean/actualizan las cuentas DEMO y, cuando `/ready` responde, se carga el flujo completo con `scripts/demo_e2e.py`: escuela, docente, marco curricular, plan ACTIVO, aula multigrado, estudiantes, tarea publicada, intentos y alerta.
   - Si el servicio tiene un **Docker Command** personalizado en Render, debe quedar vacío o ser `sh start.sh`; un comando manual como `uvicorn app.main:app` también funciona porque las migraciones y la carga inicial viven en el arranque de FastAPI.
5. Accesos DEMO: administrador `admin@demo.pe` / `Kawsay-Demo-Local-2026`; docente `maestra@demo.pe` / `Aula-Multigrado-2026!`; estudiantes con la pestaña **Estudiante → Código y PIN**. Los códigos y PIN se imprimen en los logs de Render en cada arranque.
6. Para arrancar sin cargar datos, define `KAWSAY_DEMO_SEED=0`. Para desactivar las migraciones automáticas (no recomendado), define `KAWSAY_AUTO_MIGRATE=0`.
7. **Limitación de Render Free:** el disco es efímero; la base SQLite se pierde en cada redeploy. Para datos reales usa un disco persistente o PostgreSQL (ADR-010).
8. Si el login devuelve `no such table: users`, revisa que el deploy haya terminado y que no exista un **Docker Command** antiguo en Render; luego usa **Manual Deploy → Clear build cache & deploy**. Los logs deben mostrar `Migraciones Alembic aplicadas` y `KAWSAY DEMO: datos ficticios cargados`.

## Producción (propuesta mínima para un piloto)
1. Un solo servidor (SQLite: **un único proceso de backend**, sin réplicas) detrás de un proxy con HTTPS.
2. `APP_ENV=production`, `JWT_SECRET` aleatorio, `CORS_ORIGINS` exacto, sin `/docs`.
3. Cifrado de disco del volumen de datos; permisos de `data/` solo para el usuario del servicio.
4. Respaldos programados (`python -m app.cli backup`) a un destino cifrado y **prueba de restauración**; `python -m app.cli check-db`.
5. Monitoreo de `/health` y `/ready`, logs JSON centralizados, rotación de logs.
6. Cambiar las credenciales DEMO o partir de una base vacía (`python scripts/dev.py admin`).
7. Plan de migración a PostgreSQL si se supera el piloto (ver ADR-010).
