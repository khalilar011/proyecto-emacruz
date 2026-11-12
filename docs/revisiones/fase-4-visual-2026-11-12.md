# Revisión de entrega — Fase 4 visual

**Fecha:** 2026-11-12

**Historia Jira:** `SCRUM-38`

**Épica CRISP-DM:** `SCRUM-32` — Fase 6, Despliegue; regresión de fase 5, Evaluación

**Base funcional:** commit `999932f`
**Versión revisada:** diff preparado sobre `999932f`, 24 archivos de SCRUM-38; pendiente de commit, push y despliegue

## Alcance y decisiones

- Actores: vecino; operador/supervisor y administrador/comunicador según los permisos ya documentados.
- Necesidad: mejorar claridad, identidad, responsividad y presentación de las tres rutas.
- Resultado observable: identidad Smart City Urbana, logo oficial, portada cruceña y tema persistente.
- Límites: cero cambios a negocio, datos, rutas, Supabase, Auth, RLS, Edge Functions, Apriori, cron, horarios, alertas y mapas.
- Fuentes: no se incorporan fuentes de datos. Los logos proceden de Descargas y fueron confirmados visualmente; la portada es una ilustración original sin marca institucional.
- Decisión: el logo conserva fondo blanco dentro de un contenedor claro para no eliminar sus trazos blancos ni reinterpretar el original.
- Decisión: la preferencia se guarda sólo como `alerta-ruta-theme`; la primera visita usa `prefers-color-scheme`.
- Decisión: el tema de las gráficas lee variables CSS; los datos y eventos de Chart.js no cambian.
- No se agregó dependencia de producción. Playwright 1.56.1 y Chromium se instalaron temporalmente en `/tmp` para capturas y pruebas.

## Matriz de trazabilidad

| Criterio Jira | Archivo o artefacto | Comprobación y resultado observado | Estado |
| --- | --- | --- | --- |
| CV1 Contrato funcional | `tests/test_visual_regression.js`, HTML, hashes base | La prueba conserva hashes de `app.js`, `admin.js`, fuentes públicas, configuración, funciones, migraciones y workflow; IDs principales presentes. Suite previa y posterior verde. `mining.js` sólo agrega lectura de variables visuales y redibujado por evento de tema. | cumple |
| CV2 Identidad oficial | `web/assets/brand/`, tres HTML | Inspección visual confirmó el monograma AR, ruta, camión, reciclaje, hoja y marcador; cartel con lema exacto. WebP de 36/59 kB y favicon PNG de 5,8 kB; rutas locales verificadas. | cumple |
| CV3 Tema persistente | `web/theme.js`, variables CSS, `test_visual_regression.js` | Primera visita oscura del sistema, cambio inmediato, `localStorage`, navegación `/` → `/admin/` y recarga; claro/oscuro en tres rutas. Sin parpadeo al aplicar el tema con script bloqueante antes de CSS. | cumple |
| CV4 Página pública | `web/index.html`, `styles.css`, ilustraciones, capturas | Chromium: 26 opciones + placeholder; búsqueda Chacarrilla → 1 coincidencia; ficha/alerta visible; mapa abre y llega a 125 %. Portada separa imagen de controles. Capturas claro/oscuro inspeccionadas. | cumple |
| CV5 Administración | `web/admin/index.html`, `admin.css`, capturas, consulta remota 12/11 y validación del responsable | Formulario real cargó 26/104, controles, cobertura y tabla; DOM y `admin.js` protegido por hash. Supabase confirma que `bfe84ee8…` (`SIM-C08`) tiene `retired_at=2026-11-12 04:43:12.20163+00`, ciclo `RETIRADA` e historial `CREATED → RETIRED`. El responsable confirmó que cerró sesión, volvió a iniciar y observó que permanecía retirada. | cumple |
| CV6 Minería | `web/admin/mineria/`, `mining.js`, suites, consulta remota 12/11 y validación del responsable | Corrida manual `b89f9b17…` `COMPLETED`: 180 registros/transacciones, 64 reglas totales, 30 persistidas y siete datasets (`26/12/4/7/3/26/5`). Indicadores, `chart_data` y reglas tienen hashes idénticos a la corrida demo anterior; filtros y umbrales coinciden. El responsable confirmó que revisó las siete gráficas con datos en los modos claro y oscuro. | cumple |
| CV7 Responsividad y accesibilidad | CSS compartido, tres HTML, evidencia Chromium | Sin desbordamiento horizontal en `/`, `/admin/` y `/admin/mineria/` a 390, 768 y 1440 px; foco `:focus-visible`, etiquetas/ARIA conservadas, selector nombrado y `prefers-reduced-motion` reduce transiciones. | cumple |
| CV8 Datos y seguridad | suite completa, `verify_supabase_public.py`, hashes | 12/12 Python y seis suites Node aprobadas; remoto de sólo lectura: 26 barrios, 104 servicios, 4 incidencias vigentes y escritura anónima denegada. Sin cambios en `data/`, Supabase, secretos, migraciones, funciones o workflow. | cumple |
| CV9 Evidencia y publicación | este archivo, `reports/figures/fase-4-visual/`, Jira | Seis capturas presentes; validación manual autenticada registrada; persistencia de Supabase y corrida de minería verificadas de sólo lectura. Historia vigente y diff preparado completo revisados con `alerta-ruta-jira`; todos los criterios cumplen. | cumple |

