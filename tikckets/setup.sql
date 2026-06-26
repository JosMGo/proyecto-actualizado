-- ════════════════════════════════════════════════════════════════════════════
--  SIRT — Gestión histórica de tickets (server-side con pg_cron)
--  Ejecutar en: Supabase → SQL Editor → Run
--  Idempotente: se puede correr varias veces sin romper nada.
-- ════════════════════════════════════════════════════════════════════════════
--
--  Qué hace este script:
--    1. Agrega columnas a `tickets`: closed_at, archived, archived_at
--    2. Trigger que registra closed_at automáticamente al cerrar un ticket
--    3. Tablas nuevas: monthly_reports, archive_logs
--    4. Funciones SQL: archivar tickets viejos / generar reportes mensuales
--    5. Jobs de pg_cron que ejecutan esas funciones solas (24/7)
--
--  NO incluye envío de email: los reportes se generan en el servidor, y el
--  envío queda como botón manual en el dashboard (EmailJS).
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 0 · Extensión pg_cron
--  Si da error de permisos, actívala primero en:
--  Supabase → Database → Extensions → buscar "pg_cron" → Enable
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists pg_cron;


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 1 · Columnas nuevas en `tickets`
-- ─────────────────────────────────────────────────────────────────────────────
alter table tickets add column if not exists closed_at   timestamptz;
alter table tickets add column if not exists archived    boolean default false;
alter table tickets add column if not exists archived_at  timestamptz;

