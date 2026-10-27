# Revisión de SCRUM-22

## Definición vigente simplificada

El usuario indicó que la historia resultaba demasiado complicada y pidió aclarar su viabilidad y producto final. Se ajustó SCRUM-22 a una entrega única: `data/processed/SCRUM-22_piloto.xlsx`, con las hojas `Distritos_piloto`, `Frecuencias`, `Avisos_simulados` y `Validacion`. La definición vigente está en `docs/historias/SCRUM-22.md` y sustituye las propuestas y entregables anteriores de este informe.

Se verificó localmente que el Excel fuente tiene 16 registros de distritos, al menos seis identificadores numéricos seleccionables con nombre y sector, y 21 registros de frecuencias. Esto permite preparar la muestra con los archivos actuales, sin inventar relaciones territoriales ni acreditar vigencia de horarios. Los avisos serán ejemplos académicos. La elaboración admite Excel o Python, con pasos y comprobaciones documentados dentro del propio producto; no exige desarrollar los scripts, CSV e informes independientes de la versión anterior.

Jira guardó la simplificación el 2026-10-25 a las 12:44:30 -04:00. Una lectura posterior verificó el título y la descripción completos, los cuatro criterios medibles CV1–CV4, la épica SCRUM-29 y el estado «Por hacer». Cada criterio indica la comprobación y su evidencia. La preparación del archivo piloto y la ejecución de esas comprobaciones siguen pendientes: no se emite aprobación de cierre, push o despliegue.

Las secciones siguientes conservan el historial de las revisiones anteriores.

## Actualización de Jira posterior a la revisión

El 2026-10-25 el usuario autorizó editar directamente las historias revisadas y confirmó que el piloto comienza con los sectores y distritos disponibles en el Excel. Se actualizó el título y la descripción de SCRUM-22; Jira confirmó la última modificación el 2026-10-25 a las 12:35:20 -04:00. Una segunda lectura verificó el contenido completo, los siete criterios CV1–CV7, la épica SCRUM-29 y el estado «Por hacer».

La definición actual está copiada en `docs/historias/SCRUM-22.md`. Reemplaza la propuesta original de este informe: utiliza una muestra reproducible de seis distritos, mantiene las frecuencias con vigencia no acreditada y define archivos y comprobaciones para cada criterio. Los avisos son exclusivamente simulados. El catálogo de sectores/distritos y la tabla de frecuencias se conservan por separado para evitar asignaciones territoriales no respaldadas.

La revisión de la nueva definición comprobó que cada criterio tiene una entrada o escenario, resultado esperado, evidencia y condición de aprobación. Las verificaciones de la entrega siguen pendientes: no existen todavía los CSV, la transformación ni el informe de ejecución exigidos. El dictamen para cerrar, hacer push o desplegar continúa **BLOQUEADO** hasta completar la evidencia. La nueva definición no acredita vigencia institucional de horarios ni permite publicar los datos.

Lo que sigue conserva la revisión inicial de la versión anterior de Jira y sus huellas; sus observaciones sobre barrios y horarios confirmados corresponden al alcance anterior.

## Revisión inicial conservada

Fecha: 2026-10-25. Skill aplicada: `skills/alerta-ruta-jira/SKILL.md`.

