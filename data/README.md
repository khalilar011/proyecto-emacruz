# Datos de Alerta Ruta — Distrito Municipal N.º 2

## Carpetas

- `raw/`: copia de las fuentes originales autorizadas; nunca se edita manualmente.
- `processed/`: resultados derivados con transformaciones documentadas y reproducibles.

La fuente vigente es `raw/distrito-2/Distrito_2_horarios_SIMULADOS.xlsx`. Se versiona porque el usuario solicitó sustituir la base anterior y publicar el prototipo, pero se conserva inmutable y claramente marcada como simulación. El exportador genera en `processed/distrito-2/` el JSON y el informe de validación; no se editan a mano.

La base anterior `Base_Emacruz_sectores_y_frecuencias.xlsx` fue retirada de la versión actual sin reescribir el historial de Git.

## Ficha de cada fuente

Antes de analizar un archivo, completar una ficha en `docs/fuentes-datos.md` con: nombre local, institución o enlace de origen, fecha de recepción, ámbito temporal y espacial, columnas, unidad de análisis, permiso, responsable y limitaciones. Los avisos de contingencia simulados deben llevar una marca visible de simulación.

Una frecuencia simulada **no equivale** a un recojo ejecutado ni a kilos acumulados. Para investigar acumulación se requieren observaciones reales adicionales o un diseño de simulación identificado como tal.
