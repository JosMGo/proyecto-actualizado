// ── DASHBOARD ADMIN ────────────────────────────────────────────────────────

let adminTab        = 'tickets';
let calClientFilter = -2; // -2 = todas las empresas
let openCompanies   = new Set(); // IDs de empresas con acordeón abierto

function render() {
  // Dispatcher entre los dos dashboards: "horas" (actual) y "trabajo" (nuevo).
  const badge = document.querySelector('.topbar-badge');
  if (window.dashboardMode === 'trabajo' && typeof renderAdminTrabajo === 'function') {
    if (badge) badge.textContent = 'Dashboard admin trabajo';
    renderAdminTrabajo();
  } else {
    if (badge) badge.textContent = 'Dashboard Admin';
    renderAdmin();
  }
}

function setAdminTab(t) {
  adminTab = t;
  renderAdmin();
}

const COMPANY_BADGE_PALETTE = [
  { bg: '#dceeff', fg: '#004c8f' },
  { bg: '#ddf5df', fg: '#1c6b2a' },
  { bg: '#fff0d7', fg: '#9b5b00' },
  { bg: '#f3e6f3', fg: '#6b1c6b' },
  { bg: '#e8f1ff', fg: '#1f4e8c' },
  { bg: '#ffe7d9', fg: '#a24b15' },
  { bg: '#e4f7f4', fg: '#116b63' },
  { bg: '#f1ecff', fg: '#5a3ca4' }
];

function getCompanyBadgeHtml(clientId) {
  const client = CLIENTS.find(c => c.id === clientId);
  if (!client) {
    return `<span class="company-badge company-badge--gray">Sin empresa</span>`;
  }

  const tone = COMPANY_BADGE_PALETTE[CLIENTS.findIndex(c => c.id === clientId) % COMPANY_BADGE_PALETTE.length];
  return `<span class="company-badge" style="background:${tone.bg};color:${tone.fg}">${escapeHtml(client.name)}</span>`;
}

