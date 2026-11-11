# Fase 3 — minería de datos automatizada

## Propósito y alcance

El módulo privado `/admin/mineria/` transforma las incidencias del prototipo en descriptivos, comparaciones normalizadas y reglas de asociación. Es una herramienta académica de apoyo a decisiones: no mide la operación real de EMACRUZ, no certifica puntualidad y no atribuye causas.

La página pública, los 26 barrios, las 15 UV, los 104 servicios semanales, los 12 camiones simulados, el visor de mapas y la gestión de alertas conservan sus fuentes y flujos anteriores.

## Arquitectura

```text
Administrador con sesión Supabase ─┐
                                   ├─> Edge Function mining-analysis
GitHub Actions, lunes 07:00 UTC ───┘          │
                                              ├─ verifica administrador o secreto del cron
                                              ├─ lee catálogo + incidencias
                                              ├─ ejecuta el único motor Apriori
                                              └─ persiste mining_analysis_runs
                                                            │
Dashboard privado <── Auth + RLS ────────────────────────────┘
```

- `supabase/functions/_shared/mining-engine.mjs`: preparación, dataset sintético, descriptivos, normalización y Apriori. Es el único motor usado por el botón y el cron.
- `supabase/functions/mining-analysis/index.ts`: autorización, consultas, control de concurrencia, ejecución y persistencia.
- `supabase/migrations/0003_mining_analysis.sql`: tabla privada, índices y política RLS.
- `web/admin/mineria/`: dashboard estático privado. La ruta HTML es pública como cualquier archivo de GitHub Pages, pero los datos sólo se obtienen con Auth, pertenencia a `admin_users`, función autorizada y RLS.
- `.github/workflows/mining-weekly.yml`: invocación del modo historial cada lunes a las 07:00 UTC, equivalentes a las 03:00 de Bolivia (`America/La_Paz`, UTC-4).

El frontend no contiene claves privadas. La Edge Function usa `SUPABASE_SECRET_KEYS`, inyectada por Supabase y nunca enviada al navegador. No se reactiva `service_role` legacy.

## Unidad de análisis y preparación

La unidad de análisis es **una incidencia única por `incidents.id`**. Se utiliza la versión actual de la fila, de modo que editar una incidencia no crea otra transacción. Los registros retirados se conservan porque siguen en `incidents`; `retired_at` permite reconocerlos.

Una transacción puede incluir varios barrios, servicios o camiones:

- en el total general cuenta una sola incidencia;
- en el ranking territorial cuenta una vez en cada barrio afectado;
- cada categoría se añade una sola vez dentro de la transacción;
- los servicios programados afectados se identifican por `servicio@fecha`, evitando duplicar la misma ocurrencia si varias alertas la mencionan.

Variables categóricas:

- `CAMION`: identificador simulado;
- `BARRIO`: ID, presentado con el nombre del catálogo;
- `DIA`: día del servicio programado afectado;
- `TURNO`: mañana (antes de 11:00), mediodía (11:00–14:59) o tarde (desde 15:00), derivado de la hora de inicio del catálogo;
- `MOTIVO`: lluvia, falla mecánica, problema técnico u otro;
- `TIPO`: demora o servicio suspendido;
- `DURACION`: 1–15, 16–30, 31–60, 61–120 o más de 120 minutos. Sólo se crea si existe una estimación positiva.

La evolución temporal usa `starts_at`. Los días y turnos de las reglas proceden de los servicios programados afectados, no de una supuesta ejecución real.

## Apriori

Apriori construye conjuntos frecuentes por niveles. Un candidato de tamaño `k` sólo se evalúa si todos sus subconjuntos de tamaño `k-1` fueron frecuentes. Esto aplica la propiedad de cierre descendente y evita enumerar combinaciones que ya no pueden superar el soporte mínimo.

Para `N` transacciones:

```text
soporte(X → Y) = conteo(X ∪ Y) / N
confianza(X → Y) = conteo(X ∪ Y) / conteo(X)
lift(X → Y) = confianza(X → Y) / (conteo(Y) / N)
```

Cada regla guarda antecedente, consecuente, soporte, confianza, lift y cantidad de transacciones de respaldo. La clasificación usa primero lift, después confianza y soporte. Por defecto:

- soporte mínimo: 0,08;
- confianza mínima: 0,55;
- lift mínimo: 1,05;
- tamaño máximo del conjunto: 3;
- máximo visible/persistido: 30 reglas;
- mínimo: 10 transacciones.

El administrador puede ajustar soporte, confianza, lift y límite de reglas. El servidor restringe los rangos para impedir combinaciones excesivas. Un lift superior a 1 expresa coocurrencia por encima de la esperada bajo independencia; no demuestra causalidad.

## Comparaciones con servicios programados

Para cada fecha del periodo se generan las ocurrencias esperadas de los 104 servicios según su día semanal. La tasa mostrada es:

```text
incidencias por 100 servicios programados = incidencias registradas / ocurrencias programadas × 100
```

El denominador es programación simulada, no evidencia de servicio realizado. La interfaz lo identifica expresamente y no lo llama cumplimiento ni puntualidad.

## Modos de datos

### Demostración académica

El servidor genera en memoria 180 incidencias con semilla fija `20261111`, periodo 5 de enero a 5 de julio de 2026 y valores del catálogo. No se insertan en `incidents`.

Se diseñaron coocurrencias reproducibles para comprobar el método, entre ellas:

- `SIM-C01` con `FALLA_MECANICA` y estimaciones mayores;
- Santa Clara o La Santa Cruz con lluvia en parte de las observaciones;
- turnos de tarde con problemas técnicos en parte de las observaciones.

