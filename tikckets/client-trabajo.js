// ── PORTAL CLIENTE — POR TRABAJO ───────────────────────────────────────────
// Versión del portal cliente enfocada por TRABAJO (no por horas).
// Usa los datos de work-data.js (empresas/trabajos/órdenes nuevas).
// Diseño basado en las tarjetas: "Mis trabajos", "Trabajos por mes",
// "Trabajo realizado por tipo" (con descarga PDF) e "Historial mensual"
// con PDF por trabajo, más el calendario de trabajos realizados.
//
// PASO 2 — Maqueta con datos en memoria. Supabase se conecta en el PASO 3.
// ───────────────────────────────────────────────────────────────────────────

function clientWorkId() {
  const auth = getAuth();
  return auth ? auth.clientId : 0;
}

function render() {
  const auth = getAuth();
  const cl   = WORK_CLIENTS.find(c => c.id === clientWorkId());
  const nameEl = document.getElementById('topbar-client-name');
  if (nameEl) nameEl.textContent = auth && auth.userName ? `${auth.userName} — ${cl ? cl.name : ''}` : (cl ? cl.name : '');
  renderClientTrabajo();
}

function renderClientTrabajo() {
  const ci = clientWorkId();
  const cl = WORK_CLIENTS.find(c => c.id === ci);
  if (!cl) {
    document.getElementById('main-area').innerHTML =
      `<div class="card"><div style="padding:24px;text-align:center;color:var(--muted)">No se encontró la empresa asociada a tu usuario.</div></div>`;
    return;
  }

  const myWorks   = WORKS.filter(w => w.clientId === ci);
  const myTickets = WORK_TICKETS.filter(t => t.clientId === ci);
  const myOrders  = WORK_ORDERS.filter(o => o.clientId === ci);

  const activos     = myWorks.filter(w => w.status === 'activo').length;
  const completados = myWorks.filter(w => w.status === 'completado').length;
  const openTk      = myTickets.filter(t => t.status === 'open').length;
  const pendingTk   = myTickets.filter(t => t.status === 'pending').length;
  const closedTk    = myTickets.filter(t => t.status === 'closed').length;
  const ordersMonth = myOrders.filter(o => o.fecha && isSameMonth(o.fecha)).length;

  document.getElementById('main-area').innerHTML = `
    <div class="metrics">
      <div class="metric"><div class="metric-label">Trabajos activos</div><div class="metric-val">${activos}</div></div>
      <div class="metric"><div class="metric-label">Trabajos completados</div><div class="metric-val" style="color:#185FA5">${completados}</div></div>
      <div class="metric"><div class="metric-label">Tickets abiertos</div><div class="metric-val">${openTk}</div></div>
      <div class="metric"><div class="metric-label">Trabajos realizados</div><div class="metric-val">${myOrders.length}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Este mes: ${ordersMonth}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">Mis trabajos</span>
        <button class="btn btn-secondary" onclick="openNewWorkTicket()">
          <i class="ti ti-plus"></i> Nuevo ticket
        </button>
      </div>
      <div class="tabs">
        <div class="tab active" onclick="filterWorkTab(this,'all')">Todos (${myTickets.length})</div>
        <div class="tab" onclick="filterWorkTab(this,'open')">Abiertos (${openTk})</div>
        <div class="tab" onclick="filterWorkTab(this,'pending')">En proceso (${pendingTk})</div>
        <div class="tab" onclick="filterWorkTab(this,'closed')">Cerrados (${closedTk})</div>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl" id="cw-tbl">
          <colgroup><col style="width:80px"><col><col style="width:200px"><col style="width:95px"><col style="width:130px"></colgroup>
          <thead><tr><th>ID</th><th>Asunto</th><th>Trabajo</th><th>Estado</th><th>Técnico</th></tr></thead>
          <tbody>
            ${myTickets.length === 0
              ? `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:16px">Sin trabajos registrados.</td></tr>`
              : myTickets.map(t => `
                <tr data-status="${t.status}">
                  <td style="color:var(--muted)">${t.id}</td>
                  <td>${escapeHtml(t.title)}</td>
                  <td><span class="company-badge" style="background:#eef2f6;color:#475467">${escapeHtml(workName(t.workId))}</span>${t.cat ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">${escapeHtml(t.cat)}</div>` : ''}</td>
                  <td>${sBadge(t.status)}</td>
                  <td>${escapeHtml(t.tech)}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${renderWorkMonthlyChart(myOrders)}

    ${renderOrdersByType(myOrders)}

    ${renderOrdersHistory(myOrders)}

    ${renderClientWorkCalendar(myOrders, ci)}
  `;
}

function filterWorkTab(el, f) {
  document.querySelectorAll('.card .tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#cw-tbl tbody tr').forEach(row => {
    if (!row.dataset.status) return;
    row.style.display = (f === 'all' || row.dataset.status === f) ? '' : 'none';
  });
}

// ── NUEVO TICKET POR TRABAJO (cliente) ─────────────────────────────────────

function openNewWorkTicket() {
  const ci = clientWorkId();
  const myWorks = WORKS.filter(w => w.clientId === ci);
  if (myWorks.length === 0) {
    alert('Tu empresa aún no tiene trabajos/proyectos registrados. Pide al administrador que cree uno para poder asociar el ticket.');
    return;
  }

  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>Nuevo ticket por trabajo</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div class="form-row">
        <label class="form-label">Asunto</label>
        <input class="form-input" id="cwt-title" placeholder="Describe el problema o solicitud brevemente" />
      </div>

      <div class="form-row">
        <label class="form-label">Trabajo (proyecto)</label>
        <select class="form-input" id="cwt-work">
          ${myWorks.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">Categoría</label>
        <select class="form-input" id="cwt-cat">
          ${WORK_TICKET_CATS.map(c => `<option>${c}</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">Prioridad</label>
        <select class="form-input" id="cwt-prio">
          <option value="low">Baja</option>
          <option value="medium" selected>Media</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">Descripción</label>
        <textarea class="form-input" id="cwt-desc" rows="3" placeholder="Describe el problema con detalle"></textarea>
      </div>

      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitWorkTicket()">
          <i class="ti ti-send"></i> Enviar ticket
        </button>
      </div>
    </div>
  `);
}

function submitWorkTicket() {
  const title = document.getElementById('cwt-title').value.trim();
  if (!title) { alert('Ingresa un asunto para el ticket.'); return; }

  const workId = Number(document.getElementById('cwt-work').value);
  const w = WORKS.find(x => x.id === workId);

  const ticket = {
    id:        nextWorkTicketId(),
    title,
    workId,
    clientId:  w ? w.clientId : clientWorkId(),
    status:    'open',
    prio:      document.getElementById('cwt-prio').value,
    tech:      'Sin asignar',
    cat:       document.getElementById('cwt-cat').value,
    desc:      document.getElementById('cwt-desc').value.trim(),
    createdAt: new Date().toISOString().slice(0, 10)
  };

  WORK_TICKETS.unshift(ticket);
  closeModal();
  render();
  if (typeof dbUpsertWorkTicket === 'function') dbUpsertWorkTicket(ticket);
  _sendWorkTicketEmail(ticket);
}

// Misma notificación por correo que el portal por horas (EmailJS).
function _sendWorkTicketEmail(t) {
  if (typeof emailjs === 'undefined') return;
  const auth    = getAuth();
  const empresa = workClientName(t.clientId);
  const prioMap = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };

  emailjs.send('service_11zanls', 'template_pp6rjvy', {
    ticket_id:      t.id,
    ticket_titulo:  t.title,
    usuario_nombre: auth && auth.userName ? auth.userName : 'Usuario',
    empresa:        empresa,
    prioridad:      prioMap[t.prio] || t.prio,
    descripcion:    `[Trabajo: ${workName(t.workId)}] ${t.desc || 'Sin descripción'}`
  }).catch(err => console.error('EmailJS error:', err));
}

// ── TRABAJOS POR MES (antes "Horas por mes") ───────────────────────────────

function renderWorkMonthlyChart(orders) {
  const counts = [0, 0, 0, 0, 0, 0];
  orders.forEach(o => {
    if (!o.fecha) return;
    const m = new Date(o.fecha + 'T00:00:00').getMonth();
    if (m >= 0 && m <= 5) counts[m]++;
  });
  const max  = Math.max(...counts, 1);
  const year = new Date().getFullYear();
  const total = counts.reduce((a, b) => a + b, 0);
  const avg   = (total / counts.length).toFixed(1);

  const bars = counts.map((n, i) => {
    const pct   = Math.round((n / max) * 100);
    const color = n >= max * 0.9 ? '#185FA5' : n >= max * 0.5 ? '#2c7fc9' : '#7aa9d6';
    return `
      <div class="month-col">
        <div class="month-val" style="color:${color}">${n}</div>
        <div class="month-bar-wrap"><div class="month-bar" style="height:${pct}%; background:${color}"></div></div>
        <div class="month-name">${MONTHS[i]}</div>
      </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-head">
        <span class="card-title"><i class="ti ti-chart-bar"></i> Trabajos por mes</span>
        <span style="font-size:12px;color:var(--muted)">Ene – Jun ${year} &nbsp;·&nbsp; Promedio: <strong>${avg}</strong></span>
      </div>
      <div class="monthly-chart">${bars}</div>
    </div>`;
}

// ── TRABAJO REALIZADO POR TIPO (con descarga PDF) ──────────────────────────

function renderOrdersByType(orders) {
  const year = new Date().getFullYear();
  const catTotals  = {};
  const catByMonth = Array.from({ length: 6 }, () => ({}));

  orders.forEach(o => {
    if (!o.fecha) return;
    const m = new Date(o.fecha + 'T00:00:00').getMonth();
    if (m < 0 || m > 5) return;
    const cat = o.categoria || 'Otro';
    catTotals[cat] = (catTotals[cat] || 0) + 1;
    catByMonth[m][cat] = (catByMonth[m][cat] || 0) + 1;
  });

  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const grandTotal = sorted.reduce((s, [, n]) => s + n, 0);

  const rows = sorted.map(([cat, total]) => {
    const color = ORDER_CAT_COLORS[cat] || '#667085';
    const catPct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
    const monthly = MONTHS.map((m, i) => {
      const n = catByMonth[i][cat] || 0;
      return `<td style="text-align:center;font-size:12px;color:${n > 0 ? color : 'var(--muted)'}">${n > 0 ? n : '—'}</td>`;
    }).join('');
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>${cat}
        </div></td>
        ${monthly}
        <td style="text-align:right;font-weight:700;font-size:13px">${total}</td>
        <td style="text-align:right;font-size:12px;color:var(--muted)">${catPct}%</td>
      </tr>`;
  }).join('');

  const body = sorted.length === 0
    ? `<div style="padding:16px;text-align:center;color:var(--muted);font-size:13px">Aún no hay trabajos realizados registrados.</div>`
    : `<div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Categoría</th>${MONTHS.map(m => `<th style="text-align:center">${m}</th>`).join('')}<th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

  return `
    <div class="card">
      <div class="card-head">
        <span class="card-title"><i class="ti ti-list-details"></i> Trabajo realizado por tipo</span>
        <button class="btn btn-secondary" onclick="downloadMonthlyReportPDF()" ${sorted.length === 0 ? 'disabled' : ''}>
          <i class="ti ti-file-type-pdf"></i> Descargar PDF
        </button>
      </div>
      ${body}
    </div>`;
}

// ── HISTORIAL DE TRABAJOS REALIZADOS (por mes, con PDF) ─────────────────────

function renderOrdersHistory(orders) {
  if (orders.length === 0) {
    return `
      <div class="card">
        <div class="card-head"><span class="card-title"><i class="ti ti-history"></i> Historial de trabajos realizados</span></div>
        <div style="padding:16px;text-align:center;color:var(--muted);font-size:13px">Sin trabajos realizados todavía.</div>
      </div>`;
  }

  // Agrupar por "Mes Año"
  const groups = {};
  orders.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).forEach(o => {
    const d = o.fecha ? new Date(o.fecha + 'T00:00:00') : null;
    const key = d ? `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` : 'Sin fecha';
    (groups[key] = groups[key] || []).push(o);
  });

  const blocks = Object.entries(groups).map(([month, list]) => `
    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:bold;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">${month} · ${list.length} trabajo(s)</div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Título</th><th style="width:170px">Tipo</th><th style="width:90px">Fecha</th><th style="width:120px">Factura</th><th style="width:170px"></th></tr></thead>
          <tbody>
            ${list.map(o => `
              <tr>
                <td style="font-weight:500">${o.titulo}</td>
                <td>${orderTypeBadge(o.tipo)}</td>
                <td style="font-size:12px">${o.fecha ? formatDate(o.fecha) : '—'}</td>
                <td style="font-size:12px;color:var(--muted)">${o.factura || '—'}</td>
                <td>
                  <div style="display:flex;gap:6px;justify-content:flex-end">
                    <button class="btn btn-sm" onclick="openOrderDetail('${o.id}')"><i class="ti ti-eye"></i> Ver</button>
                    <button class="btn btn-sm btn-primary" onclick="downloadOrderPDF('${o.id}')"><i class="ti ti-download"></i> PDF</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`).join('');

  return `
    <div class="card">
      <div class="card-head"><span class="card-title"><i class="ti ti-history"></i> Historial de trabajos realizados</span></div>
      ${blocks}
    </div>`;
}

