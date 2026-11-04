# Automatizaciones de la fase 2

- `export_web_data.py`: valida el Excel inmutable del Distrito 2 y genera los JSON de `data/processed/` y `web/data/`. `--check` verifica reproducibilidad sin escribir.
- `manage_alerts.py`: crea, lista, modifica, valida y retira incidencias simuladas. Usa `--help` y consulta los ejemplos exactos del `README.md`.
- `prepare_map_data.py`: verifica hashes de las fuentes ODbL y extrae de forma reproducible un límite distrital y 15 geometrías de UV. `--check` no escribe.
- `generate_supabase_catalog.py`: genera `supabase/migrations/0002_catalog.sql` desde el JSON validado. `--check` detecta desactualización.

Los scripts usan rutas relativas a la raíz del repositorio. No requieren dependencias nuevas fuera de `openpyxl`, que ya está declarada en `requirements.txt`.
