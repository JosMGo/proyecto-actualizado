// ── DATOS COMPARTIDOS: DASHBOARD POR TRABAJO ───────────────────────────────
// Pool separado de "nuevas empresas" gestionadas POR TRABAJO (no por horas).
// Usado tanto por el dashboard admin (admin-trabajo.js) como por el portal
// cliente (client-trabajo.js).
//
// PASO 2 — Maqueta con datos en memoria. Supabase se conecta en el PASO 3.
// ───────────────────────────────────────────────────────────────────────────

// ── ESTADOS DE TRABAJO ─────────────────────────────────────────────────────

const WORK_STATUS = {
  activo:     { label: 'Activo',     color: '#1c6b2a', bg: '#ddf5df' },
  pausado:    { label: 'Pausado',    color: '#9b5b00', bg: '#fff0d7' },
  completado: { label: 'Completado', color: '#185FA5', bg: '#dceeff' }
};

function wBadge(status) {
  const s = WORK_STATUS[status] || WORK_STATUS.activo;
  return `<span class="badge" style="background:${s.bg};color:${s.color}">${s.label}</span>`;
}

// Tipo de orden de trabajo
const ORDER_TYPES = {
  mantenimiento: { label: 'Mantenimiento de equipo', color: '#7C3AED', bg: '#f1ecff' },
  trabajo:       { label: 'Trabajo a realizar',       color: '#185FA5', bg: '#dceeff' }
};

// Categorías para tickets por trabajo (modal "Nuevo ticket") — servicios SIRT
const WORK_TICKET_CATS = [
  'Punto de red',
  'Cámaras / Videovigilancia',
  'Cableado estructurado',
  'Sistemas de seguridad (control de acceso / alarmas)',
  'Soluciones TI (servidores / virtualización / backup)',
  'Enlace inalámbrico',
  'Centro de datos',
  'Soporte IT / Mesa de ayuda',
  'Otro'
];

// Categorías para el desglose "Trabajo realizado por tipo"
const ORDER_CAT_COLORS = {
  'Mantenimiento': '#7C3AED',
  'Instalación':   '#185FA5',
  'Redes':         '#0891B2',
  'Soporte':       '#059669',
  'Seguridad':     '#E24B4A',
  'Otro':          '#667085'
};

// ── EMPRESAS POR TRABAJO ────────────────────────────────────────────────────

let WORK_CLIENTS = [
  { id: 1, name: 'TechNova',   sector: 'Tecnología',   contact: 'Ana Ruiz' },
  { id: 2, name: 'ConstruMax', sector: 'Construcción', contact: 'Luis Gómez' },
  { id: 3, name: 'GreenFarm',  sector: 'Agro',         contact: 'María Soto' }
];

// ── TRABAJOS / PROYECTOS ────────────────────────────────────────────────────

let WORKS = [
  { id: 1, name: 'Migración a la nube',   clientId: 1, status: 'activo',     progress: 60,  start: '2026-05-04', end: '2026-07-15', desc: 'Migrar servidores on-premise a AWS.' },
  { id: 2, name: 'Red interna oficinas',  clientId: 1, status: 'activo',     progress: 30,  start: '2026-06-01', end: '2026-08-01', desc: 'Recableado y configuración de red piso 2.' },
  { id: 3, name: 'Sistema de inventario', clientId: 2, status: 'pausado',    progress: 45,  start: '2026-04-10', end: '2026-06-30', desc: 'Desarrollo de módulo de stock.' },
  { id: 4, name: 'Cámaras de seguridad',  clientId: 2, status: 'completado', progress: 100, start: '2026-03-01', end: '2026-05-20', desc: 'Instalación de 8 cámaras IP.' },
  { id: 5, name: 'Sensores IoT campo',    clientId: 3, status: 'activo',     progress: 20,  start: '2026-06-10', end: '2026-09-01', desc: 'Despliegue de sensores de humedad.' }
];

// ── TICKETS POR TRABAJO ─────────────────────────────────────────────────────

