# Archivo de configuración para Render (Python nativo)
# Documenta los valores exactos que debes poner en el panel de Render.
#
# ── Settings del servicio web (KAWSAY-AI) ─────────────────────────
#   Language / Runtime :  Python 3  (NO Docker)
#   Root Directory     :  backend
#   Build Command      :  pip install -r requirements.txt
#   Start Command      :  uvicorn app.main:app --host 0.0.0.0 --port $PORT
#   Health Check Path  :  /health        (existe en app/main.py; también hay /ready)
#
# ── Variables de entorno (Environment) ────────────────────────────
#   APP_ENV       = production
#   DATABASE_URL  = postgresql+psycopg://usuario:password@host:5432/kawsay
#                   (usa la "Internal Database URL" de tu PostgreSQL de Render si
#                    ambos servicios están en la misma región; también acepta la
#                    External URL. SQLite no está soportado)
#   JWT_SECRET    = (cadena larga aleatoria, NO el valor de desarrollo)
#   CORS_ORIGINS  = https://tu-teacher.onrender.com,https://tu-admin.onrender.com
#   AI_PROVIDER   = mock          (o openai si configuras AI_API_KEY)
#   PYTHON_VERSION= 3.11.11       (en Build & Deploy > Advanced)
#
# ── Notas importantes ─────────────────────────────────────────────
# 1. El proyecto es FastAPI + Uvicorn, NO Flask. Por eso el comando de
#    arranque es "uvicorn app.main:app" y NO "gunicorn app:app".
# 2. Las migraciones (`alembic upgrade head`) se ejecutan al iniciar Uvicorn,
#    no en el build: en el build la base de datos aún puede no estar accesible.
#    El arranque reintenta la conexión y falla con un mensaje si DATABASE_URL
#    no apunta a PostgreSQL.
#    requirements.txt ya existe en backend/ — no agregues flask/gunicorn.
# 3. Si antes Render detectó "Docker", fue porque backend/Dockerfile existe.
#    Al cambiar Runtime a Python y Root Directory a "backend", se ignora.
# 4. Tras guardar cambios: Events → "Manual Deploy" →
#    "Clear build cache & deploy".
