# Dictamen técnico previo a push — panel de demoras y visor simple

**Fecha:** 2026-11-04

**Historias:** SCRUM-14, SCRUM-15 y SCRUM-19; épica SCRUM-30

**Versión revisada:** diff preparado de `main` contra `896d01bc1bdc6b8b0025cb6a55ad98798c247a00`

**Dictamen:** **APROBADO**

## Alcance y evidencia

La matriz completa está en `docs/revisiones/panel-demoras-visor-simple-2026-11-04.md`. Se revisaron README, plan CRISP-DM, historias vigentes de Jira, todos los archivos modificados, pruebas, permisos, fuentes, carácter simulado, datos sensibles y estado Git.

- SCRUM-14: CV1–CV5 `cumple` para el visor simple.
- SCRUM-15: CV1–CV5 `cumple` con cliente simulado, respaldo JSON y REST real.
- SCRUM-19: CV1–CV6 `cumple` con Auth, PostgreSQL, RLS, RPC y navegador reales.
- 12 pruebas Python, tres conjuntos Node, seis verificaciones de sintaxis JavaScript, exportadores y validadores locales: aprobados; se añadieron verificaciones remotas reproducibles.
- HTTP local: página, panel, dos JSON y tres mapas respondieron 200.
- Datos originales: ningún cambio en `data/raw/`; la programación conserva 26 barrios, 15 UV, 104 servicios y 12 camiones simulados.
- Supabase real: migraciones `0001/0002`, 26 barrios, 104 servicios, 5 tablas RLS, 6 políticas, 3 RPC, linter y dos pruebas SQL aprobados.
- Navegador real: login autorizado, creación, modificación, aviso público en Totai y retiro; historial `CREATED, UPDATED, UPDATED, RETIRED`.
- Seguridad: no hay contraseñas, tokens, `sb_secret`, `service_role` ni JWT heredados en Git. `web/config.js` contiene exclusivamente URL y publishable key pública.

## Hallazgos

No existen hallazgos bloqueantes. El asesor de Supabase informa advertencias esperadas por cuatro funciones `SECURITY DEFINER`: las tres RPC de escritura y la verificación de administrador. Son intencionales; `anon` no puede ejecutarlas, no hay DML directo y cada RPC valida `admin_users` antes de operar.

## Controles externos completados

- Proyecto confirmado: `alerta-ruta-emacruz` (`isbjpdslwhpbqfhwxvqr`).
- Registro público y acceso anónimo Auth deshabilitados; correo/contraseña habilitado; URLs del panel configuradas.
- Usuario único confirmado y autorizado por UUID real.
- Claves heredadas deshabilitadas por el responsable; el navegador usa `sb_publishable_…`.

## Decisión de publicación

Se autoriza el `git push` y despliegue de esta versión exacta, solicitado expresamente por el responsable. Cualquier cambio posterior exige repetir la revisión. No se autoriza publicar avisos institucionales reales: el sistema continúa identificado como simulación académica.
