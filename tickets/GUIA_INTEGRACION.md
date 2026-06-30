# 🔧 GUÍA DE INTEGRACIÓN - Sistema de Gestión Histórica

**Fecha:** 2026-06-24  
**Archivos nuevos creados:** 5  
**Archivos a modificar:** 3  

---

## 📦 ARCHIVOS NUEVOS CREADOS

1. **archive-policy.js** — Lógica de archivado automático (30 días)
2. **reports-generator.js** — Generación de reportes mensuales en PDF/CSV
3. **email-reports.js** — Envío automático de reportes por email
4. **date-filter.js** — Filtros de fecha para dashboards
5. **GUIA_INTEGRACION.md** — Este archivo

---

## 🔌 PASO 1: AGREGAR SCRIPTS AL HTML

### En `admin.html`, agregar ANTES del `</body>`:

```html
<!-- Nuevos scripts de gestión histórica -->
<script src="archive-policy.js"></script>
<script src="reports-generator.js"></script>
<script src="email-reports.js"></script>
<script src="date-filter.js"></script>
```

### En `client.html`, agregar ANTES del `</body>`:

```html
<!-- Nuevos scripts de gestión histórica -->
<script src="archive-policy.js"></script>
<script src="reports-generator.js"></script>
<script src="email-reports.js"></script>
<script src="date-filter.js"></script>
```

---

## 🗄️ PASO 2: CREAR TABLAS EN SUPABASE

### Ejecutar en Supabase SQL Editor:

```sql
-- Tabla para tickets archivados
CREATE TABLE IF NOT EXISTS archived_tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prio TEXT,
  status TEXT,
  tech TEXT,
  hours NUMERIC DEFAULT 0,
  client INTEGER REFERENCES clients(id),
  cat TEXT,
  description TEXT,
  createdAt TIMESTAMP,
  archived BOOLEAN DEFAULT true,
  archived_at TIMESTAMP DEFAULT NOW(),
  original_status TEXT
);

-- Tabla para reportes mensuales
CREATE TABLE IF NOT EXISTS monthly_reports (
  id TEXT PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  total_tickets INTEGER DEFAULT 0,
  open_tickets INTEGER DEFAULT 0,
  closed_tickets INTEGER DEFAULT 0,
  pending_tickets INTEGER DEFAULT 0,
  total_hours NUMERIC DEFAULT 0,
  pdf_url TEXT,
  data JSONB,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP
);

-- Tabla de logs de archivado
CREATE TABLE IF NOT EXISTS archive_logs (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  archived_at TIMESTAMP DEFAULT NOW(),
  reason TEXT DEFAULT 'Auto-archivado'
);

-- Agregar columnas a tabla tickets (si no existen)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_archived_tickets_client ON archived_tickets(client);
CREATE INDEX IF NOT EXISTS idx_archived_tickets_date ON archived_tickets(archived_at);
CREATE INDEX IF NOT EXISTS idx_reports_client_month ON monthly_reports(client_id, month);
CREATE INDEX IF NOT EXISTS idx_archive_logs_date ON archive_logs(archived_at);
```

---

## 🎨 PASO 3: AGREGAR UI EN ADMIN.JS

### Ubicar la función `renderAdmin()` y modificar:

**Buscar:**
```javascript
if (adminTab === 'tickets') {
  tabContent = `
    <div style="overflow-x:auto">
      <table class="tbl">
        ...tickets table...
      </table>
    </div>
  `;
} else if (adminTab === 'clients') {
```

