# Revisión de SCRUM-40 — Fase 5 académica

**Fecha:** 19/11/2026 (`America/La_Paz`)

**Historia Jira:** `SCRUM-40` — Validar Alerta Ruta con un millón de datos y análisis exploratorio

**Épica CRISP-DM:** `SCRUM-30` — Fase 4, Modelado; evidencia de Fase 5, Evaluación

**Base original:** `646efc8dc4759251311efa957f4dba739d6be701`

**Alcance actualizado:** cierre verificable de la Fase 5, incluida la corrida remota agregada, la interfaz vecinal compactada y la publicación controlada.

## Definición revisada

Jira se consultó directamente después de crear la historia. La lectura guardada confirmó actor, necesidad, resultado, 11 criterios, fuentes, límites, relación con `SCRUM-37`/`SCRUM-38`, ruta conservada y parent `SCRUM-30`. Las decisiones institucionales no se ampliaron: los datos siguen siendo simulados, no existe afirmación de puntualidad o volumen real y los permisos permanecen iguales.

## Matriz de trazabilidad

| Criterio Jira | Archivo o artefacto | Comprobación y resultado observado | Estado |
| --- | --- | --- | --- |
| CV1 · Consulta compacta | `web/styles.css`; HTML público; JS protegido | Chromium headless a 390 y 1440 px, claro/oscuro: Chacarrilla, 7 días, frecuencia, camión, 3 mapas, diálogo, tema y ancho exacto sin desbordamiento. En móvil la altura total quedó en 4.016 px y el resultado en 1.179 px. Las huellas de `app.js`, `map-viewer.js`, horarios e incidencias no cambiaron. | cumple |
| CV2 · Millón reproducible y separado | motor; pruebas; `export_synthetic_demo.mjs` | Semilla `20261111`; IDs `DEMO-0000001`–`DEMO-1000000`; extremos 01/01/2005–19/11/2026; 26 barrios, 12 camiones y 104 servicios. La verificación individual produjo SHA-256 `db45e83891e791f74667d4578afa2d62cdbf0dc4e5ccb0e02c68e5b9ad570e61`. Las 10 filas de `public.incidents` conservaron su huella. | cumple |
| CV3 · Procesamiento acotado | motor, Edge Function, benchmark y corrida remota | 1.000.000 generados y analizados, 2.983 perfiles, 44 reglas calculadas, 2.052,59 ms y 106,12 MiB de RSS máxima en benchmark. Supabase guardó una sola fila agregada `COMPLETED` con 1.000.000/1.000.000. El bundle esbuild mide 43,3 kB. | cumple |
| CV4 · Apriori equivalente | motor y prueba | `[AB, AB, AB, C]`: soporte 0,75, confianza 1, lift 4/3, respaldo 3. La versión ponderada coincide exactamente con expansión en 180 y 5.000 registros; cada regla del millón cumple `support = support_count / 1.000.000`. | cumple |
| CV5 · Siete gráficas | motor, panel, pruebas y fila remota | Existen barrios, camiones, motivos, días, turnos, evolución temporal y duración. La demo remota conserva 26/12/4/7/3/22/5 puntos; motivos y evolución anual suman 1.000.000. Historial conserva su agrupación semanal. | cumple |
| CV6 · Indicadores no engañosos | motor, `index.html`, `mining.js` | Rótulo literal visible; en demo `normalized_rates_applicable=false`, las tasas son nulas y la tabla dice “No aplica”; el texto distingue calendario y prueba sintética. | cumple |
| CV7 · Nombre visible | administración, panel, integración | Título, encabezados y menús muestran **Análisis exploratorio**; `/admin/mineria/` y nombres técnicos permanecen. | cumple |
| CV8 · Periodo y ejecución | `mining-view.js`, panel, prueba frontend y Supabase | 01/01/2005–19/11/2026 y 1.000.000 visibles sólo desde una corrida confirmada; inicio/finalización en `DD/MM/AAAA HH:MM`, `America/La_Paz`; manual/automática diferenciadas; resultado vacío mantiene fechas nulas. Panel controlado a 390/1440 px sin desbordamiento. | cumple |
| CV9 · Ortografía | textos visibles y búsqueda de cadenas | Se revisaron portal, administración, panel, errores, reglas y documentación. Se conservaron literalmente **Alerta Ruta** y **Sistema inteligente de alertas**; no se cambiaron códigos técnicos. | cumple |
| CV10 · Regresión, seguridad y cron | suites, SQL remoto, GitHub Actions | 12 pruebas Python y 7 suites Node pasan; 26/104 confirmados; lint remoto sin errores; `security_checks.sql` y `admin_flow_checks.sql` terminaron con `ROLLBACK`; anónimo no escribe. Cron real del 16/11/2026 concluyó `success` y guardó ejecución `scheduled`, `COMPLETED`, 10 transacciones. | cumple |
| CV11 · Documentación y control | README, fuentes, plan, historia local y este dictamen | Semilla, periodo, distribución, pesos, fórmulas, rendimiento, límites, archivos y pruebas documentados. Estado/diff y datos sensibles revisados; no se modificó `data/raw/`. | cumple |

