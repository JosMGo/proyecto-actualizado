// ── USUARIOS ────────────────────────────────────────────────────────────────

let users = [];

function nextUserId() {
  const ids = users.map(u => u.id).filter(n => !isNaN(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

async function dbUpsertUser(u) {
  const { error } = await _sb.from('client_users').upsert({
    id: u.id, name: u.name, username: u.user, pass: u.pass, client_id: u.client
  });
  if (error) console.error('dbUpsertUser:', error);
}

async function dbDeleteUser(id) {
  const { error } = await _sb.from('client_users').delete().eq('id', id);
  if (error) console.error('dbDeleteUser:', error);
}

// ── TÉCNICOS ────────────────────────────────────────────────────────────────

async function dbInsertTech(name) {
  const { error } = await _sb.from('techs').insert({ name });
  if (error) console.error('dbInsertTech:', error);
}

async function dbDeleteTech(name) {
  const { error } = await _sb.from('techs').delete().eq('name', name);
  if (error) console.error('dbDeleteTech:', error);
}

// ── EMPRESAS ────────────────────────────────────────────────────────────────

function nextClientId() {
  const ids = CLIENTS.map(c => c.id).filter(n => !isNaN(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

async function dbUpsertClient(c) {
  const { error } = await _sb.from('clients').upsert({
    id: c.id, name: c.name, hours: c.hours,
    monthly: c.monthly || emptyMonthly()
  });
  if (error) console.error('dbUpsertClient:', error);
}

// ── DATOS COMPARTIDOS ───────────────────────────────────────────────────────

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Cuántos meses mostrar en las gráficas: desde Enero hasta el mes actual (inclusive).
// En julio → 7 (Ene–Jul); crece solo cada mes hasta 12 en diciembre; el 1-ene vuelve a 1.
function visibleMonthCount(referenceDate = new Date()) {
  return referenceDate.getMonth() + 1;
}

// Etiqueta del rango visible, p.ej. "Ene – Jul 2026".
function visibleMonthsLabel(referenceDate = new Date()) {
  const n = visibleMonthCount(referenceDate);
  const range = n <= 1 ? MONTHS[0] : `${MONTHS[0]} – ${MONTHS[n - 1]}`;
  return `${range} ${referenceDate.getFullYear()}`;
}

// Array mensual vacío (12 posiciones, una por mes del año).
function emptyMonthly() {
  return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

let CLIENTS = [];

let TECHS = ['Sin asignar'];

let tickets = [];

function nextTicketId() {
  const nums = tickets.map(t => parseInt(t.id.replace('TK-', ''), 10)).filter(n => !isNaN(n));
  const max  = nums.length ? Math.max(...nums) : 0;
  return `TK-${String(max + 1).padStart(3, '0')}`;
}

async function dbInsertTicket(t) {
  const { error } = await _sb.from('tickets').insert({
    id: t.id, title: t.title, prio: t.prio, status: t.status,
    tech: t.tech, hours: t.hours, client_id: t.client,
    cat: t.cat, description: t.desc
  });
  if (error) console.error('dbInsertTicket:', error);
}

async function dbUpdateTicket(id, fields) {
  const dbFields = {};
  if (fields.status !== undefined) dbFields.status = fields.status;
  if (fields.tech   !== undefined) dbFields.tech   = fields.tech;
  if (fields.hours  !== undefined) dbFields.hours  = fields.hours;
  const { error } = await _sb.from('tickets').update(dbFields).eq('id', id);
  if (error) console.error('dbUpdateTicket:', error);
}

// ── CALENDAR DATA ───────────────────────────────────────────────────────────

const EVENT_TYPES = {
  mantenimiento: { label: 'Mantenimiento',  color: '#185FA5', bg: '#dceeff' },
  visita:        { label: 'Visita técnica', color: '#1c6b2a', bg: '#ddf5df' },
  capacitacion:  { label: 'Capacitación',   color: '#6b1c6b', bg: '#f3e6f3' },
  revision:      { label: 'Revisión',        color: '#9b5b00', bg: '#fff0d7' },
  otro:          { label: 'Otro',            color: '#667085', bg: '#eef2f6' }
};

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

let events = [];

function nextEventId() {
  const nums = events.map(e => parseInt(e.id.replace('EV-', ''), 10)).filter(n => !isNaN(n));
  const max  = nums.length ? Math.max(...nums) : 0;
  return `EV-${String(max + 1).padStart(3, '0')}`;
}

async function dbUpsertEvent(e) {
  const { error } = await _sb.from('events').upsert({
    id: e.id, title: e.title, date: e.date, time: e.time, type: e.type,
    description: e.desc, client_id: e.client === -1 ? null : e.client,
    tech: e.tech
  });
  if (error) console.error('dbUpsertEvent:', error);
}

async function dbDeleteEvent(id) {
  const { error } = await _sb.from('events').delete().eq('id', id);
  if (error) console.error('dbDeleteEvent:', error);
}

// ── DATA LOADING ─────────────────────────────────────────────────────────────

async function loadData() {
  const [cr, ur, tr, er] = await Promise.all([
    _sb.from('clients').select('*').order('id'),
    _sb.from('client_users').select('*').order('id'),
    _sb.from('tickets').select('*').order('id'),
    _sb.from('events').select('*').order('date')
  ]);

  if (cr.data) CLIENTS = cr.data.map(c => ({
    id: c.id, name: c.name, hours: c.hours,
    monthly: Array.isArray(c.monthly) ? c.monthly : emptyMonthly()
  }));

  if (tr.data) {
    tickets = tr.data
      .map(t => ({
        id: t.id, title: t.title, prio: t.prio, status: t.status,
        tech: t.tech, hours: Number(t.hours), client: t.client_id,
        cat: t.cat || '', desc: t.description || '',
        createdAt: t.created_at || null,
        closedAt: t.closed_at || null
      }))
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;

        const numA = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
        return numB - numA;
      });
    // Calcular horas usadas y gráfica mensual desde los tickets
    const year = new Date().getFullYear();
    CLIENTS.forEach(cl => {
      const myTickets = tickets.filter(t => t.client === cl.id);
      cl.used = myTickets.reduce((sum, t) => sum + Number(t.hours), 0);
      cl.monthly = emptyMonthly();
      myTickets.forEach(t => {
        if (!t.createdAt) return;
        const m = new Date(t.createdAt).getMonth();
        if (m >= 0 && m <= 11) cl.monthly[m] += Number(t.hours);
      });
    });
  }

  if (ur.data) users = ur.data.map(u => ({
    id: u.id, name: u.name, user: u.username, pass: u.pass, client: u.client_id
  }));

  const tr2 = await _sb.from('techs').select('*').order('name');
  if (tr2.data && tr2.data.length > 0) {
    TECHS = [...tr2.data.map(t => t.name), 'Sin asignar'];
  }

  if (er.data) events = er.data.map(e => ({
    id: e.id, title: e.title, date: e.date, time: e.time, type: e.type,
    desc: e.description || '', client: e.client_id === null ? -1 : e.client_id,
    tech: e.tech || 'Sin asignar'
  }));
}

function isSameMonth(dateValue, referenceDate = new Date()) {
  const parsed = new Date(dateValue);
  return parsed.getFullYear() === referenceDate.getFullYear() && parsed.getMonth() === referenceDate.getMonth();
}

// ── PERIODO MENSUAL DE TICKETS (reinicio el día 1 de cada mes) ────────────────
// Un ticket "pertenece" al mes de referencia si:
//   • sigue abierto/en proceso (status !== 'closed') → se arrastra hasta cerrarse, o
//   • se cerró dentro de ese mes (por closed_at; si falta, se usa created_at).
// Así, al llegar el día 1 los tickets cerrados de meses anteriores dejan de contar
// y el cliente arranca el nuevo mes con horas y tickets en cero.
function isTicketInMonth(ticket, referenceDate = new Date()) {
  if (!ticket) return false;
  if (ticket.status !== 'closed') return true;          // abierto → se arrastra al mes actual
  const stamp = ticket.closedAt || ticket.createdAt;    // cerrado → cuenta en su mes de cierre
  return stamp ? isSameMonth(stamp, referenceDate) : false;
}

// Tickets de un cliente que cuentan en el mes de referencia (mes actual + abiertos arrastrados).
function getClientMonthTickets(clientId, referenceDate = new Date()) {
  return tickets.filter(t => t.client === clientId && isTicketInMonth(t, referenceDate));
}

function getCurrentMonthTicketHours(clientId, referenceDate = new Date()) {
  return getClientMonthTickets(clientId, referenceDate)
    .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
}

// Pertenencia ESTRICTA al mes (para el reporte PDF mensual): el ticket fue
// creado en el mes de referencia O cerrado en él. No arrastra abiertos previos.
function isTicketStrictlyInMonth(ticket, referenceDate = new Date()) {
  if (!ticket) return false;
  if (ticket.createdAt && isSameMonth(ticket.createdAt, referenceDate)) return true;
  if (ticket.status === 'closed' && ticket.closedAt && isSameMonth(ticket.closedAt, referenceDate)) return true;
  return false;
}

function getClientStrictMonthTickets(clientId, referenceDate = new Date()) {
  return tickets.filter(t => t.client === clientId && isTicketStrictlyInMonth(t, referenceDate));
}

function getMonthlyExtraHours(clientId, referenceDate = new Date()) {
  const cl = CLIENTS.find(c => c.id === clientId);
  if (!cl) return 0;
  const monthlyUsed = getCurrentMonthTicketHours(clientId, referenceDate);
  return Math.max(0, monthlyUsed - Number(cl.hours || 0));
}

// Solo carga usuarios — usado por login-client.html
async function loadUsers() {
  const { data, error } = await _sb.from('client_users').select('*');
  if (error) { console.error('loadUsers:', error); return; }
  if (data) users = data.map(u => ({
    id: u.id, name: u.name, user: u.username, pass: u.pass, client: u.client_id
  }));
}

function showLoading() {
  const el = document.getElementById('main-area');
  if (el) el.innerHTML = `
    <div style="padding:60px;text-align:center;color:var(--muted)">
      <span class="spinner" style="width:28px;height:28px;border-width:3px;display:inline-block"></span>
      <div style="margin-top:14px;font-size:13px">Cargando datos...</div>
    </div>`;
}

// ── CALENDAR STATE ──────────────────────────────────────────────────────────

let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

function calNav(dir) {
  calMonth += dir;
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  render();
}

function renderCalendarGrid(filteredEvents, isAdmin) {
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today       = new Date();

  const evByDay = {};
  filteredEvents.forEach(ev => {
    const d = new Date(ev.date + 'T00:00:00');
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const day = d.getDate();
      if (!evByDay[day]) evByDay[day] = [];
      evByDay[day].push(ev);
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    rows.push(`<tr>${week.map(d => {
      if (d === null) return `<td class="cal-cell cal-empty"></td>`;
      const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === d;
      const evs     = evByDay[d] || [];
      const clickFn = isAdmin ? `onclick="calDayClick(${d})"` : '';
      const chips   = evs.slice(0, 2).map(ev => {
        const et = EVENT_TYPES[ev.type] || EVENT_TYPES.otro;
        return `<div class="cal-chip" style="background:${et.bg};color:${et.color}" onclick="event.stopPropagation();openEventDetail('${ev.id}')" title="${escapeHtml(ev.title)}">${escapeHtml(ev.title)}</div>`;
      }).join('');
      const more = evs.length > 2 ? `<div class="cal-more">+${evs.length - 2} más</div>` : '';
      return `<td class="cal-cell${isToday ? ' cal-today' : ''}" ${clickFn}><div class="cal-day-num${isToday ? ' cal-today-num' : ''}">${d}</div>${chips}${more}</td>`;
    }).join('')}</tr>`);
  }

  return `
    <div class="cal-nav">
      <button class="btn btn-sm" onclick="calNav(-1)"><i class="ti ti-chevron-left"></i></button>
      <span class="cal-title">${MONTH_NAMES[calMonth]} ${calYear}</span>
      <button class="btn btn-sm" onclick="calNav(1)"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div style="overflow-x:auto">
      <table class="cal-table">
        <thead><tr>${DAY_NAMES.map(n => `<th class="cal-th">${n}</th>`).join('')}</tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  `;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ── HELPERS ────────────────────────────────────────────────────────────────

// Escapa texto para insertarlo de forma segura dentro de innerHTML / atributos.
// Previene XSS almacenado: cualquier dato escrito por el usuario (títulos de
// ticket, nombres de empresa/usuario, comentarios) DEBE pasar por aquí antes
// de interpolarse en una plantilla HTML.
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pBadge(p) {
  const cls = { low: 'b-blue', medium: 'b-blue', high: 'b-amber', critical: 'b-red' };
  const lbl = { low: 'Baja',   medium: 'Media',  high: 'Alta',    critical: 'Crítica' };
  return `<span class="badge ${cls[p]}">${lbl[p]}</span>`;
}

function sBadge(s) {
  const cls = { open: 'b-blue', pending: 'b-amber', closed: 'b-green' };
  const lbl = { open: 'Abierto', pending: 'En proceso', closed: 'Cerrado' };
  return `<span class="badge ${cls[s]}">${lbl[s]}</span>`;
}

// ── MODALES ────────────────────────────────────────────────────────────────

function openModal(html) {
  const mc = document.getElementById('modal-container');
  mc.innerHTML = `<div class="overlay" id="overlay" onclick="closeModalIfOverlay(event)">${html}</div>`;
}

function closeModalIfOverlay(e) {
  if (e.target.id === 'overlay') closeModal();
}

function closeModal() {
  document.getElementById('modal-container').innerHTML = '';
}
