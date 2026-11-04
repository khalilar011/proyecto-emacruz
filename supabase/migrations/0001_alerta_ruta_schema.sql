-- Alerta Ruta · esquema seguro para incidencias simuladas
-- Ejecutar con Supabase CLI o SQL Editor como propietario del proyecto.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.neighborhood_catalog (
  id text primary key check (id ~ '^D2-B[0-9]{2}$'),
  name text not null,
  uv smallint not null check (uv > 0),
  active boolean not null default true
);

create table if not exists public.service_catalog (
  id text primary key check (id ~ '^D2-S[0-9]{3}$'),
  neighborhood_id text not null references public.neighborhood_catalog(id),
  truck_id text not null check (truck_id ~ '^SIM-C[0-9]{2}$'),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  truck_order smallint not null check (truck_order > 0),
  active boolean not null default true,
  check (start_time < end_time)
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  state text not null check (state in ('NORMAL', 'DEMORA', 'SERVICIO_SUSPENDIDO')),
  reason_code text not null check (reason_code in ('LLUVIA', 'FALLA_MECANICA', 'PROBLEMA_TECNICO', 'OTRO')),
  reason_detail text not null check (char_length(trim(reason_detail)) between 3 and 240),
  estimated_delay_minutes integer,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  notes text check (notes is null or char_length(notes) <= 1000),
  primary_target_type text not null check (primary_target_type in ('truck', 'service')),
  primary_target_id text not null,
  affected_service_ids text[] not null,
  affected_neighborhood_ids text[] not null,
  affected_truck_ids text[] not null,
  published boolean not null default true,
  is_simulation boolean not null default true check (is_simulation),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  retired_at timestamptz,
  retired_by uuid references auth.users(id),
  check (starts_at < expires_at),
  check (cardinality(affected_service_ids) > 0),
  check (cardinality(affected_neighborhood_ids) > 0),
  check (cardinality(affected_truck_ids) > 0),
  check (
    estimated_delay_minutes is null
    or (state = 'DEMORA' and estimated_delay_minutes between 1 and 1440)
  )
);

create table if not exists public.incident_history (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.incidents(id) on delete restrict,
  action text not null check (action in ('CREATED', 'UPDATED', 'RETIRED')),
  changed_at timestamptz not null default now(),
  changed_by uuid not null references auth.users(id),
  old_record jsonb,
  new_record jsonb not null
);

alter table public.admin_users enable row level security;
alter table public.neighborhood_catalog enable row level security;
alter table public.service_catalog enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_history enable row level security;

revoke all on public.admin_users from anon, authenticated;
revoke all on public.neighborhood_catalog from anon, authenticated;
revoke all on public.service_catalog from anon, authenticated;
revoke all on public.incidents from anon, authenticated;
revoke all on public.incident_history from anon, authenticated;

grant select on public.neighborhood_catalog to anon, authenticated;
grant select on public.service_catalog to anon, authenticated;
grant select (user_id, display_name, created_at) on public.admin_users to authenticated;
grant select on public.incidents to authenticated;
grant select on public.incident_history to authenticated;
grant select (
  id, state, reason_code, reason_detail, estimated_delay_minutes,
  starts_at, expires_at, primary_target_type, primary_target_id,
  affected_service_ids, affected_neighborhood_ids, affected_truck_ids,
  published_at, updated_at, is_simulation
) on public.incidents to anon;

create or replace function public.is_alerta_ruta_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_alerta_ruta_admin() from public, anon;
grant execute on function public.is_alerta_ruta_admin() to authenticated;

drop policy if exists "Public reads neighborhoods" on public.neighborhood_catalog;
create policy "Public reads neighborhoods"
on public.neighborhood_catalog for select
to anon, authenticated
using (active);

drop policy if exists "Public reads services" on public.service_catalog;
create policy "Public reads services"
on public.service_catalog for select
to anon, authenticated
using (active);

drop policy if exists "Users read own admin membership" on public.admin_users;
create policy "Users read own admin membership"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Public reads active simulated incidents" on public.incidents;
create policy "Public reads active simulated incidents"
on public.incidents for select
to anon
using (
  published
  and is_simulation
  and retired_at is null
  and starts_at <= now()
  and expires_at > now()
);

drop policy if exists "Admins read all incidents" on public.incidents;
create policy "Admins read all incidents"
on public.incidents for select
to authenticated
using (public.is_alerta_ruta_admin());

