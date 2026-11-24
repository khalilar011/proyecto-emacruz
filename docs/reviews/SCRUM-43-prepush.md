# Dictamen previo a publicación — SCRUM-43

- **Fecha:** 2026-11-23, `America/La_Paz`.
- **Historia:** SCRUM-43, “Simular el recorrido sabatino de SIM-C01”.
- **Épica:** SCRUM-32, Fase 6 — Despliegue.
- **Versión revisada:** cambios preparados sobre `93f95b7` en `main`; el commit final se crea sin cambios posteriores a este dictamen.
- **Alcance:** página pública estática `/simulacion/`, enlace de navegación, motor local, estilos, documentación y pruebas.
- **Dictamen:** **APROBADO**.

## Historia y alcance

La historia vigente define sin ambigüedad actor público, necesidad académica, fuente `web/data/distrito-2.json`, tres entradas exactas, salida observable, límites, estados, controles, parámetros, evidencia y separación de las ventanas del catálogo. La simulación no se presenta como GPS, ruta vial, hora real ni operación oficial. No modifica Supabase, Auth/RLS, alertas, Apriori, análisis exploratorio, fuentes raw, mapas o automatizaciones.

Los únicos permisos nuevos son lectura pública de archivos estáticos ya publicados por GitHub Pages. No hay escritura, credenciales, persistencia ni llamadas externas. El rol vecino/visitante consulta; no se alteran roles administrativos.

## Trazabilidad y resultados

| Criterio | Artefacto revisado | Comprobación | Resultado | Estado |
| --- | --- | --- | --- | --- |
| CV1 | `web/index.html`, `web/simulacion/` | Prueba de catálogo, IDs, ventanas, orden, enlace y fallo seguro. | Los tres servicios sabatinos de SIM-C01 coinciden. | cumple |
| CV2 | `web/simulacion/index.html` | DOM e inspección visual. | Avisos académicos y ausencia de afirmaciones GPS/oficiales. | cumple |
| CV3 | SVG, interpolación Bézier y motor | Prueba de posiciones intermedias y Playwright. | Movimiento continuo, detenciones, demoras y final observable. | cumple |
| CV4 | `SimulationEngine` y controles | Pruebas unitarias y navegador. | Iniciar, pausar, reanudar, cambiar velocidad y reiniciar son repetibles. | cumple |
| CV5 | Generador con semilla y documentación | Comparación de planes y rangos. | Semilla `20261123`; distribuciones y parámetros documentados. | cumple |
| CV6 | Acumuladores de eventos | Invariantes y resultado final en navegador. | 149 = 61 + 77 + 11; 3 paradas; 10:29. | cumple |
| CV7 | CSS, tema y recursos | Playwright 390/1440, claro/oscuro, y regresión visual. | 5/5 pruebas; sin desbordamiento de página; seguimiento móvil visible. | cumple |
| CV8 | README, documento, pruebas y estado Git | Matriz completa local, benchmark, `git diff --check`, diff preparado y control previo. | No hay regresiones, dependencias, secretos ni fuentes modificadas. | cumple |

## Evidencia ejecutada

- Exportadores y validadores de datos/SQL: todos pasan sin modificar archivos.
- `python -m unittest discover -s tests -p 'test_*.py' -v`: 12/12.
- Suites `test_schedule`, `test_incidents`, `test_web_integration`, minería, integración, frontend, visual y simulación: todas pasan.
- Benchmark: 1.000.000 registros, 1.000.000 transacciones, 2.985 perfiles, 44 reglas, 1.733,98 ms y 100,66 MiB RSS máxima.
- Playwright: 5/5 en 390 px y 1440 px, claro/oscuro y flujo completo de controles.
- Sintaxis JavaScript y `git diff --check`: sin errores.

## Seguridad, datos y estado

La revisión no encuentra datos locales, credenciales, documentos institucionales ni cambios sin relación con SCRUM-43. `data/raw/` permanece intacto. La programación leída continúa marcada como simulada y la trayectoria es puramente ilustrativa. El flujo de GitHub Pages existente publicará `web/` al recibir el commit en `main`.

Este dictamen técnico habilita el push de la versión revisada, no autoriza publicar datos institucionales ni sustituye una decisión del responsable del proyecto. Si cambia cualquier archivo preparado, el dictamen deja de ser válido y debe repetirse. Después del despliegue se debe verificar la URL y registrar la evidencia en Jira antes de considerar cerrada la historia.
