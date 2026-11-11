# Automatizaciones de Alerta Ruta

- `export_web_data.py`: valida el Excel inmutable del Distrito 2 y genera los JSON de `data/processed/` y `web/data/`. `--check` verifica reproducibilidad sin escribir.
- `manage_alerts.py`: crea, lista, modifica, valida y retira incidencias simuladas. Usa `--help` y consulta los ejemplos exactos del `README.md`.
- `prepare_map_data.py`: conserva y verifica para trazabilidad un límite distrital y 15 geometrías de UV en `data/processed/`. El frontend ya no consume este GeoJSON. `--check` no escribe.
- `generate_supabase_catalog.py`: genera `supabase/migrations/0002_catalog.sql` desde el JSON validado. `--check` detecta desactualización.
- `validate_supabase_sql.py`: detecta delimitadores o tuplas sin cerrar y comprueba migraciones, plantillas, pruebas, 26 barrios y 104 servicios consecutivos.
- `verify_supabase_public.py`: usa solo la URL y publishable key de `web/config.js` para comprobar catálogos, lectura pública y denegación anónima de tablas/RPC de escritura.
- `verify_supabase_frontend.js`: aplica la lógica real de `web/incidents.js` a las incidencias vigentes de Supabase y confirma qué barrios muestran el aviso.

Los scripts usan rutas relativas a la raíz del repositorio. No requieren dependencias nuevas fuera de `openpyxl`, que ya está declarada en `requirements.txt`.

La fase de minería no agrega un script Python alternativo: usa un único motor JavaScript compatible con Node/Deno en `supabase/functions/_shared/mining-engine.mjs`, probado por `tests/test_mining_engine.mjs`. Así la ejecución manual y la semanal no pueden divergir por usar implementaciones distintas. Chart.js se carga en el navegador desde una versión fijada y no modifica las dependencias Python.
