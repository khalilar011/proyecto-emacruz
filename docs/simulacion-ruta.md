# Simulación académica de ruta

La ruta pública `/simulacion/` demuestra un recorrido sabatino del camión ficticio `SIM-C01` mediante eventos discretos ejecutados sólo en el navegador. Su trayectoria SVG es un esquema sin escala: no usa coordenadas, calles, GPS, APIs externas ni recorridos oficiales de EMACRUZ.

## Fuente y secuencia

Antes de habilitar los controles, `web/simulacion/simulacion.js` valida en `web/data/distrito-2.json` estos servicios y sus identificadores:

1. Santa Clara, `D2-S067`, sábado 08:00–11:00, `SIM-C01`.
2. La Santa Cruz, `D2-S068`, sábado 11:30–14:30, `SIM-C01`.
3. Fleig, `D2-S069`, sábado 15:00–18:00, `SIM-C01`.

Las horas son ventanas programadas por barrio. No determinan las duraciones ni la hora de llegada de la simulación.

## Modelo

El generador pseudoaleatorio `mulberry32` usa la semilla fija `20261123`. Al iniciar o reiniciar se conserva el mismo plan:

- recolección por parada: distribución triangular `T(mínimo=18, moda=24, máximo=32)` minutos;
- desplazamiento por tramo: distribución triangular `T(mínimo=20, moda=28, máximo=38)` minutos;
- ocurrencia de demora por tramo: Bernoulli con `p=0,50`;
- duración de cada demora: uniforme discreta entre 4 y 12 minutos, extremos incluidos.

La triangular concentra resultados cerca de una duración típica sin asumir normalidad ni permitir valores fuera del rango. Bernoulli representa si aparece una demora y la uniforme discreta asigna igual probabilidad a cada minuto permitido. Son supuestos académicos, no parámetros estimados con datos operativos.

Con la semilla vigente, el plan dura 149 minutos: 61 de desplazamiento, 77 de recolección y 11 de demora; completa 3 paradas a las 10:29 simuladas. El motor acumula cada indicador desde el tiempo consumido de los eventos. Por construcción y por prueba, `total = desplazamiento + recolección + demora`.

## Ejecución y controles

La velocidad normal consume 10 minutos simulados por segundo real y la rápida, 40. Cambiarla sólo altera la reproducción visual; no vuelve a generar eventos ni cambia resultados. Pausar congela reloj y posición. Reiniciar vuelve a 08:00 con el mismo plan, y la simulación puede repetirse sin recargar.

Los desplazamientos se dividen en dos eventos continuos alrededor del posible evento de demora. La posición se interpola con curvas Bézier cúbicas; durante una demora queda fija y luego continúa. `requestAnimationFrame` mantiene una sola reproducción activa.

## Límites

- Es una demostración de Optimización Empresarial III, no una optimización de rutas ni un sistema de despacho.
- No acredita operación, tiempos, productividad o puntualidad de EMACRUZ.
- No guarda resultados en Supabase ni modifica Auth, RLS, incidencias, Apriori, catálogos o mapas.
- Los estados y métricas describen sólo esta ejecución simulada.

## Verificación

Ejecutar:

```bash
node tests/test_route_simulation.js
node --check web/simulacion/simulacion.js
```

La prueba valida catálogo, semilla, rangos, continuidad temporal, pausa, reanudación, reinicio, velocidades, movimiento intermedio, demora y coherencia matemática.

## Matriz de trazabilidad de SCRUM-43

| Criterio Jira | Artefacto | Evidencia reproducible | Estado |
| --- | --- | --- | --- |
| CV1. Catálogo y navegación | `web/index.html`, `web/simulacion/index.html`, `web/simulacion/simulacion.js` | `node tests/test_route_simulation.js` valida `D2-S067`, `D2-S068`, `D2-S069`, orden, ventanas, camión y enlace; el error de catálogo también se prueba. | cumple |
| CV2. Identificación y límites | `web/simulacion/index.html` | La prueba DOM confirma los dos avisos literales; la inspección en 390 y 1440 px confirma que permanecen visibles. | cumple |
| CV3. Recorrido visual continuo | `web/simulacion/index.html`, `web/simulacion/simulacion.js`, `web/simulacion/simulacion.css` | La prueba unitaria verifica posiciones distintas dentro del tramo y posición fija sólo en demora; Playwright observa cambio continuo del `transform` y final “Recorrido completado”. | cumple |
| CV4. Controles repetibles | `web/simulacion/simulacion.js` | Playwright ejecuta iniciar, pausar, reanudar, velocidad normal/rápida, reiniciar, completar y volver a reiniciar; la prueba del motor confirma reloj congelado y plan inmutable. | cumple |
| CV5. Modelo reproducible | `web/simulacion/simulacion.js`, este documento | Dos planes con semilla `20261123` son iguales; las pruebas validan rangos triangulares, Bernoulli aplicado y demoras uniformes discretas de 4–12 minutos. | cumple |
| CV6. Indicadores derivados | `web/simulacion/simulacion.js` | La prueba obtiene 149 = 61 + 77 + 11, 3 paradas y 10:29; Playwright confirma esos mismos valores al terminar. | cumple |
| CV7. Presentación adaptable | `web/simulacion/index.html`, `web/simulacion/simulacion.css`, `web/theme.js` | 5 pruebas Playwright pasan en 390 y 1440 px, claro/oscuro, sin desbordamiento de página; en celular el mapa acompaña al camión. `tests/test_visual_regression.js` valida recursos y tema. | cumple |
| CV8. Regresión, documentación y publicación controlada | `README.md`, este documento, `tests/`, `docs/reviews/SCRUM-43-prepush.md` | Validadores, 12 pruebas Python, suites JS, millón sintético, benchmark, sintaxis y 5 pruebas Playwright pasan. El dictamen previo queda guardado; la URL se comprueba después del despliegue y se registra en Jira sin declarar antes el cierre. | cumple |

La matriz corresponde al diff sobre `93f95b7`. La comprobación publicada es una evidencia posterior al push y no sustituye el control técnico previo ni autoriza datos institucionales.
