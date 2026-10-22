# Datos técnicos

`synthetic.csv` se genera con `python -m app.modules.ai.training.synthetic app/modules/ai/data/synthetic.csv`.
Son 45 ejercicios redactados para probar el pipeline, no historiales ni etiquetas validadas por docentes.
Contexto rural peruano orientativo; no existe aprobación MINEDU/UGEL.

Para datos autorizados: mismo esquema CSV o lista JSON, `origin=authorized`, `source` con referencia
de autorización/licencia verificable y `family_id` común a todas las paráfrasis de un ejercicio.
No incluir nombres, DNI, correos, respuestas de estudiantes ni identificadores personales.
La herramienta verifica el esquema, no puede certificar permisos legales ni detectar toda PII en texto.
Un responsable debe revisar procedencia, anonimización y etiquetas antes del entrenamiento.
