# Revisión de entrega — Fase 3 minería de datos

**Fecha:** 2026-11-11

**Historia Jira:** `SCRUM-37`, creada y verificada el 11/11/2026; independiente de `SCRUM-23`.

**Texto de trabajo:** `docs/historias/FASE-3-MINERIA.md`, derivado de la solicitud del responsable.
**Diff revisado:** árbol de trabajo sobre `2f925da`; Supabase validado, todavía sin commit, push ni publicación de GitHub Pages.

## Alcance revisado

- Actor: administrador/comunicador y proceso programado interno.
- Necesidad: convertir incidencias únicas en descriptivos, tasas sobre programación y reglas Apriori.
- Resultado observable: dashboard privado persistente, dos modos, actualización manual y semanal.
- Fuente: catálogos Supabase, `incidents` y generador sintético en memoria.
- Límites: Distrito 2, datos simulados, sin causalidad, predicción de acumulación, GPS o desempeño oficial.
- Dependencias: Supabase Auth/RLS/Edge Functions, GitHub Actions y Chart.js 4.4.7 con versión/SRI fijados.
- Decisión registrada: el esquema distingue retiradas; cancelación/prueba no existen como etiquetas y no se infieren.

## Matriz de trazabilidad

| Criterio | Archivo o artefacto | Comprobación y resultado observado | Estado |
| --- | --- | --- | --- |
| CV1 Navegación y sesión | `web/admin/index.html`, `web/admin/mineria/index.html`, `mining.js` | Playwright con Auth real: login temporal autorizado, navegación `/admin/` ↔ `/admin/mineria/`, recarga, sesión conservada y logout; API: no administrador `403`, revocado `403`, RLS no administrador 0 filas. | cumple |
| CV2 Descriptivos y gráficas calculadas | `mining-engine.mjs`, `mining.js`, `index.html` | E2E confirmó siete canvas, 180 incidencias, reglas y cero errores de consola; la corrida persistida tiene 26 barrios, 12 camiones y 7 días en `chart_data`, sin resultados hardcodeados. | cumple |
| CV3 No duplicación | `tests/test_mining_engine.mjs` | Dos versiones de `INC-1` producen total 1; dos barrios reciben conteo 1; promedio usa la versión más reciente. | cumple |
| CV4 Normalización | `mining-engine.mjs`, `docs/mineria-datos.md` | Se generan ocurrencias `servicio@fecha` y tasas por 100 programados; etiquetas y documentación niegan puntualidad real. Prueba exacta confirma dos servicios afectados en el caso multibarrio. | cumple |
| CV5 Apriori matemático | `mining-engine.mjs`, `tests/test_mining_engine.mjs` | `[AB, AB, AB, C]` produce `A → B`: soporte 0,75, confianza 1, lift 4/3, respaldo 3. | cumple |
| CV6 Demostración separada | generador compartido, prueba, rótulo HTML | Dos generaciones con semilla `20261111` son iguales, contienen 180 IDs únicos y recuperan `SIM-C01` ↔ falla mecánica; no existe código de inserción en `incidents`. | cumple |
| CV7 Historial registrado | Edge Function, motor, documentación | Corrida remota `scheduled`: 5 IDs/5 transacciones, retiradas incluidas por consulta de `incidents`, 0 reglas y mensaje “Datos insuficientes”; no consulta `incident_history`. | cumple |
| CV8 Ejecución manual y concurrencia | Edge Function, índice parcial, frontend | API y E2E guardaron corridas demo `COMPLETED` de 180 registros/64 reglas; recarga leyó persistencia; una corrida `RUNNING` temporal causó HTTP `409` y fue limpiada. | cumple |
| CV9 Automatización semanal | `.github/workflows/mining-weekly.yml` | Cron `0 7 * * 1`, modo `history`, secreto coordinado y rotado; `actionlint` sin hallazgos; el comando exacto del job generó remotamente una corrida `scheduled COMPLETED`. Tras publicar se ejecutará `workflow_dispatch` para conservar el log de Actions. | cumple |
| CV10 Seguridad | migración `0003`, `security_checks.sql`, función | Remoto: anónimo tabla/función `401`, no administrador función `403` y 0 filas, administrador `200`, escritura directa `403`, revocación `403`; SQL de seguridad y lint pasan; ninguna clave privada versionada. | cumple |
| CV11 Regresión | suite completa, servidor HTTP, Supabase público | Línea base antes/después idéntica: 5 incidencias, 13 eventos, 1 usuario, 1 admin, 26 barrios, 104 servicios y mismas huellas de funciones/políticas. Suites locales, flujo admin SQL, web pública remota y E2E pasan. | cumple |
| CV12 Documentación | `docs/mineria-datos.md`, README, fuentes y plan | Arquitectura, fórmulas, fuentes, límites, cron, manual, seguridad, configuración y guía de exposición presentes; `SCRUM-37` guarda los 12 criterios y vínculos de trazabilidad. | cumple |

