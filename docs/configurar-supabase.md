# Configurar Supabase para Alerta Ruta

Estado verificado el 4 de noviembre de 2026: el repositorio está vinculado exclusivamente a `alerta-ruta-emacruz` (`isbjpdslwhpbqfhwxvqr`), las dos migraciones están aplicadas, Auth/RLS/RPC fueron comprobadas y existe un único administrador autorizado. Las instrucciones siguientes permiten auditar o reproducir la configuración sin publicar secretos.

## 1. Crear el proyecto

1. Inicia sesión en [Supabase](https://supabase.com/dashboard) y crea un proyecto.
2. Elige una contraseña fuerte para PostgreSQL y guárdala fuera del repositorio.
3. Espera a que el proyecto termine de aprovisionarse.

## 2. Aplicar el esquema reproducible

Con Supabase CLI autenticada, vincula la referencia comprobada y aplica las migraciones:

```bash
npx --yes supabase@latest link --project-ref isbjpdslwhpbqfhwxvqr --yes --agent no
npx --yes supabase@latest db push --remote --skip-vault --yes --agent no
npx --yes supabase@latest db query --remote --file supabase/tests/security_checks.sql --yes --agent no
npx --yes supabase@latest db query --remote --file supabase/tests/admin_flow_checks.sql --yes --agent no
```

Las pruebas deben terminar sin excepciones. Verifican 26 barrios, 104 servicios, RLS habilitado, escritura directa denegada, RPC no disponible para `anon`, auditoría y el ciclo crear–modificar–retirar en una transacción revertida.

Antes de copiarlos al panel de Supabase, la comprobación local reproducible es:

```bash
python scripts/generate_supabase_catalog.py --check
python scripts/validate_supabase_sql.py
```

Esta validación local comprueba delimitadores, literales, bloques de inserción y las 104 tuplas cerradas. La validación PostgreSQL definitiva es ejecutar los tres SQL en un proyecto Supabase y obtener `security_checks.sql` sin excepciones; no se sustituye con una prueba estática.

## 3. Cerrar el registro público

En **Authentication → Providers → Email**:

1. conserva habilitado el acceso con correo y contraseña;
2. deshabilita **Allow new users to sign up**;
3. no habilites acceso anónimo;
4. en **URL Configuration**, establece como Site URL `https://khalilar011.github.io/proyecto-emacruz/admin/` y agrega esa URL y `http://localhost:8000/admin/` a Redirect URLs.

El panel no incluye formulario de registro. La restricción real se aplica también en Auth y en las políticas RLS, no ocultando botones.

## 4. Crear la primera cuenta de forma segura

1. En **Authentication → Users**, usa **Add user** para crear el usuario administrador o enviarle una invitación. No compartas su contraseña.
2. Abre `supabase/setup/authorize_first_admin.sql`.
3. Sustituye `REEMPLAZAR-CORREO` por el correo exacto del usuario y `REEMPLAZAR-NOMBRE` por su nombre visible.
4. Ejecuta la plantilla en SQL Editor. La propia plantilla rechaza marcadores sin sustituir y correos que todavía no existen en Auth.

Una cuenta autenticada que no figure en `admin_users` no puede leer el historial ni ejecutar las operaciones de crear, modificar o retirar.

## 5. Conectar el navegador

En **Settings → API Keys**, copia únicamente Project URL y la **publishable key**. No uses las claves heredadas `anon`/`service_role`. Completa `web/config.js`:

```js
window.ALERTA_RUTA_CONFIG = Object.freeze({
  supabaseUrl: "https://ID-DEL-PROYECTO.supabase.co",
  supabasePublishableKey: "CLAVE-PUBLICA",
  refreshSeconds: 60,
});
```

La clave pública está diseñada para el navegador y su alcance queda limitado por RLS. **Nunca** coloques `service_role`, la contraseña de PostgreSQL, tokens personales ni contraseñas de usuarios en Git, GitHub Pages o JavaScript.

## 6. Verificación antes de publicar

1. Abre localmente `http://localhost:8000/admin/`.
2. Comprueba que una contraseña incorrecta no inicia sesión.
3. Comprueba que una cuenta no incluida en `admin_users` es expulsada.
4. Con el administrador autorizado, crea una alerta que cubra un servicio real dentro de la ventana elegida.
5. En una ventana privada, confirma que solo el barrio/servicio afectado muestra la alerta.
6. Retira la alerta y confirma que desaparece de la consulta, pero queda como `RETIRADA` en el panel.
7. Repite `supabase/tests/security_checks.sql` y las pruebas locales del README.

La comprobación ejecutada en el proyecto real creó una demora desde el navegador, la modificó, la mostró únicamente en Totai (UV 43), la retiró y confirmó el historial `CREATED → UPDATED → UPDATED → RETIRED`. La incidencia retirada permanece en el historial administrativo y ya no es legible por `anon`.

La web consulta cambios mediante Supabase Realtime y, como respaldo de actualización, cada 60 segundos. Los vencimientos dejan de ser legibles para visitantes por RLS aunque el navegador no reciba un evento.

## Responsabilidades y alcance

El administrador autorizado publica directamente una incidencia académica. Esta versión no implementa un segundo paso institucional de aprobación. Supabase conserva creador, modificador, retiro y un historial para consulta administrativa; eso no convierte los avisos en información oficial de EMACRUZ.