let WORK_TICKETS = [
  { id: 'TR-001', title: 'Configurar servidor AWS',  workId: 1, clientId: 1, status: 'open',    prio: 'high',     tech: 'Sin asignar', desc: 'Provisionar EC2 y VPC.',          createdAt: '2026-06-05' },
  { id: 'TR-002', title: 'Migrar base de datos',     workId: 1, clientId: 1, status: 'pending', prio: 'medium',   tech: 'Sin asignar', desc: 'Volcado y carga en RDS.',          createdAt: '2026-06-12' },
  { id: 'TR-003', title: 'Cableado estructurado P2', workId: 2, clientId: 1, status: 'open',    prio: 'medium',   tech: 'Sin asignar', desc: 'Tendido de cable UTP cat6.',       createdAt: '2026-06-15' },
  { id: 'TR-004', title: 'Diseño módulo stock',      workId: 3, clientId: 2, status: 'closed',  prio: 'low',      tech: 'Sin asignar', desc: 'Mockups y modelo de datos.',       createdAt: '2026-05-02' },
  { id: 'TR-005', title: 'Instalar 8 cámaras',       workId: 4, clientId: 2, status: 'closed',  prio: 'high',     tech: 'Sin asignar', desc: 'Montaje y pruebas.',               createdAt: '2026-04-18' },
  { id: 'TR-006', title: 'Calibrar sensores campo',  workId: 5, clientId: 3, status: 'open',    prio: 'critical', tech: 'Sin asignar', desc: 'Ajuste de umbrales de humedad.',   createdAt: '2026-06-18' }
];

// ── USUARIOS POR EMPRESA ────────────────────────────────────────────────────
// pass: credenciales demo para probar el login del portal por trabajo.

let WORK_USERS = [
  { id: 1, name: 'Ana Ruiz',    user: 'ana.technova',    pass: '1234', clientId: 1 },
  { id: 2, name: 'Carlos Vega', user: 'carlos.technova', pass: '1234', clientId: 1 },
  { id: 3, name: 'Luis Gómez',  user: 'luis.construmax', pass: '1234', clientId: 2 },
  { id: 4, name: 'María Soto',  user: 'maria.greenfarm', pass: '1234', clientId: 3 }
];

// ── VISITAS / ACTIVIDADES PROGRAMADAS POR TRABAJO ──────────────────────────

let WORK_EVENTS = [
  { id: 'WV-001', title: 'Visita: instalación servidor', date: '2026-06-24', time: '09:00', type: 'visita',        workId: 1, clientId: 1, tech: 'Sin asignar', desc: 'Instalación física en datacenter.' },
  { id: 'WV-002', title: 'Revisión avance red',          date: '2026-06-27', time: '11:00', type: 'revision',      workId: 2, clientId: 1, tech: 'Sin asignar', desc: 'Checklist de puntos de red.' },
  { id: 'WV-003', title: 'Mantenimiento cámaras',        date: '2026-06-30', time: '15:00', type: 'mantenimiento', workId: 4, clientId: 2, tech: 'Sin asignar', desc: 'Limpieza y firmware.' }
];

// ── ÓRDENES DE TRABAJO ──────────────────────────────────────────────────────
// Un registro por servicio/equipo. Es lo que el cliente ve en su historial
// mensual y lo que se exporta a PDF.
//   tipo:        'mantenimiento' | 'trabajo'
//   fecha:       fecha de realización (para agrupar por mes)
//   categoria:   para el desglose "Trabajo realizado por tipo"
// Campos de equipo (mantenimiento): ingreso, modelo, serie, fechaEntrada,
//   fechaSalida, estadoEquipo, problema.
// Campos comunes: requerimientos, trabajoRealizado, factura, observaciones,
//   recomendaciones, tecnico.

