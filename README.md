# Alerta Ruta — Distrito Municipal N.º 2

Prototipo universitario para consultar programación **simulada** de recolección e incidencias manuales en 26 barrios del Distrito Municipal N.º 2 de Santa Cruz de la Sierra, Bolivia.

> **SIMULACIÓN ACADÉMICA — NO ES UN AVISO OFICIAL.** Los horarios, camiones y alertas no acreditan la operación de EMACRUZ en tiempo real.

## Funcionalidad actual

- Buscador y selector de 26 barrios, 15 UV, 104 servicios semanales y 12 camiones simulados.
- Próximo servicio calculado con la hora `America/La_Paz` y semana programada del Excel.
- Estados `NORMAL`, `DEMORA` y `SERVICIO_SUSPENDIDO`, con prioridad suspensión → demora → normal.
- Mapa Leaflet/OpenStreetMap con límite distrital y 15 UV verificadas; filtros por camión, día y estado.
- Cobertura y secuencia de barrios programados, sin inventar GPS, calles recorridas ni rutas oficiales.
- Panel `/admin/` con Supabase Auth, PostgreSQL, RLS, historial y operaciones validadas.
- Un único respaldo JSON cuando Supabase todavía no está configurado o falla en la carga inicial.
- Tres mapas suministrados, conservados como referencias secundarias ampliables.

La integración Supabase queda inactiva mientras `web/config.js` no contenga una URL y una clave pública reales. En ese estado la consulta funciona con `web/data/incidencias.json` y el panel informa que falta configuración; no simula una conexión.

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
└── prepare_map_data.py
supabase/
├── migrations/                                         # esquema RLS y catálogo
└── tests/security_checks.sql
tests/
web/
├── admin/                                               # acceso Auth + RLS
├── assets/maps/
├── data/geodata/distrito-2-uv.geojson
├── data/distrito-2.json
├── data/incidencias.json
├── index.html
├── app.js
├── incidents.js
├── map.js
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
python -m http.server 8000 --directory web
```

Abre `http://localhost:8000` y el panel en `http://localhost:8000/admin/`. Los archivos deben servirse por HTTP para cargar JSON y GeoJSON.

Para regenerar derivados después de cambiar deliberadamente una fuente:

```bash
python scripts/export_web_data.py
python scripts/prepare_map_data.py
python scripts/generate_supabase_catalog.py
```

Los exportadores validan duplicados, campos incompletos, referencias, horarios, frecuencia, camiones, solapamientos, hashes y cantidades esperadas. Las fuentes de `data/raw/` no se modifican.

## Activar el panel web

Sigue [docs/configurar-supabase.md](docs/configurar-supabase.md). En resumen:

1. crea el proyecto Supabase;
2. ejecuta `0001_alerta_ruta_schema.sql`, `0002_catalog.sql` y `security_checks.sql`;
3. deshabilita el registro público y crea el primer usuario desde el Dashboard;
4. inserta su UUID en `admin_users`;
5. configura únicamente Project URL y publishable key en `web/config.js`;
6. verifica login, creación, retiro y lectura pública antes de publicar.

No hay contraseñas ni claves privadas en el repositorio. La ruta `/admin/` es un recurso estático visible, pero los datos y cambios quedan protegidos por Auth, pertenencia explícita a `admin_users`, RLS y RPC. Ocultar la URL no es una medida de seguridad.

### Registrar una demora desde el navegador

1. abre `https://khalilar011.github.io/proyecto-emacruz/admin/`;
2. inicia sesión con una cuenta autorizada;
3. elige **Camión**, por ejemplo `SIM-C01`;
4. selecciona `DEMORA`, motivo, estimación, inicio y vencimiento;
5. revisa los servicios y barrios que coinciden realmente con esa ventana;
6. pulsa **Publicar alerta**.

La web pública recibe el cambio por Realtime o en la consulta periódica. El horario del Excel no cambia: la demora se muestra como información adicional. La tabla permite editar y retirar; retirar exige confirmación y conserva el historial.

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
python scripts/manage_alerts.py validar
python -m unittest discover -s tests -p 'test_*.py' -v
node tests/test_schedule.js
node tests/test_incidents.js
node tests/test_web_integration.js
node --check web/app.js
node --check web/map.js
node --check web/supabase-data.js
node --check web/admin/admin.js
```

Las pruebas locales cubren consistencia Excel/JSON, cuatro servicios por barrio, hashes y reproducción de geodatos, catálogo SQL, estructura RLS/RPC, respaldo manual, próxima recolección, alcance temporal y prioridad. `supabase/tests/security_checks.sql` requiere un proyecto real y no se declara ejecutado hasta configurarlo.

Antes de cada `git push` se debe ejecutar la revisión de `skills/alerta-ruta-jira/SKILL.md`. GitHub Pages publica `web/` automáticamente al llegar un commit a `main`.

## Fuentes y limitaciones

- Excel suministrado: programación y camiones ficticios para fines académicos.
- Geometrías: Hogaria 2026-10, con crédito a GAMSCS y colaboradores de OpenStreetMap, licencia ODbL 1.0.
- Calles base: teselas OpenStreetMap con atribución visible y sin descarga masiva.
- No existen geometrías verificadas de los límites exactos de los 26 barrios ni recorridos oficiales de recolección.
- No hay GPS, clima automático, reclamos, mediciones reales ni datos para afirmar que un modelo predice acumulación.
- El próximo servicio es un cálculo sobre la semana simulada, no una hora estimada de llegada.

Consulta [docs/fuentes-datos.md](docs/fuentes-datos.md) para la procedencia, hashes y condiciones de uso.

## Equipo

- Khalil Arab
- Monica Blanco

Carrera: Ingeniería en Ciencias de Datos e Inteligencia de Negocios — Univalle.
