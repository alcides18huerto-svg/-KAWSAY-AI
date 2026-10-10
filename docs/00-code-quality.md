# KAWSAY AI — Calidad de Código

Guía corta de linting/formateo. Todos los comandos son **idempotentes** y no alteran la lógica.

## 1. Python (Backend)

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

## 2. Flutter (mobile-app/student-app)

Requiere Flutter SDK (no incluido en el repo). Config: `analysis_options.yaml` (flutter_lints).

```bash
cd mobile-app/student-app
flutter pub get
dart format lib test                                  # formatear
dart format --set-exit-if-changed --output=none lib test   # verificar sin escribir
flutter analyze                                        # linter + static analysis
flutter test                                           # tests
```

## 3. TypeScript / React (frontend-web/teacher-web, frontend-web/admin-web)

Requiere Node >= 20 y `npm install`. Config: `eslint.config.js`, `.prettierrc.json`.

```bash
cd frontend-web/teacher-web  # (igual para frontend-web/admin-web)
npm run lint            # eslint .
npm run format          # prettier --write .
npm run format:check    # prettier --check .
```

## 4. Limpieza de artefactos

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

## 5. Flujo recomendado (pre-commit)

```
clean → format → lint → build/test
```

Orden sugerido antes de cada commit: 1) `clean.ps1 -DryRun` para auditar,
2) formatear, 3) lintear, 4) correr tests.

## 6. Notas / deuda técnica conocida

- `frontend-web/*/package.json`: runtime deps fijadas en `"latest"`. Para producción, anclar
  versiones exactas (`npm run build` con lockfile).
- `python-multipart` en `requirements.txt`: no usado por endpoints actuales (sin forms);
  se mantiene porque FastAPI lo requiere si algún día se añade `OAuth2PasswordRequestForm`
  o subida de archivos. Eliminar SOLO si se confirma que nunca habrá forms.
- Regla fail-safe aplicada: nada de caches de `node_modules`, `.venv` ni `.git` se elimina
  con la limpieza normal; `--deep` lo hace y exige reinstalar dependencias.