Historia consultada: [SCRUM-22](https://misabelbr.atlassian.net/browse/SCRUM-22), «CRISP-DM 3 · Preparación de zonas, horarios y alertas de prueba». Última actualización informada por Jira: 2026-10-19 15:21:59 -04:00. Estado: «Por hacer». Épica: [SCRUM-29](https://misabelbr.atlassian.net/browse/SCRUM-29), «Fase 3 - Preparación de los datos». Jira no muestra subtareas, enlaces a otras historias, adjuntos ni comentarios.

## Dictamen

**BLOQUEADO para aprobar la redacción y para cerrar la historia.** El objetivo corresponde a la fase 3, pero las reglas de preparación y las fuentes necesarias no están suficientemente definidas. Tampoco existe una entrega local que permita demostrar los tres criterios completos. Que la historia esté «Por hacer» concuerda con esta ausencia de entregables; este dictamen no significa que se haya rechazado una implementación terminada.

La revisión solicitada queda completada con este informe. El dictamen pendiente corresponde a la historia y no autoriza un push ni un despliegue.

## Evidencia inspeccionada

- `README.md`, `AGENTS.md`, `docs/plan-crisp-dm.md`, `data/README.md` y `docs/fuentes-datos.md`. La ficha de procedencia, permiso y vigencia todavía contiene valores pendientes. El README principal dice que no hay datos operativos; debe distinguirse ese estado de la presencia local de un Excel cuya vigencia no está acreditada.
- `proyecto-emacruz/README.md` y el Excel local `proyecto-emacruz/data/Base_Emacruz_sectores_y_frecuencias.xlsx`, leídos sin modificar su contenido. La carpeta es un repositorio Git anidado y aparece sin seguimiento en el repositorio principal; no debe añadirse entera para resolver esta historia.
- El Excel tiene las hojas `Frecuencias`, `Distritos`, `Servicios` y `Fuentes`. `Frecuencias` contiene 21 registros y columnas de sector, zona, delimitación, distritos indicados, días, turno, inicio, fin y nota de revisión. No contiene un catálogo explícito de barrio y punto de referencia ni campos de aviso, motivo o actualización.
- Al contar celdas vacías o los marcadores «No indicado» y sus variantes: 12 de 21 registros no indican distritos, 9 no indican inicio y 15 no indican fin. Los 13 registros de `Fuentes` tienen vigencia «No indicada». Estos recuentos describen la completitud del archivo; no prueban la vigencia de ningún horario ni permiten concluir que la historia sea imposible con fuentes adicionales.
- `data/raw/` y `data/processed/` solo contienen marcadores `.gitkeep` y metadatos `Zone.Identifier`. En `src/`, `scripts/` y `notebooks/` hay instrucciones y marcadores, sin una transformación ni una validación implementada para esta historia. No se encontró una muestra piloto, un informe de calidad o evidencia de visualización de avisos simulados.
- Se consultaron `git status --short`, `git diff --stat` y `git diff --cached --stat`. Los cambios previos corresponden a instrucciones y documentación de la skill; no implementan SCRUM-22. No hay cambios preparados para commit.

Los recuentos se obtuvieron leyendo el XLSX como ZIP/XML con la biblioteca estándar de Python, sin instalar dependencias. No se copiaron registros de la base al informe.

## Matriz de los criterios vigentes

Las rutas propuestas aún no existen y no constituyen evidencia de cumplimiento.

| Criterio de Jira | Artefacto actual / entrega propuesta | Comprobación y resultado observado | Estado de entrega |
| --- | --- | --- | --- |
| 1. Normalizar barrio, distrito y punto de referencia para 5 o 6 zonas piloto. | Excel local; propuestos: `data/processed/scrum-22/zonas_piloto.csv` y `docs/scrum-22-preparacion.md`. | Inspección del esquema e inventario local: no hay catálogo explícito de barrios/referencias, selección piloto ni reglas implementadas. El intervalo 5–6 es contable, pero no define cuáles son las zonas ni la unidad territorial y sus correspondencias. | **no cumple** |
| 2. Cada zona tiene horarios confirmados, estado, motivo y actualización; duplicados y faltantes identificados. | Excel local y ficha de fuentes pendiente; propuestos: tablas de horarios y avisos en `data/processed/scrum-22/`, más `reports/scrum-22-calidad.md`. | Inspección de completitud: hay horarios incompletos, vigencia sin acreditar y campos de aviso ausentes. Falta fuente de confirmación, catálogo de estados, formato de fecha y clave para detectar duplicados. | **bloqueado** |
| 3. Etiquetar los estados de demostración como simulados y no como avisos reales. | Las instrucciones exigen simulación; propuestos: datos de prueba etiquetados y evidencia de su presentación en la demo cuando exista. | Las instrucciones muestran intención, pero no hay registros simulados ni demo para comprobar que la etiqueta se conserva en las salidas. | **no cumple** |

## Ambigüedades que deben resolverse

1. **Unidad territorial.** «Zona», «sector», «distrito» y «barrio» no son equivalentes. Falta definir la clave de zona y cómo se demuestra su relación con barrio y referencia. La presencia de distritos en otra hoja no basta para asignarlos a cada frecuencia por inferencia.
2. **Selección piloto.** Debe registrarse la lista concreta de 5 o 6 zonas, el responsable de selección y la fuente de cada correspondencia. No hay que inventar asociaciones para completar el cupo.
3. **Normalización.** No se especifica qué cambios se permiten ni cómo se conserva el valor original. Tampoco cómo manejar un barrio con varios nombres o un nombre compartido por zonas distintas.
4. **Confirmación de horarios.** El Excel recoge información publicada, pero su hoja de fuentes no acredita vigencia. Falta identificar quién confirma cada horario, cuándo y con qué evidencia. Una fecha de procesamiento no es una confirmación institucional.
5. **Estado y motivo.** `docs/plan-crisp-dm.md` presenta «normal», «retraso» y «contingencia» como candidatos sujetos a validación. Jira debe indicar si se adoptan para simulación y qué motivo exige cada estado.
6. **Actualización.** Hay que distinguir actualización del aviso simulado, recepción de la fuente y confirmación del horario. Son hechos distintos y requieren campos separados.
7. **Calidad.** Faltan la clave de duplicado, el significado de dato faltante, el tratamiento de conflictos y la condición de aceptación del informe.
8. **Alcance de la prueba.** La historia prepara datos, pero promete que el vecino encontrará su barrio y verá mensajes. La búsqueda y la presentación necesitan otra entrega o una dependencia explícita. No corresponde afirmar esa experiencia como verificada solo por crear un CSV.

## Redacción propuesta para acordar

Esta propuesta conserva el requisito de barrios y horarios confirmados. No modifica Jira ni declara aprobadas las decisiones nuevas.

**Título:** Preparar y validar la muestra de 5 o 6 zonas piloto con horarios acreditados y avisos simulados.

**Historia:** Como integrante responsable de la preparación de datos de Alerta Ruta, necesito generar una muestra reproducible de 5 o 6 zonas piloto, con su correspondencia documentada entre barrio, distrito y punto de referencia, horarios respaldados por una fuente vigente y avisos identificados como simulados, para que el equipo pruebe la consulta por zona sin confundir los escenarios académicos con avisos operativos.

**Alcance:** Preparación de archivos, reglas de transformación y comprobaciones de calidad. Registrar como dependencia la implementación de búsqueda y visualización si se pretende comprobar la experiencia del vecino. Las tablas derivadas permanecen locales en `data/processed/`; los originales se conservan sin modificación. Registrar procedencia y permiso antes de incorporar una copia autorizada en `data/raw/`.

**Criterios propuestos:**

1. **Selección y fuentes.** Dada una lista de zonas acordada por el equipo, la tabla piloto contiene exactamente sus 5 o 6 identificadores únicos, sin zonas adicionales. Para cada zona se identifica el registro fuente y la evidencia de la relación entre barrio, distrito y punto de referencia. La lista y las decisiones de selección se documentan en `docs/scrum-22-preparacion.md`. Si falta esa correspondencia, este criterio no cumple.
2. **Reglas reproducibles.** La documentación define columnas, tipos, claves y reglas de limpieza. Una transformación ejecutable genera las tablas derivadas sin editar la fuente y conserva la trazabilidad hacia los valores originales. Se verifica que ninguna transformación asigne una relación territorial no respaldada por la fuente. El comando y los resultados de comprobación quedan registrados.
3. **Horarios confirmados.** Cada zona piloto tiene al menos un horario con días, turno, datos horarios disponibles y referencia a una confirmación de vigencia, con fecha y responsable. El equipo define antes de implementar si exige inicio y fin exactos o si admite solo un turno confirmado. Todos los horarios deben cumplir esa definición acordada; los datos ausentes permanecen identificados y no se completan por inferencia. Mientras falte la definición o la confirmación, el criterio queda bloqueado.
4. **Avisos simulados.** Cada zona tiene al menos un escenario de prueba con identificador, zona válida, estado del catálogo acordado, motivo según las reglas acordadas, instante de actualización y marca de simulación. Se propone usar `simulado=true`, fecha ISO 8601 con zona horaria y texto visible «SIMULACIÓN ACADÉMICA — NO ES UN AVISO OFICIAL». Catálogo, reglas de motivo y formato deben acordarse antes de implementar; todos los registros deben validarse contra ellos.
5. **Informe de calidad.** Un control ejecutable revisa unicidad de las claves acordadas, pertenencia de cada horario/aviso a una zona, valores obligatorios, catálogo de estados y fechas. El informe enumera cada duplicado o faltante con su registro, campo y resolución; si no hay incidencias, registra cero. Para aprobar, no quedan conflictos sin resolver en las claves, correspondencias ni campos obligatorios; las ausencias permitidas por el criterio 3 se explican individualmente.
6. **Simulación visible.** Toda salida de demostración incluida en la entrega muestra la etiqueta acordada junto a cada aviso, y conserva la marca de simulación al exportar datos. Si la comprobación es solo sobre archivos, la historia no declara probada una interfaz. Si incluye una interfaz, enlaza su entrega y presenta evidencia de que la etiqueta sigue visible para el vecino.
7. **Cierre con evidencia.** La matriz final relaciona cada criterio con archivo, comando o inspección, resultado observado y versión revisada. Todos deben figurar como `cumple`. Una definición pendiente, una fuente sin acreditar o una prueba no ejecutada impide cerrar la historia.

## Siguiente paso concreto

El responsable de la historia debe resolver primero si mantiene la búsqueda por barrio. Si la mantiene, hace falta una fuente autorizada que relacione barrios, referencias y zonas. Si el piloto se limita a sectores/distritos disponibles, eso supone un cambio de alcance y debe quedar acordado y reflejado en Jira antes de implementar. En ambos casos debe definirse cómo se acredita la vigencia de los horarios; identificar faltantes no equivale a cumplir el requisito actual de horarios confirmados.

Después corresponde acordar la lista piloto, los campos obligatorios de horario y el catálogo de estados; actualizar la historia con esas decisiones; y recién entonces implementar y verificar la preparación.

## Referencia de la versión revisada

HEAD del repositorio principal: `652c62fcc6f7aca08029045b8244d761efd0cff1`, con cambios locales de documentación pendientes. Se revisaron los archivos locales presentes, no únicamente el contenido de HEAD. Huellas SHA-256 para identificar los documentos y datos utilizados:

| Archivo | SHA-256 |
| --- | --- |
| `AGENTS.md` | `c76841227244b0ef7ab7a9f0c2b46136e463247d139217c8c764ada970970635` |
| `README.md` | `bec747cb869938b53125083a66009e384cc4b10505c62645a5c77d43da55e873` |
| `docs/plan-crisp-dm.md` | `e8d7616211b4343c0cf4c33c6e844fe181d0c74b1058b076f35d25acb02cbf3f` |
| `docs/fuentes-datos.md` | `a8714ccd15a1478ece88791c5a25587b7d38a7efb0cb5ce23a6b4dc6cb0d0d1f` |
| `skills/alerta-ruta-jira/SKILL.md` | `fd216b8b13a74da005aa1cc875810757ffd94d09a19269047f621ca2ceb18cf0` |
| Excel local de sectores y frecuencias | `cbc88d35f868abb898139e0e11f64dc134754a644d90430807ad701cae39b59a` |
