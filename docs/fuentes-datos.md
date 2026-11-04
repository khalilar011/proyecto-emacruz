# Registro de fuentes

Completar una ficha por cada archivo antes de incorporarlo al análisis. Guardar el propio archivo en `data/raw/` y conservarlo sin modificaciones.

| Campo | Valor por completar |
| --- | --- |
| Nombre del archivo | `Distrito_2_horarios_SIMULADOS.xlsx` |
| Fuente e interlocutor | Archivo suministrado por el usuario; hoja `Fuentes` remite al diagnóstico municipal del DM-2. |
| Fecha de recepción y versión | Localizado el 2026-11-04; SHA-256 `35fa74023ffdbfb7ac894a2dd961724af5414ac4d702ce53f53eb81ae8c8c47e`. |
| Periodo y cobertura espacial | Semana tipo simulada; Distrito Municipal N.º 2 de Santa Cruz de la Sierra. No acredita vigencia operativa. |
| Unidad de análisis | Barrio y servicio programado por día. |
| Columnas y definiciones | Documentadas en la hoja `Diccionario`; 26 barrios, 15 UV, 104 servicios y 12 camiones ficticios. |
| Permiso de uso y publicación | El usuario autorizó incorporarlo al repositorio para este prototipo académico. No autoriza presentarlo como información institucional real. |
| Calidad, ausencias y supuestos | Validaciones en `data/processed/distrito-2/validacion.json`; no contiene rutas, coordenadas, ejecución real, capacidad, descarga ni tiempos de viaje. |
| Responsable del equipo | Equipo Alerta Ruta. |

Los mapas publicados en `web/assets/maps/` son los tres insumos suministrados para orientación del Distrito 2. Dos reproducen páginas del diagnóstico municipal y uno es un plano general. No están georreferenciados para la aplicación; por ello no se trazan recorridos ni se asignan coordenadas.

## Geodatos abiertos para el mapa interactivo

| Campo | Valor |
| --- | --- |
| Fuente de descarga | [Hogaria — Datos geográficos abiertos de Bolivia](https://hogaria.com/geo) |
| Versión consultada | `2026-10`, descargada el 2026-11-04 |
| Procedencia declarada | GAMSCS / Guía Urbana para geometrías de Santa Cruz y colaboradores de OpenStreetMap |
| Licencia declarada | Open Database License 1.0 (ODbL) |
| Archivos originales | `data/raw/geodata/hogaria-2026-10-distritos.geojson` y `hogaria-2026-10-barrios.geojson` |
| SHA-256 distritos | `5390f1fa43377c15424ca6a2d85784f8d01f2ca22b7d9cc0450d3b731c991f82` |
| SHA-256 barrios/UV | `442084e4e3c79e1340be4e40b0e250176f7363bfd0671c21c93cbfaa19c822b5` |
| Derivado publicado | `web/data/geodata/distrito-2-uv.geojson` |
| Contenido usado | Un límite de `070101-distrito-2` y 15 geometrías correspondientes a las UV 15–22 y 37–43 |

`scripts/prepare_map_data.py` verifica los hashes antes de extraer el derivado. La correspondencia de códigos fuente con números de UV se contrastó con la Guía Urbana y los mapas suministrados. La capa fuente denomina algunas entidades por barrios de referencia, por lo que la aplicación las presenta únicamente como UV.

La fuente no aporta límites verificables para cada uno de los 26 barrios de la programación ni recorridos de recolección. En consecuencia, seleccionar un barrio centra su UV, y seleccionar un camión resalta cobertura y secuencia de servicios; no se dibujan trayectorias por calles. La cartografía base usa teselas estándar de OpenStreetMap con atribución visible, sin precarga ni descarga masiva.

Los pesos o volúmenes acumulados no deben llenarse con cifras inventadas. La programación de esta fase no permite validar un modelo predictivo de acumulación.