## Evidencia reproducible ejecutada

```text
python scripts/export_web_data.py --check                         OK
python scripts/prepare_map_data.py --check                        OK: 1 distrito, 15 UV
python scripts/generate_supabase_catalog.py --check               OK: 26 barrios, 104 servicios
python scripts/validate_supabase_sql.py --check                    OK: 3 migraciones
python scripts/manage_alerts.py validar                            OK: 0 incidencias, referencias válidas
python -m unittest discover -s tests -p 'test_*.py' -v            OK: 12/12
node tests/test_schedule.js                                       OK
node tests/test_incidents.js                                      OK
node tests/test_web_integration.js                                OK
node tests/test_mining_engine.mjs                                 OK
node tests/test_mining_integration.mjs                            OK
node --check web/admin/mineria/mining.js                          OK
npx esbuild ... supabase/functions/mining-analysis/index.ts       OK: bundle 32,6 kB
python scripts/verify_supabase_public.py                           OK remoto: 26/104, 0 vigentes, escritura anon denegada
HTTP local /, /admin/, /admin/mineria/, mining.js                 200
npx supabase db push --dry-run                                    OK: sólo aplicaría 0003
npx supabase db lint --remote                                     OK: sin errores actuales
Auditoría remota Supabase                                         0001/0002/0003 y mining-analysis activas
Secretos de automatización                                        configurados en Supabase y GitHub; valor no versionado
Prueba Auth/RLS temporal                                           no admin 403/0 filas; admin 200; escritura 403; revocado 403
Corrida manual demo                                                COMPLETED, 180 transacciones, 64 reglas
Corrida programada equivalente                                    COMPLETED, history, 5 transacciones, 0 reglas
Control de concurrencia                                            segunda ejecución HTTP 409
Playwright/Chromium E2E                                            1/1: sesión, botón, gráficas, recarga, público, logout
actionlint v1.7.12                                                  workflows de minería y Pages sin hallazgos
```

No se pudo levantar Supabase local por permisos de Docker; se sustituyó con las pruebas autorizadas contra el proyecto remoto y cuentas temporales eliminadas.

## Datos sensibles y alcance

- `data/raw/` no cambia.
- No se agregan contraseñas, JWT, tokens ni valores `sb_secret_...`.
- La publishable key existente sigue siendo la única clave en `web/`.
- El workflow referencia un GitHub Secret por nombre, no por valor.
- El generador sintético no escribe en `incidents`.
- No cambian mapas, consulta pública, RPC de incidencias ni tablas existentes de forma destructiva.

## Dictamen actual

**APROBADO** para preparar commit y push de la versión exacta revisada, sujeto a repetir el control si cambia cualquier archivo.

Los 12 criterios de `SCRUM-37` cumplen con evidencia local/remota. La primera ejecución real de GitHub Actions sólo puede ocurrir después de que el workflow exista en la rama predeterminada; su comando exacto ya produjo la corrida remota esperada y `actionlint` validó el workflow. Después del push se ejecutará `workflow_dispatch` y se verificará el log y la fila nueva antes de considerar finalizada la publicación.

La aprobación técnica no sustituye autorización institucional para publicar datos oficiales; esta entrega conserva exclusivamente datos del prototipo académico.
