# Automatizaciones de la fase 2

- `export_web_data.py`: valida el Excel inmutable del Distrito 2 y genera los JSON de `data/processed/` y `web/data/`. `--check` verifica reproducibilidad sin escribir.
- `manage_alerts.py`: crea, lista, modifica, valida y retira incidencias simuladas. Usa `--help` y consulta los ejemplos exactos del `README.md`.

Ambos scripts usan rutas relativas a la raíz del repositorio. No requieren dependencias nuevas fuera de `openpyxl`, que ya está declarada en `requirements.txt`.
