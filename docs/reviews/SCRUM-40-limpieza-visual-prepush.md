# Dictamen previo a publicación — limpieza visual de SCRUM-40

- **Fecha:** 2026-11-23, `America/La_Paz`.
- **Historia:** SCRUM-40, “Validar Alerta Ruta con un millón de datos y análisis exploratorio”.
- **Versión revisada:** diff preparado sobre `1c85583` en `main`.
- **Alcance:** retirar avisos académicos generales redundantes y cerrar sus espacios, conservando las advertencias específicas y todo el contenido analítico.
- **Dictamen:** **APROBADO**.

## Decisiones de alcance

Se eliminaron únicamente los contenedores generales de la portada, Gestión de alertas y Análisis exploratorio. Las aclaraciones necesarias quedan en textos ya existentes: información y pie de la portada, cabecera administrativa y subtítulo del análisis. No se modificó la simulación de ruta.

Se conserva literalmente `DATOS SINTÉTICOS — DEMOSTRACIÓN ACADÉMICA` en el HTML y en `showModeNotice()` para que continúe al seleccionar el modo demostración. También permanecen interpretación académica, hallazgos, reglas Apriori, estadísticas, siete gráficas, filtros y notas metodológicas.

## Matriz de trazabilidad

| Criterio SCRUM-40 | Artefacto y comprobación | Resultado | Estado |
| --- | --- | --- | --- |
| CV1. Consulta compacta | `web/index.html`; pruebas web/visual y capturas 390/1440. | Se retira el banner sin alterar consulta, mapas, navegación ni aclaraciones útiles. | cumple |
| CV2. Millón reproducible | Motor protegido y `test_mining_engine.mjs`. | Un millón exacto y semilla sin cambios. | cumple |
| CV3. Procesamiento acotado | Benchmark del millón. | 1.000.000 transacciones, 2.985 perfiles comprimidos. | cumple |
| CV4. Apriori correcto | Suite del motor. | Fórmulas, reglas y respaldos sin cambios. | cumple |
| CV5. Descriptivos y gráficas | HTML conserva siete canvas; suites de minería. | Indicadores y siete gráficas presentes. | cumple |
| CV6. Datos sintéticos no engañosos | `web/admin/mineria/index.html`, `mining.js` y prueba de integración. | Aviso sintético literal conservado en estado inicial y actualización dinámica. | cumple |
| CV7. Nombre coherente | HTML y prueba de integración. | “Análisis exploratorio” permanece en título, encabezado y navegación. | cumple |
| CV8. Periodo y ejecución | Pruebas de frontend. | Metadatos, fechas y zona horaria intactos. | cumple |
| CV9. Textos | Tres HTML y búsqueda de cadenas. | Avisos generales fuera; aclaraciones breves, hallazgos e interpretaciones dentro. | cumple |
| CV10. Regresión y seguridad | Validadores, 12 pruebas Python, suites JS, sintaxis y diff. | Sin cambios en datos, Supabase, Auth/RLS, alertas, simulación, motor o workflows. | cumple |
| CV11. Trazabilidad y control | Este dictamen, diff preparado, estado Git y revisión Jira vigente. | Evidencia vinculada a la versión exacta; publicación condicionada al dictamen. | cumple |

## Evidencia ejecutada

- Validadores de catálogo, mapas, SQL e incidencias: pasan sin modificar archivos.
- `python -m unittest discover -s tests -p 'test_*.py' -v`: 12/12.
- Todas las suites Node del README y comprobaciones de sintaxis: pasan.
- Benchmark: 1.000.000 registros, 2.985 perfiles, 44 reglas, 1.629,77 ms, 103,37 MiB RSS máxima.
- Capturas locales: portada, acceso administrativo y acceso al análisis en 390 px claro y 1440 px oscuro; sin banners, huecos ni desbordamiento observado.
- `git diff --check`: sin errores.

## Seguridad y publicación

El diff sólo contiene HTML, CSS, una prueba estructural y este dictamen. No incluye datos, credenciales, cambios de permisos ni documentos institucionales. `data/raw/`, Supabase, RLS, funciones, alertas, Apriori, simulación de ruta y automatizaciones permanecen intactos.

Este dictamen técnico habilita el push de la versión revisada, pero no sustituye la autorización del responsable para publicar datos institucionales. Cualquier cambio posterior invalida la aprobación y exige repetir la revisión. Tras GitHub Pages se comprobarán las rutas y cadenas publicadas antes de registrar evidencia final en Jira.
