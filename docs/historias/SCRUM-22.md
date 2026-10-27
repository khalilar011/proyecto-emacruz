# CRISP-DM 3 · Crear un Excel piloto de sectores, distritos y avisos simulados

## Historia de usuario

Como integrante del equipo de Alerta Ruta, necesito preparar un Excel de prueba con seis distritos y sus sectores, las frecuencias disponibles y avisos simulados, para contar con una base pequeña que podamos revisar y usar en la futura demostración del proyecto.

**CRISP-DM:** fase 3 — Preparación de los datos. **Épica:** SCRUM-29.

## Producto final

Un archivo local: `data/processed/SCRUM-22_piloto.xlsx`, con cuatro hojas:

| Hoja | Contenido |
| --- | --- |
| Distritos_piloto | Seis distritos con su identificador, nombre y sector tomados del Excel fuente. |
| Frecuencias | Los registros de frecuencias que ya tenemos, con sus datos faltantes identificados. |
| Avisos_simulados | Seis ejemplos de avisos académicos, uno por distrito piloto. |
| Validacion | Las comprobaciones de los cuatro criterios, sus resultados y las limitaciones de los datos. |

**Fuente:** `Base_Emacruz_sectores_y_frecuencias.xlsx`, hojas `Distritos`, `Frecuencias` y `Fuentes`. El archivo fuente se conserva sin modificar. La elaboración puede hacerse con Excel o con Python; se registran los pasos utilizados en la hoja Validacion. Esta historia entrega el Excel preparado y revisado; la aplicación de consulta corresponde a otra historia.

## Pasos de trabajo

1. Tomar de la hoja Distritos los seis distritos con identificador entero positivo menor, ordenados numéricamente. Copiar identificador, nombre y sector; no agregar barrios ni relaciones territoriales que no figuren en la fuente.
2. Copiar las frecuencias publicadas en una hoja independiente. Mantener los datos no indicados y señalar que su vigencia no está acreditada.
3. Escribir un aviso ficticio por distrito para probar tres situaciones: normal, retraso y contingencia.
4. Revisar cantidades, coincidencias con la fuente y etiquetas de simulación. Registrar cada comprobación en Validacion y guardar el archivo derivado en la ruta indicada.

## Criterios de validación

### CV1. Seis distritos identificados

Distritos_piloto contiene exactamente seis filas de datos y las columnas `distrito_id`, `nombre`, `sector` y `fila_origen`. Se seleccionan los seis identificadores enteros positivos menores de la hoja Distritos, sin repetirlos. Nombre y sector coinciden con la fila de origen; se permite únicamente quitar espacios al principio y al final. Ninguno de estos cuatro campos queda vacío.

**Evidencia:** en Validacion se registra cantidad esperada = 6, cantidad observada, duplicados = 0, campos obligatorios vacíos = 0 y diferencias frente a la selección/fuente = 0. Se comprueba cada fila contra su referencia de origen.

### CV2. Frecuencias conservadas con sus limitaciones

Frecuencias contiene exactamente una fila por cada registro no vacío de la hoja fuente Frecuencias, conservando sus columnas y valores publicados. Añade `fila_origen` y `vigencia`, cuyo valor es “No acreditada” en todas las filas. Las celdas vacías y los textos “No indicado”, “No indicada”, “No indicados” y “No indicadas” permanecen identificables como ausencias; no se rellenan con horarios o distritos inventados.

No se asignan estas frecuencias a un distrito piloto cuando la fuente no demuestra esa relación. Se mantienen en su propia hoja como información publicada de referencia.

**Evidencia:** en Validacion se comparan la cantidad de registros del origen y del resultado, con cero diferencias de cantidad o contenido en las columnas copiadas. Se anotan los datos ausentes con fila y campo, y los identificadores duplicados si existen. La cantidad de filas sin la marca de vigencia “No acreditada” debe ser 0.

### CV3. Seis avisos claramente simulados

Avisos_simulados contiene exactamente seis filas, una por cada distrito de Distritos_piloto. Las columnas son `aviso_id`, `distrito_id`, `estado`, `motivo`, `fecha_hora` y `etiqueta`. Los identificadores de aviso son únicos. Hay dos avisos de estado `normal`, dos de `retraso` y dos de `contingencia`; son categorías para esta prueba académica.

Cada motivo es una frase no vacía que describe un escenario ficticio. Cada fecha y hora se guarda como texto con formato `AAAA-MM-DDTHH:MM:SS-04:00`, corresponde al instante elegido para la simulación y no a un hecho operativo. Cada fila muestra la etiqueta completa “SIMULACIÓN ACADÉMICA — NO ES UN AVISO OFICIAL”. La misma advertencia figura en la primera fila de la hoja y los encabezados de la tabla en la segunda.

**Evidencia:** en Validacion se registra total = 6, distribución = 2 por estado, distritos ajenos o repetidos = 0, identificadores de aviso duplicados = 0, campos vacíos = 0, fechas inválidas = 0 y etiquetas ausentes o incompletas = 0. Se revisa que ningún motivo presente el escenario como un incidente real confirmado.

### CV4. Comprobaciones documentadas para cerrar

Validacion incluye el nombre y ubicación local de la fuente, fecha de elaboración, pasos utilizados y la aclaración de que las fuentes no acreditan la vigencia operativa de los horarios. La procedencia y el permiso de uso se consignan según la evidencia disponible; lo desconocido se registra como “No acreditado”. Se anota la huella SHA-256 del archivo original antes y después de elaborar el producto: ambas deben ser iguales.

La hoja contiene una tabla con una fila por CV1–CV4 y las columnas `criterio`, `comprobacion`, `resultado_esperado`, `resultado_observado`, `referencia_de_evidencia` y `estado`. Cada referencia señala la hoja, fila, rango o celda comprobada. CV4 comprueba que las cuatro filas estén presentes, que CV1–CV3 tengan evidencia y que se hayan registrado la fuente, los pasos y las dos huellas iguales.

**Evidencia:** cuatro criterios registrados, todos en `cumple`, sin comprobaciones pendientes. Las ausencias heredadas de la fuente pueden permanecer si CV2 las identifica; no impiden completar la muestra académica y no se convierten en información confirmada. Una diferencia introducida al copiar, un dato inventado o una comprobación no realizada impide cerrar la historia.

## Estado actual y cierre

El Excel fuente permite realizar esta muestra: se verificó que hay al menos seis distritos con nombre y sector y que existen registros de frecuencias. El archivo piloto todavía no se ha elaborado ni validado; los criterios permanecen pendientes y la historia sigue “Por hacer”.

Para terminar se entrega el archivo local con sus cuatro hojas y la evidencia de las comprobaciones. El Excel no se publica automáticamente en Jira o GitHub. Antes de cualquier push, integración o despliegue sigue siendo obligatorio el dictamen de la skill según AGENTS.md.