function renderAdmin() {
  const open       = tickets.filter(t => t.status === 'open').length;
  const pending    = tickets.filter(t => t.status === 'pending').length;
  const closed     = tickets.filter(t => t.status === 'closed').length;
  const unassigned = tickets.filter(t => t.tech === 'Sin asignar').length;

  let tabContent = '';

  if (adminTab === 'tickets') {
    tabContent = `
      <div style="overflow-x:auto">
        <table class="tbl">
          <colgroup>
            <col style="width:80px">
            <col>
            <col style="width:90px">
            <col style="width:90px">
            <col style="width:160px">
            <col style="width:50px">
          </colgroup>
          <thead>
            <tr><th>ID</th><th>Asunto</th><th>Estado</th><th>Prioridad</th><th>Técnico</th><th>h</th></tr>
          </thead>
          <tbody>
            ${tickets.filter(t => !t.archived).map(t => {
              const unassigned = t.tech === 'Sin asignar';
              return `
              <tr${unassigned ? ' style="background:#fffbeb"' : ''}>
                <td style="color:var(--muted);font-size:12px">${t.id}</td>
                <td style="cursor:pointer;color:var(--primary-dark);font-weight:500" onclick="openDetail('${t.id}')">${escapeHtml(t.title)}</td>
                <td>
                  <div class="ticket-status-wrap">
                    ${sBadge(t.status)}
                    ${getCompanyBadgeHtml(t.client)}
                  </div>
                </td>
                <td>${pBadge(t.prio)}</td>
                <td>
                  <select class="tech-sel${unassigned ? ' tech-sel--unassigned' : ''}" onchange="assignTech('${t.id}', this.value)">
                    ${TECHS.map(tc => `<option${tc === t.tech ? ' selected' : ''}>${escapeHtml(tc)}</option>`).join('')}
                    <option value="__add__" style="color:#0C447C;font-weight:600;border-top:1px solid #ddd">＋ Agregar técnico</option>
                  </select>
                </td>
                <td>${t.hours}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

  } else if (adminTab === 'archivados') {
    tabContent = renderArchivadosTab();

  } else if (adminTab === 'reportes') {
    tabContent = renderReportesTab();

  } else if (adminTab === 'clients') {
    tabContent = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
        <button class="btn btn-secondary" onclick="openClientForm(null)">
          <i class="ti ti-building-plus"></i> Nueva empresa
        </button>
      </div>
      ${CLIENTS.map(cl => {
        const pct = Math.round(cl.used / cl.hours * 100);
        const c   = pct >= 90 ? '#E24B4A' : pct >= 70 ? '#EF9F27' : '#185FA5';
        const extraHours = getMonthlyExtraHours(cl.id);
        return `
          <div class="hora-bar" style="display:flex;align-items:center;gap:10px">
            <div class="hora-name" style="flex:0 0 140px">${escapeHtml(cl.name)}</div>
            <div class="hora-prog" style="flex:1"><div class="hora-fill" style="width:${pct}%; background:${c}"></div></div>
            <div class="hora-val" style="flex:0 0 160px">${cl.used}/${cl.hours}h (${pct}%)${extraHours > 0 ? ` <span class="company-extra">+${extraHours}h extras</span>` : ''}</div>
            <button class="btn btn-sm" onclick="openClientForm(${cl.id})" style="flex-shrink:0"><i class="ti ti-edit"></i></button>
          </div>
        `;
      }).join('')}
    `;

  } else if (adminTab === 'users') {
    const byClient = CLIENTS.map(cl => ({
      ...cl,
      members: users.filter(u => u.client === cl.id)
    }));

    tabContent = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
        <button class="btn btn-secondary" onclick="openUserForm(null)">
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
                          <button class="btn btn-sm" onclick="openUserForm(${u.id})"><i class="ti ti-edit"></i></button>
                          <button class="btn btn-sm" style="border-color:#E24B4A;color:#a42828" onclick="deleteUser(${u.id})"><i class="ti ti-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>`
          }
        </div>
      `).join('')}
    `;

  } else if (adminTab === 'empresas') {
    tabContent = renderEmpresasTab();

  } else if (adminTab === 'calendar') {
    const visibleEvents = calClientFilter === -2
      ? events
      : events.filter(ev => ev.client === calClientFilter || ev.client === -1);

    tabContent = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <select class="form-input" onchange="setCalFilter(this.value)" style="max-width:210px;width:auto">
          <option value="-2"${calClientFilter === -2 ? ' selected' : ''}>Todas las empresas</option>
          ${CLIENTS.map(cl => `<option value="${cl.id}"${calClientFilter === cl.id ? ' selected' : ''}>${escapeHtml(cl.name)}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="openEventForm(null, null)">
          <i class="ti ti-plus"></i> Nueva actividad
        </button>
      </div>
      ${renderCalendarGrid(visibleEvents, true)}
    `;

  } else {
    const techMap = {};
    TECHS.filter(t => t !== 'Sin asignar').forEach(name => {
      techMap[name] = { count: 0, hours: 0 };
    });
    tickets.forEach(t => {
      if (!techMap[t.tech]) techMap[t.tech] = { count: 0, hours: 0 };
      techMap[t.tech].count++;
      techMap[t.tech].hours += t.hours;
    });
    tabContent = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
        <button class="btn btn-secondary" onclick="openTechForm()">
          <i class="ti ti-user-plus"></i> Agregar técnico
        </button>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Técnico</th><th>Tickets asignados</th><th>Horas totales</th><th style="width:60px"></th></tr></thead>
          <tbody>
            ${Object.entries(techMap).map(([k, v]) => `
              <tr>
                <td>${k}</td>
                <td>${v.count}</td>
                <td>${v.hours}h</td>
                <td>
                  ${k !== 'Sin asignar' ? `
                    <button class="btn btn-sm" style="border-color:#E24B4A;color:#a42828"
                      onclick="removeTech('${k}', ${v.count})">
                      <i class="ti ti-trash"></i>
                    </button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  document.getElementById('main-area').innerHTML = `
    <div class="metrics">
      <div class="metric"><div class="metric-label">Abiertos</div><div class="metric-val">${open}</div></div>
      <div class="metric"><div class="metric-label">En proceso</div><div class="metric-val">${pending}</div></div>
      <div class="metric"><div class="metric-label">Cerrados</div><div class="metric-val">${closed}</div></div>
      <div class="metric">
        <div class="metric-label">Sin asignar <span class="metric-dot"></span></div>
        <div class="metric-val">${unassigned}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">Dashboard administrador</span>
        <button class="btn" onclick="askAI()">
          <i class="ti ti-sparkles"></i> Análisis IA
        </button>
      </div>

      <div class="tabs">
        <div class="tab${adminTab === 'tickets'  ? ' active' : ''}" onclick="setAdminTab('tickets')">Tickets</div>
        <div class="tab${adminTab === 'empresas' ? ' active' : ''}" onclick="setAdminTab('empresas')"><i class="ti ti-building" style="margin-right:4px"></i>Empresas</div>
        <div class="tab${adminTab === 'clients'  ? ' active' : ''}" onclick="setAdminTab('clients')">Horas</div>
        <div class="tab${adminTab === 'techs'    ? ' active' : ''}" onclick="setAdminTab('techs')">Técnicos</div>
        <div class="tab${adminTab === 'users'    ? ' active' : ''}" onclick="setAdminTab('users')"><i class="ti ti-users" style="margin-right:4px"></i>Usuarios</div>
        <div class="tab${adminTab === 'calendar' ? ' active' : ''}" onclick="setAdminTab('calendar')"><i class="ti ti-calendar" style="margin-right:4px"></i>Calendario</div>
        <div class="tab${adminTab === 'archivados' ? ' active' : ''}" onclick="setAdminTab('archivados')"><i class="ti ti-archive" style="margin-right:4px"></i>Archivados</div>
        <div class="tab${adminTab === 'reportes' ? ' active' : ''}" onclick="setAdminTab('reportes')"><i class="ti ti-file-text" style="margin-right:4px"></i>Reportes</div>
      </div>

      ${tabContent}
    </div>
  `;
}

// ── ACORDEÓN EMPRESAS ──────────────────────────────────────────────────────

function toggleEmpresa(id) {
  if (openCompanies.has(id)) {
    openCompanies.delete(id);
  } else {
    openCompanies.add(id);
  }
  renderAdmin();
}

function renderEmpresasTab() {
  // Botón para abrir el segundo dashboard, enfocado por trabajo (no por horas).
  const switchBtn = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-primary" onclick="goToWorkDashboard()">
        <i class="ti ti-briefcase"></i> Dashboard admin trabajo
      </button>
    </div>`;

  if (CLIENTS.length === 0) {
    return switchBtn + `<div style="padding:24px;text-align:center;color:var(--muted);font-size:14px">
      No hay empresas registradas. Crea una en la pestaña <strong>Horas</strong>.
    </div>`;
  }

  return switchBtn + CLIENTS.map(cl => {
    const clTickets  = tickets.filter(t => t.client === cl.id);
    const clUsers    = users.filter(u => u.client === cl.id);
    const openTk     = clTickets.filter(t => t.status === 'open').length;
    const pendingTk  = clTickets.filter(t => t.status === 'pending').length;
    const closedTk   = clTickets.filter(t => t.status === 'closed').length;
    const pct        = cl.hours > 0 ? Math.round(cl.used / cl.hours * 100) : 0;
    const barColor   = pct >= 90 ? '#E24B4A' : pct >= 70 ? '#EF9F27' : '#185FA5';
    const isOpen     = openCompanies.has(cl.id);

    const ticketsTable = clTickets.length === 0
      ? `<div style="font-size:13px;color:var(--muted);padding:8px 0">Sin tickets registrados para esta empresa.</div>`
      : `<div style="overflow-x:auto;margin-top:8px">
          <table class="tbl">
            <thead>
              <tr><th>ID</th><th>Asunto</th><th>Estado</th><th>Prioridad</th><th>Técnico</th><th>h</th></tr>
            </thead>
            <tbody>
              ${clTickets.map(t => `
                <tr>
                  <td style="color:var(--muted)">${t.id}</td>
                  <td style="cursor:pointer;color:var(--primary)" onclick="openDetail('${t.id}')">${escapeHtml(t.title)}</td>
                  <td>${sBadge(t.status)}</td>
                  <td>${pBadge(t.prio)}</td>
                  <td>
                    <select class="tech-sel" onchange="assignTech('${t.id}', this.value)">
                      ${TECHS.map(tc => `<option${tc === t.tech ? ' selected' : ''}>${escapeHtml(tc)}</option>`).join('')}
                    </select>
                  </td>
                  <td>${t.hours}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;

    const usersSection = clUsers.length === 0
      ? `<div style="font-size:13px;color:var(--muted)">Sin usuarios registrados.</div>`
      : clUsers.map(u => `
          <span style="display:inline-flex;align-items:center;gap:5px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;margin:3px">
            <i class="ti ti-user" style="font-size:12px;color:var(--muted)"></i> ${escapeHtml(u.name)}
            <span style="color:var(--muted);font-size:11px">(${escapeHtml(u.user)})</span>
          </span>`).join('');

    return `
      <div class="empresa-accordion${isOpen ? ' open' : ''}" id="emp-${cl.id}">
        <div class="empresa-header" onclick="toggleEmpresa(${cl.id})">
          <div class="empresa-header-left">
            <i class="ti ti-chevron-right empresa-chevron"></i>
            <span class="empresa-name">${escapeHtml(cl.name)}</span>
            <span class="empresa-chips">
              <span class="echip echip-open">${openTk} abiertos</span>
              <span class="echip echip-pending">${pendingTk} en proceso</span>
              <span class="echip echip-closed">${closedTk} cerrados</span>
            </span>
          </div>
          <div class="empresa-header-right">
            <span style="font-size:12px;color:var(--muted)">${cl.used}/${cl.hours}h</span>
            <div class="hora-prog" style="width:100px"><div class="hora-fill" style="width:${pct}%;background:${barColor}"></div></div>
            <button class="btn btn-sm" onclick="event.stopPropagation();openClientForm(${cl.id})">
              <i class="ti ti-edit"></i>
            </button>
          </div>
        </div>

        ${isOpen ? `
        <div class="empresa-body">
          <div class="empresa-section">
            <div class="empresa-section-title"><i class="ti ti-users"></i> Usuarios (${clUsers.length})</div>
            <div>${usersSection}</div>
          </div>
          <div class="empresa-section">
            <div class="empresa-section-title"><i class="ti ti-ticket"></i> Tickets (${clTickets.length})</div>
            ${ticketsTable}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ── ASIGNACIÓN ─────────────────────────────────────────────────────────────

function assignTech(id, tech) {
  if (tech === '__add__') {
    renderAdmin(); // resetea el select antes de abrir el modal
    openTechForm();
    return;
  }
  const t = tickets.find(t => t.id === id);
  if (!t) return;
  t.tech = tech;
  dbUpdateTicket(id, { tech });
  renderAdmin();
}

// ── DETALLE TICKET ─────────────────────────────────────────────────────────

function openDetail(id) {
  const t = tickets.find(tk => tk.id === id);
  if (!t) return;

  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${escapeHtml(t.id)} — ${escapeHtml(t.title)}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div class="detail-grid">
        <div><div class="form-label">Estado</div>${sBadge(t.status)}</div>
        <div><div class="form-label">Prioridad</div>${pBadge(t.prio)}</div>
        <div><div class="form-label">Técnico</div><span style="font-size:13px">${escapeHtml(t.tech)}</span></div>
        <div>
          <div class="form-label">Horas registradas</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <input id="detail-hours" type="number" min="0" step="0.5" value="${t.hours}"
              class="form-input" style="width:80px;padding:4px 8px;font-size:13px" />
            <button class="btn btn-sm btn-primary" onclick="saveHours('${t.id}')">
              <i class="ti ti-check"></i> Guardar
            </button>
          </div>
        </div>
      </div>

      ${t.desc ? `
        <div class="form-row">
          <div class="form-label">Descripción</div>
          <div style="font-size:13px; line-height:1.5">${escapeHtml(t.desc)}</div>
        </div>
      ` : ''}

      <div class="form-row">
        <div class="form-label">Cambiar estado</div>
        <div class="status-btns">
          <button class="btn btn-sm" onclick="changeStatus('${t.id}','open')">Abrir</button>
          <button class="btn btn-sm" onclick="changeStatus('${t.id}','pending')">En proceso</button>
          <button class="btn btn-sm btn-danger" onclick="closeModal();openCloseModal('${t.id}')">
            <i class="ti ti-check"></i> Cerrar ticket
          </button>
        </div>
      </div>

      <div class="form-row">
        <div class="form-label">Asignar técnico</div>
        <select class="form-input" onchange="assignTech('${t.id}', this.value); closeModal(); render()">
          ${TECHS.map(tc => `<option${tc === t.tech ? ' selected' : ''}>${escapeHtml(tc)}</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <div class="form-label">Análisis con IA</div>
        <button class="btn" onclick="analyzeTicket('${t.id}')">
          <i class="ti ti-sparkles"></i> Analizar ticket
        </button>
        <div class="ai-box" id="ai-result">
          Haz clic para obtener sugerencias de resolución.
        </div>
      </div>
    </div>
  `);
}

function saveHours(id) {
  const hours = Number(document.getElementById('detail-hours').value);
  if (isNaN(hours) || hours < 0) { alert('Ingresa un número de horas válido.'); return; }
  const t = tickets.find(tk => tk.id === id);
  if (!t) return;
  t.hours = hours;
  // Recalcular cl.used para la empresa
  const cl = CLIENTS.find(c => c.id === t.client);
  if (cl) cl.used = tickets.filter(tk => tk.client === cl.id).reduce((sum, tk) => sum + tk.hours, 0);
  dbUpdateTicket(id, { hours });
  closeModal();
  render();
}

function changeStatus(id, status) {
  const t = tickets.find(tk => tk.id === id);
  if (t) {
    t.status = status;
    dbUpdateTicket(id, { status });
    const cl = CLIENTS.find(c => c.id === t.client);
    notifyWhatsApp('status_change', t, cl?.name || '—', cl?.phone || null);
  }
  closeModal();
  render();
}

// ── CIERRE DE TICKET ───────────────────────────────────────────────────────

function openCloseModal(id) {
  const t  = tickets.find(tk => tk.id === id);
  if (!t) return;
  const cl = CLIENTS.find(c => c.id === t.client);
  const remaining = cl ? cl.hours - cl.used : null;

  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span><i class="ti ti-check" style="color:#22c55e;margin-right:6px"></i>Cerrar ticket</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13px">
        <div style="font-weight:700;margin-bottom:4px">${escapeHtml(t.id)} — ${escapeHtml(t.title)}</div>
        <div style="color:var(--muted)">${cl ? escapeHtml(cl.name) : '—'}</div>
      </div>

      <div class="form-row">
        <label class="form-label">Horas trabajadas para resolver este ticket</label>
        <div style="display:flex;align-items:center;gap:10px">
          <input class="form-input" id="close-hours" type="number" min="0" step="0.5"
            value="${t.hours || 0}" style="width:100px" />
          <span style="font-size:13px;color:var(--muted)">horas</span>
        </div>
        ${cl && remaining !== null ? `
          <div style="margin-top:8px;font-size:12px;color:var(--muted)">
            Horas disponibles de <strong>${escapeHtml(cl.name)}</strong>:
            <strong style="color:${remaining <= 2 ? '#E24B4A' : '#22c55e'}">${remaining.toFixed(1)}h restantes</strong>
            de ${cl.hours}h contratadas
          </div>
        ` : ''}
      </div>

      <div class="form-row">
        <label class="form-label">Nota de cierre (opcional)</label>
        <textarea class="form-input" id="close-note" rows="2"
          placeholder="Describe brevemente cómo se resolvió el problema..."></textarea>
      </div>

      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" style="background:#22c55e;border-color:#22c55e"
          onclick="confirmClose('${id}')">
          <i class="ti ti-check"></i> Confirmar cierre
        </button>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('close-hours')?.select(), 50);
}

async function confirmClose(id) {
  const hours = Number(document.getElementById('close-hours').value);
  if (isNaN(hours) || hours < 0) { alert('Ingresa un número de horas válido.'); return; }

  const t = tickets.find(tk => tk.id === id);
  if (!t) return;

  const prevHours = t.hours;
  t.hours  = hours;
  t.status = 'closed';

  // Recalcular horas usadas del cliente
  const cl = CLIENTS.find(c => c.id === t.client);
  if (cl) {
    cl.used = tickets.filter(tk => tk.client === cl.id).reduce((sum, tk) => sum + tk.hours, 0);
    // Actualizar gráfica mensual: restar horas anteriores del mes del ticket y sumar nuevas
    if (t.createdAt) {
      const m = new Date(t.createdAt).getMonth();
      if (m >= 0 && m <= 5) {
        cl.monthly[m] = Math.max(0, (cl.monthly[m] || 0) - prevHours + hours);
      }
    }
  }

  closeModal();
  render();
  await dbUpdateTicket(id, { status: 'closed', hours });
  const updatedClient = CLIENTS.find(c => c.id === t.client);
  notifyWhatsApp('status_change', { ...t, status: 'closed' }, updatedClient?.name || '—', updatedClient?.phone || null);
}

// ── IA ─────────────────────────────────────────────────────────────────────

async function analyzeTicket(id) {
  const t   = tickets.find(tk => tk.id === id);
  if (!t) return;

  const box = document.getElementById('ai-result');
  box.innerHTML = `<span class="spinner"></span>Analizando...`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: 'Eres un técnico de soporte IT experto. Responde siempre en español. Sé conciso (máximo 3 oraciones). Da pasos concretos de resolución.',
        messages: [{
          role: 'user',
          content: `Analiza este ticket de soporte IT y sugiere los pasos de resolución más probables:
Título: ${t.title}
Categoría: ${t.cat}
Prioridad: ${t.prio}
Descripción: ${t.desc || 'Sin descripción'}`
        }]
      })
    });

    const data = await response.json();
    // textContent (no innerHTML): la respuesta de la IA puede reflejar datos
    // escritos por el usuario; renderizarla como HTML sería un vector XSS.
    box.textContent = data.content?.[0]?.text || 'Sin respuesta de la IA.';

  } catch (err) {
    console.error(err);
    box.innerHTML = 'Error al conectar con la IA. Verifica tu conexión.';
  }
}

async function askAI() {
  const open       = tickets.filter(t => t.status === 'open').length;
  const critical   = tickets.filter(t => t.prio === 'critical').length;
  const unassigned = tickets.filter(t => t.tech === 'Sin asignar').length;

  const summary = `Tickets totales: ${tickets.length}. Abiertos: ${open}. Críticos: ${critical}. Sin asignar: ${unassigned}.`;
  alert(`Función askAI: en producción esto abriría un chat con Claude.\n\nResumen: ${summary}`);
}

// ── USUARIOS ───────────────────────────────────────────────────────────────

function openUserForm(userId) {
  const u = userId !== null ? users.find(u => u.id === userId) : null;

  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${u ? 'Editar usuario' : 'Nuevo usuario'}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div class="form-row">
        <label class="form-label">Nombre completo</label>
        <input class="form-input" id="u-name" value="${u ? escapeHtml(u.name) : ''}" placeholder="Ej: Juan Pérez" />
      </div>

      <div class="form-row">
        <label class="form-label">Usuario (para iniciar sesión)</label>
        <input class="form-input" id="u-user" value="${u ? escapeHtml(u.user) : ''}" placeholder="Ej: juan.publicarte" autocomplete="off" />
      </div>

      <div class="form-row">
        <label class="form-label">${u ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
        <div class="input-wrap">
          <input class="form-input" id="u-pass" type="password" placeholder="••••••••" autocomplete="new-password" />
          <button class="eye-btn" type="button" onclick="toggleUPwd()">
            <i class="ti ti-eye" id="u-eye"></i>
          </button>
        </div>
      </div>

      <div class="form-row">
        <label class="form-label">Empresa</label>
        <select class="form-input" id="u-client">
          ${CLIENTS.map(cl => `<option value="${cl.id}"${u && u.client === cl.id ? ' selected' : ''}>${escapeHtml(cl.name)}</option>`).join('')}
        </select>
      </div>

      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveUser(${userId})">
          <i class="ti ti-check"></i> ${u ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </div>
    </div>
  `);
}

function toggleUPwd() {
  const inp  = document.getElementById('u-pass');
  const icon = document.getElementById('u-eye');
  inp.type       = inp.type === 'password' ? 'text' : 'password';
  icon.className = inp.type === 'password' ? 'ti ti-eye' : 'ti ti-eye-off';
}

async function saveUser(userId) {
  const name   = document.getElementById('u-name').value.trim();
  const user   = document.getElementById('u-user').value.trim().toLowerCase();
  const pass   = document.getElementById('u-pass').value;
  const client = Number(document.getElementById('u-client').value);

  if (!name) { alert('Ingresa el nombre completo.'); return; }
  if (!user) { alert('Ingresa el nombre de usuario.'); return; }

  const duplicate = users.find(u => u.user === user && u.id !== userId);
  if (duplicate) { alert('Ese nombre de usuario ya está en uso.'); return; }

  let targetUser;
  if (userId !== null && userId !== undefined) {
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].name   = name;
      users[idx].user   = user;
      users[idx].client = client;
      if (pass) users[idx].pass = pass;
      targetUser = users[idx];
    }
  } else {
    if (!pass) { alert('Ingresa una contraseña.'); return; }
    targetUser = { id: nextUserId(), name, user, pass, client };
    users.push(targetUser);
  }

  closeModal();
  render();
  if (targetUser) await dbUpsertUser(targetUser);
}

async function deleteUser(id) {
  const target       = users.find(u => u.id === id);
  if (!target) return;
  const companyUsers = users.filter(u => u.client === target.client);
  if (companyUsers.length <= 1) {
    alert('No puedes eliminar el único usuario de esta empresa.');
    return;
  }
  if (!confirm(`¿Eliminar al usuario "${target.name}"?`)) return;
  users = users.filter(u => u.id !== id);
  render();
  await dbDeleteUser(id);
}

// ── CALENDARIO ─────────────────────────────────────────────────────────────

function setCalFilter(val) {
  calClientFilter = Number(val);
  render();
}

function calDayClick(d) {
  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  openEventForm(dateStr, null);
}

function openEventDetail(id) {
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  const et          = EVENT_TYPES[ev.type] || EVENT_TYPES.otro;
  const clientObj   = CLIENTS.find(c => c.id === ev.client);
  const clientName  = ev.client === -1 ? 'Todas las empresas' : (clientObj ? clientObj.name : '—');

  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${escapeHtml(ev.title)}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>
      <div style="margin-bottom:14px">
        <span class="badge" style="background:${et.bg};color:${et.color}">${et.label}</span>
      </div>
      <div class="detail-grid">
        <div><div class="form-label">Fecha</div><span style="font-size:13px">${formatDate(ev.date)}</span></div>
        <div><div class="form-label">Hora</div><span style="font-size:13px">${ev.time}</span></div>
        <div><div class="form-label">Empresa</div><span style="font-size:13px">${clientName}</span></div>
        <div><div class="form-label">Técnico</div><span style="font-size:13px">${escapeHtml(ev.tech)}</span></div>
      </div>
      ${ev.desc ? `<div class="form-row"><div class="form-label">Descripción</div><div style="font-size:13px;line-height:1.5">${escapeHtml(ev.desc)}</div></div>` : ''}
      <div class="modal-actions">
        <button class="btn" style="border-color:#E24B4A;color:#a42828;margin-right:auto" onclick="deleteEvent('${ev.id}')">
          <i class="ti ti-trash"></i> Eliminar
        </button>
        <button class="btn" onclick="openEventForm(null,'${ev.id}')"><i class="ti ti-edit"></i> Editar</button>
        <button class="btn" onclick="closeModal()">Cerrar</button>
      </div>
    </div>
  `);
}

function openEventForm(date, eventId) {
  const ev      = eventId ? events.find(e => e.id === eventId) : null;
  const dateVal = date || (ev ? ev.date : '');

  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${ev ? 'Editar actividad' : 'Nueva actividad'}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div class="form-row">
        <label class="form-label">Título</label>
        <input class="form-input" id="ev-title" value="${ev ? escapeHtml(ev.title) : ''}" placeholder="Nombre de la actividad" />
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-row">
          <label class="form-label">Fecha</label>
          <input class="form-input" id="ev-date" type="date" value="${dateVal}" />
        </div>
        <div class="form-row">
          <label class="form-label">Hora</label>
          <input class="form-input" id="ev-time" type="time" value="${ev ? ev.time : '09:00'}" />
        </div>
      </div>

      <div class="form-row">
        <label class="form-label">Tipo de actividad</label>
        <select class="form-input" id="ev-type">
          ${Object.entries(EVENT_TYPES).map(([k, v]) =>
            `<option value="${k}"${ev && ev.type === k ? ' selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">Empresa</label>
        <select class="form-input" id="ev-client">
          <option value="-1"${ev && ev.client === -1 ? ' selected' : ''}>Todas las empresas</option>
          ${CLIENTS.map(cl =>
            `<option value="${cl.id}"${ev && ev.client === cl.id ? ' selected' : ''}>${escapeHtml(cl.name)}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">Técnico</label>
        <select class="form-input" id="ev-tech">
          ${TECHS.map(tc => `<option${ev && ev.tech === tc ? ' selected' : ''}>${escapeHtml(tc)}</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">Descripción</label>
        <textarea class="form-input" id="ev-desc" rows="2" placeholder="Detalle opcional de la actividad">${ev ? escapeHtml(ev.desc) : ''}</textarea>
      </div>

      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveEvent('${eventId || ''}')">
          <i class="ti ti-check"></i> ${ev ? 'Guardar cambios' : 'Crear actividad'}
        </button>
      </div>
    </div>
  `);
}

async function saveEvent(eventId) {
  const title = document.getElementById('ev-title').value.trim();
  const date  = document.getElementById('ev-date').value;
  if (!title) { alert('Ingresa un título para la actividad.'); return; }
  if (!date)  { alert('Selecciona una fecha.'); return; }

  const data = {
    title,
    date,
    time:   document.getElementById('ev-time').value,
    type:   document.getElementById('ev-type').value,
    client: Number(document.getElementById('ev-client').value),
    tech:   document.getElementById('ev-tech').value,
    desc:   document.getElementById('ev-desc').value.trim()
  };

  let targetEv;
  if (eventId) {
    targetEv = { id: eventId, ...data };
    const idx = events.findIndex(e => e.id === eventId);
    if (idx !== -1) events[idx] = targetEv;
  } else {
    targetEv = { id: nextEventId(), ...data };
    events.unshift(targetEv);
  }

  closeModal();
  const [y, m] = date.split('-');
  calYear  = Number(y);
  calMonth = Number(m) - 1;
  adminTab = 'calendar';
  render();
  await dbUpsertEvent(targetEv);
}

async function deleteEvent(id) {
  if (!confirm('¿Eliminar esta actividad del calendario?')) return;
  events = events.filter(e => e.id !== id);
  closeModal();
  render();
  await dbDeleteEvent(id);
}

// ── TÉCNICOS ───────────────────────────────────────────────────────────────

function openTechForm() {
  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>Agregar técnico</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="form-row">
        <label class="form-label">Nombre completo</label>
        <input class="form-input" id="tech-name" placeholder="Ej: Marco Vargas"
               onkeydown="if(event.key==='Enter') saveTech()" />
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveTech()">
          <i class="ti ti-check"></i> Agregar
        </button>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('tech-name')?.focus(), 50);
}

async function saveTech() {
  const name = document.getElementById('tech-name').value.trim();
  if (!name) { alert('Ingresa el nombre del técnico.'); return; }
  if (TECHS.includes(name)) { alert('Ya existe un técnico con ese nombre.'); return; }
  TECHS = [...TECHS.filter(t => t !== 'Sin asignar'), name, 'Sin asignar'];
  closeModal();
  render();
  await dbInsertTech(name);
}

async function removeTech(name, ticketCount) {
  if (ticketCount > 0) {
    if (!confirm(`"${name}" tiene ${ticketCount} ticket(s) asignado(s). Los tickets quedarán sin asignar. ¿Continuar?`)) return;
    // Reasignar tickets a "Sin asignar"
    const affected = tickets.filter(t => t.tech === name);
    for (const t of affected) {
      t.tech = 'Sin asignar';
      dbUpdateTicket(t.id, { tech: 'Sin asignar' });
    }
  } else {
    if (!confirm(`¿Eliminar al técnico "${name}"?`)) return;
  }
  TECHS = TECHS.filter(t => t !== name);
  render();
  await dbDeleteTech(name);
}

// ── EMPRESAS ───────────────────────────────────────────────────────────────

function openClientForm(clientId) {
  const cl = clientId !== null ? CLIENTS.find(c => c.id === clientId) : null;

  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${cl ? 'Editar empresa' : 'Nueva empresa'}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div class="form-row">
        <label class="form-label">Nombre de la empresa</label>
        <input class="form-input" id="cl-name" value="${cl ? escapeHtml(cl.name) : ''}" placeholder="Ej: NovaGro" />
      </div>

      <div class="form-row">
        <label class="form-label">Horas de soporte contratadas</label>
        <input class="form-input" id="cl-hours" type="number" min="1" value="${cl ? cl.hours : 10}" placeholder="Ej: 10" />
      </div>

      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveClient(${clientId !== null ? clientId : 'null'})">
          <i class="ti ti-check"></i> ${cl ? 'Guardar cambios' : 'Crear empresa'}
        </button>
      </div>
    </div>
  `);
}

async function saveClient(clientId) {
  const name  = document.getElementById('cl-name').value.trim();
  const hours = Number(document.getElementById('cl-hours').value);

  if (!name)        { alert('Ingresa el nombre de la empresa.'); return; }
  if (!hours || hours < 1) { alert('Ingresa las horas contratadas.'); return; }

  const duplicate = CLIENTS.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== clientId);
  if (duplicate) { alert('Ya existe una empresa con ese nombre.'); return; }

  let targetClient;
  if (clientId !== null && clientId !== undefined) {
    const idx = CLIENTS.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      CLIENTS[idx].name  = name;
      CLIENTS[idx].hours = hours;
      targetClient = CLIENTS[idx];
    }
  } else {
    targetClient = { id: nextClientId(), name, hours, monthly: [0, 0, 0, 0, 0, 0], used: 0 };
    CLIENTS.push(targetClient);
  }

  closeModal();
  render();
  if (targetClient) await dbUpsertClient(targetClient);
}

// ── INIT ───────────────────────────────────────────────────────────────────

async function init() {
  showLoading();
  await loadData();
  if (typeof dbLoadWorkData === 'function') await dbLoadWorkData();
  render();
}
init();
