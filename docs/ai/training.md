# Entrenar, evaluar y desplegar

Ejecutar desde `backend/` con Python 3.12 (contenedor/CI) o 3.13 (entorno local probado).
Crear un venv propio y activarlo antes de instalar:

```sh
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# PowerShell: .\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m app.modules.ai.training.validate_data app/modules/ai/data/synthetic.csv
python -m app.modules.ai.training.train app/modules/ai/data/synthetic.csv --output app/modules/ai/models --seed 42
python -m pytest -q
```

La generación del CSV es opcional y explícita:

```sh
python -m app.modules.ai.training.synthetic app/modules/ai/data/synthetic.csv
```

## Incorporar ejercicios validados por docentes

CSV UTF-8 o JSON como lista de registros. Campos requeridos:

```json
{
  "text": "Texto anonimizado del ejercicio",
  "label": "BASIC",
  "family_id": "familia-editorial-no-personal-001",
  "origin": "authorized",
  "source": "Referencia verificable de autorización y revisión docente",
  "grade": 3,
  "subject": "Matemática",
  "competency": "Resuelve problemas de cantidad"
}
```

Opcionales: grade, subject, competency, topic, activity_type, prerequisites. Cadenas vacías opcionales
se convierten a null y se cuentan como faltantes; faltantes requeridos o tipos inválidos rechazan la
importación. No se imputan etiquetas ni se mezclan orígenes. No incluir identificadores personales.
Validar permisos, anonimización, etiquetas y adecuación al currículo aplicable antes de importar.

Duplicados normalizados se eliminan; contradicciones de familia/etiqueta se rechazan. Variantes con
números distintos se unen, al igual que todas las variantes con el mismo family_id. Las componentes
conectadas se dividen de forma estratificada; mínimo cinco familias independientes por clase.
Paráfrasis semánticas sin family_id correcto no se detectan automáticamente: auditoría docente requerida.

## Reproducibilidad y evaluación

Semilla 42; normalización NFKD, minúsculas, tokens de dos o más caracteres, TF-IDF unigramas,
máximo 8000 features y norma L2. Vocabulario/IDF se ajustan **solo en entrenamiento**.
Compara LogisticRegression(C=4, max_iter=1000) y MultinomialNB(alpha=0.5) en validación por F1 macro.
No se reentrena el ganador sobre validación ni se selecciona con el test.

Modelos clásicos por el pequeño corpus y necesidad de ejecución local ligera/explicable. El ganador
actual es Naive Bayes (validación F1 macro 0,435 frente a 0,167 de regresión logística).
No hay evidencia suficiente para redes profundas ni calibración independiente fiable. No se
calibran probabilidades ni se ajusta el umbral para mejorar artificialmente métricas del test.

El entrenamiento genera:

```text
models/difficulty-v1-<hash>/
  model.json       # vocabulario, IDF, pesos, interceptos, clases y preprocesamiento
  metadata.json    # SHA-256, procedencia/hash del dataset, versiones, parámetros, limitaciones
  evaluation.json # validación de candidatos, test reservado, baseline, errores y familias
```

Versión derivada de parámetros; rechaza sobrescribir parámetros o procedencia distintos bajo la misma
versión. Entrenamientos iguales en el mismo entorno producen model.json idéntico (probado).
Versiones exactas de sklearn/numpy/scipy/joblib/threadpoolctl están declaradas; metadata registra
Python/sklearn/numpy/scipy. Distintas plataformas BLAS pueden introducir variaciones numéricas y,
por diseño, producir otra versión. El backend existente no fija todas sus dependencias transitivas.
El entrenador escribe bytes UTF-8/LF; `models/.gitattributes` conserva LF en Git para que publicar
desde Windows no invalide el checksum al cargar en Linux.

La evaluación separada de un release congelado acepta datos nuevos:

```sh
python -m app.modules.ai.training.evaluate /ruta/datos_independientes.json app/modules/ai/models/difficulty-v1-2be2a78c56b6 --output /ruta/evaluacion.json
```

El responsable debe comprobar que esos datos sean independientes del entrenamiento/selección.
Evaluar el CSV sintético completo sirve como comprobación técnica, **no** como resultado de test.
El reporte válido de test inicial es `evaluation.json` generado por `train` (9 ejemplos reservados).

## Publicación y rollback internos

1. Entrenar en un entorno controlado; revisar procedencia, calidad, errores, abstención y tamaño.
2. Revisar JSON/metadata/evaluation y tests; distribuir el directorio completo por release de confianza.
3. Cambiar `models/active.json` al identificador revisado mediante commit/despliegue controlado.
   No aceptar nombres o rutas enviados por clientes. No colocar modelos descargados arbitrariamente.
4. Desplegar/reiniciar workers (caché de carga por proceso). Verificar `/health`, `/ai/status`,
   `/ai/models` y una clasificación con usuario docente.
5. Rollback: restaurar puntero/commit previo y reiniciar; conservar el release anterior hasta validar.

El Dockerfile existente incluye `backend/app` con rutas relativas a `__file__`, compatibles con Linux.
La imagen instala las dependencias declaradas. No se entrena ni se descarga un modelo al arrancar.
Falta/corrupción del artefacto no impide iniciar FastAPI; `/ai/status` informa indisponible y
`/ai/classify` responde 503. Gateway y guía limitada pueden seguir funcionando.

Una vez cargado, un worker utiliza su snapshot en memoria; cambios/corrupción posteriores en disco
se detectan en la siguiente carga/reinicio, no mediante lectura de disco en cada petición.
No se modificaron servicios ni credenciales de Render.
