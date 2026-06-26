// ── HISTÓRICO: ARCHIVADOS Y REPORTES (Dashboard Admin) ──────────────────────
// El archivado y la generación de reportes corren SOLOS en el servidor (pg_cron).
// Aquí solo LEEMOS esos datos y ofrecemos botones manuales ("hacerlo ahora").

let archivedTickets = [];
let monthlyReports  = [];
let historicoLoaded = false;

// ── CARGA DE DATOS ───────────────────────────────────────────────────────────

async function loadHistorico() {
  const [ar, rr] = await Promise.all([
    _sb.from('tickets').select('*').eq('archived', true).order('archived_at', { ascending: false }),
    _sb.from('monthly_reports').select('*').order('month', { ascending: false })
  ]);

  if (ar.error) console.error('loadHistorico (archivados):', ar.error);
  if (rr.error) console.error('loadHistorico (reportes):', rr.error);

  archivedTickets = (ar.data || []).map(t => ({
    id: t.id, title: t.title, prio: t.prio, status: t.status,
    tech: t.tech, hours: Number(t.hours), client: t.client_id,
    cat: t.cat || '', desc: t.description || '',
    createdAt: t.created_at || null, closedAt: t.closed_at || null,
    archivedAt: t.archived_at || null
  }));

  monthlyReports = rr.data || [];
  historicoLoaded = true;
}

// ── ACCIONES MANUALES (llaman a las funciones SQL del servidor) ──────────────

async function runArchiveNow() {
  if (!confirm('¿Archivar ahora todos los tickets cerrados hace más de 30 días?')) return;
  const { data, error } = await _sb.rpc('archive_old_closed_tickets');
  if (error) { alert('Error al archivar: ' + error.message); return; }
  await loadData();          // recargar tickets activos
  await loadHistorico();     // recargar archivados
  render();
  alert(`✅ Listo. Tickets archivados en esta corrida: ${data ?? 0}`);
}

async function runGenerateReports() {
  if (!confirm('¿Generar ahora los reportes del mes anterior?')) return;
  const { data, error } = await _sb.rpc('generate_monthly_reports');
  if (error) { alert('Error al generar reportes: ' + error.message); return; }
  await loadHistorico();
  render();
  alert(`✅ Listo. Reportes generados/actualizados: ${data ?? 0}`);
}

async function restoreArchivedTicket(id) {
  if (!confirm('¿Restaurar este ticket a la vista activa?')) return;
  const { error } = await _sb.from('tickets')
    .update({ archived: false, archived_at: null })
    .eq('id', id);
  if (error) { alert('Error al restaurar: ' + error.message); return; }
  await loadData();
  await loadHistorico();
  render();
}

// ── RENDER: PESTAÑA ARCHIVADOS ───────────────────────────────────────────────

function renderArchivadosTab() {
  // Carga perezosa: la primera vez que se abre la pestaña, traemos los datos.
  if (!historicoLoaded) {
    loadHistorico().then(renderAdmin);
    return `<div style="padding:24px;text-align:center;color:var(--muted)">
      <span class="spinner"></span> Cargando archivados…
    </div>`;
  }

  const toolbar = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <span style="font-size:13px;color:var(--muted)">
        ${archivedTickets.length} ticket(s) archivado(s). Se archivan solos 30 días después de cerrarse.
      </span>
      <button class="btn btn-secondary" onclick="runArchiveNow()">
        <i class="ti ti-archive"></i> Archivar ahora
      </button>
    </div>`;

  if (archivedTickets.length === 0) {
    return toolbar + `<div style="padding:24px;text-align:center;color:var(--muted);font-size:14px">
      No hay tickets archivados todavía.
    </div>`;
  }

  return toolbar + `
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>Asunto</th><th>Empresa</th><th>Prioridad</th><th>h</th><th>Archivado</th><th></th></tr>
        </thead>
        <tbody>
          ${archivedTickets.map(t => `
            <tr style="opacity:.85">
              <td style="color:var(--muted);font-size:12px">${t.id}</td>
              <td style="cursor:pointer;color:var(--primary-dark);font-weight:500" onclick="openDetail('${t.id}')">${t.title}</td>
              <td>${getCompanyBadgeHtml(t.client)}</td>
              <td>${pBadge(t.prio)}</td>
              <td>${t.hours}</td>
              <td style="font-size:12px;color:var(--muted)">${t.archivedAt ? formatDate(t.archivedAt) : '—'}</td>
              <td>
                <button class="btn btn-sm" onclick="restoreArchivedTicket('${t.id}')">
                  <i class="ti ti-arrow-back-up"></i> Restaurar
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── RENDER: PESTAÑA REPORTES ─────────────────────────────────────────────────

function renderReportesTab() {
  if (!historicoLoaded) {
    loadHistorico().then(renderAdmin);
    return `<div style="padding:24px;text-align:center;color:var(--muted)">
      <span class="spinner"></span> Cargando reportes…
    </div>`;
  }

  const toolbar = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <span style="font-size:13px;color:var(--muted)">
        ${monthlyReports.length} reporte(s). Se generan solos el día 1 de cada mes.
      </span>
      <button class="btn btn-secondary" onclick="runGenerateReports()">
        <i class="ti ti-refresh"></i> Generar reportes ahora
      </button>
    </div>`;

  if (monthlyReports.length === 0) {
    return toolbar + `<div style="padding:24px;text-align:center;color:var(--muted);font-size:14px">
      Aún no hay reportes generados. Pulsa "Generar reportes ahora" para crear los del mes anterior.
    </div>`;
  }

  return toolbar + `
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr><th>Período</th><th>Empresa</th><th>Tickets</th><th>Cerrados</th><th>Horas</th><th></th></tr>
        </thead>
        <tbody>
          ${monthlyReports.map(r => {
            const c = CLIENTS.find(cl => cl.id === r.client_id);
            return `
            <tr>
              <td><strong>${r.month}</strong></td>
              <td>${c ? c.name : 'Empresa ' + r.client_id}</td>
              <td>${r.total_tickets}</td>
              <td>${r.closed_tickets}</td>
              <td>${r.total_hours}h</td>
              <td>
                <button class="btn btn-sm" onclick="exportReportCSV('${r.id}')">
                  <i class="ti ti-download"></i> CSV
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── EXPORTAR REPORTE A CSV ───────────────────────────────────────────────────

function exportReportCSV(reportId) {
  const r = monthlyReports.find(x => x.id === reportId);
  if (!r) { alert('Reporte no encontrado'); return; }
  const c = CLIENTS.find(cl => cl.id === r.client_id);

  const rows = [
    ['Empresa', c ? c.name : r.client_id],
    ['Período', r.month],
    ['Total tickets', r.total_tickets],
    ['Abiertos', r.open_tickets],
    ['En proceso', r.pending_tickets],
    ['Cerrados', r.closed_tickets],
    ['Horas totales', r.total_hours]
  ];
  const csv = rows.map(([k, v]) => `"${k}","${v}"`).join('\n');

  const blob = new Blob(["﻿" + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `reporte_${r.month}_${r.client_id}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
