# Matriz de trazabilidad — mapa interactivo y administración

> Revisión histórica del commit `896d01b`. El alcance cartográfico fue sustituido posteriormente por el visor simple solicitado en SCRUM-14; no usar esta matriz como estado vigente.

Fecha de revisión: 2026-11-04. Historias vigentes consultadas directamente en Jira: SCRUM-14, SCRUM-15 y SCRUM-19. Las tres permanecen en «Por hacer» durante la preparación; esta matriz no las cierra ni sustituye la revisión previa al push.

## SCRUM-14 — mapa interactivo

| Criterio Jira | Artefacto | Comprobación y resultado | Estado |
| --- | --- | --- | --- |
| CV1 Mapa real y atribución | `web/index.html`, `web/map.js` | Leaflet 1.9.4 con SRI, tesela OSM exacta, atribución visible y fallback; CDN respondió HTTP 200 y sitio local respondió HTTP 200. | cumple |
| CV2 Límite y 15 UV | `scripts/prepare_map_data.py`, `data/raw/geodata/`, `web/data/geodata/distrito-2-uv.geojson` | `python scripts/prepare_map_data.py --check`: 1 distrito, 15 UV y hashes esperados; prueba Python confirma 16 entidades. | cumple |
| CV3 Selección sincronizada | `web/app.js`, `web/map.js` | Los 26 barrios se relacionan con una UV existente; `tests/test_web_integration.js` comprueba cada relación y el código usa una sola función de selección para mapa/ficha. | cumple |
| CV4 Filtros y secuencia | `web/map.js`, `web/index.html` | Prueba compara filtro camión/día con los servicios y orden `orden_camion`; UI declara que la secuencia no es trayectoria. | cumple |
| CV5 Alertas y prioridad | `web/incidents.js`, `web/map.js` | `node tests/test_incidents.js` verifica suspensión sobre demora, vigencia y barrio no afectado. Estado también tiene texto/leyenda. | cumple |
| CV6 Responsive y accesibilidad | `web/styles.css`, `web/index.html` | Breakpoints 1050/820/650/600 px, controles etiquetados, estados con texto y color, mapa `width:100%`; inspección HTML: sin IDs duplicados ni recursos locales ausentes. | cumple |

## SCRUM-15 — lectura pública de incidencias

| Criterio Jira | Artefacto | Comprobación y resultado | Estado |
| --- | --- | --- | --- |
| CV1 Supabase o fallback único | `web/supabase-data.js`, `web/config.js` | `tests/test_web_integration.js` simula respuesta Supabase y fallback JSON; la fuente no se mezcla y la UI muestra el modo. | cumple |
| CV2 Alcance temporal/servicio | `web/incidents.js`, migración `0001` | Pruebas lunes/miércoles verifican que solo servicios solapados entran; SQL vuelve a validar cada ID. | cumple |
| CV3 Prioridad | `web/incidents.js`, `web/schedule-utils.js` | Pruebas Node verifican suspensión > demora y desempate por actualización. | cumple |
| CV4 Presentación segura | `web/app.js`, `web/admin/admin.js` | Datos dinámicos se insertan con `textContent`/`createTextNode`; búsqueda `rg innerHTML` sin resultados; prueba conserva texto con etiqueta sin evaluarlo. | cumple |
| CV5 Sin secretos | `web/config.js`, `docs/configurar-supabase.md` | Configuración vacía; búsqueda de patrones sensibles sin credenciales. Solo se documenta publishable key. | cumple |

## SCRUM-19 — panel administrativo

| Criterio Jira | Artefacto | Comprobación y resultado | Estado |
| --- | --- | --- | --- |
| CV1 Auth y sesión | `web/admin/admin.js`, `admin-core.js` | Cliente simulado prueba login/logout y pertenencia autorizada/no autorizada; sin configuración el panel no construye cliente ni permite escritura. | cumple |
| CV2 Alcance calculado | `web/admin/admin.js`, `web/incidents.js` | Pruebas verifican camión por día, restricción a barrio y rechazo mediante alcance vacío en la UI. Minutos solo se habilitan para demora. | cumple |
| CV3 Persistencia validada | `supabase/migrations/0001_alerta_ruta_schema.sql` | Funciones de seguridad validan admin, estado, motivo, fechas, objetivo, referencias y ocurrencia; catálogo se deriva reproduciblemente. Pruebas estáticas pasan. | cumple |
| CV4 Gestión e historial | panel y migración `0001` | Clasificación activa/programada/vencida/retirada probada; edición y confirmación de retiro presentes; trigger registra valores anterior/nuevo y usuario. | cumple |
| CV5 RLS y mínimo privilegio | migración `0001`, `supabase/tests/security_checks.sql` | RLS en cinco tablas; anon sin escritura; navegador usa RPC; prueba Python y revisión de grants/policies pasan. | cumple |
| CV6 Actualización pública | `web/supabase-data.js`, panel, migración | Realtime solicita recarga y sondeo de 60 s actúa de respaldo; RLS oculta vencidas/retiradas. Cliente simulado prueba lectura/RPC. | cumple |

## Evidencia común ejecutada

```text
python -m unittest discover -s tests -v          → 6 pruebas, OK
node tests/test_schedule.js                      → cumple
node tests/test_incidents.js                     → cumple
node tests/test_web_integration.js               → cumple
python scripts/export_web_data.py --check        → actualizado
python scripts/prepare_map_data.py --check       → 1 distrito y 15 UV
python scripts/generate_supabase_catalog.py --check → 26 barrios y 104 servicios
python scripts/manage_alerts.py validar           → JSON válido, 0 incidencias
node --check sobre JavaScript nuevo              → sin errores
git diff --check                                 → sin errores
HTTP local /, /admin/, config.js y GeoJSON       → 200; GeoJSON 16 entidades, ODbL
CDN Supabase 2.45.4 y Leaflet 1.9.4              → HTTP 200
```

## Límite externo explícito

No existe todavía URL, publishable key ni primera cuenta de un proyecto Supabase aportado por el responsable. Por ello no se ha ejecutado `supabase/tests/security_checks.sql` contra una base remota ni se ha probado un login real. La implementación y los caminos simulados cumplen los criterios vigentes, pero la activación operativa del panel permanece pendiente y no debe describirse como conectada. `docs/configurar-supabase.md` contiene el procedimiento exacto.
