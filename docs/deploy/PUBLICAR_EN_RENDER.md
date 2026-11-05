# KAWSAY AI — publicación en GitHub y Render

## Repositorio oficial de esta entrega

**https://github.com/alcides18huerto-svg/-KAWSAY-AI** (repositorio del proyecto).

## Paso 1. Subir el código al repositorio existente

1. Instala Git en Windows y configúralo con tu cuenta de GitHub.
2. Extrae este ZIP en una carpeta nueva, sin archivos `.git` antiguos.
3. Abre PowerShell dentro de `KAWSAY-AI` y ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\SUBIR_A_KAWSAY.ps1
```

El script comprueba archivos y credenciales a través de Git, rechaza posibles secretos o bases de datos y se detiene si `main` ya contiene commits. No hace `force push`. **No necesitas crear otro repositorio.**

## Paso 2. Publicar en Render

1. Abre https://dashboard.render.com/blueprints e inicia la creación de un Blueprint nuevo.
2. Conecta el repositorio `alcides18huerto-svg/-KAWSAY-AI`, rama `main`.
3. Render detectará `render.yaml` y `render.Dockerfile`.
4. Configura `JWT_SECRET` como secreto nuevo aleatorio, exclusivamente desde Render. No lo incluyas en GitHub.
5. El arranque de FastAPI ejecuta `alembic upgrade head`, crea/actualiza las cuentas DEMO y carga automáticamente el flujo completo (escuela, docente, plan ACTIVO, aula multigrado, estudiantes, tarea, intentos y alerta). Espera a que los logs muestren `KAWSAY DEMO: datos ficticios cargados` antes de probar el panel.
   - Si el servicio tiene un **Docker Command** personalizado, déjalo vacío o usa `sh start.sh`. Un `uvicorn app.main:app` manual también funciona porque las migraciones y la carga inicial están en el arranque de la aplicación.
6. Revisa logs, estado del build y `/health`, `/admin`, `/docente`, `/estudiante` antes de compartir la URL.
7. Accesos DEMO: administrador `admin@demo.pe` / `Kawsay-Demo-Local-2026`; docente `maestra@demo.pe` / `Aula-Multigrado-2026!`; estudiantes con **Estudiante → Código y PIN**. Los códigos y PIN aparecen en los logs de Render.
8. Para desactivar la carga automática, define `KAWSAY_DEMO_SEED=0`.
9. Si el login devuelve `no such table: users`, el contenedor no ejecutó las migraciones. Verifica el estado del deploy, elimina cualquier **Docker Command** antiguo y usa **Manual Deploy → Clear build cache & deploy**.

**Esta configuración es solo para demostraciones con datos ficticios.** Render Free no conserva los datos SQLite almacenados en su disco temporal y el entrenamiento de ML no está validado con estudiantes reales. Para una instalación escolar real hay que usar almacenamiento externo persistente con copias de seguridad y cumplir controles de protección de datos.

La compilación completa de React, el funcionamiento offline en navegador y el despliegue en Render deben verificarse realmente; no se infieren de las pruebas unitarias.
