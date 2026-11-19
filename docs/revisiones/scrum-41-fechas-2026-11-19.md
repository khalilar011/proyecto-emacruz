# Revisión de SCRUM-41 — Intervalos sintéticos

**Fecha:** 19/11/2026 (`America/La_Paz`)

**Historia Jira:** `SCRUM-41` — Ejecutar el millón sintético en cualquier intervalo de fechas

**Épica CRISP-DM:** `SCRUM-30` — Fase 4, Modelado; validación en Fase 5

**Base:** `f6c73a1c2f2667d31616663ed2a79b7ca65e13d9`

## Alcance revisado

La historia vigente se creó y volvió a leer en Jira antes de implementar. Define al administrador/comunicador como actor, el intervalo inclusivo como entrada, 1.000.000/1.000.000 como resultado observable, el catálogo y generador como fuentes y la conservación completa de Historial como límite. Los filtros de barrio/camión mantienen su semántica existente y no forman parte de esta corrección temporal.

## Matriz de trazabilidad

| Criterio Jira | Archivo o artefacto | Comprobación y resultado observado | Estado previo a publicación |
| --- | --- | --- | --- |
| CV1 · Intervalos y límites | `supabase/functions/_shared/mining-engine.mjs`; `tests/test_mining_engine.mjs` | Corridas completas 2015–2020, 2018–2026, febrero de 2037, 10–11/06/2040 y 10/06/2040: cada una 1.000.000 registros y transacciones, extremos exactos, cero fuera de rango y suma temporal 1.000.000. | cumple |
| CV2 · Vacíos e inválidos | motor, Edge Function y `web/admin/mineria/mining.js` | Ambos vacíos conservan 2005-01-01–2026-11-19. Fecha inexistente, orden inverso o un solo campo se rechazan; Edge devuelve 400 antes de crear `RUNNING`, frontend muestra el mensaje. | cumple |
| CV3 · Reproducibilidad e IDs | motor y prueba | Igual semilla/intervalo produce objetos idénticos; IDs secuenciales únicos `DEMO-0000001`–`DEMO-1000000`; mínimo/máximo observados coinciden con Desde/Hasta. | cumple |
| CV4 · Apriori | motor y prueba | Caso `[AB, AB, AB, C]` mantiene soporte 0,75, confianza 1, lift 4/3 y respaldo 3. En cada corrida del millón, `support = support_count / 1.000.000`; reglas calculadas, no prefabricadas. | cumple |
| CV5 · Resultado completo | motor, frontend y pruebas | Siete series en cada corrida. Evolución anual para periodos largos, diaria para mes/dos días/un día; motivos y evolución suman un millón. Indicadores, reglas y hallazgos se reconstruyen por ejecución. | cumple |
| CV6 · Persistencia acotada | Edge Function; `prepare_demo_run_sql.mjs`; benchmark | Solo se guardan agregados. Bundle esbuild 47,0 kB. Benchmark: 1.000.000/1.000.000, 2.985 perfiles, 44 reglas, 1.616,81 ms y 101,48 MiB RSS. Cinco filas remotas `COMPLETED` guardan 1.000.000/1.000.000, siete series y reglas válidas. Edge `mining-analysis` versión 7 `ACTIVE`. | cumple |
| CV7 · Historial y seguridad | diff, suites y snapshots remotos | No cambian migraciones, RLS, Auth, administración, cron ni `data/raw/`. Antes y después: 10 incidencias, huella `0cd998827e808c1e796224f67a54c2ef`; 19 eventos, huella `6c3a971cf0ca543031bf8d1ae7a8faf0`; última history `dd4ff45e…`, 10/10, sin cambios. | cumple |
| CV8 · Control de publicación | Jira, esta matriz, diff y dictamen | Historia vigente verificada; pruebas locales completas y diff limpio. Falta dictamen sobre la versión exacta, validación remota y revisión final previa al push. | bloqueado |

## Evidencia local reproducible

```text
python exportadores/validadores + unittest                          OK · 12/12
node tests/test_schedule.js                                         OK
node tests/test_incidents.js                                        OK
node tests/test_web_integration.js                                  OK
node tests/test_mining_engine.mjs                                   OK · seis corridas del millón, incluida la predeterminada
node tests/test_mining_integration.mjs                              OK
node tests/test_mining_frontend.js                                  OK
node tests/test_visual_regression.js                                OK
node scripts/benchmark_mining.mjs                                   OK · 1.616,81 ms · 101,48 MiB
npx esbuild ... mining-analysis/index.ts                            OK · 47,0 kB
prepare_demo_run_sql --start 2040-06-10 --end 2040-06-10           OK · 1.000.000/1.000.000 · 7 series
Supabase Edge Function                                              ACTIVE · versión 7
Supabase runs 8ddc9e47 / be218177 / ac19e564 / a4c1b96d / 145bd578  COMPLETED · cinco intervalos · 1.000.000/1.000.000
git diff --check                                                    OK
```

Las cinco filas remotas confirman extremos iguales a `period_start`/`period_end`, `synthetic_out_of_range_records = 0`, siete claves de gráficas, evolución de 6/9/28/2/1 puntos, sumas de motivos y evolución iguales a 1.000.000, 30 reglas persistidas y soporte matemáticamente coherente con el respaldo. Las corridas se insertaron como agregados mediante el mecanismo temporal aprobado; la autenticación administrativa del botón no se sustituyó ni se modificó.

## Seguridad y límites

- Los datos son sintéticos y continúan rotulados como demostración académica.
- No se modifican fuentes originales, incidencias, eventos históricos, permisos ni automatización semanal.
- El navegador recibe indicadores, siete series, reglas y hallazgos, nunca el millón individual.
- El SQL temporal de validación agrega una fila de resultados y no escribe en `public.incidents` ni `public.incident_history`.
- La aprobación técnica no autoriza avisos institucionales reales.