drop policy if exists "Admins read incident history" on public.incident_history;
create policy "Admins read incident history"
on public.incident_history for select
to authenticated
using (public.is_alerta_ruta_admin());

create or replace function public.service_occurs_in_window(
  p_service_id text,
  p_starts_at timestamptz,
  p_expires_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.service_catalog service
    cross join lateral generate_series(
      (p_starts_at at time zone 'America/La_Paz')::date,
      (p_expires_at at time zone 'America/La_Paz')::date,
      interval '1 day'
    ) as calendar(day_value)
    where service.id = p_service_id
      and service.active
      and extract(isodow from calendar.day_value) = service.day_of_week
      and tstzrange(
        ((calendar.day_value::date + service.start_time) at time zone 'America/La_Paz'),
        ((calendar.day_value::date + service.end_time) at time zone 'America/La_Paz'),
        '[)'
      ) && tstzrange(p_starts_at, p_expires_at, '[)')
  );
$$;

revoke all on function public.service_occurs_in_window(text, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.validate_incident_scope(
  p_target_type text,
  p_target_id text,
  p_service_ids text[],
  p_starts_at timestamptz,
  p_expires_at timestamptz
)
returns table(service_ids text[], neighborhood_ids text[], truck_ids text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_ids text[];
  invalid_count integer;
begin
  if p_target_type not in ('truck', 'service') then
    raise exception 'Tipo de objetivo inválido';
  end if;
  if p_starts_at >= p_expires_at then
    raise exception 'El vencimiento debe ser posterior al inicio';
  end if;

  select array_agg(distinct value order by value)
  into normalized_ids
  from unnest(coalesce(p_service_ids, array[]::text[])) as value;
  if coalesce(cardinality(normalized_ids), 0) = 0 then
    raise exception 'La incidencia no afecta servicios dentro de su ventana';
  end if;

  select count(*) into invalid_count
  from unnest(normalized_ids) requested(id)
  left join public.service_catalog service on service.id = requested.id and service.active
  where service.id is null
    or (p_target_type = 'truck' and service.truck_id <> p_target_id)
    or (p_target_type = 'service' and service.id <> p_target_id)
    or not public.service_occurs_in_window(service.id, p_starts_at, p_expires_at);
  if invalid_count > 0 then
    raise exception 'Servicios inexistentes o incompatibles con objetivo/ventana';
  end if;

  return query
  select
    array_agg(service.id order by service.id),
    array_agg(distinct service.neighborhood_id order by service.neighborhood_id),
    array_agg(distinct service.truck_id order by service.truck_id)
  from public.service_catalog service
  where service.id = any(normalized_ids);
end;
$$;

revoke all on function public.validate_incident_scope(text, text, text[], timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.create_alerta_ruta_incident(
  p_state text,
  p_reason_code text,
  p_reason_detail text,
  p_estimated_delay_minutes integer,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_notes text,
  p_target_type text,
  p_target_id text,
  p_service_ids text[]
)
returns public.incidents
language plpgsql
security definer
set search_path = ''
as $$
declare
  scope record;
  result public.incidents;
begin
  if not public.is_alerta_ruta_admin() then
    raise exception 'No autorizado';
  end if;
  if p_state not in ('NORMAL', 'DEMORA', 'SERVICIO_SUSPENDIDO') then
    raise exception 'Estado inválido';
  end if;
  if p_reason_code not in ('LLUVIA', 'FALLA_MECANICA', 'PROBLEMA_TECNICO', 'OTRO') then
    raise exception 'Motivo inválido';
  end if;
  if char_length(trim(coalesce(p_reason_detail, ''))) not between 3 and 240 then
    raise exception 'Detalle de motivo inválido';
  end if;
  if p_estimated_delay_minutes is not null
    and (p_state <> 'DEMORA' or p_estimated_delay_minutes not between 1 and 1440) then
    raise exception 'Estimación inválida';
  end if;

  select * into scope
  from public.validate_incident_scope(
    p_target_type, p_target_id, p_service_ids, p_starts_at, p_expires_at
  );

  insert into public.incidents (
    state, reason_code, reason_detail, estimated_delay_minutes,
    starts_at, expires_at, notes, primary_target_type, primary_target_id,
    affected_service_ids, affected_neighborhood_ids, affected_truck_ids,
    created_by, updated_by
  ) values (
    p_state, p_reason_code, trim(p_reason_detail), p_estimated_delay_minutes,
    p_starts_at, p_expires_at, nullif(trim(coalesce(p_notes, '')), ''),
    p_target_type, p_target_id,
    scope.service_ids, scope.neighborhood_ids, scope.truck_ids,
    auth.uid(), auth.uid()
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.update_alerta_ruta_incident(
  p_id uuid,
  p_state text,
  p_reason_code text,
  p_reason_detail text,
  p_estimated_delay_minutes integer,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_notes text,
  p_target_type text,
  p_target_id text,
  p_service_ids text[]
)
returns public.incidents
language plpgsql
security definer
set search_path = ''
as $$
declare
  scope record;
  result public.incidents;
begin
  if not public.is_alerta_ruta_admin() then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from public.incidents where id = p_id and retired_at is null) then
    raise exception 'Incidencia inexistente o retirada';
  end if;
  if p_state not in ('NORMAL', 'DEMORA', 'SERVICIO_SUSPENDIDO')
    or p_reason_code not in ('LLUVIA', 'FALLA_MECANICA', 'PROBLEMA_TECNICO', 'OTRO')
    or char_length(trim(coalesce(p_reason_detail, ''))) not between 3 and 240 then
    raise exception 'Estado o motivo inválido';
  end if;
  if p_estimated_delay_minutes is not null
    and (p_state <> 'DEMORA' or p_estimated_delay_minutes not between 1 and 1440) then
    raise exception 'Estimación inválida';
  end if;

  select * into scope
  from public.validate_incident_scope(
    p_target_type, p_target_id, p_service_ids, p_starts_at, p_expires_at
  );

  update public.incidents set
    state = p_state,
    reason_code = p_reason_code,
    reason_detail = trim(p_reason_detail),
    estimated_delay_minutes = p_estimated_delay_minutes,
    starts_at = p_starts_at,
    expires_at = p_expires_at,
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    primary_target_type = p_target_type,
    primary_target_id = p_target_id,
    affected_service_ids = scope.service_ids,
    affected_neighborhood_ids = scope.neighborhood_ids,
    affected_truck_ids = scope.truck_ids,
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_id
  returning * into result;
  return result;
end;
$$;

create or replace function public.retire_alerta_ruta_incident(p_id uuid)
returns public.incidents
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.incidents;
begin
  if not public.is_alerta_ruta_admin() then
    raise exception 'No autorizado';
  end if;
  update public.incidents set
    retired_at = now(),
    retired_by = auth.uid(),
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_id and retired_at is null
  returning * into result;
  if result.id is null then
    raise exception 'Incidencia inexistente o ya retirada';
  end if;
  return result;
end;
$$;

revoke all on function public.create_alerta_ruta_incident(text, text, text, integer, timestamptz, timestamptz, text, text, text, text[]) from public, anon;
revoke all on function public.update_alerta_ruta_incident(uuid, text, text, text, integer, timestamptz, timestamptz, text, text, text, text[]) from public, anon;
revoke all on function public.retire_alerta_ruta_incident(uuid) from public, anon;
grant execute on function public.create_alerta_ruta_incident(text, text, text, integer, timestamptz, timestamptz, text, text, text, text[]) to authenticated;
grant execute on function public.update_alerta_ruta_incident(uuid, text, text, text, integer, timestamptz, timestamptz, text, text, text, text[]) to authenticated;
grant execute on function public.retire_alerta_ruta_incident(uuid) to authenticated;

create or replace function public.log_alerta_ruta_incident_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action := 'CREATED';
  elsif old.retired_at is null and new.retired_at is not null then
    event_action := 'RETIRED';
  else
    event_action := 'UPDATED';
  end if;
  insert into public.incident_history (
    incident_id, action, changed_by, old_record, new_record
  ) values (
    new.id,
    event_action,
    coalesce(auth.uid(), new.updated_by),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists alerta_ruta_incident_history on public.incidents;
create trigger alerta_ruta_incident_history
after insert or update on public.incidents
for each row execute function public.log_alerta_ruta_incident_change();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'incidents'
  ) then
    alter publication supabase_realtime add table public.incidents;
  end if;
end;
$$;

comment on table public.incidents is
  'Incidencias manuales de simulación académica; no son avisos oficiales de EMACRUZ.';
