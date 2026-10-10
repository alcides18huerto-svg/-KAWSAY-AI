# KAWSAY AI — Guía de Setup (00)

Guía estricta y ordenada para levantar el entorno de desarrollo local:
**Backend** (FastAPI + PostgreSQL 16 vía Docker), **Web** (Teacher-Web y Admin-Web, Vite/React) y **Mobile** (Student-App, Flutter).

> Los scripts de instalación (`setup.sh` / `setup.ps1`) son **fail-fast**: validan
> herramientas, versiones y puertos y se detienen ante el primer error. No dejan
> instalaciones a medias.

---

## 1. Prerrequisitos y versiones fijas

| Herramienta      | Versión              | Uso                                    |
| ---------------- | -------------------- | -------------------------------------- |
| Docker           | Engine + Compose v2  | PostgreSQL 16 + pgAdmin                |
| PostgreSQL       | 16 (imagen `postgres:16`) | Base de datos central (`kawsay`)   |
| Python           | >= 3.11              | Backend FastAPI                        |
| Node.js          | >= 20 LTS            | Web (Vite/React) + npm                 |
| npm              | (con Node)           | Dependencias de Web                    |
| Flutter SDK      | 3.x stable           | App de estudiante (offline-first)      |

Dependencias de backend ya versionadas en `requirements.txt` (fastapi 0.115.6, sqlalchemy 2.0.36, alembic 1.14.0, etc.).

**Puertos usados por el entorno local**

| Puerto | Servicio      | Notas                                  |
| ------ | ------------- | -------------------------------------- |
| 8000   | Backend API   | `/api/v1/*`                            |
| 5432   | PostgreSQL 16 | contenedor `kawsay_postgres`           |
| 5050   | pgAdmin       | opcional (admin@kawsay.local / kawsay) |
| 5173   | Teacher-Web   | Vite dev server                        |
| 5174   | Admin-Web     | Vite dev server                        |

> Nota: Teacher-Web/Admin-Web corren en **5173/5174** (Vite, definidos en
> `CORS_ORIGINS` del backend), no en 3000. Los scripts validan los puertos reales.

---

## 2. Ejecución rápida (Windows)

```powershell
# PowerShell 5.1+
cd C:\ruta\a\KAWSAY-AI-COMPLETO
Set-ExecutionPolicy -Scope Process Bypass   # solo para esta terminal
.\setup.ps1
```

## 2b. Ejecución rápida (Linux / macOS)

```bash
cd /ruta/a/KAWSAY-AI-COMPLETO
chmod +x setup.sh
./setup.sh
```

El script hace, en orden y con verificación: Docker daemon → Python ≥3.11 → Node ≥20 → Flutter → puertos → variables de entorno → venv + deps Python → contenedor postgres (espera `healthy`) → migraciones Alembic → `npm install` (x2 Web) → `flutter pub get`.

---

## 3. Pasos manuales equivalentes (referencia)

```bash
# 1. Variables de entorno (si setup no las creó)
cp backend/.env.example backend/.env
cp apps/teacher-web/.env.example apps/teacher-web/.env
cp apps/admin-web/.env.example apps/admin-web/.env

# 2. Backend: venv + deps
python -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt   # Windows: .\.venv\Scripts\python

# 3. PostgreSQL 16 + pgAdmin
docker compose -f backend/docker-compose.yml up -d

# 4. Migraciones (desde backend/)
cd backend
.venv/bin/python -m alembic upgrade head

# 5. Web
cd apps/teacher-web && npm install
cd apps/admin-web   && npm install

# 6. Mobile
cd apps/student-app && flutter pub get
```

---

## 4. Cómo ejecutar cada servicio

| Servicio    | Comando                                                     | URL                      |
| ----------- | ----------------------------------------------------------- | ------------------------ |
| Backend     | `cd backend` → `./.venv/bin/uvicorn app.main:app --reload --port 8000` | http://localhost:8000 |
| Backend (Docker) | `cd backend` → `docker compose up --build`            | http://localhost:8000 |
| Teacher-Web | `cd apps/teacher-web` → `npm run dev`                        | http://localhost:5173 |
| Admin-Web   | `cd apps/admin-web` → `npm run dev`                          | http://localhost:5174 |
| Student-App | `cd apps/student-app` → `flutter run`                        | emulador/dispositivo    |
| pgAdmin     | `cd backend` → `docker compose up -d pgadmin`               | http://localhost:5050  |