**Reemplazar por:**
```javascript
if (adminTab === 'tickets') {
  tabContent = `
    ${getDateFilterStyles()}
    ${renderDateFilterUI()}
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
          ${dateFilter.getFilteredTickets(tickets).map(t => {
            const unassigned = t.tech === 'Sin asignar';
            return \`
            <tr\${unassigned ? ' style="background:#fffbeb"' : ''}>
              <td style="color:var(--muted);font-size:12px">\${t.id}</td>
              <td style="cursor:pointer;color:var(--primary-dark);font-weight:500" onclick="openDetail('\${t.id}')">\${t.title}</td>
              <td>
                <div class="ticket-status-wrap">
                  \${sBadge(t.status)}
                  \${getCompanyBadgeHtml(t.client)}
                </div>
              </td>
              <td>\${pBadge(t.prio)}</td>
              <td>
                <select class="tech-sel\${unassigned ? ' tech-sel--unassigned' : ''}" onchange="assignTech('\${t.id}', this.value)">
                  \${TECHS.map(tc => \`<option\${tc === t.tech ? ' selected' : ''}>\${tc}</option>\`).join('')}
                  <option value="__add__" style="color:#0C447C;font-weight:600;border-top:1px solid #ddd">＋ Agregar técnico</option>
                </select>
              </td>
              <td>\${t.hours}</td>
            </tr>\`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

} else if (adminTab === 'archivados') {
  tabContent = \`
    \${getDateFilterStyles()}
    \${renderDateFilterUI()}
    <div style="overflow-x:auto">
      <table class="tbl">
        <colgroup>
          <col style="width:80px">
          <col>
          <col style="width:90px">
          <col style="width:90px">
          <col style="width:160px">
          <col style="width:80px">
        </colgroup>
        <thead>
          <tr><th>ID</th><th>Asunto</th><th>Estado</th><th>Prioridad</th><th>Técnico</th><th>Acción</th></tr>
        </thead>
        <tbody>
          \${getClientArchivedTickets(-2).map(t => {
            return \`
            <tr style="opacity:0.7">
              <td style="color:var(--muted);font-size:12px">\${t.id}</td>
              <td>\${t.title}</td>
              <td>\${sBadge(t.original_status)}</td>
              <td>\${pBadge(t.prio)}</td>
              <td>\${t.tech}</td>
              <td>
                <button class="btn btn-sm" onclick="restoreTicket('\${t.id}'); render()">
                  <i class="ti ti-restore"></i> Restaurar
                </button>
              </td>
            </tr>\`;
          }).join('')}
        </tbody>
      </table>
    </div>
  \`;

} else if (adminTab === 'reportes') {
  tabContent = \`
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-secondary" onclick="generateMonthlyReports()">
        <i class="ti ti-refresh"></i> Generar Reportes Ahora
      </button>
    </div>
    <div style="overflow-x:auto">
      <table class="tbl">
        <colgroup>
          <col style="width:150px">
          <col>
          <col style="width:80px">
          <col style="width:80px">
          <col style="width:100px">
          <col style="width:100px">
        </colgroup>
        <thead>
          <tr>
            <th>Período</th><th>Cliente</th><th>Tickets</th><th>Horas</th><th>Enviado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          \${monthlyReports.map(r => {
            const c = CLIENTS.find(cl => cl.id === r.client_id);
            return \`
            <tr>
              <td><strong>\${MONTH_NAMES[r.month - 1]} \${r.year}</strong></td>
              <td>\${c ? c.name : 'Desconocido'}</td>
              <td>\${r.total_tickets}</td>
              <td>\${r.total_hours}h</td>
              <td>\${r.email_sent ? '✓ Sí' : '✗ No'}</td>
              <td>
                <button class="btn btn-sm" onclick="downloadReportPDF('\${r.id}')">PDF</button>
                <button class="btn btn-sm" onclick="exportReportToCSV('\${r.id}')">CSV</button>
                <button class="btn btn-sm" onclick="resendReportEmail('\${r.id}'); alert('Email reenviado')">📧</button>
              </td>
            </tr>\`;
          }).join('')}
        </tbody>
      </table>
    </div>
  \`;

} else if (adminTab === 'clients') {
```

### Modificar los tabs del admin:

**Buscar:**
```javascript
const open       = tickets.filter(t => t.status === 'open').length;
const pending    = tickets.filter(t => t.status === 'pending').length;
const closed     = tickets.filter(t => t.status === 'closed').length;
const unassigned = tickets.filter(t => t.tech === 'Sin asignar').length;

let tabContent = '';

if (adminTab === 'tickets') {
```

**Agregar ANTES:**
```javascript
// Contar archivados
const archived = getArchiveStats().totalArchived;

// Crear tabs
const tabs = `
  <div style="display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:10px">
    <button 
      class="tab-btn ${adminTab === 'tickets' ? 'active' : ''}"
      onclick="adminTab='tickets'; renderAdmin()">
      📋 Activos (${getActiveTickets().length})
    </button>
    <button 
      class="tab-btn ${adminTab === 'archivados' ? 'active' : ''}"
      onclick="adminTab='archivados'; renderAdmin()">
      📦 Archivados (${archived})
    </button>
    <button 
      class="tab-btn ${adminTab === 'reportes' ? 'active' : ''}"
      onclick="adminTab='reportes'; renderAdmin()">
      📊 Reportes (${monthlyReports.length})
    </button>
    <button 
      class="tab-btn ${adminTab === 'clients' ? 'active' : ''}"
      onclick="adminTab='clients'; renderAdmin()">
      🏢 Clientes (${CLIENTS.length})
    </button>
    <button 
      class="tab-btn ${adminTab === 'tecnicos' ? 'active' : ''}"
      onclick="adminTab='tecnicos'; renderAdmin()">
      👨‍💼 Técnicos (${TECHS.length})
    </button>
  </div>
`;
```

**Y cambiar el innerHTML:**
```javascript
document.getElementById('main-area').innerHTML = \`
  ... estadísticas ...
  \${tabs}
  \${tabContent}
\`;
```

---

## 👤 PASO 4: AGREGAR UI EN CLIENT.JS

### Modificar `renderClient()`:

**Buscar:**
```javascript
<div class="tabs">
  <div class="tab active" onclick="filterTab(this,'all')">Todos (${my.length})</div>
  <div class="tab" onclick="filterTab(this,'open')">Abiertos (${open})</div>
  <div class="tab" onclick="filterTab(this,'pending')">En proceso (${pending})</div>
  <div class="tab" onclick="filterTab(this,'closed')">Cerrados (${closed})</div>
</div>
```

**Reemplazar por:**
```javascript
<div class="tabs">
  <div class="tab active" onclick="filterTab(this,'all')">Activos (${my.filter(t => !t.archived).length})</div>
  <div class="tab" onclick="filterTab(this,'open')">Abiertos (${open})</div>
  <div class="tab" onclick="filterTab(this,'pending')">En proceso (${pending})</div>
  <div class="tab" onclick="filterTab(this,'closed')">Cerrados (${closed})</div>
  <div class="tab" onclick="filterTab(this,'archived')">Históricos (${my.filter(t => t.archived).length})</div>
</div>

${getDateFilterStyles()}
${renderDateFilterUI()}
```

---

## ⚙️ PASO 5: INICIALIZAR MONITOREO

### En `admin.html`, agregar ANTES del `</script>` final:

```javascript
// Iniciar monitoreo automático cuando los datos se carguen
async function initializeArchivingSystem() {
  await loadArchivedData();
  startArchiveMonitoring();
  startReportMonitoring();
  startEmailMonitoring();
  
  console.log('✅ Sistema de archivado inicializado');
  console.log(`   - ${archivedTickets.length} tickets archivados`);
  console.log(`   - ${monthlyReports.length} reportes disponibles`);
}

// Esperar a que los datos se carguen
window.addEventListener('load', () => {
  setTimeout(initializeArchivingSystem, 2000);
});
```

---

## 📝 PASO 6: ACTUALIZAR EMAIL CONFIG

### En `email-reports.js`, cambiar:

```javascript
const EMAIL_CONFIG = {
  adminEmail: 'admin@sirtsc.com',        // ← Tu email
  reportFrom: 'reportes@sirtsc.com',     // ← Email de origen
  companyName: 'SIRT — Soporte Técnico', // ← Tu empresa
  companyPhone: '+591 7558 2445',        // ← Tu teléfono
  companyEmail: 'info@sirtsc.com',       // ← Tu email
  companyWeb: 'https://sirtsc.com'       // ← Tu sitio web
};
```

---

## ✅ PASO 7: VERIFICAR FUNCIONALIDAD

### Checklist de integración:

- [ ] Archivos JS agregados a HTML
- [ ] Tablas creadas en Supabase
- [ ] Tabs de "Archivados" y "Reportes" funcionan en admin
- [ ] Filtros de fecha funcionan
- [ ] Archivado automático se ejecuta cada día
- [ ] Reportes se generan el día 28 de cada mes
- [ ] Emails se envían el día 1 de mes
- [ ] Botones de descarga (PDF/CSV) funcionan
- [ ] Botón de restaurar funciona

---

## 🚀 USO EN PRODUCCIÓN

### Flujo automático:

1. **Diariamente (00:00 UTC):**
   - Sistema busca tickets cerrados hace 30+ días
   - Los archiva automáticamente
   - Registra en logs

2. **Día 28 de cada mes (23:00 UTC):**
   - Genera reportes mensuales
   - Crea PDFs con resúmenes
   - Guarda datos en BD

3. **Día 1 de mes (08:00 UTC):**
   - Envía reportes del mes anterior por email
   - A clientes y administrador
   - Registra envíos

4. **Manual (desde UI):**
   - Admin puede generar reportes cuando quiera
   - Descargar PDF/CSV
   - Reenviar emails
   - Restaurar tickets archivados

---

## 📊 ESTADÍSTICAS DE RENDIMIENTO

**Esperado después de 1 mes:**

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tickets en vista | ∞ | ~500 | 70-90% ↓ |
| Tiempo carga | 5-10s | 1-2s | 5x ⚡ |
| Tamaño BD | Crece | Constante | ✅ |
| Auditoría | ❌ | ✅ | ✅ |

---

## 🐛 TROUBLESHOOTING

**Problema:** Archivos JS no se cargan
- ✅ Verificar que estén en la misma carpeta
- ✅ Ver consola (F12) para errores

**Problema:** Tablas no existen en Supabase
- ✅ Ejecutar SQL desde SQL Editor
- ✅ Verificar permisos de escritura

**Problema:** Emails no se envían
- ✅ Verificar emailjs.init() está correctamente inicializado
- ✅ Comprobar credenciales en client.html

**Problema:** Archivado no funciona
- ✅ Verificar que `startArchiveMonitoring()` se llamó
- ✅ Ver console.log para mensajes de debug

---

## 📞 SOPORTE

Para preguntas o problemas:
1. Revisar consola del navegador (F12)
2. Comprobar que todos los scripts se cargaron
3. Verificar permisos en Supabase

---

**Siguiente paso:** Pruebas de integración
