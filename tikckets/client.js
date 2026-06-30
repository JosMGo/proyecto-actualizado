// ── PORTAL CLIENTE ─────────────────────────────────────────────────────────

function clientIdx() {
  const auth = getAuth();
  return auth ? auth.clientId : 0;
}

function render() {
  const auth   = getAuth();
  const cl     = CLIENTS[clientIdx()];
  const nameEl = document.getElementById('topbar-client-name');
  if (nameEl) nameEl.textContent = auth && auth.userName ? `${auth.userName} — ${cl.name}` : cl.name;
  renderClient();
}

function renderClient() {
  const ci  = clientIdx();
  const cl  = CLIENTS[ci];
  const my  = tickets.filter(t => t.client === ci);
  const monthUsed = getCurrentMonthTicketHours(ci);
  const extraHours = getMonthlyExtraHours(ci);
  const pct = Math.round(cl.used / cl.hours * 100);
  const barColor = pct >= 90 ? '#E24B4A' : pct >= 70 ? '#EF9F27' : '#185FA5';

  const open    = my.filter(t => t.status === 'open').length;
  const closed  = my.filter(t => t.status === 'closed').length;
  const pending = my.filter(t => t.status === 'pending').length;

  const remaining      = cl.hours - cl.used;
  const remainingColor = remaining <= 0 ? '#E24B4A' : remaining <= cl.hours * 0.2 ? '#EF9F27' : '#1c6b2a';

  document.getElementById('main-area').innerHTML = `
    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Horas contratadas</div>
        <div class="metric-val">${cl.hours}h</div>
      </div>
      <div class="metric">
        <div class="metric-label">Horas usadas</div>
        <div class="metric-val" style="color:${barColor}">${cl.used}h</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${Math.min(pct,100)}%; background:${barColor}"></div>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:4px">${pct}% consumido</div>
      </div>
      <div class="metric">
        <div class="metric-label">Horas restantes</div>
        <div class="metric-val" style="color:${remainingColor}">${remaining > 0 ? remaining : 0}h</div>
        <div style="font-size:11px; color:var(--muted); margin-top:4px">
          ${remaining <= 0 ? '⚠ Límite alcanzado' : remaining <= cl.hours * 0.2 ? '⚠ Pocas horas disponibles' : 'Disponibles'}
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">Tickets abiertos</div>
        <div class="metric-val">${open}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Horas extras</div>
        <div class="metric-val" style="color:${extraHours > 0 ? '#E24B4A' : 'var(--muted)'}">${extraHours}h</div>
        <div style="font-size:11px; color:var(--muted); margin-top:4px">Mes actual: ${monthUsed}h</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">Mis tickets</span>
        <button class="btn btn-secondary" onclick="openNewTicket()">
          <i class="ti ti-plus"></i> Nuevo ticket
        </button>
      </div>

      <div class="tabs">
        <div class="tab active" onclick="filterTab(this,'all')">Todos (${my.length})</div>
        <div class="tab" onclick="filterTab(this,'open')">Abiertos (${open})</div>
        <div class="tab" onclick="filterTab(this,'pending')">En proceso (${pending})</div>
        <div class="tab" onclick="filterTab(this,'closed')">Cerrados (${closed})</div>
      </div>

      <div style="overflow-x:auto">
        <table class="tbl" id="client-tbl">
          <colgroup>
            <col style="width:80px">
            <col>
            <col style="width:90px">
            <col style="width:95px">
            <col style="width:130px">
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>Asunto</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Técnico</th>
            </tr>
          </thead>
          <tbody>
            ${my.map(t => `
              <tr data-status="${t.status}" style="cursor:pointer" onclick="openDetail('${t.id}')">
                <td style="color:var(--muted)">${escapeHtml(t.id)}</td>
                <td>${escapeHtml(t.title)}</td>
                <td>${pBadge(t.prio)}</td>
                <td>${sBadge(t.status)}</td>
                <td>${escapeHtml(t.tech)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${renderMonthlyChart(cl, my)}

    ${renderClientCalendar(ci)}
  `;
}

function renderClientCalendar(ci) {
  const myEvents = events.filter(ev => ev.client === ci || ev.client === -1);
  return `
    <div class="card">
      <div class="card-head">
        <span class="card-title"><i class="ti ti-calendar"></i> Cronograma de actividades</span>
      </div>
      ${renderCalendarGrid(myEvents, false)}
    </div>
  `;
}

function openEventDetail(id) {
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  const et = EVENT_TYPES[ev.type] || EVENT_TYPES.otro;

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
        <div><div class="form-label">Técnico</div><span style="font-size:13px">${escapeHtml(ev.tech)}</span></div>
        <div><div class="form-label">Tipo</div><span class="badge" style="background:${et.bg};color:${et.color}">${et.label}</span></div>
      </div>
      ${ev.desc ? `<div class="form-row"><div class="form-label">Descripción</div><div style="font-size:13px;line-height:1.5">${escapeHtml(ev.desc)}</div></div>` : ''}
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cerrar</button>
      </div>
    </div>
  `);
}

