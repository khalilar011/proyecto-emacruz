# Alerta Ruta — Distrito Municipal N.º 2

Prototipo universitario para consultar programación **simulada** de recolección e incidencias manuales en 26 barrios del Distrito Municipal N.º 2 de Santa Cruz de la Sierra, Bolivia.

> **SIMULACIÓN ACADÉMICA — NO ES UN AVISO OFICIAL.** Los horarios, camiones y alertas no acreditan la operación de EMACRUZ en tiempo real.

## Funcionalidad actual

- Buscador y selector de 26 barrios, 15 UV, 104 servicios semanales y 12 camiones simulados.
- Próximo servicio calculado con la hora `America/La_Paz` y semana programada del Excel.
- Estados `NORMAL`, `DEMORA` y `SERVICIO_SUSPENDIDO`, con prioridad suspensión → demora → normal.
- Visor sencillo de los tres mapas suministrados: barrios, unidades vecinales y plano municipal, con ampliación entre 75 % y 300 %.
- Sin Leaflet, polígonos, filtros cartográficos, GPS, calles recorridas ni rutas oficiales.
- Panel `/admin/` con Supabase Auth, PostgreSQL, RLS, historial y operaciones validadas.
- Panel privado `/admin/mineria/` con descriptivos, siete gráficas, tasas sobre servicios programados y reglas Apriori.
- Dos modos separados: 180 incidencias sintéticas reproducibles y el historial registrado del prototipo.
- Motor único en Supabase Edge Functions para actualización manual y semanal, con resultados persistidos y RLS.
- Un único respaldo JSON si Supabase no responde durante la carga inicial.
- Tres mapas suministrados, conservados como referencias secundarias ampliables.

La integración está conectada al proyecto Supabase `alerta-ruta-emacruz` mediante su URL y publishable key pública. Las migraciones, RLS, Auth, RPC e historial fueron comprobados contra el proyecto real; no se publica ninguna clave secreta.

## Estructura principal

```text
data/
├── raw/distrito-2/Distrito_2_horarios_SIMULADOS.xlsx  # fuente original inmutable
├── raw/geodata/                                        # fuentes ODbL inmutables
└── processed/                                          # derivados reproducibles
scripts/
├── export_web_data.py
├── generate_supabase_catalog.py
├── manage_alerts.py
├── verify_supabase_public.py
├── verify_supabase_frontend.js
└── prepare_map_data.py
supabase/
├── config.toml                                         # Auth remoto reproducible
├── functions/                                          # Motor Apriori y endpoint privado
├── migrations/                                         # esquema RLS y catálogo
└── tests/                                              # seguridad y flujo transaccional
tests/
web/
├── admin/                                               # acceso Auth + RLS
│   └── mineria/                                         # dashboard privado de análisis
├── assets/maps/
├── data/distrito-2.json
├── data/incidencias.json
├── index.html
├── app.js
├── incidents.js
├── map-viewer.js
├── schedule-utils.js
└── supabase-data.js
```

La base anterior `Base_Emacruz_sectores_y_frecuencias.xlsx` ya no forma parte de la versión actual. No se reescribió el historial de Git.

## Ejecutar localmente

```bash
cd ~/alerta-ruta
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/export_web_data.py --check
python scripts/prepare_map_data.py --check
python scripts/generate_supabase_catalog.py --check
python scripts/validate_supabase_sql.py
python -m http.server 8000 --directory web
```

Abre `http://localhost:8000` y el panel en `http://localhost:8000/admin/`. Los archivos deben servirse por HTTP para cargar el catálogo JSON y las incidencias.

Para regenerar derivados después de cambiar deliberadamente una fuente:

```bash
python scripts/export_web_data.py
python scripts/prepare_map_data.py
python scripts/generate_supabase_catalog.py
```

Los exportadores validan duplicados, campos incompletos, referencias, horarios, frecuencia, camiones, solapamientos, hashes y cantidades esperadas. Las fuentes de `data/raw/` no se modifican.

## Configuración Supabase

El proyecto actual ya está configurado. Para reproducir la instalación en otro proyecto, sigue [docs/configurar-supabase.md](docs/configurar-supabase.md). En resumen:

1. crea el proyecto Supabase;
2. ejecuta las migraciones `0001`, `0002`, `0003` y después `security_checks.sql`;
3. deshabilita el registro público y crea el primer usuario desde el Dashboard;
4. autorízalo mediante `supabase/setup/authorize_first_admin.sql`;
5. configura únicamente Project URL y publishable key en `web/config.js`;
6. verifica login, creación, retiro y lectura pública antes de publicar.

No hay contraseñas ni claves privadas en el repositorio. La ruta `/admin/` es un recurso estático visible, pero los datos y cambios quedan protegidos por Auth, pertenencia explícita a `admin_users`, RLS y RPC. Ocultar la URL no es una medida de seguridad.

### Registrar una demora desde el navegador

1. abre `https://khalilar011.github.io/proyecto-emacruz/admin/`;
2. inicia sesión con una cuenta autorizada;
3. elige **Camión**, por ejemplo `SIM-C01`;
4. selecciona `DEMORA`, motivo, estimación, inicio y vencimiento;
5. revisa los nombres de barrios, UV, días y horarios que coinciden realmente con esa ventana;
6. pulsa **Publicar alerta**.

La web pública recibe el cambio por Realtime o en la consulta periódica. El horario del Excel no cambia: la demora se muestra como información adicional. La tabla permite editar y retirar; retirar exige confirmación y conserva el historial.

### Analizar incidencias desde el navegador

