# KAWSAY AI · Simulador educativo

Abre `index.html` directamente en un navegador moderno. No necesita servidor, instalación, API ni conexión. Los datos ficticios se guardan en el almacenamiento local del navegador; el botón **Reiniciar demostración** restaura los datos iniciales.

El menú presenta tres perfiles: administrador, docente y estudiante. El administrador gestiona los registros, el docente crea y asigna actividades, y el estudiante las resuelve y consulta su progreso. Los cambios se comparten entre los tres perfiles.

El banco contiene 240 ejercicios (10 por grado y área). La selección usa hasta cinco preguntas del contenido y grado elegidos; si hay menos, presenta solamente las disponibles. Si no hay ejercicios del contenido para un grado, la asignación queda bloqueada para que el docente la revise. Las preguntas de respuesta abierta se comprueban con coincidencia normalizada; no evalúan redacciones semánticamente equivalentes. Las traducciones quechua y aimara son ejemplos parciales no validados. La red, el entrenamiento, el tutor, las recomendaciones y las sincronizaciones son simulaciones locales, no modelos o servicios reales.

## Recorrido para el jurado

1. En **Administrador → Inicio**, pulsa **Ejecutar demostración completa**. Se puede pausar, continuar o avanzar por pasos. Reiniciar la secuencia conserva los registros creados; **Reiniciar demostración** restaura todo el estado ficticio.
2. En **Docente → Cursos y actividades**, elige área, contenido y competencia. Al asignar, revisa la previsualización por estudiante. Si se detecta una señal de apoyo, **Docente → Propuestas** permite aprobar o rechazar el refuerzo antes de publicarlo.
3. En **Estudiante**, elige un perfil, responde y consulta la explicación o una pista. La respuesta activa el análisis local y, si corresponde, una alerta preliminar. El administrador ve los indicadores compartidos.
4. El botón de conectividad simula la desconexión. Las respuestas se guardan localmente en la cola y se marcan como sincronizadas al recuperar la conexión simulada.

## Límites del prototipo

- La competencia y los contenidos son un catálogo demostrativo reducido; **no se ha conectado ni verificado el currículo vigente de ninguna institución o UGEL**. El docente debe validar su pertinencia.
- No existen modelo entrenado ni diagnóstico: la señal utiliza una regla fija (70 % acierto parcial y 30 % historial) y puede activarse con una sola respuesta incorrecta. La visualización de neuronas es ilustrativa.
- El banco es finito; no hay suficientes ejercicios de todos los contenidos en todos los grados. Algunas actividades tendrán menos de cinco preguntas o requerirán revisión docente.
- El modo offline es un cambio de estado simulado y `localStorage`; no realiza transferencias a un servidor. Las traducciones no son completas ni están validadas.

Para comprobar los flujos sin instalar dependencias, ejecuta `node tests/roles.cjs`, `node tests/escenarios.cjs` y `node tests/smoke.cjs`. Los archivos `tests/navegador.html`, `tests/hackathon.html` y `tests/responsive.html` prueban el proyecto dentro de un navegador. Las pruebas deben abrirse en un contexto que permita al iframe acceder al archivo local, por ejemplo Chrome con `--allow-file-access-from-files`.
