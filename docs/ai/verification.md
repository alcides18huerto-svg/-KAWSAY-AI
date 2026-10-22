# Evidencia de implementación y verificación

Fecha de sesión: 22 de octubre de 2026. Rama: `feature/entrenamiento-ia`.
Entorno probado: Windows, Python 3.13.14, venv aislado fuera del repositorio.

## Comandos y resultados reales

Desde `backend/`, utilizando el Python del venv:

| Comando | Resultado |
| --- | --- |
| `python -m pip install -r requirements.txt` | Instalación correcta; dependencias ML fijadas |
| `python -m pip check` | No broken requirements found |
| `python -m app.modules.ai.training.synthetic app/modules/ai/data/synthetic.csv` | CSV generado, 45 registros |
| `python -m app.modules.ai.training.validate_data app/modules/ai/data/synthetic.csv` | Correcto: 15/clase, 0 duplicados; campos curriculares opcionales faltantes informados |
| `python -m app.modules.ai.training.train app/modules/ai/data/synthetic.csv --output app/modules/ai/models` | Correcto; release reproducible generado |
| `python -m app.modules.ai.training.evaluate app/modules/ai/data/synthetic.csv app/modules/ai/models/difficulty-v1-2be2a78c56b6 --output <temporal>/kawsay-evaluation-smoke.json` | Correcto; smoke CLI sobre fixture completo, no evaluación independiente |
| `python -m pytest -q --junitxml=../docs/ai/test-results.xml` | **39 passed, 50 warnings in 4.32s** |
| `python -m ruff check app/modules/ai --output-format concise` | All checks passed |
| `git diff --check` | Sin errores de whitespace; avisos Git de conversión LF/CRLF del entorno |

Evidencia máquina: [test-results.xml](test-results.xml). Las 39 pruebas incluyen las 7 pruebas previas
y 32 nuevas. No se sustituyeron ni eliminaron pruebas previas. Los 50 warnings son deprecaciones
AnyIO/Starlette y `datetime.utcnow()` en el ORM/sync existentes, no fallos de las pruebas.

Cobertura funcional comprobada:

- CSV/JSON, datos vacíos/invalidos, esquema allowlist, campos faltantes, duplicados contradictorios,
  mezcla de orígenes e identificadores evidentes rechazados.
- Particiones deterministas y disjuntas por familia; variantes numéricas agrupadas.
- Dos entrenamientos con artefactos idénticos; comparación de modelos por validación y baseline.
- Matriz de confusión/métricas conocidas y evaluación de release congelado.
- Inferencia con socket bloqueado; proceso separado que prohíbe imports sklearn/numpy/scipy/httpx.
- Probabilidades del JSON equivalentes al modelo sklearn con tolerancia absoluta 1e-10.
- Archivo faltante, checksum incorrecto, dimensiones corruptas, NaN y versión de preprocesamiento
  desconocida; abstención por vocabulario desconocido/baja confianza.
- FastAPI: 401/403/404/422/503 según caso, clasificación docente, modelos, recomendaciones propias
  o de alumnos del aula; evidencia sin respuestas privadas.
- Tutor limitado, pistas progresivas, exclusión de borradores, corrección docente con nueva aprobación.
- Timeout de proveedor, rechazo de salida insegura y bloqueo de envío de identificadores al proveedor.
- Sync idempotente, conflictos de contenido/propietario, primer intento inmediato y contador sin duplicar.

## Artefacto y evaluación reservada

- Versión: **difficulty-v1-2be2a78c56b6**.
- Algoritmo elegido: **TF-IDF + MultinomialNB(alpha=0.5)**.
- 167 features; **20.560 bytes** de model.json (UTF-8/LF estable entre plataformas).
- SHA-256 model.json: `e077f57a18f5ae31e3ba4d6db728ec99ee19f7186c73abac898925e0bdb014d2`.
- Dataset: 45 ejercicios **sintéticos**, 15 por clase; 27 entrenamiento / 9 validación / 9 test.
- No hay datos reales de alumnos ni aprobación de etiquetas por MINEDU, UGEL o docentes.

