# SCRUM-40 — millón sintético y análisis exploratorio

Historia vigente en Jira: `SCRUM-40`, hija de `SCRUM-30` (Fase 4 — Modelado), creada y verificada el 19/11/2026. Amplía `SCRUM-37` sin reescribir su alcance histórico y conserva la identidad visual de `SCRUM-38`.

## Historia

Como vecino del Distrito Municipal N.º 2 y administrador/comunicador autorizado, quiero una consulta pública más compacta y un Análisis exploratorio reproducible sobre un millón de incidencias sintéticas, para demostrar el prototipo académico con resultados verificables sin alterar los avisos ni el historial registrado.

## Decisiones aprobadas

- El nombre público es **Análisis exploratorio**; la ruta técnica continúa en `/admin/mineria/`.
- La demostración procesa exactamente 1.000.000 de registros con semilla `20261111` y periodo 01/01/2005–19/11/2026.
- Los IDs conceptuales van de `DEMO-0000001` a `DEMO-1000000`.
- Los registros se generan en flujo y se descartan después de acumular estadísticas; no se insertan en `public.incidents`.
- Apriori suma pesos enteros de perfiles equivalentes. Las fórmulas y los respaldos son iguales a los de la expansión individual.
- En demostración no se calcula la tasa por 100 servicios, porque el volumen artificial no es comparable con el calendario semanal.
- El periodo y el momento de ejecución se muestran por separado en `America/La_Paz`.
- El historial mantiene una fila actual por incidencia y sus cálculos anteriores.

## Límites y dependencias

- Fuentes: Excel inmutable derivado en 26 barrios, 104 servicios semanales y 12 camiones simulados; `public.incidents` solo para el modo historial.
- Los conteos sintéticos no representan volumen real, puntualidad, cumplimiento ni cantidad de problemas del Distrito 2.
- Se conservan Supabase Auth, RLS, gestión de alertas, mapas, temas, persistencia, botón manual y cron semanal.
- Las comprobaciones remotas y la publicación requieren el dictamen `alerta-ruta-jira` sobre la versión exacta y autorización separada del responsable.

## Criterios vigentes

Jira conserva los once criterios comprobables:

1. consulta vecinal compacta sin pérdida funcional;
2. generación sintética exacta, reproducible y separada;
3. procesamiento acotado y resultados agregados;
4. Apriori ponderado equivalente y matemáticamente correcto;
5. descriptivos y siete gráficas calculados;
6. indicadores sintéticos no engañosos;
7. nombre público coherente;
8. periodo y ejecución visibles y reales;
9. ortografía y terminología;
10. regresión, seguridad y automatización;
11. documentación, trazabilidad y publicación controlada.

La evidencia por criterio se registra en `docs/revisiones/fase-5-academica-2026-11-19.md`. La historia no se mueve a «Hecho» si alguna comprobación permanece bloqueada.
