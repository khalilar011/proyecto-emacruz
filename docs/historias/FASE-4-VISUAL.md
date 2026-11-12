# SCRUM-38 — Fase 4 visual de Alerta Ruta

Historia vigente en Jira: `SCRUM-38`, hija de `SCRUM-32` (Fase 6 — Despliegue).

## Definición acordada

Como vecino y como administrador/comunicador autorizado, quiero una interfaz coherente, accesible y adaptable con identidad de Santa Cruz de la Sierra, para consultar y gestionar el prototipo académico con claridad sin alterar funciones, datos ni reglas existentes.

El resultado observable comprende las rutas `/`, `/admin/` y `/admin/mineria/`, el logo oficial, una portada urbana original, tema claro/oscuro persistente y regresión del contrato DOM y los módulos protegidos.

## Alcance

- HTML presentacional, CSS, recursos visuales y `web/theme.js`.
- Ajuste de colores de Chart.js en `mining.js`, limitado a variables visuales y redibujado con el mismo resultado persistido.
- Logo cuadrado y cartel horizontal verificados visualmente en Descargas y optimizados sin redibujarlos.
- Ilustración original de la Catedral Metropolitana y un camión genérico, separada de controles y textos HTML.
- Capturas de las tres rutas en claro y oscuro.

## Fuera de alcance

- Consultas Supabase, Auth, RLS, migraciones, Edge Functions y backend.
- Apriori, filtros, cálculos, resultados, cron y modos de minería.
- Horarios, barrios, camiones, mapas, alertas y reglas de publicación.
- Rutas, IDs, atributos o selectores consumidos por JavaScript.
- Nuevas funciones de negocio o representaciones oficiales de EMACRUZ.

## Actores, dependencias y fuentes

- Vecino: consulta pública anónima.
- Administrador/comunicador: gestión de incidencias simuladas y minería privada.
- Fuente de programación: Excel simulado ya procesado; no cambia.
- Fuente de incidencias y minería: Supabase y respaldo existentes; no cambian.
- Dependencias de ejecución: navegador moderno, `localStorage`, preferencia del sistema y Chart.js existente.
- No se agregó ninguna dependencia de producción. Playwright 1.56.1 se usó sólo desde `/tmp` para evidencia local.

La descripción y los nueve criterios medibles están guardados y verificados en Jira. La matriz de entrega se mantiene en `docs/revisiones/fase-4-visual-2026-11-12.md`.
