-- Plantilla para SQL Editor después de crear el usuario en Authentication > Users.
-- Sustituya los dos valores REEMPLAZAR antes de ejecutar.

do $$
declare
  requested_email constant text := 'REEMPLAZAR-CORREO';
  requested_name constant text := 'REEMPLAZAR-NOMBRE';
  requested_user_id uuid;
begin
  if requested_email like 'REEMPLAZAR-%' or requested_name like 'REEMPLAZAR-%' then
    raise exception 'Sustituya REEMPLAZAR-CORREO y REEMPLAZAR-NOMBRE antes de ejecutar';
  end if;

  select id into requested_user_id
  from auth.users
  where lower(email) = lower(requested_email);

  if requested_user_id is null then
    raise exception 'No existe un usuario Auth con el correo %', requested_email;
  end if;

  insert into public.admin_users (user_id, display_name)
  values (requested_user_id, requested_name)
  on conflict (user_id) do update set display_name = excluded.display_name;

  raise notice 'Administrador autorizado: % (%)', requested_name, requested_user_id;
end;
$$;