-- Backfill: a los tickets que YA están cerrados pero no tienen fecha de cierre,
-- les ponemos la fecha de creación como aproximación (no teníamos el dato real).
update tickets
set closed_at = created_at
where status = 'closed' and closed_at is null;


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 2 · Trigger: registrar closed_at al cerrar (y limpiarlo al reabrir)
--  Esto funciona sin importar desde dónde se cierre el ticket (navegador, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function trg_set_closed_at()
returns trigger as $$
begin
  if new.status = 'closed' then
    -- Solo sellar la fecha la primera vez que pasa a 'closed'
    if tg_op = 'INSERT' or old.status is distinct from 'closed' then
      new.closed_at := now();
    end if;
  else
    -- Si se reabre, se borra la fecha de cierre
    new.closed_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_closed_at on tickets;
create trigger set_closed_at
  before insert or update on tickets
  for each row execute function trg_set_closed_at();


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 3 · Tabla de reportes mensuales
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists monthly_reports (
  id              text primary key,            -- RPT-<clientId>-<YYYYMM>
  client_id       integer not null references clients(id),
  month           text    not null,            -- 'YYYY-MM'
  year            integer not null,
  created_at      timestamptz default now(),
  total_tickets   integer default 0,
  open_tickets    integer default 0,
  closed_tickets  integer default 0,
  pending_tickets integer default 0,
  total_hours     numeric default 0,
  data            jsonb,
  email_sent      boolean default false,
  email_sent_at   timestamptz
);


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 4 · Tabla de auditoría de archivado
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists archive_logs (
  id          bigserial primary key,
  ticket_id   text not null,
  client_id   integer,
  archived_at timestamptz default now(),
  reason      text default 'Auto-archivado por política de retención'
);


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 5 · Índices (rendimiento)
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_tickets_archived    on tickets(archived);
create index if not exists idx_tickets_closed_at    on tickets(closed_at) where status = 'closed';
create index if not exists idx_reports_client_month on monthly_reports(client_id, month);
create index if not exists idx_archive_logs_date     on archive_logs(archived_at);


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 6 · Función: archivar tickets cerrados hace 30+ días
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function archive_old_closed_tickets()
returns integer as $$
declare
  v_count integer;
begin
  -- Registrar en auditoría lo que se va a archivar
  insert into archive_logs (ticket_id, client_id, reason)
  select id, client_id, 'Auto-archivado: 30 días tras el cierre'
  from tickets
  where status = 'closed'
    and archived = false
    and closed_at is not null
    and closed_at < now() - interval '30 days';

  -- Marcar como archivados
  update tickets
  set archived = true, archived_at = now()
  where status = 'closed'
    and archived = false
    and closed_at is not null
    and closed_at < now() - interval '30 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 7 · Función: generar reportes del MES ANTERIOR
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function generate_monthly_reports()
returns integer as $$
declare
  v_month_start date := date_trunc('month', now() - interval '1 month');
  v_month_end   date := date_trunc('month', now());
  v_month_str   text := to_char(v_month_start, 'YYYY-MM');
  v_year        int  := extract(year from v_month_start);
  v_count       integer;
begin
  insert into monthly_reports (
    id, client_id, month, year,
    total_tickets, open_tickets, closed_tickets, pending_tickets,
    total_hours, data, email_sent
  )
  select
    'RPT-' || c.id || '-' || to_char(v_month_start, 'YYYYMM'),
    c.id, v_month_str, v_year,
    count(t.id),
    count(t.id) filter (where t.status = 'open'),
    count(t.id) filter (where t.status = 'closed'),
    count(t.id) filter (where t.status = 'pending'),
    coalesce(sum(t.hours), 0),
    jsonb_build_object(
      'clientName',      c.name,
      'contractedHours', c.hours,
      'usedHours',       coalesce(sum(t.hours), 0)
    ),
    false
  from clients c
  left join tickets t
    on  t.client_id  = c.id
    and t.created_at >= v_month_start
    and t.created_at <  v_month_end
  group by c.id, c.name, c.hours
  having count(t.id) > 0          -- no generar reportes vacíos
  on conflict (id) do update set
    total_tickets   = excluded.total_tickets,
    open_tickets    = excluded.open_tickets,
    closed_tickets  = excluded.closed_tickets,
    pending_tickets = excluded.pending_tickets,
    total_hours     = excluded.total_hours,
    data            = excluded.data;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 8 · Permisos / RLS para las tablas nuevas
--  (El dashboard lee estas tablas con la "publishable key" desde el navegador.)
--  ⚠ Política permisiva para que funcione igual que tus tablas actuales.
--     Revísala si más adelante endureces la seguridad.
-- ─────────────────────────────────────────────────────────────────────────────
alter table monthly_reports enable row level security;
alter table archive_logs    enable row level security;

drop policy if exists "monthly_reports_all" on monthly_reports;
create policy "monthly_reports_all" on monthly_reports
  for all using (true) with check (true);

drop policy if exists "archive_logs_all" on archive_logs;
create policy "archive_logs_all" on archive_logs
  for all using (true) with check (true);


-- ─────────────────────────────────────────────────────────────────────────────
--  PASO 9 · Programar los jobs con pg_cron  (horarios en UTC)
-- ─────────────────────────────────────────────────────────────────────────────

-- Quitar versiones previas si ya existían (idempotente)
select cron.unschedule('sirt-archivar-tickets')   where exists (select 1 from cron.job where jobname = 'sirt-archivar-tickets');
select cron.unschedule('sirt-generar-reportes')   where exists (select 1 from cron.job where jobname = 'sirt-generar-reportes');

-- Archivar todos los días a las 05:00 UTC (~01:00 Bolivia)
select cron.schedule(
  'sirt-archivar-tickets',
  '0 5 * * *',
  $$ select archive_old_closed_tickets(); $$
);

-- Generar reportes el día 1 de cada mes a las 06:00 UTC (~02:00 Bolivia)
select cron.schedule(
  'sirt-generar-reportes',
  '0 6 1 * *',
  $$ select generate_monthly_reports(); $$
);


-- ════════════════════════════════════════════════════════════════════════════
--  VERIFICACIÓN (opcional) — corre estas líneas para confirmar
-- ════════════════════════════════════════════════════════════════════════════
--  Ver los jobs programados:
--      select jobname, schedule, active from cron.job;
--
--  Probar el archivado manualmente (sin esperar al cron):
--      select archive_old_closed_tickets();
--
--  Probar la generación de reportes manualmente:
--      select generate_monthly_reports();
--
--  Ver el historial de ejecuciones del cron:
--      select * from cron.job_run_details order by start_time desc limit 10;
-- ════════════════════════════════════════════════════════════════════════════