function _row(label, value) {
  if (!value) return '';
  value = escapeHtml(value);
  return `<div class="form-row"><div class="form-label">${label}</div><div style="font-size:13px;line-height:1.5">${value}</div></div>`;
}

function openOrderDetail(id) {
  const o = WORK_ORDERS.find(x => x.id === id);
  if (!o) return;
  const isMant = o.tipo === 'mantenimiento';

  openModal(`
    <div class="modal modal-lg" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>${escapeHtml(o.titulo)}</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        ${orderTypeBadge(o.tipo)}
        <span class="badge" style="background:#eef2f6;color:#475467">${escapeHtml(o.categoria || 'Otro')}</span>
        ${o.fecha ? `<span class="badge" style="background:#ddf5df;color:#1c6b2a">${formatDate(o.fecha)}</span>` : ''}
      </div>

      <div class="detail-grid">
        <div><div class="form-label">Empresa</div><span style="font-size:13px">${escapeHtml(workClientName(o.clientId))}</span></div>
        <div><div class="form-label">Trabajo / proyecto</div><span style="font-size:13px">${o.workId ? escapeHtml(workName(o.workId)) : '—'}</span></div>
        <div><div class="form-label">Técnico</div><span style="font-size:13px">${escapeHtml(o.tecnico || '—')}</span></div>
        <div><div class="form-label">N° de factura</div><span style="font-size:13px">${escapeHtml(o.factura || '—')}</span></div>
      </div>

      ${_row('Requerimientos', o.requerimientos)}
      ${_row('Problema reportado / trabajo a realizar', o.problema)}

      ${isMant ? `
        <div style="border:1px dashed var(--border);border-radius:8px;padding:12px;margin-bottom:14px">
          <div style="font-size:11px;font-weight:bold;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px"><i class="ti ti-device-desktop"></i> Datos del equipo</div>
          <div class="detail-grid">
            <div><div class="form-label">Modelo</div><span style="font-size:13px">${escapeHtml(o.modelo || '—')}</span></div>
            <div><div class="form-label">N° de serie</div><span style="font-size:13px">${escapeHtml(o.serie || '—')}</span></div>
            <div><div class="form-label">Fecha de entrada</div><span style="font-size:13px">${o.fechaEntrada ? formatDate(o.fechaEntrada) : '—'}</span></div>
            <div><div class="form-label">Fecha de salida</div><span style="font-size:13px">${o.fechaSalida ? formatDate(o.fechaSalida) : '—'}</span></div>
          </div>
          ${_row('Cómo ingresa el producto', o.ingreso)}
          ${_row('Detalle / estado del equipo', o.estadoEquipo)}
        </div>` : ''}

      ${_row('Trabajo realizado', o.trabajoRealizado)}
      ${_row('Observaciones', o.observaciones)}
      ${_row('Recomendaciones', o.recomendaciones)}

      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cerrar</button>
        <button class="btn btn-primary" onclick="downloadOrderPDF('${o.id}')">
          <i class="ti ti-download"></i> Descargar PDF
        </button>
      </div>
    </div>
  `);
}

