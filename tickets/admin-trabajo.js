// ── DASHBOARD ADMIN TRABAJO ────────────────────────────────────────────────
// Segundo dashboard, enfocado por TRABAJO (proyecto) en vez de por horas.
// Los datos compartidos viven en work-data.js (WORK_CLIENTS, WORKS,
// WORK_TICKETS, WORK_USERS, WORK_EVENTS, WORK_ORDERS, helpers).
//
// PASO 2 — Maqueta con datos en memoria. Supabase se conecta en el PASO 3.
// ───────────────────────────────────────────────────────────────────────────

window.dashboardMode = window.dashboardMode || 'horas';

let workTab        = 'empresas';   // pestaña activa del dashboard de trabajo
let workCalClient  = -2;           // filtro del calendario (-2 = todas)
let openWorks      = new Set();     // IDs de empresas con acordeón abierto

// ── NAVEGACIÓN ENTRE DASHBOARDS ────────────────────────────────────────────

function goToWorkDashboard() {
  window.dashboardMode = 'trabajo';
  workTab = 'empresas';
  render();
}
function goToHoursDashboard() {
  window.dashboardMode = 'horas';
  render();
}
function setWorkTab(t) {
  workTab = t;
  renderAdminTrabajo();
}

// ── RENDER PRINCIPAL ───────────────────────────────────────────────────────

function renderAdminTrabajo() {
  const activos    = WORKS.filter(w => w.status === 'activo').length;
  const openTk     = WORK_TICKETS.filter(t => t.status === 'open').length;
  const closedTk   = WORK_TICKETS.filter(t => t.status === 'closed').length;
  const unassigned = WORK_TICKETS.filter(t => t.tech === 'Sin asignar').length;

  let tabContent = '';
  if      (workTab === 'tickets')  tabContent = renderWorkTicketsTab();
  else if (workTab === 'empresas') tabContent = renderWorkEmpresasTab();
  else if (workTab === 'techs')    tabContent = renderWorkTechsTab();
  else if (workTab === 'users')    tabContent = renderWorkUsersTab();
  else if (workTab === 'calendar') tabContent = renderWorkCalendarTab();
  else if (workTab === 'trabajos') tabContent = renderWorkTrabajosTab();
  else if (workTab === 'ordenes')  tabContent = renderWorkOrdersTab();

  document.getElementById('main-area').innerHTML = `
    <div class="metrics">
      <div class="metric"><div class="metric-label">Trabajos activos</div><div class="metric-val">${activos}</div></div>
      <div class="metric"><div class="metric-label">Tickets abiertos</div><div class="metric-val">${openTk}</div></div>
      <div class="metric"><div class="metric-label">Tickets cerrados</div><div class="metric-val">${closedTk}</div></div>
      <div class="metric">
        <div class="metric-label">Sin asignar <span class="metric-dot"></span></div>
        <div class="metric-val">${unassigned}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title"><i class="ti ti-briefcase" style="margin-right:6px"></i>Dashboard admin trabajo</span>
        <button class="btn" onclick="goToHoursDashboard()">
          <i class="ti ti-arrow-back-up"></i> Volver a horas
        </button>
      </div>

      <div class="tabs">
        <div class="tab${workTab === 'tickets'  ? ' active' : ''}" onclick="setWorkTab('tickets')"><i class="ti ti-ticket" style="margin-right:4px"></i>Tickets</div>
        <div class="tab${workTab === 'empresas' ? ' active' : ''}" onclick="setWorkTab('empresas')"><i class="ti ti-building" style="margin-right:4px"></i>Empresas</div>
        <div class="tab${workTab === 'techs'    ? ' active' : ''}" onclick="setWorkTab('techs')"><i class="ti ti-tool" style="margin-right:4px"></i>Técnicos</div>
        <div class="tab${workTab === 'users'    ? ' active' : ''}" onclick="setWorkTab('users')"><i class="ti ti-users" style="margin-right:4px"></i>Usuarios</div>
        <div class="tab${workTab === 'calendar' ? ' active' : ''}" onclick="setWorkTab('calendar')"><i class="ti ti-calendar" style="margin-right:4px"></i>Calendario</div>
        <div class="tab${workTab === 'trabajos' ? ' active' : ''}" onclick="setWorkTab('trabajos')"><i class="ti ti-briefcase" style="margin-right:4px"></i>Trabajos</div>
        <div class="tab${workTab === 'ordenes'  ? ' active' : ''}" onclick="setWorkTab('ordenes')"><i class="ti ti-clipboard-text" style="margin-right:4px"></i>Órdenes</div>
      </div>

      ${tabContent}
    </div>
  `;
}

// ── PESTAÑA: TICKETS (por trabajo) ─────────────────────────────────────────