| Métrica del test reservado | Modelo | Baseline mayoritaria |
| --- | ---: | ---: |
| Accuracy | 0,666667 | 0,333333 |
| Precision macro | 0,833333 | 0,111111 |
| Recall macro | 0,666667 | 0,333333 |
| F1 macro | 0,655556 | 0,166667 |
| Log loss | 0,974766 | No calculada |

Matriz de confusión (filas reales, columnas predichas; BASIC/INTERMEDIATE/ADVANCED):

```text
1 2 0
0 3 0
0 1 2
```

Errores: dos básicos y un avanzado confundidos con intermedio. F1 por clase: básico 0,50;
intermedio 0,666667; avanzado 0,80. Cada clase tiene apenas tres ejemplos en test.
Validación: F1 macro NB 0,434921 frente a regresión logística 0,166667.

**Abstención: 9 de 9 ejemplos del test** con el umbral técnico 0,65 (cobertura aceptada 0%).
Las métricas de la tabla son predicciones sin aplicar abstención, para comparar clasificadores.
El resultado selectivo se publica por separado en evaluation.json. No se bajó el umbral para
presentar más respuestas. El modelo necesita más datos autorizados y calibración antes de servir
de base para decisiones educativas. La heurística de adaptación no se presenta como ML entrenado.

Reportes completos: `backend/app/modules/ai/models/difficulty-v1-2be2a78c56b6/`.

## Incidencias resueltas durante la ejecución

1. Primera ejecución de las pruebas anteriores: 3 errores de recopilación. El Python global tomaba
   FastAPI/Starlette de un venv ajeno y faltaba pydantic-settings. Se creó un entorno aislado con las
   dependencias del repositorio; las 7 pruebas previas pasaron.
2. Primer entrenamiento: TypeError de serialización de índices numpy.int64. Se convierten los índices
   del vocabulario a int nativo antes del JSON; entrenamiento posterior y reproducibilidad pasan.
3. Resolución transitiva inicial de SciPy emitía una advertencia de opciones de solver con sklearn
   1.6.1. Se fijaron numpy 2.2.3/scipy 1.15.2/joblib 1.4.2/threadpoolctl 3.5.0 y se repitió entrenamiento.
4. Primer lint IA detectó orden de imports, zip sin strict y dependencias FastAPI como defaults.
   Se corrigieron y se verificó Ruff sin exclusiones adicionales.
5. Revisión de publicación detectó CRLF en artefactos generados en Windows. El entrenador ahora
   escribe bytes UTF-8/LF y `models/.gitattributes` conserva LF en los checkouts. Se regeneró el
   release y se añadió una comprobación de LF al test reproducible; el checksum corresponde a esos bytes.

## Verificaciones bloqueadas o no realizadas

- Docker: CLI instalado; `docker version` falla porque el daemon Linux de Docker Desktop no está
  disponible. No se ejecutó build ni arranque del contenedor.
- Flutter: `flutter --version` falla porque no hay SDK en PATH. No se compilaron ni ejecutaron tests
  móviles. El único cambio Dart es el import faltante de sqflite.
- PostgreSQL real: no se aprovisionó una instancia. Las integraciones usan SQLite in-memory mediante
  override de dependencias, sin cambiar la configuración de producción. Concurrencia PostgreSQL
  y restricciones reales deben verificarse antes de desplegar.
- OpenAI real: no se enviaron ejercicios a servicios externos ni se consumieron credenciales. Se
  verificaron gateway, timeout, seguridad y fallback mediante proveedores de prueba.
- GitHub: `gh auth status` indica que no hay sesión autenticada. El PR se prepara en `pull-request.md`;
  el resultado de publicación se registra en la sección Git de ese documento.
- Web React: no hubo cambios en sus archivos; se preservaron campos/URLs anteriores. No se ejecutó build.

No se ha desplegado en Render, modificado producción ni autorizado el modelo para estudiantes reales.
