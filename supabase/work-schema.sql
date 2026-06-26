-- ════════════════════════════════════════════════════════════════════════
--  ESQUEMA — DASHBOARD POR TRABAJO (Paso 3)
--  Ejecutar en Supabase → SQL Editor (una sola vez).
--  Crea las 6 tablas, políticas RLS permisivas (igual que las tablas
--  actuales por horas) y carga los datos demo.
-- ════════════════════════════════════════════════════════════════════════

-- ── TABLAS ────────────────────────────────────────────────────────────────

create table if not exists public.work_clients (
  id      bigint primary key,
  name    text not null,
  sector  text,
  contact text
);

create table if not exists public.works (
  id          bigint primary key,
  name        text not null,
  client_id   bigint references public.work_clients(id) on delete cascade,
  status      text default 'activo',
  progress    int  default 0,
  start_date  date,
  end_date    date,
  description text
);

create table if not exists public.work_tickets (
  id          text primary key,
  title       text not null,
  work_id     bigint references public.works(id) on delete set null,
  client_id   bigint references public.work_clients(id) on delete cascade,
  status      text default 'open',
  prio        text default 'medium',
  tech        text default 'Sin asignar',
  cat         text,
  description text,
  created_at  date
);

-- Si la tabla ya existía (creada antes de agregar la categoría), añade la columna:
alter table public.work_tickets add column if not exists cat text;

create table if not exists public.work_users (
  id        bigint primary key,
  name      text not null,
  username  text unique not null,
  pass      text,
  client_id bigint references public.work_clients(id) on delete cascade
);

create table if not exists public.work_events (
  id          text primary key,
  title       text not null,
  date        date,
  time        text,
  type        text,
  work_id     bigint references public.works(id) on delete set null,
  client_id   bigint references public.work_clients(id) on delete cascade,
  tech        text,
  description text
);

create table if not exists public.work_orders (
  id                text primary key,
  client_id         bigint references public.work_clients(id) on delete cascade,
  work_id           bigint references public.works(id) on delete set null,
  tipo              text default 'trabajo',
  categoria         text,
  titulo            text not null,
  fecha             date,
  requerimientos    text,
  problema          text,
  ingreso           text,
  modelo            text,
  serie             text,
  fecha_entrada     date,
  fecha_salida      date,
  estado_equipo     text,
  trabajo_realizado text,
  factura           text,
  observaciones     text,
  recomendaciones   text,
  tecnico           text
);

-- ── RLS — POLÍTICAS PERMISIVAS (clave anon) ───────────────────────────────
-- ⚠ Mismo modelo que las tablas actuales: acceso total con la clave pública.
--   Revisar/endurecer antes de producción real.

