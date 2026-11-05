# Ruta de trabajo CRISP-DM — Alerta Ruta

Las seis fases son las épicas de organización en Jira. Una épica agrupa historias; una historia describe una entrega verificable y puede requerir varias tareas.

| Fase | Pregunta de trabajo | Entregable inicial posible |
| --- | --- | --- |
| 1. Comprensión del negocio | ¿Quién necesita enterarse de las contingencias y quién autoriza publicar? | Necesidad, roles, flujo y criterios de éxito validados. |
| 2. Comprensión de los datos | ¿Qué zonas, frecuencias y avisos reales se pueden usar? | Inventario de fuentes y diccionario de datos. |
| 3. Preparación de los datos | ¿Cómo unir zona, días/turnos y estado sin ambigüedades? | Tabla limpia de zonas y reglas de validación. |
| 4. Modelado | ¿Qué reglas o modelos aportan al análisis y al prototipo? | Comparación con una línea base; modelo solo si hay datos adecuados. |
| 5. Evaluación | ¿El resultado responde a la necesidad del vecino y al flujo de aprobación? | Pruebas con casos de contingencia y observaciones de usuarios. |
| 6. Despliegue | ¿Cómo se presenta y mantiene el piloto académico? | Demo etiquetada, instrucciones y responsables de actualización. |

La pregunta vigente de investigación busca **factores que permiten predecir** mayor acumulación durante restricciones de diésel. Las frecuencias programadas por sí solas no permiten medir acumulación real. Separar esta investigación de la función inmediata del portal: comunicar estados aprobados por zona. Si la disponibilidad de observaciones no permite modelar, documentar la limitación y no fabricar evidencia predictiva.

Para la fase 2 académica se implementan los estados técnicos `NORMAL`, `DEMORA` y `SERVICIO_SUSPENDIDO`. Son registros manuales simulados y no sustituyen la nomenclatura, aprobación ni publicación institucional que EMACRUZ pudiera definir. La consulta usa únicamente los 26 barrios verificables del Excel del Distrito 2; no busca puntos de referencia ni infiere la ubicación precisa de un vecino porque la fuente no contiene esos datos.

## Extensión de despliegue: mapa y administración

La programación continúa derivándose del Excel inmutable y Supabase almacena únicamente incidencias y su historial. Los geodatos abiertos se conservan como fuente de trazabilidad, pero la web pública vuelve a los tres mapas gráficos suministrados. Esta separación evita presentar una geometría territorial como recorrido operativo.

El vecino mantiene acceso anónimo de solo lectura a incidencias publicadas, simuladas, vigentes y no retiradas. El administrador usa correo/contraseña, debe figurar en `admin_users` y escribe solo mediante funciones PostgreSQL que vuelven a validar objetivo, servicio y ventana. RLS es el control efectivo; la ruta del panel no es secreta. El rol autorizado publica directamente en este prototipo: el flujo institucional operador/supervisor → administrador/comunicador con una aprobación separada queda pendiente de una historia futura.

El visor de mapas no tiene capas, filtros ni selección territorial: solo cambia y amplía las imágenes de barrios, UV y plano municipal. No se infieren posiciones de camiones, GPS, calles recorridas ni polígonos exactos de barrios. Una suspensión prevalece sobre una demora; una demora prevalece sobre la ausencia de incidencias, que se comunica como `NORMAL` sin confirmar la operación real.
