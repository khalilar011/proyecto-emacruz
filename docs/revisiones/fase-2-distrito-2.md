# Revisión y trazabilidad — Fase 2, Distrito Municipal N.º 2

- **Fecha:** 2026-11-04
- **Versión revisada:** árbol de trabajo de `main` anterior al commit de la fase 2
- **Historias vigentes:** SCRUM-35, SCRUM-14, SCRUM-15, SCRUM-16 y SCRUM-19
**Carácter de los datos:** simulación académica; no oficial

## Decisiones y límites

- Actor vecino: consulta pública y de solo lectura.
- Operador/supervisor: prepara la incidencia; administrador/comunicador: revisa el JSON y publica mediante Git.
- Fuente original: `data/raw/distrito-2/Distrito_2_horarios_SIMULADOS.xlsx`, preservada con SHA-256 `35fa74023ffdbfb7ac894a2dd961724af5414ac4d702ce53f53eb81ae8c8c47e`.
- La fuente no contiene rutas, geometrías, puntos de referencia, GPS ni ejecución real. Se muestran camiones y servicios simulados; no se completan los datos ausentes.
- El mapa se implementa como visor de imágenes ampliable. No se georreferencia ni resalta un polígono exacto.

## Matriz de trazabilidad

| Historia y criterio | Artefacto | Comprobación y resultado observado | Estado |
| --- | --- | --- | --- |
| SCRUM-35 CV1 · fuente y catálogo | Excel raw; `export_web_data.py`; `validacion.json` | Hash antes/después idéntico; 26 barrios, 15 UV, 0 duplicados | cumple |
| SCRUM-35 CV2 · agenda semanal | JSON procesado/web; pruebas Python | 104 servicios; 14 barrios L/Mi/V/S y 12 Ma/J/S/D; cuatro por barrio | cumple |
| SCRUM-35 CV3 · horarios | Exportador; pruebas Python | Solo 08:00–11:00, 11:30–14:30 y 15:00–18:00; 12 domingos 15:00–18:00 | cumple |
| SCRUM-35 CV4 · camiones y referencias | Exportador; `validacion.json` | 12 camiones; separación mínima validada; 0 referencias inexistentes; ausencia de rutas registrada | cumple |
| SCRUM-35 CV5 · JSON reproducible | Ambos JSON; comando `--check` | 26 barrios/104 servicios; días sin servicio `null`; archivos procesado/web idénticos | cumple |
| SCRUM-14 CV1 · búsqueda | `app.js`; `test_schedule.js` | Coincidencia exacta y búsqueda `belgica` sin tilde devuelven el barrio esperado | cumple |
| SCRUM-14 CV2 · múltiples | `app.js`; `test_schedule.js` | `san` produce varias opciones; escribir reinicia la ficha y exige seleccionar | cumple |
| SCRUM-14 CV3 · sin coincidencias | `app.js`; `test_schedule.js` | Consulta inexistente devuelve 0 y la interfaz oculta ficha e informa el límite | cumple |
| SCRUM-14 CV4 · identificación | JSON; `index.html`; `app.js` | La ficha toma nombre y UV exclusivamente del barrio seleccionado | cumple |
| SCRUM-15 CV1 · estado | `schedule-utils.js`; `app.js` | Selección resuelve un único estado NORMAL/DEMORA/SERVICIO_SUSPENDIDO | cumple |
| SCRUM-15 CV2 · vigencia | `schedule-utils.js`; pruebas JS | Inicio inclusivo, vencimiento exclusivo y retiro ocultan la incidencia; CLI valida referencias | cumple |
| SCRUM-15 CV3 · normal seguro | `app.js`; `index.html` | Texto exacto “No hay demora prevista”, actualización y aclaración de no tiempo real | cumple |
| SCRUM-15 CV4 · simulación visible | HTML; JSON; README | Advertencia visible global y en incidencia; datos marcados `simulacion=true` | cumple |
| SCRUM-16 CV1 · demora | `app.js`; `manage_alerts.py` | Motivo y estimación opcional; sin estimación muestra “No indicado” | cumple |
| SCRUM-16 CV2 · suspensión | `app.js` | Indicación de conservar residuos y esperar actualización, sin promesa de reprogramación | cumple |
| SCRUM-16 CV3 · móvil | `styles.css`; `index.html` | Inspección reproducible: breakpoint 600 px, rejillas a una/dos columnas y ancho mínimo 320 px; estado precede al mapa | cumple |
| SCRUM-16 CV4 · fuentes | Código web y README | Solo JSON manual + programación; sin GPS, clima ni confirmación institucional | cumple |
| SCRUM-19 CV1 · crear/consultar | `manage_alerts.py`; pruebas Python | Alta válida; referencia inexistente falla sin crear archivo; `listar` implementado | cumple |
| SCRUM-19 CV2 · modificar/historial | CLI; pruebas Python | Modificación conserva evento inicial y añade evento con responsable/fecha | cumple |
| SCRUM-19 CV3 · retirar/vencer | CLI; utilidades JS; pruebas Python/JS | Retiro conserva registro y lo oculta; vencimiento exacto también lo oculta | cumple |
| SCRUM-19 CV4 · contradicciones | CLI; pruebas Python | Segundo aviso solapado para el mismo objetivo es rechazado sin alterar el archivo | cumple |
| SCRUM-19 CV5 · publicación controlada | README; workflow Pages | Roles y comandos documentados; `web/` es estático y se despliega desde `main` | cumple |

## Comprobaciones ejecutadas

```text
python scripts/export_web_data.py --check
  Datos y validación actualizados; no se modificó ningún archivo.

python scripts/manage_alerts.py validar
  JSON válido: 0 incidencias, todas simuladas y con referencias existentes.

python -m unittest discover -s tests -p 'test_*.py' -v
  Ran 4 tests — OK

node tests/test_schedule.js
  búsqueda normalizada, próximo servicio y vigencia cumplen

node --check web/app.js
node --check web/schedule-utils.js
python -m py_compile scripts/export_web_data.py scripts/manage_alerts.py
git diff --check
  sin errores
```

Prueba HTTP local: `/`, `/data/distrito-2.json`, `/data/incidencias.json` y `/assets/maps/distrito-2-barrios.webp` respondieron `200`.

## Pendiente fuera de esta entrega

- Validación de comprensión con vecinos y autorización institucional para avisos reales.
- Rutas o mapa interactivo cuando exista una fuente geográfica verificable.
- Autenticación y aprobación dentro de la aplicación; GitHub Pages solo ofrece consulta estática.
- Verificación de la URL pública y del workflow después del push autorizado.

## Dictamen técnico previo a commit/push

**APROBADO** para crear el commit y enviar esta versión preparada a `main`, sujeto a que no cambie ningún archivo después de este dictamen.

- Historias revisadas directamente en Jira el 2026-11-04: SCRUM-35, SCRUM-14, SCRUM-15, SCRUM-16 y SCRUM-19.
- Referencia revisada: `git diff --cached` de `main` contra `5fba63ec96844fa1373b6c5703fce54430b52de8`.
- Resultado: todos los criterios de la matriz cumplen; `git diff --cached --check` no presenta errores; no hay archivos sin preparar ni credenciales detectadas.
- Permisos: la web sigue siendo de solo lectura; el gestor es local; administrador/comunicador conserva la decisión de publicar.
- Datos sensibles y alcance: no se detectaron credenciales ni documentos ajenos; la base y los mapas autorizados están etiquetados como simulación/orientación; no se añade GPS, reclamos ni predicción.
- Autorización separada: este dictamen es técnico y no autoriza publicar datos operativos reales ni representa aprobación de EMACRUZ.