Una cuenta incluida en `admin_users` puede abrir **Minería de datos** sin volver a iniciar sesión. El modo demostración genera 180 observaciones sintéticas con semilla fija sin insertarlas en `incidents`; el modo historial usa una fila actual por incidencia y conserva retiradas. El botón ejecuta Apriori en el servidor, guarda la corrida y sólo confirma el éxito después de persistirla.

El cron de GitHub Actions invoca el mismo motor los lunes a las 07:00 UTC (03:00 en Bolivia). Su despliegue y el secreto compartido se configuran siguiendo [docs/mineria-datos.md](docs/mineria-datos.md). Las asociaciones son descriptivas, no causales, y las tasas usan servicios programados, no servicios efectivamente realizados.

## Respaldo manual de alertas

Este flujo se conserva para demostración cuando Supabase no está disponible. No se combinan fuentes: si Supabase carga, se usa su tabla; de lo contrario se usa el JSON local.

### Crear una demora

```bash
python scripts/manage_alerts.py crear \
  --estado DEMORA \
  --motivo "Lluvia (escenario simulado)" \
  --estimacion-minutos 45 \
  --inicio "2026-11-04T14:00:00-04:00" \
  --vence "2026-11-04T18:00:00-04:00" \
  --responsable "Nombre del administrador" \
  --servicio D2-S001
```

También admite objetivos repetibles `--barrio`, `--camion` y `--servicio`. Para objetivos amplios, la web solo aplica la alerta a servicios cuyo día y horario se solapan con la vigencia; `--servicio` ofrece máxima precisión.

### Consultar, modificar y retirar

```bash
python scripts/manage_alerts.py listar
python scripts/manage_alerts.py modificar INC-AAAA... \
  --motivo "Motivo corregido (escenario simulado)" \
  --estimacion-minutos 30 \
  --responsable "Nombre del administrador"
python scripts/manage_alerts.py retirar INC-AAAA... \
  --responsable "Nombre del administrador"
python scripts/manage_alerts.py validar
```

`retirar` conserva responsable, fecha e historial. El gestor rechaza fechas sin zona horaria, vigencias inválidas, estimaciones no positivas, referencias inexistentes y periodos solapados que comparten objetivo.

## Roles y permisos

- **Operador/supervisor:** prepara y verifica el dato de la incidencia.
- **Administrador/comunicador:** cuenta incluida en `admin_users`; crea, modifica y retira incidencias simuladas.
- **Vecino:** consulta datos publicados y vigentes en modo de solo lectura.

El panel permite publicación directa por un administrador autorizado; todavía no implementa aprobación institucional en dos pasos. El respaldo CLI depende del acceso a Ubuntu y Git. Ninguno autoriza publicar información institucional real.

## Pruebas

```bash
python scripts/export_web_data.py --check
python scripts/prepare_map_data.py --check
python scripts/generate_supabase_catalog.py --check
python scripts/validate_supabase_sql.py
python scripts/manage_alerts.py validar
python -m unittest discover -s tests -p 'test_*.py' -v
node tests/test_schedule.js
node tests/test_incidents.js
node tests/test_web_integration.js
node tests/test_mining_engine.mjs
node tests/test_mining_integration.mjs
node --check web/app.js
node --check web/map-viewer.js
node --check web/supabase-data.js
node --check web/admin/admin.js
node --check web/admin/mineria/mining.js
```

Las pruebas locales cubren consistencia Excel/JSON, cuatro servicios por barrio, los tres mapas del visor, límites de zoom, catálogo SQL con 104 tuplas cerradas, estructura RLS/RPC, respaldo manual, próxima recolección, alcance temporal y prioridad. `security_checks.sql` y `admin_flow_checks.sql` también fueron ejecutados satisfactoriamente en el proyecto real.

Con la CLI autenticada y el repositorio vinculado al proyecto correcto, las verificaciones remotas son:

```bash
npx --yes supabase@latest db lint --remote --schema public --level warning --fail-on error --agent no
npx --yes supabase@latest db query --remote --file supabase/tests/security_checks.sql --yes --agent no
npx --yes supabase@latest db query --remote --file supabase/tests/admin_flow_checks.sql --yes --agent no
python scripts/verify_supabase_public.py
node scripts/verify_supabase_frontend.js  # requiere una incidencia pública vigente
```

`admin_flow_checks.sql` termina en `ROLLBACK`. La validación real del 4 de noviembre de 2026 confirmó login desde `/admin/`, creación, modificación, visibilidad pública, vencimiento, retiro e historial con RLS activa.

Antes de cada `git push` se debe ejecutar la revisión de `skills/alerta-ruta-jira/SKILL.md`. GitHub Pages publica `web/` automáticamente al llegar un commit a `main`.

## Fuentes y limitaciones

- Excel suministrado: programación y camiones ficticios para fines académicos.
- Geometrías abiertas: se conservan en `data/raw/geodata/` y `data/processed/geodata/` para trazabilidad, pero ya no se cargan en el frontend.
- Mapas públicos: únicamente los tres insumos gráficos suministrados al proyecto.
- No existen geometrías verificadas de los límites exactos de los 26 barrios ni recorridos oficiales de recolección.
- No hay GPS, clima automático, reclamos, mediciones reales ni datos para afirmar que un modelo predice acumulación.
- El próximo servicio es un cálculo sobre la semana simulada, no una hora estimada de llegada.

Consulta [docs/fuentes-datos.md](docs/fuentes-datos.md) para la procedencia, hashes y condiciones de uso.

## Equipo

- Khalil Arab
- Monica Blanco

Carrera: Ingeniería en Ciencias de Datos e Inteligencia de Negocios — Univalle.