No se hardcodean reglas ni métricas: el test exige que Apriori recupere la asociación de `SIM-C01` y falla mecánica a partir de las transacciones generadas. La interfaz mantiene el rótulo **DATOS SINTÉTICOS — DEMOSTRACIÓN ACADÉMICA**.

### Historial registrado del prototipo

Lee únicamente `public.incidents`, incluida su versión actual retirada cuando corresponda. No lee cada evento de `incident_history`, porque hacerlo multiplicaría una incidencia por sus ediciones.

Limitación vigente: el esquema distingue retiradas mediante `retired_at`, pero no tiene categorías separadas para “cancelación” o “dato de prueba”. Esas categorías no se infieren. Añadirlas requiere una historia y migración futura. Si hay menos de 10 transacciones o ninguna regla supera los umbrales, se muestran descriptivos válidos y un aviso de datos insuficientes.

## Flujo manual

1. El administrador entra en `/admin/` y abre **Minería de datos**. La sesión se conserva en el mismo origen.
2. El módulo vuelve a comprobar Auth y `admin_users`.
3. **Actualizar análisis** se desactiva y muestra “Calculando análisis…”.
4. La Edge Function valida la sesión, crea una corrida `RUNNING`, ejecuta y guarda el resultado.
5. Sólo después de guardar cambia a `COMPLETED` y el navegador muestra confirmación, fecha y datos nuevos.
6. Un índice parcial impide dos corridas simultáneas del mismo modo. Una corrida abandonada por más de 20 minutos se marca `FAILED` antes de reintentar.

## Automatización semanal

GitHub Actions llama la misma función con `{"mode":"history"}`. El cron no necesita una computadora encendida ni tokens de GitHub en el frontend. `MINING_SCHEDULE_SECRET` autentica sólo la invocación; la credencial privada de base permanece en Supabase.

La invocación programada equivalente fue comprobada remotamente el 11/11/2026: produjo una fila `COMPLETED`, `execution_type = scheduled`, `mode = history`, 5 transacciones y el mensaje esperado de datos insuficientes. El workflow fue validado con `actionlint`; después del primer push se debe ejecutar `workflow_dispatch` y conservar además el log de GitHub Actions.

## Seguridad

- `anon` no tiene privilegios sobre `mining_analysis_runs`.
- `authenticated` sólo tiene `SELECT`; RLS entrega filas únicamente si `is_alerta_ruta_admin()` es verdadero.
- El navegador no puede insertar, actualizar o borrar corridas.
- La función acepta un JWT válido de administrador o el secreto del cron; nunca confía sólo en un botón oculto.
- La clave `sb_secret_...` es leída mediante `SUPABASE_SECRET_KEYS` dentro de Supabase.
- Los resultados sintéticos no se insertan en las incidencias operativas.
- La función usa una lista CORS, aunque la autorización real sigue siendo Auth/secreto y RLS.

## Configuración de despliegue

Realizar estos pasos sólo después de una revisión Jira `APROBADO` sobre el diff exacto. En el proyecto actual, `0003`, `mining-analysis` y `MINING_SCHEDULE_SECRET` ya fueron configurados y validados de forma segura el 11/11/2026; los pasos se conservan para reproducir o rotar la instalación:

1. Supabase Dashboard → **SQL Editor**: aplicar `supabase/migrations/0003_mining_analysis.sql`, o ejecutar `npx supabase db push` con el proyecto correcto vinculado.
2. Supabase Dashboard → **Edge Functions → Secrets**: crear `MINING_SCHEDULE_SECRET` con un valor aleatorio de al menos 32 caracteres. No pegarlo en código, issues ni conversación.
3. GitHub → repositorio `proyecto-emacruz` → **Settings → Secrets and variables → Actions → New repository secret**: crear también `MINING_SCHEDULE_SECRET` con exactamente el mismo valor.
4. Desplegar `mining-analysis` con la configuración del repositorio. `verify_jwt = false` es intencional porque la función valida por código el JWT o el secreto del cron.
5. Abrir `/admin/mineria/`, confirmar que la sesión se conserva y ejecutar ambos modos.
6. GitHub → **Actions → Actualizar minería semanal → Run workflow**: lanzar una prueba. Confirmar una corrida `COMPLETED`, `execution_type = scheduled` y `mode = history`.

No hace falta crear ni copiar una clave secret de Supabase a GitHub.

## Guía breve para la exposición

1. Explicar la unidad: una incidencia única, aunque afecte varios barrios.
2. Mostrar el modo demostración y su rótulo sintético.
3. Explicar soporte como frecuencia conjunta, confianza como proporción condicionada y lift como comparación contra independencia.
4. Abrir una regla y aclarar “asociación, no causalidad”.
5. Comparar conteo y tasa por 100 servicios programados, aclarando que el denominador es calendario esperado.
6. Cambiar a historial y mostrar que, con pocos datos, el sistema no inventa reglas.
7. Mostrar fecha, tipo de ejecución y persistencia tras recargar.
8. Cerrar con seguridad: Auth, `admin_users`, RLS y ejecución del algoritmo sólo en servidor.

## Pruebas

```bash
node tests/test_mining_engine.mjs
node tests/test_mining_integration.mjs
python scripts/validate_supabase_sql.py --check
```

`test_mining_engine.mjs` usa un dataset conocido donde `A → B` tiene soporte 0,75, confianza 1 y lift 4/3; también prueba semilla fija, asociación sintética, rangos y no duplicación por edición.