let WORK_ORDERS = [
  {
    id: 'OT-001', clientId: 1, workId: 1, tipo: 'trabajo', categoria: 'Instalación',
    titulo: 'Instalación de servidor AWS', fecha: '2026-06-06',
    requerimientos: 'Servidor EC2 t3.large con 100 GB de almacenamiento.',
    ingreso: '', modelo: '', serie: '', fechaEntrada: '', fechaSalida: '', estadoEquipo: '',
    problema: 'Se requiere infraestructura en la nube para la migración.',
    trabajoRealizado: 'Se provisionó la instancia EC2, se configuró la VPC y los grupos de seguridad.',
    factura: 'F-2026-0142',
    observaciones: 'Acceso SSH entregado al equipo de TechNova.',
    recomendaciones: 'Programar respaldos automáticos diarios.',
    tecnico: 'Sin asignar'
  },
  {
    id: 'OT-002', clientId: 1, workId: 2, tipo: 'mantenimiento', categoria: 'Mantenimiento',
    titulo: 'Mantenimiento switch de red', fecha: '2026-06-16',
    requerimientos: 'Revisión de switch principal por caídas intermitentes.',
    ingreso: 'El equipo ingresa por garantía / revisión en sitio.',
    modelo: 'Cisco Catalyst 2960', serie: 'FOC1843X0AB',
    fechaEntrada: '2026-06-15', fechaSalida: '2026-06-16',
    estadoEquipo: 'Equipo con polvo acumulado y un puerto dañado.',
    problema: 'Caídas intermitentes de red en el piso 2.',
    trabajoRealizado: 'Limpieza interna, actualización de firmware y reemplazo de puerto SFP.',
    factura: 'F-2026-0150',
    observaciones: 'Se recomienda reemplazo a mediano plazo.',
    recomendaciones: 'Mantener el rack ventilado y libre de polvo.',
    tecnico: 'Sin asignar'
  },
  {
    id: 'OT-003', clientId: 2, workId: 4, tipo: 'trabajo', categoria: 'Seguridad',
    titulo: 'Instalación de cámaras IP', fecha: '2026-05-19',
    requerimientos: 'Instalar 8 cámaras IP con grabación 24/7.',
    ingreso: '', modelo: 'Hikvision DS-2CD2143', serie: 'HK-2026-0098',
    fechaEntrada: '', fechaSalida: '',
    estadoEquipo: 'Equipos nuevos.',
    problema: 'Cobertura de seguridad insuficiente en almacén.',
    trabajoRealizado: 'Montaje de 8 cámaras, configuración del NVR y pruebas de grabación.',
    factura: 'F-2026-0121',
    observaciones: 'Cliente capacitado en el uso del software de monitoreo.',
    recomendaciones: 'Revisar el almacenamiento del NVR cada 30 días.',
    tecnico: 'Sin asignar'
  },
  {
    id: 'OT-004', clientId: 3, workId: 5, tipo: 'mantenimiento', categoria: 'Mantenimiento',
    titulo: 'Calibración de sensores de humedad', fecha: '2026-06-19',
    requerimientos: 'Calibrar 12 sensores IoT de humedad de suelo.',
    ingreso: 'Mantenimiento preventivo en campo.',
    modelo: 'SoilWatch 10', serie: 'SW-2026-0457',
    fechaEntrada: '2026-06-18', fechaSalida: '2026-06-19',
    estadoEquipo: 'Sensores con lecturas desfasadas.',
    problema: 'Lecturas de humedad inconsistentes.',
    trabajoRealizado: 'Recalibración de umbrales y reemplazo de 2 baterías.',
    factura: 'F-2026-0158',
    observaciones: 'Lecturas estabilizadas tras la calibración.',
    recomendaciones: 'Recalibrar cada inicio de temporada.',
    tecnico: 'Sin asignar'
  }
];

// ── ID GENERATORS ──────────────────────────────────────────────────────────