const CAT_COLORS = {
  'Conectividad / Red':      '#185FA5',
  'Hardware':                '#7C3AED',
  'Software / Aplicaciones': '#0891B2',
  'Seguridad':               '#E24B4A',
  'Correo / Comunicaciones': '#D97706',
  'Servidores':              '#059669',
  'Otro':                    '#667085'
};

function renderMonthlyChart(cl, myTickets) {
  const max  = Math.max(...cl.monthly, 1);
  const year = new Date().getFullYear();

  const bars = cl.monthly.map((h, i) => {
    const pct   = Math.round((h / max) * 100);
    const color = h >= max * 0.9 ? '#E24B4A' : h >= max * 0.7 ? '#EF9F27' : '#185FA5';
    return `
      <div class="month-col">
        <div class="month-val" style="color:${color}">${h}h</div>
        <div class="month-bar-wrap">
          <div class="month-bar" style="height:${pct}%; background:${color}"></div>
        </div>
        <div class="month-name">${MONTHS[i]}</div>
      </div>`;
  }).join('');

  const total = cl.monthly.reduce((a, b) => a + b, 0);
  const avg   = (total / cl.monthly.length).toFixed(1);

  // ── Desglose por tipo de trabajo ──────────────────────────
  const catTotals = {};
  const catByMonth = Array.from({ length: 6 }, () => ({}));

  (myTickets || []).forEach(t => {
    if (!t.hours || !t.createdAt) return;
    const m = new Date(t.createdAt).getMonth();
    if (m < 0 || m > 5) return;
    const cat = t.cat || 'Otro';
    catTotals[cat] = (catTotals[cat] || 0) + t.hours;
    catByMonth[m][cat] = (catByMonth[m][cat] || 0) + t.hours;
  });

  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  const catRows = sortedCats.map(([cat, total]) => {
    const color   = CAT_COLORS[cat] || '#667085';
    const catPct  = cl.used > 0 ? Math.round((total / cl.used) * 100) : 0;
    const monthly = MONTHS.map((m, i) => {
      const h = catByMonth[i][cat] || 0;
      return `<td style="text-align:center;font-size:12px;color:${h > 0 ? color : 'var(--muted)'}">${h > 0 ? h + 'h' : '—'}</td>`;
    }).join('');
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>
            ${cat}
          </div>
        </td>
        ${monthly}
        <td style="text-align:right;font-weight:700;font-size:13px">${total}h</td>
        <td style="text-align:right;font-size:12px;color:var(--muted)">${catPct}%</td>
      </tr>`;
  }).join('');

  const breakdownHtml = sortedCats.length > 0 ? `
    <div class="card" style="margin-top:0">
      <div class="card-head">
        <span class="card-title"><i class="ti ti-list-details"></i> Trabajo realizado por tipo</span>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:12px;color:var(--muted)">Ene – Jun ${year}</span>
          <button class="btn btn-secondary" onclick="downloadHoursReportPDF()">
            <i class="ti ti-file-type-pdf"></i> Descargar PDF
          </button>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Categoría</th>
              ${MONTHS.map(m => `<th style="text-align:center">${m}</th>`).join('')}
              <th style="text-align:right">Total</th>
              <th style="text-align:right">%</th>
            </tr>
          </thead>
          <tbody>${catRows}</tbody>
        </table>
      </div>
    </div>` : '';

  return `
    <div class="card">
      <div class="card-head">
        <span class="card-title"><i class="ti ti-chart-bar"></i> Horas por mes</span>
        <span style="font-size:12px; color:var(--muted)">Ene – Jun ${year} &nbsp;·&nbsp; Promedio: <strong>${avg}h</strong></span>
      </div>
      <div class="monthly-chart">${bars}</div>
    </div>
    ${breakdownHtml}`;
}

function filterTab(el, f) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#client-tbl tbody tr').forEach(row => {
    row.style.display = (f === 'all' || row.dataset.status === f) ? '' : 'none';
  });
}

// ── NUEVO TICKET ───────────────────────────────────────────────────────────

function openNewTicket() {
  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">
        <span>Nuevo ticket de soporte</span>
        <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div class="form-row">
        <label class="form-label">Asunto</label>
        <input class="form-input" id="new-title" placeholder="Describe el problema brevemente" />
      </div>

      <div class="form-row">
        <label class="form-label">Categoría</label>
        <select class="form-input" id="new-cat">
          <option>Conectividad / Red</option>
          <option>Hardware</option>
          <option>Software / Aplicaciones</option>
          <option>Seguridad</option>
          <option>Correo / Comunicaciones</option>
          <option>Servidores</option>
          <option>Otro</option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">Prioridad</label>
        <select class="form-input" id="new-prio">
          <option value="low">Baja</option>
          <option value="medium" selected>Media</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">Descripción</label>
        <textarea class="form-input" id="new-desc" rows="3" placeholder="Describe el problema con detalle"></textarea>
      </div>

      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitTicket()">
          <i class="ti ti-send"></i> Enviar ticket
        </button>
      </div>
    </div>
  `);
}

async function submitTicket() {
  const title = document.getElementById('new-title').value.trim();
  if (!title) { alert('Ingresa un asunto para el ticket.'); return; }

  const newTicket = {
    id:     nextTicketId(),
    title,
    prio:   document.getElementById('new-prio').value,
    status: 'open',
    tech:   'Sin asignar',
    hours:  0,
    client: clientIdx(),
    cat:    document.getElementById('new-cat').value,
    desc:   document.getElementById('new-desc').value
  };

  tickets.unshift(newTicket);
  closeModal();
  render();
  await dbInsertTicket(newTicket);
  _sendTicketEmail(newTicket);
  const empresa = CLIENTS.find(c => c.id === clientIdx())?.name || '—';
  notifyWhatsApp('new_ticket', newTicket, empresa);
}

function _sendTicketEmail(t) {
  const auth    = getAuth();
  const empresa = CLIENTS[clientIdx()]?.name || '—';
  const prioMap = { alta: 'Alta', media: 'Media', baja: 'Baja' };

  emailjs.send('service_11zanls', 'template_pp6rjvy', {
    ticket_id:       t.id,
    ticket_titulo:   t.title,
    usuario_nombre:  auth?.userName || 'Usuario',
    empresa:         empresa,
    prioridad:       prioMap[t.prio] || t.prio,
    descripcion:     t.desc || 'Sin descripción'
  }).catch(err => console.error('EmailJS error:', err));
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
        <div><div class="form-label">Horas</div><span style="font-size:13px">${t.hours}h</span></div>
      </div>

      ${t.desc ? `
        <div class="form-row">
          <div class="form-label">Descripción</div>
          <div style="font-size:13px; line-height:1.5">${escapeHtml(t.desc)}</div>
        </div>
      ` : ''}

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

// ── DESCARGA PDF — REPORTE DE HORAS ────────────────────────────────────────
// _ensureJsPDF y pdfBrandHeader (con el logo SIRT) viven en logo-data.js.

function downloadHoursReportPDF() {
  const JsPDF = _ensureJsPDF();
  if (!JsPDF) return;

  const ci = clientIdx();
  const cl = CLIENTS[ci];
  if (!cl) return;
  const my = tickets.filter(t => t.client === ci);

  const doc    = new JsPDF({ unit: 'pt', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 48;
  pdfEnableWatermark(doc);
  let y = pdfBrandHeader(doc, 'Reporte de soporte por horas');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(cl.name, margin, y); y += 22;

  const pct = cl.hours > 0 ? Math.round(cl.used / cl.hours * 100) : 0;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 90, 90);
  doc.text(`Horas contratadas: ${cl.hours}h     Usadas: ${cl.used}h (${pct}%)     Restantes: ${Math.max(0, cl.hours - cl.used)}h`, margin, y);
  y += 20;

  const section = (title) => {
    if (y > pageH - 90) { doc.addPage(); y = margin; }
    doc.setDrawColor(225, 225, 225); doc.line(margin, y, pageW - margin, y); y += 16;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 68, 124); doc.setFontSize(11);
    doc.text(title, margin, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); doc.setFontSize(10);
  };

  // Horas por mes
  section('Horas por mes');
  const monthsLine = (cl.monthly || []).map((h, i) => `${MONTHS[i]}: ${h || 0}h`).join('     ');
  const ml = doc.splitTextToSize(monthsLine || 'Sin datos', pageW - margin * 2);
  doc.text(ml, margin, y); y += ml.length * 14 + 8;

  // Desglose por tipo
  const catTotals = {};
  my.forEach(t => { if (!t.hours) return; const c = t.cat || 'Otro'; catTotals[c] = (catTotals[c] || 0) + t.hours; });
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  if (sorted.length) {
    section('Trabajo realizado por tipo');
    sorted.forEach(([cat, tot]) => {
      const p = cl.used > 0 ? Math.round(tot / cl.used * 100) : 0;
      if (y > pageH - 70) { doc.addPage(); y = margin; }
      doc.text(`•  ${cat}: ${tot}h (${p}%)`, margin, y); y += 14;
    });
    y += 8;
  }

  // Lista de tickets
  section(`Tickets (${my.length})`);
  const statusLbl = { open: 'Abierto', pending: 'En proceso', closed: 'Cerrado' };
  if (my.length === 0) { doc.text('Sin tickets registrados.', margin, y); y += 14; }
  my.forEach(t => {
    if (y > pageH - 60) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.setFontSize(10);
    const title = doc.splitTextToSize(`${t.id}  ${t.title}`, pageW - margin * 2 - 150)[0];
    doc.text(title, margin, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 90, 90); doc.setFontSize(9);
    doc.text(`${statusLbl[t.status] || t.status} · ${t.hours}h · ${t.tech}`, pageW - margin, y, { align: 'right' });
    y += 15;
  });

  const fy = pageH - 40;
  doc.setDrawColor(225, 225, 225); doc.line(margin, fy - 10, pageW - margin, fy - 10);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 140, 140); doc.setFontSize(9);
  doc.text(`Generado el ${formatDate(new Date().toISOString().slice(0, 10))} · SoporteIT`, margin, fy);

  doc.save(`Reporte_horas_${cl.name.replace(/\s+/g, '_')}.pdf`);
}

// ── INIT ───────────────────────────────────────────────────────────────────

async function init() {
  showLoading();
  await loadData();
  render();
}
init();
