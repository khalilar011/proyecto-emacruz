# Alerta Ruta — Distrito Municipal N.º 2

Prototipo universitario para consultar la programación **simulada** de recolección de residuos y las incidencias manuales registradas para barrios del Distrito Municipal N.º 2 de Santa Cruz de la Sierra, Bolivia.

> **SIMULACIÓN ACADÉMICA — NO ES UN AVISO OFICIAL.** Los horarios, camiones y alertas no acreditan la operación de EMACRUZ en tiempo real.

## Fase 2

Esta versión sustituye el enfoque general anterior y trabaja exclusivamente con 26 barrios y 15 unidades vecinales del Distrito 2. La web permite:

- buscar y seleccionar un barrio sin distinguir mayúsculas o tildes;
- consultar UV, cuatro días semanales, franja horaria y camión simulado;
- calcular el próximo servicio con la hora de `America/La_Paz`;
- mostrar estados `NORMAL`, `DEMORA` y `SERVICIO_SUSPENDIDO` desde un JSON manual;
- descartar automáticamente avisos retirados o vencidos;
- explorar tres mapas mediante un visor ampliable.

La fuente no contiene rutas operativas, coordenadas ni trayectorias. La interfaz lo informa y no inventa esos datos.

## Estructura principal

```text
data/
├── raw/distrito-2/Distrito_2_horarios_SIMULADOS.xlsx   # fuente original inmutable
└── processed/distrito-2/
    ├── Distrito_2_horarios_SIMULADOS.json               # derivado reproducible
    └── validacion.json
scripts/
├── export_web_data.py
└── manage_alerts.py
tests/
web/
├── assets/maps/
├── data/distrito-2.json
├── data/incidencias.json
├── index.html
├── styles.css
├── schedule-utils.js
└── app.js
```

La base anterior `Base_Emacruz_sectores_y_frecuencias.xlsx` ya no forma parte de la versión actual. No se reescribió el historial de Git.

## Preparar y ejecutar

Desde Ubuntu o WSL:

```bash
cd ~/alerta-ruta
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/export_web_data.py --check
python -m http.server 8000 --directory web
```

Abre `http://localhost:8000`. No abras `web/index.html` directamente como archivo, porque el navegador debe solicitar los JSON por HTTP.

Para regenerar los derivados después de reemplazar deliberadamente la fuente:

```bash
python scripts/export_web_data.py
python scripts/export_web_data.py --check
```

El exportador abre el Excel en modo de solo lectura y valida duplicados, campos incompletos, referencias inexistentes, horarios, frecuencia semanal, asignaciones de camión y solapamientos. `--check` no escribe archivos.

## Gestión manual de alertas

Los comandos modifican `web/data/incidencias.json`. Todos exigen referencias existentes en el JSON exportado y conservan historial. El archivo solo cambia cuando la operación completa es válida.

### Crear una demora

```bash
python scripts/manage_alerts.py crear \
  --estado DEMORA \
  --motivo "Lluvia (escenario simulado)" \
  --estimacion-minutos 45 \
  --inicio "2026-11-04T14:00:00-04:00" \
  --vence "2026-11-04T18:00:00-04:00" \
  --responsable "Nombre del administrador" \
  --barrio D2-B11 \
  --camion SIM-C01
```

Los objetivos `--barrio`, `--camion` y `--servicio` se pueden repetir. Debe existir al menos uno. Una alerta dirigida a un camión afecta las fichas de los barrios que tienen ese camión asignado en la semana tipo.

### Crear una suspensión

```bash
python scripts/manage_alerts.py crear \
  --estado SERVICIO_SUSPENDIDO \
  --motivo "Falla mecánica (escenario simulado)" \
  --inicio "2026-11-05T08:00:00-04:00" \
  --vence "2026-11-05T18:00:00-04:00" \
  --responsable "Nombre del administrador" \
  --servicio D2-S001
```

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

Usa el ID exacto mostrado por `listar`. `retirar` no borra el registro: añade responsable y fecha, lo oculta de la consulta y conserva el historial. Una incidencia vencida tampoco se muestra aunque siga almacenada.

El gestor rechaza fechas sin zona horaria, vencimientos anteriores al inicio, estimaciones no positivas, referencias inexistentes y alertas con periodos solapados que comparten un objetivo.

## Roles y publicación

- **Operador/supervisor:** prepara y verifica los datos de la incidencia.
- **Administrador/comunicador:** ejecuta o revisa el comando, inspecciona el diff y autoriza el commit/publicación.
- **Vecino:** consulta la web en modo de solo lectura.

La herramienta local no implementa autenticación. El permiso depende del acceso a Ubuntu y al repositorio. La revisión técnica del proyecto no sustituye una autorización institucional para publicar información real.

Después de crear o retirar una alerta:

```bash
python scripts/manage_alerts.py validar
git diff -- web/data/incidencias.json
python -m unittest discover -s tests -p 'test_*.py' -v
node tests/test_schedule.js
```

Antes de cada `git push`, se debe ejecutar la revisión definida en `skills/alerta-ruta-jira/SKILL.md`. GitHub Pages publica automáticamente el contenido de `web/` cuando un commit llega a `main`.

## Pruebas

```bash
python scripts/export_web_data.py --check
python scripts/manage_alerts.py validar
python -m unittest discover -s tests -p 'test_*.py' -v
node tests/test_schedule.js
node --check web/app.js
```

Las pruebas cubren consistencia Excel/JSON, cuatro servicios por barrio, referencias, creación/modificación/retiro, prevención de contradicciones, próxima recolección y vencimiento de incidencias.

## Fuentes y limitaciones

- Excel suministrado: horarios, camiones y servicios ficticios para fines académicos.
- Mapas: diagnóstico municipal incluido en los insumos, usado como imagen de orientación.
- No hay GPS, rutas georreferenciadas, clima automático, reclamos, mediciones reales ni datos adecuados para afirmar que un modelo predice acumulación de residuos.
- El próximo servicio es un cálculo sobre la semana simulada; no es una hora estimada de llegada.
- La aprobación y publicación institucional no están implementadas en GitHub Pages; el flujo actual es manual mediante Git.

## Equipo

- Khalil Arab
- Monica Blanco

Carrera: Ingeniería en Ciencias de Datos e Inteligencia de Negocios — Univalle.
