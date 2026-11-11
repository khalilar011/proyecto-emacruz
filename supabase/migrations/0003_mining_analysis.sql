-- Fase 3 · resultados privados de minería de datos.
-- No modifica tablas operativas ni inserta datos sintéticos en public.incidents.

create table if not exists public.mining_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('demo', 'history')),
  execution_type text not null check (execution_type in ('manual', 'scheduled')),
  source_description text not null,
  period_start date,
  period_end date,
  record_count integer not null default 0 check (record_count >= 0),
  transaction_count integer not null default 0 check (transaction_count >= 0),
  indicators jsonb not null default '{}'::jsonb check (jsonb_typeof(indicators) = 'object'),
  chart_data jsonb not null default '{}'::jsonb check (jsonb_typeof(chart_data) = 'object'),
  association_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(association_rules) = 'array'),
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  parameters jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  unit_of_analysis text,
  status text not null check (status in ('RUNNING', 'COMPLETED', 'FAILED')),
  error_message text check (error_message is null or char_length(error_message) <= 1000),
  requested_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (period_start is null or period_end is null or period_start <= period_end),
  check (
    (status = 'RUNNING' and completed_at is null)
    or (status in ('COMPLETED', 'FAILED') and completed_at is not null)
  )
);

create unique index if not exists one_running_mining_analysis_per_mode
on public.mining_analysis_runs (mode)
where status = 'RUNNING';

create index if not exists mining_analysis_runs_latest
on public.mining_analysis_runs (mode, completed_at desc)
where status = 'COMPLETED';

alter table public.mining_analysis_runs enable row level security;

revoke all on public.mining_analysis_runs from public, anon, authenticated;
grant select on public.mining_analysis_runs to authenticated;

drop policy if exists "Admins read mining analysis" on public.mining_analysis_runs;
create policy "Admins read mining analysis"
on public.mining_analysis_runs for select
to authenticated
using (public.is_alerta_ruta_admin());

comment on table public.mining_analysis_runs is
  'Corridas privadas del prototipo. demo usa datos sintéticos reproducibles; history usa incidencias registradas del prototipo.';
comment on column public.mining_analysis_runs.association_rules is
  'Reglas Apriori calculadas; describen asociaciones y no prueban causalidad.';
