# SCRUM-37 — minería automatizada

> Historia creada y verificada en Jira el 11/11/2026 a partir de la solicitud del responsable. Se mantiene independiente de `SCRUM-23` y pertenece a `SCRUM-30` (Fase 4 — Modelado).

## Historia propuesta

Como administrador/comunicador autorizado de Alerta Ruta, quiero analizar las incidencias únicas del prototipo mediante descriptivos, tasas sobre programación y reglas Apriori, para identificar asociaciones que orienten preguntas de planificación y mantenimiento sin presentarlas como causalidad ni como desempeño real de EMACRUZ.

**Épica propuesta:** SCRUM-30 — Fase 4, Modelado. La preparación categórica también aporta a Fase 3 y la automatización a Fase 6.

**Actores:** administrador/comunicador; proceso interno programado. El vecino no accede.

**Fuentes:** `incidents`, `neighborhood_catalog`, `service_catalog`; dataset sintético reproducible generado en memoria.

**Límites:** Distrito 2, 26 barrios, 104 servicios y 12 camiones simulados; sin GPS, ejecución real, causalidad, predicción de residuos ni tasa oficial de puntualidad.

## Criterios comprobables

### CV1. Navegación y sesión

Dada una sesión válida de un miembro de `admin_users`, al cambiar entre `/admin/` y `/admin/mineria/` se mantienen la sesión y el botón de cierre; un anónimo vuelve al acceso y un autenticado no administrador no obtiene resultados. Verificación: navegador y pruebas RLS remotas.

### CV2. Descriptivos calculados

Dada una corrida completada, el dashboard muestra total de incidencias únicas, barrios, camiones, motivo, promedio de demora, reglas y fecha, además de siete gráficas cuyos valores proceden de `mining_analysis_runs`. Verificación: inspección de respuesta y DOM, sin arreglos de resultados hardcodeados.

### CV3. Conteo sin duplicación

Dadas dos versiones con el mismo ID y una incidencia con dos barrios, el total es 1 y cada barrio recibe conteo 1. Verificación: `node tests/test_mining_engine.mjs`.

### CV4. Normalización por programación

Dado un periodo, el motor genera ocurrencias semanales esperadas y presenta incidencias por 100 servicios programados, etiquetadas como programación y no como cumplimiento real. Verificación: prueba del motor e inspección de interfaz/documentación.

### CV5. Apriori verificable

Dadas cuatro transacciones `[AB, AB, AB, C]`, la regla `A → B` tiene soporte `0,75`, confianza `1`, lift `4/3` y respaldo `3`. Verificación: prueba automática exacta.

### CV6. Demostración separada

Con semilla `20261111` se generan 180 incidencias reproducibles compatibles con el catálogo, sin insertarlas en `incidents`; la vista muestra permanentemente el rótulo sintético. Verificación: igualdad de dos generaciones, consulta de base e inspección DOM.

### CV7. Historial del prototipo

El modo historial lee una fila actual por incidencia, conserva retiradas y no convierte eventos de edición de `incident_history` en observaciones. Con menos de 10 transacciones no fuerza reglas. Verificación: prueba del motor y corrida remota controlada.

### CV8. Ejecución manual única

Al pulsar actualizar, el botón queda desactivado hasta recibir una corrida guardada `COMPLETED`; un segundo cálculo simultáneo del mismo modo obtiene conflicto y no crea trabajo duplicado. Verificación: navegador, índice parcial y prueba remota.

### CV9. Automatización

El lunes a las 03:00 Bolivia (07:00 UTC), GitHub Actions invoca la misma Edge Function con modo historial y guarda una corrida `scheduled`. Verificación: archivo workflow, log remoto y fila persistida.

### CV10. Seguridad

`anon` no puede leer ni escribir corridas; un autenticado no administrador tampoco lee; administradores sólo leen desde navegador; las escrituras y el algoritmo usan la Edge Function y credenciales secretas nuevas no expuestas. Verificación: SQL remoto y revisión de secretos.

### CV11. Regresión

Los exportadores conservan 26 barrios y 104 servicios, las pruebas públicas/administrativas anteriores pasan y los archivos de mapas no cambian. Verificación: suite completa y `git diff`.

### CV12. Documentación y evidencia

Arquitectura, variables, fórmulas, umbrales, limitaciones, seguridad, flujo manual/semanal y guía de exposición están documentados; la matriz marca cada criterio `cumple`, `no cumple` o `bloqueado` con evidencia de la versión revisada.

## Decisiones y pendientes

- Aprobado por la solicitud: Apriori, dos modos, actualización manual, cron semanal, persistencia, RLS y nombres de interfaz.
- Decisión técnica: unidad por incidencia única y días/turnos derivados de servicios afectados.
- Decisión confirmada: `SCRUM-37` conserva esta fase separada de `SCRUM-23`; cualquier cambio de alcance debe reflejarse primero en esa historia.
- Limitación de datos: el esquema actual no distingue “cancelación” o “prueba” de una retirada; no se inventa esa clasificación.
