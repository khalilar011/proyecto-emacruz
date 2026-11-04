# Dictamen técnico previo a push — 2026-11-04

**Dictamen: APROBADO**

- Rama y base revisadas: `main`, HEAD `783851bd0b8927e8e5b91eb5ea2cdc6e2a7e8a99`, sincronizada con `origin/main` al iniciar.
- Historias vigentes revisadas en Jira: SCRUM-14, SCRUM-15 y SCRUM-19; épica SCRUM-30. SCRUM-18 se contrastó como límite explícitamente excluido: esta entrega no afirma doble aprobación institucional.
- Versión revisada: todos los cambios preparados en el índice de Git para el mapa interactivo, panel, Supabase, pruebas, fuentes ODbL y documentación. No existen cambios de trabajo fuera del índice.
- Matriz criterio → artefacto → evidencia: `docs/revisiones/mapa-admin-supabase.md`; todos los criterios de las tres historias en alcance figuran `cumple` con evidencia reproducible.

## Evidencia revisada

- 6 pruebas Python: `OK`.
- 3 conjuntos Node: programación, incidencias e integración web: `cumple`.
- Sintaxis de los seis JavaScript nuevos/modificados: sin errores.
- Exportación Excel, GeoJSON y catálogo SQL en modo `--check`: actualizados.
- Respaldo JSON: válido, cero incidencias.
- HTML: IDs únicos y referencias locales existentes.
- HTTP local: `/`, `/admin/`, `config.js` y GeoJSON respondieron 200; salida geográfica con 16 entidades y licencia ODbL.
- Dependencias CDN fijadas: Supabase 2.45.4 y Leaflet 1.9.4 respondieron 200; scripts con SRI.
- `git diff --cached --check`: sin errores.
- Revisión de secretos: sin claves, contraseñas, tokens o material privado. `web/config.js` mantiene valores vacíos.
- Revisión XSS: no se usa `innerHTML`, `insertAdjacentHTML`, `document.write` ni `eval`; los valores dinámicos se insertan como texto.
- Datos: el Excel simulado permanece intacto; las fuentes geográficas originales se conservan en `data/raw/geodata/` con hashes y licencia; no se publican GPS ni recorridos inventados.

## Hallazgos

No hay hallazgos bloqueantes para integrar y desplegar la parte estática. La ausencia de un proyecto Supabase real es una dependencia externa documentada, no ocultada: el panel desplegado mostrará «Configuración pendiente» y la consulta seguirá usando el respaldo JSON. No se ha ejecutado la migración ni un login real; la activación completa exige los pasos de `docs/configurar-supabase.md` y una nueva validación antes de presentar el panel como conectado.

Este dictamen es técnico. No sustituye autorización institucional para publicar información real ni aprueba avisos operativos de EMACRUZ.