function nextWorkClientId() {
  const ids = WORK_CLIENTS.map(c => c.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}
function nextWorkId() {
  const ids = WORKS.map(w => w.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}
function nextWorkTicketId() {
  const nums = WORK_TICKETS.map(t => parseInt(t.id.replace('TR-', ''), 10)).filter(n => !isNaN(n));
  return `TR-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}
function nextWorkUserId() {
  const ids = WORK_USERS.map(u => u.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}
function nextWorkEventId() {
  const nums = WORK_EVENTS.map(e => parseInt(e.id.replace('WV-', ''), 10)).filter(n => !isNaN(n));
  return `WV-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}
function nextWorkOrderId() {
  const nums = WORK_ORDERS.map(o => parseInt(o.id.replace('OT-', ''), 10)).filter(n => !isNaN(n));
  return `OT-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function workClientName(id) {
  const c = WORK_CLIENTS.find(c => c.id === id);
  return c ? c.name : '—';
}
function workName(id) {
  const w = WORKS.find(w => w.id === id);
  return w ? w.name : 'Sin trabajo';
}
function orderTypeBadge(tipo) {
  const t = ORDER_TYPES[tipo] || ORDER_TYPES.trabajo;
  return `<span class="badge" style="background:${t.bg};color:${t.color}">${t.label}</span>`;
}

// ── SUPABASE: CARGA Y PERSISTENCIA (PASO 3) ────────────────────────────────
// Requiere las tablas creadas con supabase/work-schema.sql.
// Mapea entre camelCase (memoria) y snake_case (base de datos).

function _mapWorkClient(r) { return { id: r.id, name: r.name, sector: r.sector || '', contact: r.contact || '' }; }
function _mapWork(r)       { return { id: r.id, name: r.name, clientId: r.client_id, status: r.status || 'activo', progress: Number(r.progress) || 0, start: r.start_date || '', end: r.end_date || '', desc: r.description || '' }; }
function _mapWorkTicket(r) { return { id: r.id, title: r.title, workId: r.work_id, clientId: r.client_id, status: r.status, prio: r.prio, tech: r.tech || 'Sin asignar', cat: r.cat || '', desc: r.description || '', createdAt: r.created_at || null }; }
function _mapWorkUser(r)   { return { id: r.id, name: r.name, user: r.username, pass: r.pass, clientId: r.client_id }; }
function _mapWorkEvent(r)  { return { id: r.id, title: r.title, date: r.date, time: r.time, type: r.type, workId: r.work_id, clientId: r.client_id, tech: r.tech || 'Sin asignar', desc: r.description || '' }; }
function _mapWorkOrder(r)  {
  return {
    id: r.id, clientId: r.client_id, workId: r.work_id, tipo: r.tipo || 'trabajo', categoria: r.categoria || 'Otro',
    titulo: r.titulo, fecha: r.fecha || '', requerimientos: r.requerimientos || '', problema: r.problema || '',
    ingreso: r.ingreso || '', modelo: r.modelo || '', serie: r.serie || '', fechaEntrada: r.fecha_entrada || '',
    fechaSalida: r.fecha_salida || '', estadoEquipo: r.estado_equipo || '', trabajoRealizado: r.trabajo_realizado || '',
    factura: r.factura || '', observaciones: r.observaciones || '', recomendaciones: r.recomendaciones || '', tecnico: r.tecnico || 'Sin asignar'
  };
}

// Carga todas las tablas. Si una tabla falla (p.ej. aún no creada) se conserva
// el arreglo en memoria (datos demo) como respaldo.
async function dbLoadWorkData() {
  if (typeof _sb === 'undefined') return;
  try {
    const [cr, wr, tr, ur, er, orr] = await Promise.all([
      _sb.from('work_clients').select('*').order('id'),
      _sb.from('works').select('*').order('id'),
      _sb.from('work_tickets').select('*'),
      _sb.from('work_users').select('*').order('id'),
      _sb.from('work_events').select('*').order('date'),
      _sb.from('work_orders').select('*')
    ]);
    if (!cr.error  && cr.data)  WORK_CLIENTS = cr.data.map(_mapWorkClient);
    if (!wr.error  && wr.data)  WORKS        = wr.data.map(_mapWork);
    if (!tr.error  && tr.data)  WORK_TICKETS = tr.data.map(_mapWorkTicket).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    if (!ur.error  && ur.data)  WORK_USERS   = ur.data.map(_mapWorkUser);
    if (!er.error  && er.data)  WORK_EVENTS  = er.data.map(_mapWorkEvent);
    if (!orr.error && orr.data) WORK_ORDERS  = orr.data.map(_mapWorkOrder).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    [cr, wr, tr, ur, er, orr].forEach(r => { if (r.error) console.error('dbLoadWorkData:', r.error.message); });
  } catch (e) { console.error('dbLoadWorkData:', e); }
}

// Solo usuarios — usado por el login para enrutar.
async function dbLoadWorkUsers() {
  if (typeof _sb === 'undefined') return;
  const { data, error } = await _sb.from('work_users').select('*');
  if (error) { console.error('dbLoadWorkUsers:', error.message); return; }
  if (data) WORK_USERS = data.map(_mapWorkUser);
}

// ── Upserts / deletes (fire-and-forget, como el resto de la app) ───────────

async function dbUpsertWorkClient(c) {
  const { error } = await _sb.from('work_clients').upsert({ id: c.id, name: c.name, sector: c.sector || null, contact: c.contact || null });
  if (error) console.error('dbUpsertWorkClient:', error.message);
}
async function dbDeleteWorkClient(id) {
  const { error } = await _sb.from('work_clients').delete().eq('id', id);
  if (error) console.error('dbDeleteWorkClient:', error.message);
}

async function dbUpsertWork(w) {
  const { error } = await _sb.from('works').upsert({ id: w.id, name: w.name, client_id: w.clientId, status: w.status, progress: w.progress, start_date: w.start || null, end_date: w.end || null, description: w.desc || null });
  if (error) console.error('dbUpsertWork:', error.message);
}
async function dbDeleteWork(id) {
  const { error } = await _sb.from('works').delete().eq('id', id);
  if (error) console.error('dbDeleteWork:', error.message);
}

async function dbUpsertWorkTicket(t) {
  const { error } = await _sb.from('work_tickets').upsert({ id: t.id, title: t.title, work_id: t.workId, client_id: t.clientId, status: t.status, prio: t.prio, tech: t.tech, cat: t.cat || null, description: t.desc || null, created_at: t.createdAt || null });
  if (error) console.error('dbUpsertWorkTicket:', error.message);
}

async function dbUpsertWorkUser(u) {
  const { error } = await _sb.from('work_users').upsert({ id: u.id, name: u.name, username: u.user, pass: u.pass, client_id: u.clientId });
  if (error) console.error('dbUpsertWorkUser:', error.message);
}
async function dbDeleteWorkUser(id) {
  const { error } = await _sb.from('work_users').delete().eq('id', id);
  if (error) console.error('dbDeleteWorkUser:', error.message);
}

async function dbUpsertWorkEvent(e) {
  const { error } = await _sb.from('work_events').upsert({ id: e.id, title: e.title, date: e.date, time: e.time, type: e.type, work_id: e.workId, client_id: e.clientId, tech: e.tech, description: e.desc || null });
  if (error) console.error('dbUpsertWorkEvent:', error.message);
}
async function dbDeleteWorkEvent(id) {
  const { error } = await _sb.from('work_events').delete().eq('id', id);
  if (error) console.error('dbDeleteWorkEvent:', error.message);
}

async function dbUpsertWorkOrder(o) {
  const { error } = await _sb.from('work_orders').upsert({
    id: o.id, client_id: o.clientId, work_id: o.workId || null, tipo: o.tipo, categoria: o.categoria, titulo: o.titulo,
    fecha: o.fecha || null, requerimientos: o.requerimientos || null, problema: o.problema || null, ingreso: o.ingreso || null,
    modelo: o.modelo || null, serie: o.serie || null, fecha_entrada: o.fechaEntrada || null, fecha_salida: o.fechaSalida || null,
    estado_equipo: o.estadoEquipo || null, trabajo_realizado: o.trabajoRealizado || null, factura: o.factura || null,
    observaciones: o.observaciones || null, recomendaciones: o.recomendaciones || null, tecnico: o.tecnico || null
  });
  if (error) console.error('dbUpsertWorkOrder:', error.message);
}
async function dbDeleteWorkOrder(id) {
  const { error } = await _sb.from('work_orders').delete().eq('id', id);
  if (error) console.error('dbDeleteWorkOrder:', error.message);
}