alter table public.work_clients enable row level security;
alter table public.works        enable row level security;
alter table public.work_tickets enable row level security;
alter table public.work_users   enable row level security;
alter table public.work_events  enable row level security;
alter table public.work_orders  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['work_clients','works','work_tickets','work_users','work_events','work_orders']
  loop
    execute format('drop policy if exists "anon_all_%1$s" on public.%1$s;', t);
    execute format('create policy "anon_all_%1$s" on public.%1$s for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ── DATOS DEMO ────────────────────────────────────────────────────────────

insert into public.work_clients (id, name, sector, contact) values
  (1, 'TechNova',   'Tecnología',   'Ana Ruiz'),
  (2, 'ConstruMax', 'Construcción', 'Luis Gómez'),
  (3, 'GreenFarm',  'Agro',         'María Soto')
on conflict (id) do nothing;

insert into public.works (id, name, client_id, status, progress, start_date, end_date, description) values
  (1, 'Migración a la nube',   1, 'activo',     60,  '2026-05-04', '2026-07-15', 'Migrar servidores on-premise a AWS.'),
  (2, 'Red interna oficinas',  1, 'activo',     30,  '2026-06-01', '2026-08-01', 'Recableado y configuración de red piso 2.'),
  (3, 'Sistema de inventario', 2, 'pausado',    45,  '2026-04-10', '2026-06-30', 'Desarrollo de módulo de stock.'),
  (4, 'Cámaras de seguridad',  2, 'completado', 100, '2026-03-01', '2026-05-20', 'Instalación de 8 cámaras IP.'),
  (5, 'Sensores IoT campo',    3, 'activo',     20,  '2026-06-10', '2026-09-01', 'Despliegue de sensores de humedad.')
on conflict (id) do nothing;

insert into public.work_tickets (id, title, work_id, client_id, status, prio, tech, description, created_at) values
  ('TR-001', 'Configurar servidor AWS',  1, 1, 'open',    'high',     'Sin asignar', 'Provisionar EC2 y VPC.',        '2026-06-05'),
  ('TR-002', 'Migrar base de datos',     1, 1, 'pending', 'medium',   'Sin asignar', 'Volcado y carga en RDS.',       '2026-06-12'),
  ('TR-003', 'Cableado estructurado P2', 2, 1, 'open',    'medium',   'Sin asignar', 'Tendido de cable UTP cat6.',    '2026-06-15'),
  ('TR-004', 'Diseño módulo stock',      3, 2, 'closed',  'low',      'Sin asignar', 'Mockups y modelo de datos.',    '2026-05-02'),
  ('TR-005', 'Instalar 8 cámaras',       4, 2, 'closed',  'high',     'Sin asignar', 'Montaje y pruebas.',            '2026-04-18'),
  ('TR-006', 'Calibrar sensores campo',  5, 3, 'open',    'critical', 'Sin asignar', 'Ajuste de umbrales de humedad.', '2026-06-18')
on conflict (id) do nothing;

insert into public.work_users (id, name, username, pass, client_id) values
  (1, 'Ana Ruiz',    'ana.technova',    '1234', 1),
  (2, 'Carlos Vega', 'carlos.technova', '1234', 1),
  (3, 'Luis Gómez',  'luis.construmax', '1234', 2),
  (4, 'María Soto',  'maria.greenfarm', '1234', 3)
on conflict (id) do nothing;

insert into public.work_events (id, title, date, time, type, work_id, client_id, tech, description) values
  ('WV-001', 'Visita: instalación servidor', '2026-06-24', '09:00', 'visita',        1, 1, 'Sin asignar', 'Instalación física en datacenter.'),
  ('WV-002', 'Revisión avance red',          '2026-06-27', '11:00', 'revision',      2, 1, 'Sin asignar', 'Checklist de puntos de red.'),
  ('WV-003', 'Mantenimiento cámaras',        '2026-06-30', '15:00', 'mantenimiento', 4, 2, 'Sin asignar', 'Limpieza y firmware.')
on conflict (id) do nothing;

insert into public.work_orders
  (id, client_id, work_id, tipo, categoria, titulo, fecha, requerimientos, problema, ingreso, modelo, serie, fecha_entrada, fecha_salida, estado_equipo, trabajo_realizado, factura, observaciones, recomendaciones, tecnico) values
  ('OT-001', 1, 1, 'trabajo', 'Instalación', 'Instalación de servidor AWS', '2026-06-06',
   'Servidor EC2 t3.large con 100 GB de almacenamiento.', 'Se requiere infraestructura en la nube para la migración.',
   '', '', '', null, null, '',
   'Se provisionó la instancia EC2, se configuró la VPC y los grupos de seguridad.', 'F-2026-0142',
   'Acceso SSH entregado al equipo de TechNova.', 'Programar respaldos automáticos diarios.', 'Sin asignar'),
  ('OT-002', 1, 2, 'mantenimiento', 'Mantenimiento', 'Mantenimiento switch de red', '2026-06-16',
   'Revisión de switch principal por caídas intermitentes.', 'Caídas intermitentes de red en el piso 2.',
   'El equipo ingresa por garantía / revisión en sitio.', 'Cisco Catalyst 2960', 'FOC1843X0AB', '2026-06-15', '2026-06-16',
   'Equipo con polvo acumulado y un puerto dañado.',
   'Limpieza interna, actualización de firmware y reemplazo de puerto SFP.', 'F-2026-0150',
   'Se recomienda reemplazo a mediano plazo.', 'Mantener el rack ventilado y libre de polvo.', 'Sin asignar'),
  ('OT-003', 2, 4, 'trabajo', 'Seguridad', 'Instalación de cámaras IP', '2026-05-19',
   'Instalar 8 cámaras IP con grabación 24/7.', 'Cobertura de seguridad insuficiente en almacén.',
   '', 'Hikvision DS-2CD2143', 'HK-2026-0098', null, null, 'Equipos nuevos.',
   'Montaje de 8 cámaras, configuración del NVR y pruebas de grabación.', 'F-2026-0121',
   'Cliente capacitado en el uso del software de monitoreo.', 'Revisar el almacenamiento del NVR cada 30 días.', 'Sin asignar'),
  ('OT-004', 3, 5, 'mantenimiento', 'Mantenimiento', 'Calibración de sensores de humedad', '2026-06-19',
   'Calibrar 12 sensores IoT de humedad de suelo.', 'Lecturas de humedad inconsistentes.',
   'Mantenimiento preventivo en campo.', 'SoilWatch 10', 'SW-2026-0457', '2026-06-18', '2026-06-19',
   'Sensores con lecturas desfasadas.',
   'Recalibración de umbrales y reemplazo de 2 baterías.', 'F-2026-0158',
   'Lecturas estabilizadas tras la calibración.', 'Recalibrar cada inicio de temporada.', 'Sin asignar')
on conflict (id) do nothing;
