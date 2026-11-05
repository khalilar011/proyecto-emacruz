# Matriz de trazabilidad — panel de demoras y visor simple

Fecha: 2026-11-04. Base revisada: `main` en `896d01b`. Historias consultadas después de actualizar su alcance: SCRUM-14, SCRUM-15 y SCRUM-19, todas bajo SCRUM-30 y todavía en «Por hacer».

La revisión incorpora evidencia local y del proyecto real `alerta-ruta-emacruz` (`isbjpdslwhpbqfhwxvqr`). La URL y publishable key están configuradas; las claves privadas, contraseñas y tokens no forman parte del repositorio.

## SCRUM-14 — visor sencillo

| Criterio Jira | Artefacto | Evidencia reproducible | Resultado |
| --- | --- | --- | --- |
| CV1 Tres referencias | `web/index.html`, `web/data/distrito-2.json`, `web/assets/maps/` | Prueba Python exige los tres archivos; HTTP local devolvió 200 para barrios, UV y plano municipal. | cumple |
| CV2 Cambio comprensible | `web/app.js`, `web/map-viewer.js` | `node tests/test_web_integration.js` comprueba catálogo único `barrios/plano/uv`; la selección actualiza imagen, título, `alt` y `aria-pressed` con nodos seguros. | cumple |
| CV3 Ampliación | `web/index.html`, `web/app.js`, `web/map-viewer.js` | Prueba Node comprueba límites 75 %–300 %; diálogo nativo, cierre por botón/fondo/Escape y devolución explícita del foco al botón. | cumple |
| CV4 Sin cartografía compleja | `web/index.html`, eliminación de `web/map.js` y `web/data/geodata/` | Prueba Python rechaza Leaflet y controles interactivos; búsqueda no encuentra carga cartográfica en el frontend. | cumple |
| CV5 Responsive y accesible | `web/styles.css`, `web/index.html` | Reglas a 820/600 px, visor a `100vw/100vh`, pestañas flexibles, botones etiquetados, `alt`, IDs únicos y recursos locales existentes. No había motor gráfico instalado para una captura visual real. | cumple |

## SCRUM-15 — consulta pública

| Criterio Jira | Artefacto | Evidencia reproducible | Resultado |
| --- | --- | --- | --- |
| CV1 Supabase o respaldo único | `web/supabase-data.js`, `web/config.js`, `scripts/verify_supabase_public.py` | Cliente simulado y fallback pasan Node; REST real leyó la incidencia vigente y volvió a cero tras retirarla. | cumple |
| CV2 Vigencia y servicio | `web/incidents.js`, `supabase/migrations/0001_alerta_ruta_schema.sql` | `node tests/test_incidents.js` comprueba solapamiento; las RPC vuelven a validar ocurrencia semanal. | cumple |
| CV3 Prioridad | `web/incidents.js` | Prueba Node comprueba suspensión antes que demora y normal solo por ausencia. | cumple |
| CV4 Presentación segura | `web/app.js`, `web/admin/admin.js` | Los valores dinámicos usan `textContent`/`createTextNode`; no se usa `innerHTML`, `eval` ni HTML procedente de incidencias. | cumple |
| CV5 Sin secretos | `web/config.js`, `supabase/config.toml`, `docs/configurar-supabase.md` | Solo URL y `sb_publishable_…`; búsqueda del índice no encuentra `sb_secret`, `service_role` ni JWT heredados. | cumple |

## SCRUM-19 — panel administrativo

| Criterio Jira | Artefacto | Evidencia reproducible | Resultado |
| --- | --- | --- | --- |
| CV1 Autenticación y sesión | `web/admin/admin.js`, `web/admin/admin-core.js`, Supabase Auth | Usuario único confirmado y autorizado; el responsable inició sesión en `/admin/`, publicó y cerró el ciclo desde el navegador. Las RPC rechazaron un UUID autenticado sin membresía. | cumple |
| CV2 Formulario y valores simples | `web/admin/index.html`, `web/admin/admin.js`, `web/incidents.js` | DEMORA/lluvia/45 min, próximo servicio y ahora + 4 h; prueba Node verifica próxima ventana de `SIM-C01`; NORMAL no aparece. | cumple |
| CV3 Alcance legible | `web/admin/admin.js`, catálogo de 104 servicios | Vista previa y tabla muestran barrio, UV, día, horario y camión; `buildScope` se prueba con días coincidentes/no coincidentes. | cumple |
| CV4 Persistencia SQL | `scripts/generate_supabase_catalog.py`, `scripts/validate_supabase_sql.py`, migraciones | `db push` aplicó `0001/0002`; linter remoto sin errores; consultas confirmaron 26 barrios, 104 servicios, 5 tablas RLS, 6 políticas y 3 RPC. | cumple |
| CV5 Gestión e historial | panel, RPC, trigger y `supabase/tests/admin_flow_checks.sql` | Navegador real creó, editó y retiró; la base registró `CREATED, UPDATED, UPDATED, RETIRED`, todos atribuidos al administrador. | cumple |
| CV6 Seguridad y actualización | migración `0001`, pruebas SQL, scripts de verificación pública | `security_checks.sql` y flujo transaccional pasan; REST deniega tabla admin/escritura/RPC anónima; alerta activa fue visible en Totai y desapareció al retirarla. | cumple |

## Pruebas ejecutadas

```text
python -m unittest discover -s tests -p 'test_*.py' -v  → 12/12 OK
node tests/test_schedule.js                              → cumple
node tests/test_incidents.js                             → cumple
node tests/test_web_integration.js                       → cumple
node --check (6 archivos JavaScript)                     → sin errores
export_web_data.py --check                               → 26 barrios / 104 servicios
prepare_map_data.py --check                              → 1 distrito / 15 UV, derivado no publicado
generate_supabase_catalog.py --check                     → 26 / 104
validate_supabase_sql.py --check                         → 2 migraciones / 1 plantilla / 2 pruebas válidas
manage_alerts.py validar                                 → 0 incidencias, JSON válido
git diff --check                                         → sin errores
HTTP local                                               → /, /admin/, JSON y tres mapas: 200
db lint --remote                                         → sin errores de esquema
security_checks.sql                                      → cumple en PostgreSQL real
admin_flow_checks.sql                                    → crear/editar/vencer/retirar/RLS; ROLLBACK
verify_supabase_public.py                                → 26/104; escrituras anon denegadas
verificación navegador                                  → login, alta, edición, Totai visible y retiro
```

## Decisión

SCRUM-14, SCRUM-15 y SCRUM-19 tienen artefacto y evidencia reproducible para todos sus criterios. La entrega queda lista para la revisión exacta `alerta-ruta-jira` previa al push; esta matriz no sustituye ese dictamen ni la autorización del responsable.