## Evidencia local ejecutada

```text
Línea base antes del rediseño
python scripts/export_web_data.py --check                         OK
python scripts/prepare_map_data.py --check                        OK: 1 distrito, 15 UV
python scripts/generate_supabase_catalog.py --check               OK: 26 barrios, 104 servicios
python scripts/validate_supabase_sql.py                            OK: 3 migraciones
python scripts/manage_alerts.py validar                            OK: 0 incidencias locales
python -m unittest discover -s tests -p 'test_*.py' -v            OK: 12/12
cinco suites Node existentes                                      OK

Después del rediseño
node tests/test_visual_regression.js                              OK: hashes, DOM, assets y tema
python -m unittest discover -s tests -p 'test_*.py' -v            OK: 12/12
node tests/test_schedule.js                                       OK
node tests/test_incidents.js                                      OK
node tests/test_web_integration.js                                OK
node tests/test_mining_engine.mjs                                 OK
node tests/test_mining_integration.mjs                            OK
node --check de módulos JavaScript                                OK
python scripts/verify_supabase_public.py                           OK remoto: 26/104, 4 vigentes, escritura anónima denegada
Chromium headless                                                  búsqueda, ficha, mapa 125 %, temas y consola OK
Viewports 390/768/1440                                             tres rutas sin desbordamiento
Supabase SQL `--remote --read-only`                                alerta `bfe84ee8…`: RETIRADA, `CREATED → RETIRED`
Supabase SQL `--remote --read-only`                                minería `b89f9b17…`: COMPLETED, 7 datasets, hashes estables
```

## Capturas

- `reports/figures/fase-4-visual/publica-light.png`
- `reports/figures/fase-4-visual/publica-dark.png`
- `reports/figures/fase-4-visual/administracion-light.png`
- `reports/figures/fase-4-visual/administracion-dark.png`
- `reports/figures/fase-4-visual/mineria-light.png`
- `reports/figures/fase-4-visual/mineria-dark.png`

Las capturas privadas son una inspección estructural local: se reveló el DOM ya servido, sin eludir RLS, consultar datos privados ni ejecutar mutaciones. Las gráficas aparecen vacías porque no se usó una sesión autenticada; no se inventaron resultados.

## Recursos y procedencia

- Logo: copia optimizada de `Logo ecológico AlertaRuta con carretera y camión de reciclaje.png`.
- Cartel: copia optimizada del archivo horizontal `Logo ecológico Alerta Ruta…png`, identificado por contenido y lema.
- Portada: generada con la skill `imagegen`; ilustración editorial original, sin texto, logo, sello ni marca institucional. Prompt final: Catedral Metropolitana de San Lorenzo y camión genérico en una composición Smart City 16:9, paleta verde/petróleo/naranja, espacio para HTML, sin UI incrustada ni aval oficial.

## Datos sensibles, permisos y alcance

- `data/raw/` y `data/processed/` no cambian.
- No se agregaron contraseñas, tokens, claves privadas o documentos institucionales.
- La publishable key existente no cambia.
- Roles y permisos no cambian: vecino consulta; administrador autorizado escribe mediante RPC y RLS.
- Los avisos continúan rotulados como simulación académica y no oficiales.
- No se agrega GPS, reclamos, mapas interactivos, causalidad o predicción de acumulación.

## Evidencia manual aportada por el responsable

El 12/11/2026, el responsable del proyecto confirmó explícitamente que retiró `SIM-C08`, cerró y volvió a iniciar sesión y comprobó que continuaba `RETIRADA`; también revisó las siete gráficas de minería en claro y oscuro y aprobó el diseño. Esta confirmación completa la observación autenticada, pero no se presenta como captura ni como prueba automatizada. La persistencia de la retirada y la estructura de la corrida se contrastaron independientemente mediante consultas remotas de sólo lectura.

## Dictamen actual

**APROBADO** para commit, push y despliegue del diff preparado de `SCRUM-38` sobre `999932f`, revisado el 12/11/2026.

La historia vigente es clara, los nueve criterios cuentan con artefacto y evidencia verificable, la suite repetida está verde y el conjunto preparado contiene únicamente los 24 archivos justificados por la fase visual. No hay cambios en datos, permisos, credenciales, backend, Supabase, algoritmos o workflows. La autorización del responsable para publicar consta en la solicitud actual; el despliegue resultante deberá verificarse por separado. Cualquier cambio posterior a este conjunto invalida el dictamen y exige repetir la revisión.