// ── CALENDARIO DE TRABAJOS REALIZADOS ──────────────────────────────────────

function renderClientWorkCalendar(orders, ci) {
  // Combina trabajos realizados (por su fecha) y visitas programadas.
  const realizados = orders
    .filter(o => o.fecha)
    .map(o => ({ id: o.id, title: o.titulo, date: o.fecha, kind: 'order' }));
  const visitas = WORK_EVENTS
    .filter(ev => ev.clientId === ci)
    .map(ev => ({ id: ev.id, title: ev.title, date: ev.date, kind: 'event', type: ev.type }));

  return `
    <div class="card">
      <div class="card-head">
        <span class="card-title"><i class="ti ti-calendar"></i> Cronograma de trabajos</span>
        <span style="font-size:12px;color:var(--muted)">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#ddf5df;border:1px solid #1c6b2a;vertical-align:-1px"></span> Realizado &nbsp;
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#dceeff;border:1px solid #185FA5;vertical-align:-1px"></span> Programado
        </span>
      </div>
      ${renderClientWorkCalendarGrid(realizados.concat(visitas))}
    </div>`;
}

function renderClientWorkCalendarGrid(items) {
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today       = new Date();

  const byDay = {};
  items.forEach(it => {
    const d = new Date(it.date + 'T00:00:00');
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const day = d.getDate();
      (byDay[day] = byDay[day] || []).push(it);
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
      const evs = byDay[d] || [];
      const chips = evs.slice(0, 2).map(it => {
        const isOrder = it.kind === 'order';
        const bg = isOrder ? '#ddf5df' : '#dceeff';
        const fg = isOrder ? '#1c6b2a' : '#185FA5';
        const onclick = isOrder ? `openOrderDetail('${it.id}')` : '';
        return `<div class="cal-chip" style="background:${bg};color:${fg}" ${onclick ? `onclick="event.stopPropagation();${onclick}"` : ''} title="${escapeHtml(it.title)}">${escapeHtml(it.title)}</div>`;
      }).join('');
      const more = evs.length > 2 ? `<div class="cal-more">+${evs.length - 2} más</div>` : '';
      return `<td class="cal-cell${isToday ? ' cal-today' : ''}"><div class="cal-day-num${isToday ? ' cal-today-num' : ''}">${d}</div>${chips}${more}</td>`;
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
    </div>`;
}

// ── GENERACIÓN DE PDF (jsPDF) ──────────────────────────────────────────────
// _ensureJsPDF y pdfBrandHeader (con el logo SIRT) viven en logo-data.js.

function downloadOrderPDF(id) {
  const o = WORK_ORDERS.find(x => x.id === id);
  if (!o) return;
  const JsPDF = _ensureJsPDF();
  if (!JsPDF) return;

  const doc = new JsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  pdfEnableWatermark(doc);
  let y = pdfBrandHeader(doc, 'Orden de trabajo');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(o.titulo || 'Trabajo', margin, y); y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120, 120, 120);
  doc.text(o.id, margin, y); y += 18;
  doc.setTextColor(20, 20, 20);

  // Datos generales (tabla simple en dos columnas)
  const meta = [
    ['Empresa', workClientName(o.clientId)],
    ['Trabajo / proyecto', o.workId ? workName(o.workId) : '—'],
    ['Tipo', (ORDER_TYPES[o.tipo] || {}).label || o.tipo],
    ['Categoría', o.categoria || '—'],
    ['Fecha de realización', o.fecha ? formatDate(o.fecha) : '—'],
    ['Técnico', o.tecnico || '—'],
    ['N° de factura', o.factura || '—']
  ];
  if (o.tipo === 'mantenimiento') {
    meta.push(['Modelo', o.modelo || '—']);
    meta.push(['N° de serie', o.serie || '—']);
    meta.push(['Fecha de entrada', o.fechaEntrada ? formatDate(o.fechaEntrada) : '—']);
    meta.push(['Fecha de salida', o.fechaSalida ? formatDate(o.fechaSalida) : '—']);
    meta.push(['Cómo ingresa', o.ingreso || '—']);
  }

  doc.setFontSize(10);
  meta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(90, 90, 90);
    doc.text(`${k}:`, margin, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(String(v), pageW - margin - 170);
    doc.text(lines, margin + 130, y);
    y += Math.max(16, lines.length * 14);
  });

  y += 6;
  const sections = [
    ['Requerimientos', o.requerimientos],
    ['Problema reportado / trabajo a realizar', o.problema],
    ['Detalle / estado del equipo', o.estadoEquipo],
    ['Trabajo realizado', o.trabajoRealizado],
    ['Observaciones', o.observaciones],
    ['Recomendaciones', o.recomendaciones]
  ].filter(([, v]) => v);

  sections.forEach(([title, text]) => {
    if (y > doc.internal.pageSize.getHeight() - 90) { doc.addPage(); y = margin; }
    doc.setDrawColor(225, 225, 225); doc.line(margin, y, pageW - margin, y); y += 16;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 68, 124); doc.setFontSize(11);
    doc.text(title, margin, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); doc.setFontSize(10);
    const lines = doc.splitTextToSize(String(text), pageW - margin * 2);
    doc.text(lines, margin, y); y += lines.length * 14 + 8;
  });

  // Pie
  const fy = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(225, 225, 225); doc.line(margin, fy - 10, pageW - margin, fy - 10);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 140, 140); doc.setFontSize(9);
  doc.text(`Generado el ${formatDate(new Date().toISOString().slice(0, 10))} · SoporteIT`, margin, fy);

  doc.save(`Orden_${o.id}.pdf`);
}

function downloadMonthlyReportPDF() {
  const ci = clientWorkId();
  const cl = WORK_CLIENTS.find(c => c.id === ci);
  const orders = WORK_ORDERS.filter(o => o.clientId === ci);
  if (orders.length === 0) return;
  const JsPDF = _ensureJsPDF();
  if (!JsPDF) return;

  const doc = new JsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  pdfEnableWatermark(doc);
  let y = pdfBrandHeader(doc, 'Reporte de trabajos realizados');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(cl ? cl.name : 'Empresa', margin, y); y += 24;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 90, 90);
  doc.text(`Total de trabajos: ${orders.length}`, margin, y); y += 20;

  orders.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).forEach(o => {
    if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.setFontSize(11);
    doc.text(`${o.fecha ? formatDate(o.fecha) : '—'}  ·  ${o.titulo}`, margin, y); y += 15;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 90, 90); doc.setFontSize(9);
    doc.text(`${(ORDER_TYPES[o.tipo] || {}).label || o.tipo} · Factura: ${o.factura || '—'} · Técnico: ${o.tecnico || '—'}`, margin, y); y += 14;
    if (o.trabajoRealizado) {
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(o.trabajoRealizado, pageW - margin * 2);
      doc.text(lines, margin, y); y += lines.length * 12 + 10;
    } else { y += 6; }
  });

  doc.save(`Reporte_trabajos_${(cl ? cl.name : 'empresa').replace(/\s+/g, '_')}.pdf`);
}

// ── INIT ───────────────────────────────────────────────────────────────────

async function initClientTrabajo() {
  if (typeof showLoading === 'function') showLoading();
  if (typeof dbLoadWorkData === 'function') await dbLoadWorkData();
  render();
}
initClientTrabajo();
