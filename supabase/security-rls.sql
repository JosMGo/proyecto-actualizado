-- ════════════════════════════════════════════════════════════════════════════
--  SIRT — Endurecimiento de RLS (Fase intermedia, SIN tocar el login)
--  Ejecutar en: Supabase → SQL Editor → Run
--  Idempotente: se puede correr varias veces sin romper nada.
-- ════════════════════════════════════════════════════════════════════════════
--
--  CONTEXTO
--  ────────
--  Hoy todas las tablas tienen políticas tipo `for all using(true) with check(true)`,
--  es decir: CUALQUIERA con la "publishable key" (que es pública por diseño y va
--  en el navegador) puede LEER, INSERTAR, MODIFICAR y BORRAR cualquier fila de
--  cualquier tabla. Eso incluye borrar toda la base de datos o alterar tickets,
--  empresas y usuarios de otros.
--
--  QUÉ HACE ESTE SCRIPT
--  ────────────────────
--  Distingue por identidad de la sesión de Supabase:
--    • El ADMIN inicia sesión con Supabase Auth  → rol `authenticated`.
--    • El portal CLIENTE todavía NO usa Supabase Auth → opera como rol `anon`.
--
--  Política aplicada a cada tabla:
--    • SELECT  → anon + authenticated  (la app lee datos desde el navegador)
--    • INSERT  → solo authenticated     (solo el admin)
--    • UPDATE  → solo authenticated     (solo el admin)
--    • DELETE  → solo authenticated     (solo el admin)
--
--  Excepciones mínimas para que el portal cliente (anon) siga funcionando:
--    • tickets        → anon puede INSERT  (crear un ticket de soporte)
--    • work_tickets   → anon puede INSERT y UPDATE (se guarda con upsert)
--
--  RESULTADO
--  ─────────
--  ✅ Nadie con solo la publishable key puede ya BORRAR ni MODIFICAR datos,
--     ni crear empresas / usuarios / técnicos. El poder destructivo queda
--     restringido al admin autenticado.
--
--  ⚠ LO QUE ESTE SCRIPT TODAVÍA NO RESUELVE (requiere migrar el login a
--    Supabase Auth, fase siguiente):
--      1. La LECTURA sigue abierta a `anon`: un atacante con la publishable key
--         aún puede leer todas las filas, incluida la columna de contraseñas en
--         client_users / work_users (texto plano). → se cierra con Supabase Auth.
--      2. No hay aislamiento entre clientes a nivel de base de datos (el filtrado
--         por empresa es solo en el front). → se cierra con auth.uid() + Auth.
--      3. `anon` aún puede crear tickets → mitigar con rate limiting (fase 5).
--
--  El cron (archive_old_closed_tickets / generate_monthly_reports) corre como
--  dueño de las tablas y BYPASEA RLS, por lo que estos cambios NO lo afectan.
-- ════════════════════════════════════════════════════════════════════════════


do $$
declare
  t   text;
  pol record;
  -- Todas las tablas gestionadas por la app
  tablas text[] := array[
    'clients', 'client_users', 'tickets', 'techs', 'events',
    'monthly_reports', 'archive_logs',
    'work_clients', 'works', 'work_tickets', 'work_users', 'work_events', 'work_orders'
  ];
begin
  foreach t in array tablas loop

    -- Saltar tablas que no existan en esta base (evita errores)
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      raise notice 'Tabla %% no existe en public, se omite.', t;
      continue;
    end if;

    -- Activar RLS
    execute format('alter table public.%I enable row level security', t);

    -- Eliminar TODAS las políticas previas de la tabla (deja estado limpio)
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;

    -- SELECT: lectura para anon + authenticated
    execute format(
      'create policy "sel_%1$s" on public.%1$I for select to anon, authenticated using (true)', t);

    -- Escritura: SOLO usuarios autenticados (el admin vía Supabase Auth)
    execute format(
      'create policy "ins_auth_%1$s" on public.%1$I for insert to authenticated with check (true)', t);
    execute format(
      'create policy "upd_auth_%1$s" on public.%1$I for update to authenticated using (true) with check (true)', t);
    execute format(
      'create policy "del_auth_%1$s" on public.%1$I for delete to authenticated using (true)', t);

  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
--  EXCEPCIONES para el portal CLIENTE (rol anon, todavía sin Supabase Auth)
-- ─────────────────────────────────────────────────────────────────────────────

-- El cliente del portal por HORAS crea tickets de soporte (INSERT).
drop policy if exists "ins_anon_tickets" on public.tickets;
create policy "ins_anon_tickets" on public.tickets
  for insert to anon with check (true);

-- El cliente del portal por TRABAJO guarda work_tickets con upsert
-- (INSERT ... ON CONFLICT DO UPDATE), por eso necesita INSERT y UPDATE.
drop policy if exists "ins_anon_work_tickets" on public.work_tickets;
create policy "ins_anon_work_tickets" on public.work_tickets
  for insert to anon with check (true);

drop policy if exists "upd_anon_work_tickets" on public.work_tickets;
create policy "upd_anon_work_tickets" on public.work_tickets
  for update to anon using (true) with check (true);


-- ════════════════════════════════════════════════════════════════════════════
--  VERIFICACIÓN (opcional)
-- ════════════════════════════════════════════════════════════════════════════
--  Ver las políticas resultantes por tabla y rol:
--      select tablename, policyname, roles, cmd
--      from pg_policies
--      where schemaname = 'public'
--      order by tablename, cmd;
--
--  Prueba rápida (debería FALLAR con la publishable key / anon):
--      Intentar un delete de tickets desde el cliente anónimo → 0 filas / error RLS.
--  Prueba rápida (debería FUNCIONAR):
--      Crear un ticket desde el portal cliente → INSERT permitido.
-- ════════════════════════════════════════════════════════════════════════════
