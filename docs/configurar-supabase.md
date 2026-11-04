# Configurar Supabase para Alerta Ruta

El repositorio contiene la integración, las migraciones y el panel, pero no crea ni controla un proyecto externo de Supabase. Hasta completar estos pasos, la web pública usa exclusivamente `web/data/incidencias.json` y el panel muestra «Configuración pendiente».

## 1. Crear el proyecto

1. Inicia sesión en [Supabase](https://supabase.com/dashboard) y crea un proyecto.
2. Elige una contraseña fuerte para PostgreSQL y guárdala fuera del repositorio.
3. Espera a que el proyecto termine de aprovisionarse.

## 2. Aplicar el esquema reproducible

En **SQL Editor**, ejecuta en este orden y sin alterar el contenido:

1. `supabase/migrations/0001_alerta_ruta_schema.sql`;
2. `supabase/migrations/0002_catalog.sql`;
3. `supabase/tests/security_checks.sql`.

El tercer archivo debe terminar sin excepciones. Verifica 26 barrios, 104 servicios, RLS habilitado, escritura directa denegada y RPC de escritura no disponible para `anon`.

## 3. Cerrar el registro público

En **Authentication → Providers → Email**:

1. conserva habilitado el acceso con correo y contraseña;
2. deshabilita **Allow new users to sign up**;
3. no habilites acceso anónimo;
4. en **URL Configuration**, establece como Site URL `https://khalilar011.github.io/proyecto-emacruz/admin/` y agrega esa misma URL a Redirect URLs.

El panel no incluye formulario de registro. La restricción real se aplica también en Auth y en las políticas RLS, no ocultando botones.

## 4. Crear la primera cuenta de forma segura

1. En **Authentication → Users**, usa **Add user** para crear el usuario administrador o enviarle una invitación. No compartas su contraseña.
2. Copia el UUID de ese usuario.
3. En SQL Editor, autorízalo explícitamente, sustituyendo ambos valores:

```sql
insert into public.admin_users (user_id, display_name)
values ('UUID-REAL-DEL-USUARIO', 'Nombre visible del administrador');
```

Una cuenta autenticada que no figure en `admin_users` no puede leer el historial ni ejecutar las operaciones de crear, modificar o retirar.

## 5. Conectar el navegador

En **Project Settings → API**, copia únicamente Project URL y la **publishable key** (o la clave pública `anon` heredada, si el proyecto todavía usa ese formato). Completa `web/config.js`:

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

La web consulta cambios mediante Supabase Realtime y, como respaldo de actualización, cada 60 segundos. Los vencimientos dejan de ser legibles para visitantes por RLS aunque el navegador no reciba un evento.

## Responsabilidades y alcance

El administrador autorizado publica directamente una incidencia académica. Esta versión no implementa un segundo paso institucional de aprobación. Supabase conserva creador, modificador, retiro y un historial para consulta administrativa; eso no convierte los avisos en información oficial de EMACRUZ.