function renderWorkTicketsTab() {
  const rows = WORK_TICKETS.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px">Sin tickets registrados.</td></tr>`
    : WORK_TICKETS.map(t => {
        const unassigned = t.tech === 'Sin asignar';
        return `
        <tr${unassigned ? ' style="background:#fffbeb"' : ''}>
          <td style="color:var(--muted);font-size:12px">${t.id}</td>
          <td style="font-weight:500;color:var(--primary-dark)">${escapeHtml(t.title)}</td>
          <td><span class="company-badge" style="background:#eef2f6;color:#475467">${escapeHtml(workName(t.workId))}</span><div style="font-size:11px;color:var(--muted);margin-top:2px">${escapeHtml(workClientName(t.clientId))}</div></td>
          <td>${sBadge(t.status)}</td>
          <td>${pBadge(t.prio)}</td>
          <td>
            <select class="tech-sel${unassigned ? ' tech-sel--unassigned' : ''}" onchange="assignWorkTech('${t.id}', this.value)">
              ${TECHS.map(tc => `<option${tc === t.tech ? ' selected' : ''}>${escapeHtml(tc)}</option>`).join('')}
            </select>
          </td>
        </tr>`;
      }).join('');

  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-secondary" onclick="openWorkTicketForm(null)">
        <i class="ti ti-ticket"></i> Nuevo ticket por trabajo
      </button>
    </div>
    <div style="overflow-x:auto">
      <table class="tbl">
        <colgroup><col style="width:80px"><col><col style="width:200px"><col style="width:100px"><col style="width:90px"><col style="width:170px"></colgroup>
        <thead><tr><th>ID</th><th>Asunto</th><th>Trabajo</th><th>Estado</th><th>Prioridad</th><th>Técnico</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function assignWorkTech(id, tech) {
  const t = WORK_TICKETS.find(t => t.id === id);
  if (!t) return;
  t.tech = tech;
  renderAdminTrabajo();
  if (typeof dbUpsertWorkTicket === 'function') dbUpsertWorkTicket(t);
}

function openWorkTicketForm(ticketId) {
  const t = ticketId ? WORK_TICKETS.find(t => t.id === ticketId) : null;
  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${t ? 'Editar ticket' : 'Nuevo ticket por trabajo'}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="form-row">
        <label class="form-label">Asunto</label>
        <input class="form-input" id="wt-title" value="${t ? escapeHtml(t.title) : ''}" placeholder="Ej: Configurar firewall" />
      </div>
      <div class="form-row">
        <label class="form-label">Trabajo (proyecto)</label>
        <select class="form-input" id="wt-work">
          ${WORKS.map(w => `<option value="${w.id}"${t && t.workId === w.id ? ' selected' : ''}>${escapeHtml(w.name)} — ${escapeHtml(workClientName(w.clientId))}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Categoría</label>
        <select class="form-input" id="wt-cat">
          ${WORK_TICKET_CATS.map(c => `<option${t && t.cat === c ? ' selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-row">
          <label class="form-label">Prioridad</label>
          <select class="form-input" id="wt-prio">
            ${['low','medium','high','critical'].map(p => `<option value="${p}"${t && t.prio === p ? ' selected' : ''}>${({low:'Baja',medium:'Media',high:'Alta',critical:'Crítica'})[p]}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Estado</label>
          <select class="form-input" id="wt-status">
            ${['open','pending','closed'].map(s => `<option value="${s}"${t && t.status === s ? ' selected' : ''}>${({open:'Abierto',pending:'En proceso',closed:'Cerrado'})[s]}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="form-label">Técnico</label>
        <select class="form-input" id="wt-tech">
          ${TECHS.map(tc => `<option${t && t.tech === tc ? ' selected' : ''}>${escapeHtml(tc)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Descripción</label>
        <textarea class="form-input" id="wt-desc" rows="2" placeholder="Detalle del ticket">${t ? escapeHtml(t.desc) : ''}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveWorkTicket('${ticketId || ''}')">
          <i class="ti ti-check"></i> ${t ? 'Guardar cambios' : 'Crear ticket'}
        </button>
      </div>
    </div>
  `);
}

function saveWorkTicket(ticketId) {
  const title  = document.getElementById('wt-title').value.trim();
  const workId = Number(document.getElementById('wt-work').value);
  if (!title)  { alert('Ingresa el asunto del ticket.'); return; }
  if (!workId) { alert('Selecciona un trabajo.'); return; }

  const w = WORKS.find(w => w.id === workId);
  const data = {
    title, workId, clientId: w ? w.clientId : null,
    prio:   document.getElementById('wt-prio').value,
    status: document.getElementById('wt-status').value,
    tech:   document.getElementById('wt-tech').value,
    cat:    document.getElementById('wt-cat').value,
    desc:   document.getElementById('wt-desc').value.trim()
  };

  let target;
  if (ticketId) {
    const idx = WORK_TICKETS.findIndex(t => t.id === ticketId);
    if (idx !== -1) { WORK_TICKETS[idx] = { ...WORK_TICKETS[idx], ...data }; target = WORK_TICKETS[idx]; }
  } else {
    target = { id: nextWorkTicketId(), createdAt: new Date().toISOString().slice(0, 10), ...data };
    WORK_TICKETS.unshift(target);
  }
  closeModal();
  renderAdminTrabajo();
  if (target && typeof dbUpsertWorkTicket === 'function') dbUpsertWorkTicket(target);
}

// ── PESTAÑA: EMPRESAS (nuevas empresas, por trabajo) ───────────────────────

function toggleWorkEmpresa(id) {
  if (openWorks.has(id)) openWorks.delete(id); else openWorks.add(id);
  renderAdminTrabajo();
}

function renderWorkEmpresasTab() {
  const header = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-secondary" onclick="openWorkClientForm(null)">
        <i class="ti ti-building-plus"></i> Nueva empresa
      </button>
    </div>`;

  if (WORK_CLIENTS.length === 0) {
    return header + `<div style="padding:24px;text-align:center;color:var(--muted);font-size:14px">
      Aún no hay empresas por trabajo. Crea una con el botón superior.
    </div>`;
  }

  const list = WORK_CLIENTS.map(cl => {
    const clWorks   = WORKS.filter(w => w.clientId === cl.id);
    const clTickets = WORK_TICKETS.filter(t => t.clientId === cl.id);
    const clUsers   = WORK_USERS.filter(u => u.clientId === cl.id);
    const activos   = clWorks.filter(w => w.status === 'activo').length;
    const openTk    = clTickets.filter(t => t.status === 'open').length;
    const closedTk  = clTickets.filter(t => t.status === 'closed').length;
    const isOpen    = openWorks.has(cl.id);

    const worksList = clWorks.length === 0
      ? `<div style="font-size:13px;color:var(--muted)">Sin trabajos registrados.</div>`
      : clWorks.map(w => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
            <span style="flex:1;font-size:13px;font-weight:500">${escapeHtml(w.name)}</span>
            ${wBadge(w.status)}
            <div class="hora-prog" style="width:90px"><div class="hora-fill" style="width:${w.progress}%;background:#185FA5"></div></div>
            <span style="font-size:12px;color:var(--muted);width:38px;text-align:right">${w.progress}%</span>
          </div>`).join('');

    const usersList = clUsers.length === 0
      ? `<div style="font-size:13px;color:var(--muted)">Sin usuarios registrados.</div>`
      : clUsers.map(u => `
          <span style="display:inline-flex;align-items:center;gap:5px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;margin:3px">
            <i class="ti ti-user" style="font-size:12px;color:var(--muted)"></i> ${escapeHtml(u.name)}
            <span style="color:var(--muted);font-size:11px">(${escapeHtml(u.user)})</span>
          </span>`).join('');

    return `
      <div class="empresa-accordion${isOpen ? ' open' : ''}" id="wemp-${cl.id}">
        <div class="empresa-header" onclick="toggleWorkEmpresa(${cl.id})">
          <div class="empresa-header-left">
            <i class="ti ti-chevron-right empresa-chevron"></i>
            <span class="empresa-name">${escapeHtml(cl.name)}</span>
            <span class="empresa-chips">
              <span class="echip echip-open">${activos} activos</span>
              <span class="echip echip-pending">${openTk} tickets abiertos</span>
              <span class="echip echip-closed">${closedTk} cerrados</span>
            </span>
          </div>
          <div class="empresa-header-right">
            <span style="font-size:12px;color:var(--muted)">${clWorks.length} trabajo(s)</span>
            <button class="btn btn-sm" onclick="event.stopPropagation();openWorkClientForm(${cl.id})">
              <i class="ti ti-edit"></i>
            </button>
          </div>
        </div>
        ${isOpen ? `
        <div class="empresa-body">
          <div class="empresa-section">
            <div class="empresa-section-title"><i class="ti ti-briefcase"></i> Trabajos (${clWorks.length})</div>
            <div>${worksList}</div>
          </div>
          <div class="empresa-section">
            <div class="empresa-section-title"><i class="ti ti-users"></i> Usuarios (${clUsers.length})</div>
            <div>${usersList}</div>
          </div>
        </div>` : ''}
      </div>`;
  }).join('');

  return header + list;
}

function openWorkClientForm(clientId) {
  const cl = clientId !== null ? WORK_CLIENTS.find(c => c.id === clientId) : null;
  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${cl ? 'Editar empresa' : 'Nueva empresa (por trabajo)'}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="form-row">
        <label class="form-label">Nombre de la empresa</label>
        <input class="form-input" id="wc-name" value="${cl ? escapeHtml(cl.name) : ''}" placeholder="Ej: TechNova" />
      </div>
      <div class="form-row">
        <label class="form-label">Sector / Rubro</label>
        <input class="form-input" id="wc-sector" value="${cl ? cl.sector : ''}" placeholder="Ej: Tecnología" />
      </div>
      <div class="form-row">
        <label class="form-label">Contacto principal</label>
        <input class="form-input" id="wc-contact" value="${cl ? cl.contact : ''}" placeholder="Ej: Ana Ruiz" />
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveWorkClient(${clientId !== null ? clientId : 'null'})">
          <i class="ti ti-check"></i> ${cl ? 'Guardar cambios' : 'Crear empresa'}
        </button>
      </div>
    </div>
  `);
}

function saveWorkClient(clientId) {
  const name    = document.getElementById('wc-name').value.trim();
  const sector  = document.getElementById('wc-sector').value.trim();
  const contact = document.getElementById('wc-contact').value.trim();
  if (!name) { alert('Ingresa el nombre de la empresa.'); return; }

  const dup = WORK_CLIENTS.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== clientId);
  if (dup) { alert('Ya existe una empresa con ese nombre.'); return; }

  let target;
  if (clientId !== null && clientId !== undefined) {
    const idx = WORK_CLIENTS.findIndex(c => c.id === clientId);
    if (idx !== -1) { WORK_CLIENTS[idx] = { ...WORK_CLIENTS[idx], name, sector, contact }; target = WORK_CLIENTS[idx]; }
  } else {
    target = { id: nextWorkClientId(), name, sector, contact };
    WORK_CLIENTS.push(target);
  }
  closeModal();
  renderAdminTrabajo();
  if (target && typeof dbUpsertWorkClient === 'function') dbUpsertWorkClient(target);
}

// ── PESTAÑA: TRABAJOS (gestión por empresa) ────────────────────────────────

function renderWorkTrabajosTab() {
  const header = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-secondary" onclick="openWorkForm(null)">
        <i class="ti ti-briefcase"></i> Nuevo trabajo
      </button>
    </div>`;

  if (WORKS.length === 0) {
    return header + `<div style="padding:24px;text-align:center;color:var(--muted);font-size:14px">
      Sin trabajos. Crea uno con el botón superior.
    </div>`;
  }

  const byClient = WORK_CLIENTS.map(cl => ({
    ...cl,
    items: WORKS.filter(w => w.clientId === cl.id)
  })).filter(c => c.items.length > 0);

  const blocks = byClient.map(cl => `
    <div style="margin-bottom:22px">
      <div style="font-size:11px;font-weight:bold;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">${escapeHtml(cl.name)}</div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Trabajo</th><th style="width:120px">Estado</th><th style="width:160px">Avance</th><th style="width:170px">Fechas</th><th style="width:90px">Tickets</th><th style="width:60px"></th></tr></thead>
          <tbody>
            ${cl.items.map(w => {
              const tk = WORK_TICKETS.filter(t => t.workId === w.id).length;
              return `
              <tr>
                <td style="font-weight:500">${escapeHtml(w.name)}</td>
                <td>${wBadge(w.status)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="hora-prog" style="flex:1"><div class="hora-fill" style="width:${w.progress}%;background:#185FA5"></div></div>
                    <span style="font-size:12px;color:var(--muted)">${w.progress}%</span>
                  </div>
                </td>
                <td style="font-size:12px;color:var(--muted)">${w.start ? formatDate(w.start) : '—'} → ${w.end ? formatDate(w.end) : '—'}</td>
                <td>${tk}</td>
                <td><button class="btn btn-sm" onclick="openWorkForm(${w.id})"><i class="ti ti-edit"></i></button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`).join('');

  return header + blocks;
}

function openWorkForm(workId) {
  const w = workId !== null ? WORKS.find(w => w.id === workId) : null;
  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${w ? 'Editar trabajo' : 'Nuevo trabajo'}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="form-row">
        <label class="form-label">Nombre del trabajo</label>
        <input class="form-input" id="wk-name" value="${w ? escapeHtml(w.name) : ''}" placeholder="Ej: Migración a la nube" />
      </div>
      <div class="form-row">
        <label class="form-label">Empresa</label>
        <select class="form-input" id="wk-client">
          ${WORK_CLIENTS.map(c => `<option value="${c.id}"${w && w.clientId === c.id ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-row">
          <label class="form-label">Estado</label>
          <select class="form-input" id="wk-status">
            ${Object.entries(WORK_STATUS).map(([k, v]) => `<option value="${k}"${w && w.status === k ? ' selected' : ''}>${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Avance (%)</label>
          <input class="form-input" id="wk-progress" type="number" min="0" max="100" value="${w ? w.progress : 0}" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-row">
          <label class="form-label">Inicio</label>
          <input class="form-input" id="wk-start" type="date" value="${w ? w.start : ''}" />
        </div>
        <div class="form-row">
          <label class="form-label">Fin estimado</label>
          <input class="form-input" id="wk-end" type="date" value="${w ? w.end : ''}" />
        </div>
      </div>
      <div class="form-row">
        <label class="form-label">Descripción</label>
        <textarea class="form-input" id="wk-desc" rows="2" placeholder="Detalle del trabajo">${w ? escapeHtml(w.desc) : ''}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveWork(${workId !== null ? workId : 'null'})">
          <i class="ti ti-check"></i> ${w ? 'Guardar cambios' : 'Crear trabajo'}
        </button>
      </div>
    </div>
  `);
}

function saveWork(workId) {
  const name = document.getElementById('wk-name').value.trim();
  if (!name) { alert('Ingresa el nombre del trabajo.'); return; }
  const data = {
    name,
    clientId: Number(document.getElementById('wk-client').value),
    status:   document.getElementById('wk-status').value,
    progress: Math.max(0, Math.min(100, Number(document.getElementById('wk-progress').value) || 0)),
    start:    document.getElementById('wk-start').value,
    end:      document.getElementById('wk-end').value,
    desc:     document.getElementById('wk-desc').value.trim()
  };

  let target;
  if (workId !== null && workId !== undefined) {
    const idx = WORKS.findIndex(w => w.id === workId);
    if (idx !== -1) { WORKS[idx] = { ...WORKS[idx], ...data }; target = WORKS[idx]; }
  } else {
    target = { id: nextWorkId(), ...data };
    WORKS.push(target);
  }
  closeModal();
  renderAdminTrabajo();
  if (target && typeof dbUpsertWork === 'function') dbUpsertWork(target);
}

// ── PESTAÑA: ÓRDENES DE TRABAJO ────────────────────────────────────────────
// El admin/técnico carga aquí los datos detallados de cada servicio/equipo.
// Estos datos son los que el cliente verá en su historial y exportará a PDF.

function renderWorkOrdersTab() {
  const header = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:8px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--muted)">Registro de trabajos realizados (lo que ve el cliente en su historial).</span>
      <button class="btn btn-secondary" onclick="openWorkOrderForm(null)">
        <i class="ti ti-clipboard-plus"></i> Nueva orden de trabajo
      </button>
    </div>`;

  if (WORK_ORDERS.length === 0) {
    return header + `<div style="padding:24px;text-align:center;color:var(--muted);font-size:14px">
      Sin órdenes de trabajo. Crea una con el botón superior.
    </div>`;
  }

  const rows = WORK_ORDERS.map(o => `
    <tr>
      <td style="color:var(--muted);font-size:12px">${o.id}</td>
      <td style="font-weight:500">${escapeHtml(o.titulo)}</td>
      <td>${escapeHtml(workClientName(o.clientId))}</td>
      <td>${orderTypeBadge(o.tipo)}</td>
      <td style="font-size:12px">${o.fecha ? formatDate(o.fecha) : '—'}</td>
      <td style="font-size:12px;color:var(--muted)">${escapeHtml(o.factura || '—')}</td>
      <td><button class="btn btn-sm" onclick="openWorkOrderForm('${o.id}')"><i class="ti ti-edit"></i></button></td>
    </tr>`).join('');

  return header + `
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead><tr><th>ID</th><th>Título</th><th>Empresa</th><th>Tipo</th><th>Fecha</th><th>Factura</th><th style="width:60px"></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function openWorkOrderForm(orderId) {
  const o = orderId ? WORK_ORDERS.find(x => x.id === orderId) : null;
  const g = (k, d = '') => (o && o[k] != null ? o[k] : d);

  openModal(`
    <div class="modal modal-lg" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${o ? 'Editar orden de trabajo' : 'Nueva orden de trabajo'}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-row">
          <label class="form-label">Empresa</label>
          <select class="form-input" id="ot-client">
            ${WORK_CLIENTS.map(c => `<option value="${c.id}"${o && o.clientId === c.id ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Trabajo / proyecto (opcional)</label>
          <select class="form-input" id="ot-work">
            <option value="">— Sin proyecto —</option>
            ${WORKS.map(w => `<option value="${w.id}"${o && o.workId === w.id ? ' selected' : ''}>${escapeHtml(w.name)} — ${escapeHtml(workClientName(w.clientId))}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <label class="form-label">Título del trabajo</label>
        <input class="form-input" id="ot-titulo" value="${g('titulo')}" placeholder="Ej: Mantenimiento de switch" />
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div class="form-row">
          <label class="form-label">Tipo</label>
          <select class="form-input" id="ot-tipo">
            ${Object.entries(ORDER_TYPES).map(([k, v]) => `<option value="${k}"${o && o.tipo === k ? ' selected' : ''}>${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Categoría</label>
          <select class="form-input" id="ot-cat">
            ${Object.keys(ORDER_CAT_COLORS).map(c => `<option${o && o.categoria === c ? ' selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Fecha de realización</label>
          <input class="form-input" id="ot-fecha" type="date" value="${g('fecha')}" />
        </div>
      </div>

      <div class="form-row">
        <label class="form-label">Requerimientos</label>
        <textarea class="form-input" id="ot-req" rows="2" placeholder="Qué se solicitó">${g('requerimientos')}</textarea>
      </div>

      <div class="form-row">
        <label class="form-label">Problema reportado / trabajo a realizar</label>
        <textarea class="form-input" id="ot-problema" rows="2" placeholder="Falla reportada o descripción del trabajo">${g('problema')}</textarea>
      </div>

      <div style="border:1px dashed var(--border);border-radius:8px;padding:12px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:bold;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">
          <i class="ti ti-device-desktop"></i> Datos del equipo (si es mantenimiento)
        </div>
        <div class="form-row">
          <label class="form-label">Cómo ingresa el producto</label>
          <input class="form-input" id="ot-ingreso" value="${g('ingreso')}" placeholder="Ej: por garantía / revisión en sitio" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-row">
            <label class="form-label">Modelo</label>
            <input class="form-input" id="ot-modelo" value="${g('modelo')}" placeholder="Ej: Cisco Catalyst 2960" />
          </div>
          <div class="form-row">
            <label class="form-label">Número de serie</label>
            <input class="form-input" id="ot-serie" value="${g('serie')}" placeholder="Ej: FOC1843X0AB" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-row">
            <label class="form-label">Fecha de entrada</label>
            <input class="form-input" id="ot-entrada" type="date" value="${g('fechaEntrada')}" />
          </div>
          <div class="form-row">
            <label class="form-label">Fecha de salida</label>
            <input class="form-input" id="ot-salida" type="date" value="${g('fechaSalida')}" />
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">Detalle / estado del equipo</label>
          <textarea class="form-input" id="ot-estado" rows="2" placeholder="Estado físico al ingresar">${g('estadoEquipo')}</textarea>
        </div>
      </div>

      <div class="form-row">
        <label class="form-label">Trabajo realizado</label>
        <textarea class="form-input" id="ot-realizado" rows="3" placeholder="Detalle de lo que se hizo">${g('trabajoRealizado')}</textarea>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-row">
          <label class="form-label">Número de factura</label>
          <input class="form-input" id="ot-factura" value="${g('factura')}" placeholder="Ej: F-2026-0150" />
        </div>
        <div class="form-row">
          <label class="form-label">Técnico</label>
          <select class="form-input" id="ot-tech">
            ${TECHS.map(tc => `<option${o && o.tecnico === tc ? ' selected' : ''}>${escapeHtml(tc)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <label class="form-label">Observaciones</label>
        <textarea class="form-input" id="ot-obs" rows="2" placeholder="Observaciones del trabajo realizado">${g('observaciones')}</textarea>
      </div>

      <div class="form-row">
        <label class="form-label">Recomendaciones</label>
        <textarea class="form-input" id="ot-recom" rows="2" placeholder="Recomendaciones para el cliente">${g('recomendaciones')}</textarea>
      </div>

      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveWorkOrder('${orderId || ''}')">
          <i class="ti ti-check"></i> ${o ? 'Guardar cambios' : 'Crear orden'}
        </button>
      </div>
    </div>
  `);
}

function saveWorkOrder(orderId) {
  const titulo = document.getElementById('ot-titulo').value.trim();
  if (!titulo) { alert('Ingresa el título del trabajo.'); return; }

  const workVal = document.getElementById('ot-work').value;
  const data = {
    clientId:         Number(document.getElementById('ot-client').value),
    workId:           workVal ? Number(workVal) : null,
    titulo,
    tipo:             document.getElementById('ot-tipo').value,
    categoria:        document.getElementById('ot-cat').value,
    fecha:            document.getElementById('ot-fecha').value,
    requerimientos:   document.getElementById('ot-req').value.trim(),
    problema:         document.getElementById('ot-problema').value.trim(),
    ingreso:          document.getElementById('ot-ingreso').value.trim(),
    modelo:           document.getElementById('ot-modelo').value.trim(),
    serie:            document.getElementById('ot-serie').value.trim(),
    fechaEntrada:     document.getElementById('ot-entrada').value,
    fechaSalida:      document.getElementById('ot-salida').value,
    estadoEquipo:     document.getElementById('ot-estado').value.trim(),
    trabajoRealizado: document.getElementById('ot-realizado').value.trim(),
    factura:          document.getElementById('ot-factura').value.trim(),
    observaciones:    document.getElementById('ot-obs').value.trim(),
    recomendaciones:  document.getElementById('ot-recom').value.trim(),
    tecnico:          document.getElementById('ot-tech').value
  };

  let target;
  if (orderId) {
    const idx = WORK_ORDERS.findIndex(o => o.id === orderId);
    if (idx !== -1) { WORK_ORDERS[idx] = { ...WORK_ORDERS[idx], ...data }; target = WORK_ORDERS[idx]; }
  } else {
    target = { id: nextWorkOrderId(), ...data };
    WORK_ORDERS.unshift(target);
  }
  closeModal();
  renderAdminTrabajo();
  if (target && typeof dbUpsertWorkOrder === 'function') dbUpsertWorkOrder(target);
}

// ── PESTAÑA: TÉCNICOS ──────────────────────────────────────────────────────

function renderWorkTechsTab() {
  const techMap = {};
  TECHS.filter(t => t !== 'Sin asignar').forEach(name => { techMap[name] = { count: 0 }; });
  WORK_TICKETS.forEach(t => {
    if (t.tech === 'Sin asignar') return;
    if (!techMap[t.tech]) techMap[t.tech] = { count: 0 };
    techMap[t.tech].count++;
  });

  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-secondary" onclick="openTechForm()">
        <i class="ti ti-user-plus"></i> Agregar técnico
      </button>
    </div>
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead><tr><th>Técnico</th><th>Tickets de trabajo asignados</th></tr></thead>
        <tbody>
          ${Object.entries(techMap).map(([k, v]) => `
            <tr><td>${k}</td><td>${v.count}</td></tr>`).join('')
            || `<tr><td colspan="2" style="text-align:center;color:var(--muted);padding:16px">Sin técnicos registrados.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

// ── PESTAÑA: USUARIOS ──────────────────────────────────────────────────────

function renderWorkUsersTab() {
  const byClient = WORK_CLIENTS.map(cl => ({
    ...cl, members: WORK_USERS.filter(u => u.clientId === cl.id)
  }));

  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-secondary" onclick="openWorkUserForm(null)">
        <i class="ti ti-user-plus"></i> Nuevo usuario
      </button>
    </div>
    ${byClient.map(cl => `
      <div style="margin-bottom:22px">
        <div style="font-size:11px;font-weight:bold;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">${escapeHtml(cl.name)}</div>
        ${cl.members.length === 0
          ? `<div style="font-size:13px;color:var(--muted);padding:6px 0">Sin usuarios — crea uno con el botón superior.</div>`
          : `<table class="tbl">
              <thead><tr><th>Nombre</th><th>Usuario</th><th style="width:100px"></th></tr></thead>
              <tbody>
                ${cl.members.map(u => `
                  <tr>
                    <td>${escapeHtml(u.name)}</td>
                    <td style="color:var(--muted);font-size:12px">${escapeHtml(u.user)}</td>
                    <td>
                      <div style="display:flex;gap:6px">
                        <button class="btn btn-sm" onclick="openWorkUserForm(${u.id})"><i class="ti ti-edit"></i></button>
                        <button class="btn btn-sm" style="border-color:#E24B4A;color:#a42828" onclick="deleteWorkUser(${u.id})"><i class="ti ti-trash"></i></button>
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
      </div>`).join('')}
  `;
}

function openWorkUserForm(userId) {
  const u = userId !== null ? WORK_USERS.find(u => u.id === userId) : null;
  if (WORK_CLIENTS.length === 0) { alert('Primero crea una empresa.'); return; }
  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${u ? 'Editar usuario' : 'Nuevo usuario'}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="form-row">
        <label class="form-label">Nombre completo</label>
        <input class="form-input" id="wu-name" value="${u ? escapeHtml(u.name) : ''}" placeholder="Ej: Juan Pérez" />
      </div>
      <div class="form-row">
        <label class="form-label">Usuario (para iniciar sesión)</label>
        <input class="form-input" id="wu-user" value="${u ? escapeHtml(u.user) : ''}" placeholder="Ej: juan.technova" autocomplete="off" />
      </div>
      <div class="form-row">
        <label class="form-label">${u ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'}</label>
        <input class="form-input" id="wu-pass" type="text" value="" placeholder="••••••" autocomplete="off" />
      </div>
      <div class="form-row">
        <label class="form-label">Empresa</label>
        <select class="form-input" id="wu-client">
          ${WORK_CLIENTS.map(c => `<option value="${c.id}"${u && u.clientId === c.id ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveWorkUser(${userId !== null ? userId : 'null'})">
          <i class="ti ti-check"></i> ${u ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </div>
    </div>
  `);
}

async function saveWorkUser(userId) {
  const name = document.getElementById('wu-name').value.trim();
  const user = document.getElementById('wu-user').value.trim().toLowerCase();
  const pass = document.getElementById('wu-pass').value;
  const clientId = Number(document.getElementById('wu-client').value);
  if (!name) { alert('Ingresa el nombre completo.'); return; }
  if (!user) { alert('Ingresa el nombre de usuario.'); return; }

  const dup = WORK_USERS.find(u => u.user === user && u.id !== userId);
  if (dup) { alert('Ese nombre de usuario ya está en uso.'); return; }

  let target;
  if (userId !== null && userId !== undefined) {
    const idx = WORK_USERS.findIndex(u => u.id === userId);
    if (idx !== -1) {
      WORK_USERS[idx] = { ...WORK_USERS[idx], name, user, clientId };
      if (pass) {
        const hashedPass = await hashPassword(pass);
        WORK_USERS[idx].pass = hashedPass;
      }
      target = WORK_USERS[idx];
    }
  } else {
    if (!pass) { alert('Ingresa una contraseña.'); return; }
    const hashedPass = await hashPassword(pass);
    target = { id: nextWorkUserId(), name, user, pass: hashedPass, clientId };
    WORK_USERS.push(target);
  }
  closeModal();
  renderAdminTrabajo();
  if (target && typeof dbUpsertWorkUser === 'function') dbUpsertWorkUser(target);
}

function deleteWorkUser(id) {
  const u = WORK_USERS.find(u => u.id === id);
  if (!u) return;
  if (!confirm(`¿Eliminar al usuario "${u.name}"?`)) return;
  WORK_USERS = WORK_USERS.filter(x => x.id !== id);
  renderAdminTrabajo();
  if (typeof dbDeleteWorkUser === 'function') dbDeleteWorkUser(id);
}

// ── PESTAÑA: CALENDARIO (visitas por trabajo) ──────────────────────────────

function setWorkCalFilter(val) {
  workCalClient = Number(val);
  renderAdminTrabajo();
}

function renderWorkCalendarTab() {
  const visible = workCalClient === -2
    ? WORK_EVENTS
    : WORK_EVENTS.filter(ev => ev.clientId === workCalClient);

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <select class="form-input" onchange="setWorkCalFilter(this.value)" style="max-width:210px;width:auto">
        <option value="-2"${workCalClient === -2 ? ' selected' : ''}>Todas las empresas</option>
        ${WORK_CLIENTS.map(c => `<option value="${c.id}"${workCalClient === c.id ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="openWorkEventForm(null, null)">
        <i class="ti ti-plus"></i> Programar visita
      </button>
    </div>
    ${renderWorkCalendarGrid(visible, true)}
  `;
}

function renderWorkCalendarGrid(filteredEvents, isAdmin) {
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today       = new Date();

  const evByDay = {};
  filteredEvents.forEach(ev => {
    const d = new Date(ev.date + 'T00:00:00');
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const day = d.getDate();
      (evByDay[day] = evByDay[day] || []).push(ev);
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
      const evs = evByDay[d] || [];
      const clickFn = isAdmin ? `onclick="workCalDayClick(${d})"` : '';
      const chips = evs.slice(0, 2).map(ev => {
        const et = EVENT_TYPES[ev.type] || EVENT_TYPES.otro;
        return `<div class="cal-chip" style="background:${et.bg};color:${et.color}" onclick="event.stopPropagation();openWorkEventDetail('${ev.id}')" title="${escapeHtml(ev.title)}">${escapeHtml(ev.title)}</div>`;
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

function workCalDayClick(d) {
  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  openWorkEventForm(dateStr, null);
}

function openWorkEventDetail(id) {
  const ev = WORK_EVENTS.find(e => e.id === id);
  if (!ev) return;
  const et = EVENT_TYPES[ev.type] || EVENT_TYPES.otro;
  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${escapeHtml(ev.title)}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>
      <div style="margin-bottom:14px"><span class="badge" style="background:${et.bg};color:${et.color}">${et.label}</span></div>
      <div class="detail-grid">
        <div><div class="form-label">Fecha</div><span style="font-size:13px">${formatDate(ev.date)}</span></div>
        <div><div class="form-label">Hora</div><span style="font-size:13px">${ev.time}</span></div>
        <div><div class="form-label">Empresa</div><span style="font-size:13px">${escapeHtml(workClientName(ev.clientId))}</span></div>
        <div><div class="form-label">Trabajo</div><span style="font-size:13px">${escapeHtml(workName(ev.workId))}</span></div>
        <div><div class="form-label">Técnico</div><span style="font-size:13px">${escapeHtml(ev.tech)}</span></div>
      </div>
      ${ev.desc ? `<div class="form-row"><div class="form-label">Descripción</div><div style="font-size:13px;line-height:1.5">${escapeHtml(ev.desc)}</div></div>` : ''}
      <div class="modal-actions">
        <button class="btn" style="border-color:#E24B4A;color:#a42828;margin-right:auto" onclick="deleteWorkEvent('${ev.id}')">
          <i class="ti ti-trash"></i> Eliminar
        </button>
        <button class="btn" onclick="openWorkEventForm(null,'${ev.id}')"><i class="ti ti-edit"></i> Editar</button>
        <button class="btn" onclick="closeModal()">Cerrar</button>
      </div>
    </div>
  `);
}

function openWorkEventForm(date, eventId) {
  const ev      = eventId ? WORK_EVENTS.find(e => e.id === eventId) : null;
  const dateVal = date || (ev ? ev.date : '');
  if (WORKS.length === 0) { alert('Primero crea un trabajo.'); return; }
  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${ev ? 'Editar visita' : 'Programar visita por trabajo'}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="form-row">
        <label class="form-label">Título</label>
        <input class="form-input" id="we-title" value="${ev ? escapeHtml(ev.title) : ''}" placeholder="Ej: Visita de instalación" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-row">
          <label class="form-label">Fecha</label>
          <input class="form-input" id="we-date" type="date" value="${dateVal}" />
        </div>
        <div class="form-row">
          <label class="form-label">Hora</label>
          <input class="form-input" id="we-time" type="time" value="${ev ? ev.time : '09:00'}" />
        </div>
      </div>
      <div class="form-row">
        <label class="form-label">Tipo de actividad</label>
        <select class="form-input" id="we-type">
          ${Object.entries(EVENT_TYPES).map(([k, v]) => `<option value="${k}"${ev && ev.type === k ? ' selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Trabajo (proyecto)</label>
        <select class="form-input" id="we-work">
          ${WORKS.map(w => `<option value="${w.id}"${ev && ev.workId === w.id ? ' selected' : ''}>${escapeHtml(w.name)} — ${escapeHtml(workClientName(w.clientId))}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Técnico</label>
        <select class="form-input" id="we-tech">
          ${TECHS.map(tc => `<option${ev && ev.tech === tc ? ' selected' : ''}>${escapeHtml(tc)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Descripción</label>
        <textarea class="form-input" id="we-desc" rows="2" placeholder="Detalle opcional">${ev ? escapeHtml(ev.desc) : ''}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveWorkEvent('${eventId || ''}')">
          <i class="ti ti-check"></i> ${ev ? 'Guardar cambios' : 'Programar'}
        </button>
      </div>
    </div>
  `);
}

function saveWorkEvent(eventId) {
  const title = document.getElementById('we-title').value.trim();
  const date  = document.getElementById('we-date').value;
  if (!title) { alert('Ingresa un título.'); return; }
  if (!date)  { alert('Selecciona una fecha.'); return; }

  const workId = Number(document.getElementById('we-work').value);
  const w = WORKS.find(w => w.id === workId);
  const data = {
    title, date,
    time:     document.getElementById('we-time').value,
    type:     document.getElementById('we-type').value,
    workId,
    clientId: w ? w.clientId : null,
    tech:     document.getElementById('we-tech').value,
    desc:     document.getElementById('we-desc').value.trim()
  };

  let target;
  if (eventId) {
    target = { id: eventId, ...data };
    const idx = WORK_EVENTS.findIndex(e => e.id === eventId);
    if (idx !== -1) WORK_EVENTS[idx] = target;
  } else {
    target = { id: nextWorkEventId(), ...data };
    WORK_EVENTS.unshift(target);
  }

  closeModal();
  const [y, m] = date.split('-');
  calYear  = Number(y);
  calMonth = Number(m) - 1;
  workTab  = 'calendar';
  renderAdminTrabajo();
  if (target && typeof dbUpsertWorkEvent === 'function') dbUpsertWorkEvent(target);
}

function deleteWorkEvent(id) {
  if (!confirm('¿Eliminar esta visita del calendario?')) return;
  WORK_EVENTS = WORK_EVENTS.filter(e => e.id !== id);
  closeModal();
  renderAdminTrabajo();
  if (typeof dbDeleteWorkEvent === 'function') dbDeleteWorkEvent(id);
}
