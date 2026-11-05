-- Prueba remota transaccional del flujo administrativo. No conserva datos.
begin;

select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.admin_users limit 1),
  true
);
set local role authenticated;

do $$
begin
  if (select count(*) from public.admin_users) <> 1 then
    raise exception 'La prueba requiere exactamente un administrador';
  end if;
  if not public.is_alerta_ruta_admin() then
    raise exception 'El UUID autorizado no es reconocido como administrador';
  end if;
  begin
    insert into public.incidents (state) values ('DEMORA');
    raise exception 'La escritura directa de authenticated no fue bloqueada';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

with next_occurrence as (
  select
    service.id,
    ((calendar.day_value::date + service.end_time) at time zone 'America/La_Paz') as service_end
  from public.service_catalog service
  cross join lateral generate_series(
    (now() at time zone 'America/La_Paz')::date,
    (now() at time zone 'America/La_Paz')::date + 7,
    interval '1 day'
  ) as calendar(day_value)
  where service.active
    and extract(isodow from calendar.day_value) = service.day_of_week
    and ((calendar.day_value::date + service.end_time) at time zone 'America/La_Paz') > now()
  order by service_end, service.id
  limit 1
)
select (public.create_alerta_ruta_incident(
  'DEMORA',
  'LLUVIA',
  'Prueba E2E transaccional de lluvia',
  45,
  now() - interval '1 minute',
  next_occurrence.service_end,
  'Se revierte al terminar la prueba',
  'service',
  next_occurrence.id,
  array[next_occurrence.id]
)).id
from next_occurrence;

do $$
begin
  if (select count(*) from public.incidents where reason_detail = 'Prueba E2E transaccional de lluvia') <> 1 then
    raise exception 'La RPC no creó la demora';
  end if;
end;
$$;

select (public.update_alerta_ruta_incident(
  incident.id,
  'DEMORA',
  'PROBLEMA_TECNICO',
  'Prueba E2E transaccional modificada',
  30,
  incident.starts_at,
  incident.expires_at,
  incident.notes,
  incident.primary_target_type,
  incident.primary_target_id,
  incident.affected_service_ids
)).id
from public.incidents incident
where incident.reason_detail = 'Prueba E2E transaccional de lluvia';

set local role anon;
do $$
begin
  if (
    select count(id)
    from public.incidents
    where reason_detail = 'Prueba E2E transaccional modificada'
  ) <> 1 then
    raise exception 'La demora vigente no es visible para anon';
  end if;
  begin
    perform public.create_alerta_ruta_incident(
      'DEMORA', 'LLUVIA', 'Intento anónimo bloqueado', 10,
      now(), now() + interval '1 hour', null,
      'service', 'D2-S001', array['D2-S001']
    );
    raise exception 'anon pudo ejecutar la RPC de creación';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.admin_users limit 1),
  true
);
select (public.retire_alerta_ruta_incident(incident.id)).id
from public.incidents incident
where incident.reason_detail = 'Prueba E2E transaccional modificada';

do $$
begin
  if (
    select count(*)
    from public.incident_history history
    join public.incidents incident on incident.id = history.incident_id
    where incident.reason_detail = 'Prueba E2E transaccional modificada'
  ) <> 3 then
    raise exception 'El historial no contiene creación, modificación y retiro';
  end if;
end;
$$;

set local role anon;
do $$
begin
  if (
    select count(id)
    from public.incidents
    where reason_detail = 'Prueba E2E transaccional modificada'
  ) <> 0 then
    raise exception 'La demora retirada continúa visible para anon';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.admin_users limit 1),
  true
);

with previous_occurrence as (
  select
    service.id,
    ((calendar.day_value::date + service.start_time) at time zone 'America/La_Paz') as service_start,
    ((calendar.day_value::date + service.end_time) at time zone 'America/La_Paz') as service_end
  from public.service_catalog service
  cross join lateral generate_series(
    (now() at time zone 'America/La_Paz')::date - 7,
    (now() at time zone 'America/La_Paz')::date,
    interval '1 day'
  ) as calendar(day_value)
  where service.active
    and extract(isodow from calendar.day_value) = service.day_of_week
    and ((calendar.day_value::date + service.end_time) at time zone 'America/La_Paz') < now()
  order by service_end desc, service.id
  limit 1
)
select (public.create_alerta_ruta_incident(
  'DEMORA',
  'FALLA_MECANICA',
  'Prueba E2E transaccional vencida',
  20,
  previous_occurrence.service_start,
  previous_occurrence.service_end,
  null,
  'service',
  previous_occurrence.id,
  array[previous_occurrence.id]
)).id
from previous_occurrence;

set local role anon;
do $$
begin
  if (
    select count(id)
    from public.incidents
    where reason_detail = 'Prueba E2E transaccional vencida'
  ) <> 0 then
    raise exception 'La demora vencida es visible para anon';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
do $$
begin
  begin
    perform public.create_alerta_ruta_incident(
      'DEMORA', 'LLUVIA', 'Intento sin membresía', 10,
      now(), now() + interval '1 hour', null,
      'service', 'D2-S001', array['D2-S001']
    );
    raise exception 'Un autenticado no administrador pudo crear una incidencia';
  exception
    when others then
      if sqlerrm <> 'No autorizado' then
        raise;
      end if;
  end;
end;
$$;

rollback;
