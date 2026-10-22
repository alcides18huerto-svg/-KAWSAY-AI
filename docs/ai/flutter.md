# Integración offline-first con Flutter

## Arquitectura disponible

La inferencia implementada se ejecuta en **Python**, en servidor o computadora local de la escuela.
Puede funcionar sin internet; Flutter puede acceder por LAN si existe conectividad local.
Sin LAN ni internet, el móvil utiliza las actividades previamente aprobadas y descargadas.
No se ha implementado ni probado el clasificador en Dart/Android ni se exige red para resolver tareas.

El artefacto contiene unigramas, IDF y pesos numéricos de tres clases; su tamaño exacto está
registrado en [verificación](verification.md). No necesita GPU. La portabilidad JSON facilita una
posible implementación Dart futura, pero requeriría reproducir normalización Unicode, tokenización,
TF-IDF L2, softmax, checksum y abstención, y comparar probabilidades con vectores dorados. No se
incluye una supuesta conversión ONNX/TFLite ni se afirma compatibilidad Android automática.

## Flujo ya existente

1. Autenticar con `ApiClient` y descargar GET `/api/v1/students/me/assignments`.
   El servidor entrega exclusivamente variantes APPROVED de actividades PUBLISHED, grado y aula propios.
2. Persistir utilizando `ActivityRepositoryImpl.saveActivities` / `ActivityLocalDataSource` en SQLite.
   La clave de actividad evita duplicados y el reemplazo actual actualiza el contenido local.
3. Resolver desde SQLite sin conexión; `SyncService.recordAttempt` guarda un UUID y estado pendiente.
4. Al recuperar conexión, `SyncEngine` envía lotes de hasta 50 a `/sync/push`.
   Solo ACK accepted/duplicates confirma un evento. Errores de red mantienen la cola pendiente.
5. El backend compara propietario y payload para ese UUID; un payload diferente se rechaza sin
   sobrescribir el intento anterior. Los errores de integridad tampoco se confirman como duplicados.

El cliente conserva eventos rechazados pendientes; aún falta una UI para resolver conflictos con
supervisión docente. No generar un UUID nuevo automáticamente para eludir un conflicto. Si una cola
contiene eventos de varias cuentas, separar cuentas/colas antes de reintentar; el backend rechaza
UUIDs de otro propietario. El almacenamiento local actual no está particionado por usuario: la
separación completa entre sesiones/dispositivos compartidos requiere trabajo adicional del móvil.

El endpoint de intentos inmediato conserva el mismo contrato y ahora devuelve 409 ante conflicto.
El progreso agregado existente y la ruta batch aún no comparten una proyección transaccional de
`StudentProgress`; el recomendador consulta directamente los intentos para evitar depender de ese
agregado potencialmente desactualizado. Esta diferencia no se oculta como progreso sincronizado.

## Tutor contextual y recomendaciones

El contrato antiguo `tutorMessage(message)` sigue siendo válido, pero sin actividad responde
honestamente que no dispone de contenido aprobado. Para guía contextual el cliente debe enviar:

```json
{"message":"No entiendo cómo agrupar las semillas","assignment_id":"id-descargado","hint_level":1}
```

`hint_level` 0, 1 y 2 ofrece preguntas iniciales, representación y comprobación. El backend valida
acceso a la actividad, grado y aprobación. Para usarlo sin LAN se necesita una implementación de guía
local sobre contenido aprobado cacheado; esa UI/guía Dart no está implementada en esta entrega.
No prometer chat inteligente offline en la pantalla actual.

GET `/api/v1/ai/recommendations` permite al estudiante consultar exclusivamente sus sugerencias.
Un cliente puede cachear IDs y razones; cuando no hay servidor debe presentar las últimas sugerencias
como posiblemente desactualizadas. El endpoint existe y está probado; el caché/UI móvil de
recomendaciones no se añadió. La actividad seleccionada siempre debe existir en SQLite para abrirse.

## Validación pendiente en dispositivo

Flutter SDK no disponible en el entorno de implementación. Antes de publicar el móvil: ejecutar
`flutter analyze`, `flutter test` y probar descarga, modo avión, cierre/reinicio, reenvío del mismo
UUID, corrección docente posterior y cambio de cuenta. La eliminación/revocación de contenido
ya descargado requiere sincronización y política explícita: un dispositivo completamente aislado
no conoce revocaciones remotas. No se ha cambiado el esquema SQLite ni sus migraciones.
