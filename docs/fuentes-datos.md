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

Los pesos o volúmenes acumulados no deben llenarse con cifras inventadas. La programación de esta fase no permite validar un modelo predictivo de acumulación.
