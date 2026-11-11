-- Ejecutar después de 0001 y 0002. La transacción no modifica datos.
begin;

do $$
declare
  missing_rls text[];
begin
  select array_agg(c.relname order by c.relname)
  into missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array['admin_users','neighborhood_catalog','service_catalog','incidents','incident_history','mining_analysis_runs'])
    and not c.relrowsecurity;
  if cardinality(missing_rls) > 0 then
    raise exception 'RLS ausente en: %', missing_rls;
  end if;

  if has_table_privilege('anon', 'public.incidents', 'INSERT')
    or has_table_privilege('anon', 'public.incidents', 'UPDATE')
    or has_table_privilege('anon', 'public.incidents', 'DELETE') then
    raise exception 'anon posee permisos de escritura sobre incidents';
  end if;
  if has_table_privilege('authenticated', 'public.incidents', 'INSERT')
    or has_table_privilege('authenticated', 'public.incidents', 'UPDATE')
    or has_table_privilege('authenticated', 'public.incidents', 'DELETE') then
    raise exception 'authenticated posee escritura directa; debe usar RPC validada';
  end if;
  if has_table_privilege('anon', 'public.mining_analysis_runs', 'SELECT')
    or has_table_privilege('anon', 'public.mining_analysis_runs', 'INSERT')
    or has_table_privilege('anon', 'public.mining_analysis_runs', 'UPDATE')
    or has_table_privilege('anon', 'public.mining_analysis_runs', 'DELETE') then
    raise exception 'anon posee permisos sobre resultados privados de minería';
  end if;
  if has_table_privilege('authenticated', 'public.mining_analysis_runs', 'INSERT')
    or has_table_privilege('authenticated', 'public.mining_analysis_runs', 'UPDATE')
    or has_table_privilege('authenticated', 'public.mining_analysis_runs', 'DELETE') then
    raise exception 'authenticated puede escribir corridas de minería directamente';
  end if;
  if has_function_privilege(
    'anon',
    'public.create_alerta_ruta_incident(text,text,text,integer,timestamptz,timestamptz,text,text,text,text[])',
    'EXECUTE'
  ) then
    raise exception 'anon puede ejecutar create_alerta_ruta_incident';
  end if;
  if has_function_privilege(
    'anon',
    'public.log_alerta_ruta_incident_change()',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.log_alerta_ruta_incident_change()',
    'EXECUTE'
  ) then
    raise exception 'La función de auditoría es ejecutable desde el navegador';
  end if;
  if (select count(*) from public.neighborhood_catalog where active) <> 26 then
    raise exception 'Catálogo de barrios distinto de 26';
  end if;
  if (select count(*) from public.service_catalog where active) <> 104 then
    raise exception 'Catálogo de servicios distinto de 104';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'incidents'
      and policyname = 'Public reads active simulated incidents'
  ) then
    raise exception 'Falta política pública de incidencias vigentes';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mining_analysis_runs'
      and policyname = 'Admins read mining analysis'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'Falta política privada de resultados de minería';
  end if;
end;
$$;

rollback;