Los scripts NO levantan los servidores automáticamente (evita procesos que bloquean la terminal); dejan la guía de comandos impresa al final.

---

## 5. Verificación de salud

```bash
# Backend
curl http://localhost:8000/health        # {"status":"ok", ...}
curl http://localhost:8000/ready         # 200 cuando la DB responde (503 si no)

# PostgreSQL
docker inspect -f '{{.State.Health.Status}}' kawsay_postgres   # healthy

# Web: abre los puertos 5173/5174 en el navegador.
# Flutter: flutter doctor (LANZAR antes de ejecutar el setup)
```

---

## 6. Variables de entorno (referencia)

- **Centralizadas**: `.env.example` en la raíz (documenta DB, JWT, puertos, IA, pgAdmin, Web). No la usa ninguna app directamente.
- **Backend** lee `backend/.env` (pydantic-settings en `app/core/config.py`). Claves: `APP_ENV`, `DATABASE_URL`, `JWT_SECRET`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `CORS_ORIGINS`, `AI_PROVIDER`, `AI_API_KEY`, `LOG_LEVEL`, `REQUEST_TIMEOUT_SECONDS`.
- **Web** lee `apps/<app>/.env` con `VITE_API_URL=http://localhost:8000/api/v1`.
- **Docker Compose** usa `backend/docker-compose.yml` con valores por defecto (kawsay/kawsay/kawsay).

> `backend/.env` está en `.gitignore`; nunca se debe versionar un `.env` con secretos reales.

---

## 7. Troubleshooting

### Docker
- **"El daemon de Docker no está corriendo"** → inicia Docker Desktop y espera a *"Engine running"*. En Linux: `sudo systemctl enable --now docker`.
- **En Windows con error 0x8A150006 / Hyper-V** → habilita Hyper-V/WSL2 y **reinicia** antes de reintentar (instalación de Docker Desktop requiere reboot).
- **`docker compose up` falla por puerto 5432 ocupado** → `netstat -ano | findstr :5432` (Windows) / `lsof -i :5432` (mac/Linux), detén el proceso o cambia el mapeo en `docker-compose.yml`.
- Postgres en `unhealthy` → `docker logs kawsay_postgres`.

### Python / venv
- **Alias de Microsoft Store** (`python` abre la Store) → usa `py -3` o instala desde python.org y desmarca el alias en *Configuración → Apps → Alias de ejecución de aplicaciones*.
- **`.venv` roto** (apunta a un instalador borrado) → los scripts lo detectan y lo recrean; manualmente: `rm -rf backend/.venv` o `Remove-Item -Recurse -Force backend\.venv` y re-ejecuta `setup`.

### Node / npm
- **`ERESOLVE` o versiones "latest" incompatibles** → borra `node_modules` y `package-lock.json` y vuelve a `npm install`. Falta configurar `engines`/rangos en `package.json` de las webs.
- **Error de red npm** → `npm cache clean --force`, revisa proxy/registry.

### Flutter
- **`flutter` no reconocido** → agrega `C:\src\flutter\bin` al PATH (Windows) o `export PATH="$PATH:$HOME/flutter/bin"` (Linux/macOS), y reabre la terminal.
- **No se inicia el emulador** → `flutter doctor` primero; en Android habilita USB debugging/AVD; en iOS usa el simulador.
- Web del Flutter app (opcional): `flutter run -d chrome`.

### Backend / migraciones
- **`alembic upgrade head` falla** → revisa que `DATABASE_URL` en `backend/.env` apunte a postgres y que el contenedor esté `healthy`.
- **CORS / login desde la Web** → verifica `CORS_ORIGINS` en `backend/.env` incluya `http://localhost:5173` (Teacher) y `5174` (Admin) según corresponda.
- **Los puertos para la app móvil** → la app usa `10.0.2.2:8000` (emulador Android). En dispositivo físico cambia `VITE_API_URL`/`ApiClient` por la IP local del host.

### Estructura del repo
- Raíz del repo: `backend/`, `apps/`, `database/`, `docs/` y scripts `setup.*`/`clean.*`/`start-all.ps1`. Los scripts calculan su raíz a partir de su propia ubicación, por lo que funcionan desde cualquier nivel.