## Evidencia reproducible

```text
python scripts/export_web_data.py --check                         OK · 26 barrios, 104 servicios
python scripts/prepare_map_data.py --check                        OK · 1 distrito, 15 UV
python scripts/generate_supabase_catalog.py --check               OK · 26 barrios, 104 servicios
python scripts/validate_supabase_sql.py --check                   OK · 3 migraciones, 2 pruebas SQL
python scripts/manage_alerts.py validar                           OK · JSON válido
python -m unittest discover -s tests -p 'test_*.py' -v           OK · 12/12
node tests/test_schedule.js                                       OK
node tests/test_incidents.js                                      OK
node tests/test_web_integration.js                                OK
node tests/test_mining_engine.mjs                                 OK · millón exacto
node tests/test_mining_integration.mjs                            OK
node tests/test_mining_frontend.js                                OK
node tests/test_visual_regression.js                              OK
node scripts/export_synthetic_demo.mjs                            OK · 1.000.000 · SHA-256 db45e8…70e61
node scripts/benchmark_mining.mjs                                 OK · 2.052,59 ms · 106,12 MiB RSS máxima
npx esbuild ... mining-analysis/index.ts                          OK · bundle 43,3 kB
python scripts/verify_supabase_public.py                          OK · 26/104 · escrituras anónimas denegadas
npx supabase db lint --remote ...                                 OK · sin errores
npx supabase db query security_checks.sql                         OK · ROLLBACK
npx supabase db query admin_flow_checks.sql                       OK · ROLLBACK
GitHub Actions run 43911176952                                    success · evento schedule
Supabase run dd4ff45e-ab9a-44df-b444-11de912c6ec9                COMPLETED · scheduled · history
```

La prueba del navegador usó respuestas controladas únicamente para visualizar el panel privado; acredita interfaz, fechas y adaptación, no persistencia. La persistencia, RLS, flujo administrativo y cron se comprobaron por separado contra Supabase/GitHub. No había una incidencia pública vigente, por lo que `verify_supabase_frontend.js` no se ejecutó contra una alerta real; las pruebas local y SQL transaccional cubren ese flujo sin publicar datos.

## Seguridad, alcance y archivos

- No aparecen claves privadas, contraseñas o documentos institucionales en el diff.
- `data/raw/`, migraciones, Auth, RLS, RPC, catálogo, alertas, mapas y workflow semanal no cambiaron.
- Los archivos nuevos (`benchmark_mining.mjs`, `mining-view.js`, prueba frontend, historia y revisión) se relacionan directamente con SCRUM-40.
- Edge Function `mining-analysis` versión 6 activa.
- Corrida demo `cb91a3ef-7c5e-4d7b-bd46-ba4cf93434fa`: `COMPLETED`, 1.000.000 registros y transacciones, 01/01/2005–19/11/2026, 44 reglas calculadas, 30 persistidas y siete series.
- Antes y después: `public.incidents` mantiene 10 filas y huella `3404a66255e9a3a053446956f0babfdd`; `incident_history` mantiene 19 filas y huella `522319b4ff90ec63e21425019e20ec40`.

## Estado previo al dictamen final

Todos los criterios disponen de artefacto y evidencia reproducible, incluida la persistencia remota. El dictamen final de `alerta-ruta-jira` se registra en SCRUM-40 sobre el diff preparado exacto antes del push.

Este dictamen técnico no sustituye la autorización del responsable para publicar datos institucionales. La solicitud de Fase 5 autoriza publicar el prototipo académico, pero no avisos operativos reales.
