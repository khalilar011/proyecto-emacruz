---
name: alerta-ruta-jira
description: Revisar historias de Jira de Alerta Ruta, sus criterios medibles y la evidencia del repositorio; emitir un dictamen documentado antes de push, cierre o despliegue.
---

# Revisión de historias y entregas de Alerta Ruta

Usa esta skill cuando se redacte o revise una historia de Jira, se cierre una historia o se prepare un push, integración o despliegue. Aplica las reglas de `AGENTS.md`; consulta `README.md` y `docs/plan-crisp-dm.md` para el alcance vigente.

## Revisión de la historia

1. Obtén la historia vigente de Jira por su clave, incluida la épica y los criterios. Si no hay clave o acceso, solicita la clave o el texto completo y registra la limitación. No supongas que una copia antigua sigue vigente.
2. Comprueba que actor, necesidad, valor, entradas, salidas, permisos, estados, límites y dependencias tengan una interpretación única. Señala expresiones ambiguas y propón texto de reemplazo. No conviertas una propuesta en decisión institucional sin confirmación del responsable.
3. Para cada criterio, identifica escenario o entrada, acción, resultado observable y método de medición. Añade casos límite pertinentes. Si no es verificable, propone una versión medible y marca el criterio pendiente hasta que Jira refleje la decisión acordada.

## Revisión de la entrega

1. Lee los archivos afectados y `git status`, `git diff` y, antes del push, `git diff --cached`. Incluye archivos nuevos previstos y comprueba que no haya datos, credenciales o documentos sin autorización.
2. Construye una tabla con: clave y criterio de Jira, archivo o artefacto, comprobación ejecutada, resultado observado, estado (`cumple`, `no cumple`, `bloqueado`). Cita rutas concretas y resultados reproducibles. Si un criterio no corresponde a ningún archivo o evidencia, queda pendiente. Si un archivo no corresponde a la historia, explica por qué está incluido.
3. Contrasta la entrega con el alcance, fases CRISP-DM, roles, permisos, fuentes y carácter simulado de los datos. No afirmes predicción validada a partir de frecuencias programadas.
4. Emite `APROBADO` solo si la historia está clara y vigente, todos los criterios cumplen, la evidencia corresponde a la versión revisada y no hay hallazgos bloqueantes. En cualquier otro caso emite `BLOQUEADO`, enumera los criterios pendientes y propone la corrección mínima. Incluye clave de Jira, referencia del commit o diff revisado y fecha. Tras cualquier cambio, repite la revisión.

El dictamen es una revisión técnica documentada, no una autorización para publicar datos institucionales o desplegar. No hagas push, transición de Jira, publicación ni despliegue desde esta skill salvo que la tarea actual lo autorice explícitamente y se cumplan los controles de `AGENTS.md`.
