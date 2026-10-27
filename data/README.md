# Datos del Proyecto Integrador

## Carpetas

- `raw/`: copia de las fuentes originales autorizadas; nunca se edita manualmente.
- `processed/`: resultados derivados con transformaciones documentadas y reproducibles.

Ambas carpetas están excluidas de Git excepto sus `.gitkeep`. El ZIP no trae datos del ejemplo de minería. Los distritos, zonas, días y turnos facilitados por el contacto de EMACRUZ son una posible fuente inicial; comprueba versión, cobertura y permiso para usar y compartir cada archivo.

Por compatibilidad con el historial anterior, `Base_Emacruz_sectores_y_frecuencias.xlsx` permanece en la raíz de `data/` y conserva exactamente su contenido original. No se duplica ni se mueve hasta que el equipo acuerde y documente una migración.

## Ficha de cada fuente

Antes de analizar un archivo, completar una ficha en `docs/fuentes-datos.md` con: nombre local, institución o enlace de origen, fecha de recepción, ámbito temporal y espacial, columnas, unidad de análisis, permiso, responsable y limitaciones. Los avisos de contingencia simulados deben llevar una marca visible de simulación.

Una frecuencia programada **no equivale** a un recojo ejecutado ni a kilos acumulados. Para investigar acumulación se requieren observaciones adicionales o un diseño de simulación identificado como tal.
