# KAWSAY AI — Calidad de Código

Guía de arquitectura, calidad y linting/formateo. Todos los comandos son **idempotentes** y no alteran la lógica.

## 1. Arquitectura del proyecto (raíz)

```
KAWSAY-AI-COMPLETO/
├── backend/              # FastAPI + PostgreSQL 16  (app/ y migraciones Alembic)
│   └── app/
│       ├── main.py       # bootstrap FastAPI (CORS, health/ready, routers)
│       ├── api.py        # rutas de dominio: teacher, students, curriculum, IA, tutor…
│       ├── models.py     # modelos SQLAlchemy centrales
│       ├── schemas.py    # pydantic de entrada/salida
│       ├── core/         # config, database, security, permissions
│       ├── shared/       # models/base (Base declarativa)
│       └── modules/      # módulos por dominio (auth, sync, ai, + stubs en 20+ áreas)
├── frontend-web/         # Vite/React: admin-web (5173) y teacher-web (5174)
├── mobile-app/           # student-app (Flutter, offline-first)
├── database/             # SQL/seeds (fake_data_completo, fake_test, fake_delete_all)
├── docs/                 # esta guía + 00-setup-guide
└── .github/              # CI: backend, frontend-web y mobile-app
```

Scripts raíz: `setup.ps1`/`setup.sh` (bootstrap), `clean.ps1`/`clean.sh` (limpieza),
`start-all.ps1`/`stop-all.ps1` (levantar/detener servicios) y `.env.example` (referencia).

**Puertos**: Backend API 8000 · Admin-Web 5173 · Docente-Web 5174 · PostgreSQL 5432 · pgAdmin 5050.

## 2. Sección de IA (gateway de adaptación por grado)

Genera variantes de una actividad por grado (1.º–6.º) sobre el área/tema que indica el docente.

```
backend/app/modules/ai/
├── __init__.py
├── schemas.py            # AdaptedActivitySchema (contenido validado + procedencia del provider)
├── service.py            # AIGateway: selección de provider, timeout 8s, fallback, tutor_reply
└── gateway/
    ├── base.py           # contrato BaseAIProvider + AIProviderError
    └── providers/
        ├── __init__.py
        ├── openai_provider.py    # Structured Outputs (JSON schema) vía httpx
        └── fallback_provider.py  # heurístico local: ejercicios distintos por grado y área
```

**Flujo**: `POST /api/v1/teacher/assignments/{id}/generate-variants` → para cada grado
llama `adapt_activity_sync` → el gateway usa el provider configurado y, si falla o se
excede el timeout (8 s), cae al heurístico → guarda la variante (`generated_by` = provider).

**Configuración** (`backend/.env`): `AI_PROVIDER=mock` (heurístico, sin APIs externas)
o `AI_PROVIDER=openai` + `AI_API_KEY` + `AI_MODEL=gpt-4o-mini`. El heurístico detecta el
área (Matemática, Comunicación, Ciencia, Personal Social, Inglés, genérico) y genera
contenido con dificultad, pasos e instrucciones apropiados a cada grado.

**Dónde verlo**: panel Docente (5174) → «Crear actividad». **Tests**: `backend/tests/test_ai_gateway.py` + `test_teacher_api.py`.

## 3. Python (Backend)

```bash
cd backend
python -m pip install -r requirements-dev.txt        # instala black + ruff

ruff check .                                          # linter (E,F,I,B,UP; línea=100)
ruff format --check .                                 # verificar formato
ruff format .                                         # aplicar formato
black --check .                                       # verificar con black
black .                                               # aplicar black
```

Config: `backend/pyproject.toml`. Se excluyen `.venv`, `build` y `migrations/versions/`
(las migraciones se generan con Alembic y no deben reformatearse a mano).

## 4. Flutter (mobile-app/student-app)

Requiere Flutter SDK (no incluido en el repo). Config: `analysis_options.yaml` (flutter_lints).

```bash
cd mobile-app/student-app
flutter pub get
dart format lib test                                  # formatear
dart format --set-exit-if-changed --output=none lib test   # verificar sin escribir
flutter analyze                                        # linter + static analysis
flutter test                                           # tests
```

## 5. TypeScript / React (frontend-web/teacher-web, frontend-web/admin-web)

Requiere Node >= 20 y `npm install`. Config: `eslint.config.js`, `.prettierrc.json`.

```bash
cd frontend-web/teacher-web  # (igual para frontend-web/admin-web)
npm run lint            # eslint .
npm run format          # prettier --write .
npm run format:check    # prettier --check .
```

## 6. Limpieza de artefactos

```bash
./clean.sh --dry-run    # auditoría: lista qué borraría
./clean.sh              # limpieza segura (caches/logs/build, sin .venv ni node_modules)
./clean.sh --deep       # además node_modules/.venv (luego reinstalar con ./setup.sh)
```

```powershell
.\clean.ps1 -DryRun
.\clean.ps1
.\clean.ps1 -Deep
```

## 7. Flujo recomendado (pre-commit)

```
clean → format → lint → build/test
```

Orden sugerido antes de cada commit: 1) `clean.ps1 -DryRun` para auditar,
2) formatear, 3) lintear, 4) correr tests.

## 8. Notas / deuda técnica conocida

- `frontend-web/*/package.json`: runtime deps fijadas en `"latest"`. Para producción, anclar
  versiones exactas (`npm run build` con lockfile).
- `python-multipart` en `requirements.txt`: no usado por endpoints actuales (sin forms);
  se mantiene porque FastAPI lo requiere si algún día se añade `OAuth2PasswordRequestForm`
  o subida de archivos. Eliminar SOLO si se confirma que nunca habrá forms.
- Regla fail-safe aplicada: nada de caches de `node_modules`, `.venv` ni `.git` se elimina
  con la limpieza normal; `--deep` lo hace y exige reinstalar dependencias.