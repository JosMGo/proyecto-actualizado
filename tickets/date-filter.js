// ── FILTRO DE FECHAS PARA DASHBOARDS ────────────────────────────────────────

class DateFilterManager {
  constructor(storageKey = 'ticket_date_filter') {
    this.storageKey = storageKey;
    this.filters = this.loadFilters();
  }

  loadFilters() {
    try {
      const stored = sessionStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : { from: null, to: null, showArchived: false };
    } catch {
      return { from: null, to: null, showArchived: false };
    }
  }

  saveFilters() {
    sessionStorage.setItem(this.storageKey, JSON.stringify(this.filters));
  }

  setDateRange(fromDate, toDate) {
    this.filters.from = fromDate;
    this.filters.to = toDate;
    this.saveFilters();
  }

  setFromDate(date) {
    this.filters.from = date;
    this.saveFilters();
  }

  setToDate(date) {
    this.filters.to = date;
    this.saveFilters();
  }

  setShowArchived(show) {
    this.filters.showArchived = show;
    this.saveFilters();
  }

  clearFilters() {
    this.filters = { from: null, to: null, showArchived: false };
    this.saveFilters();
  }

  getFilteredTickets(sourceTickets) {
    let filtered = sourceTickets;

    // Filtrar por rango de fechas
    if (this.filters.from) {
      const fromDate = new Date(this.filters.from);
      filtered = filtered.filter(t => {
        if (!t.createdAt) return false;
        const ticketDate = new Date(t.createdAt);
        return ticketDate >= fromDate;
      });
    }

    if (this.filters.to) {
      const toDate = new Date(this.filters.to);
      toDate.setHours(23, 59, 59, 999);  // Fin del día
      filtered = filtered.filter(t => {
        if (!t.createdAt) return false;
        const ticketDate = new Date(t.createdAt);
        return ticketDate <= toDate;
      });
    }

    // Filtrar archivados
    if (!this.filters.showArchived) {
      filtered = filtered.filter(t => !t.archived);
    }

    return filtered;
  }

  // Presets comunes
  setLastNDays(n) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - n);

    this.setDateRange(
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0]
    );
  }

  setCurrentMonth() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.setDateRange(
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0]
    );
  }

  setPreviousMonth() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);

    this.setDateRange(
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0]
    );
  }

  setLastQuarter() {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 3);

    this.setDateRange(
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0]
    );
  }

  setLastYear() {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);

    this.setDateRange(
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0]
    );
  }

  // Información del rango
  getRangeLabel() {
    if (!this.filters.from && !this.filters.to) {
      return 'Sin filtro de fechas';
    }

    const from = this.filters.from ? new Date(this.filters.from).toLocaleDateString('es-ES') : 'Inicio';
    const to = this.filters.to ? new Date(this.filters.to).toLocaleDateString('es-ES') : 'Hoy';

    return `${from} → ${to}`;
  }

  getStats(sourceTickets) {
    const filtered = this.getFilteredTickets(sourceTickets);
    return {
      total: filtered.length,
      open: filtered.filter(t => t.status === 'open').length,
      closed: filtered.filter(t => t.status === 'closed').length,
      pending: filtered.filter(t => t.status === 'pending').length,
      hours: filtered.reduce((sum, t) => sum + (t.hours || 0), 0)
    };
  }
}

// Instancia global
let dateFilter = new DateFilterManager();

// ── COMPONENTE UI ────────────────────────────────────────────────────────────

function renderDateFilterUI() {
  return `
    <div class="date-filter-container">
      <div class="filter-inputs">
        <div class="filter-group">
          <label for="filter-from">Desde:</label>
          <input
            type="date"
            id="filter-from"
            value="${dateFilter.filters.from || ''}"
            onchange="onFilterFromDateChange(this.value)"
          />
        </div>

        <div class="filter-group">
          <label for="filter-to">Hasta:</label>
          <input
            type="date"
            id="filter-to"
            value="${dateFilter.filters.to || ''}"
            onchange="onFilterToDateChange(this.value)"
          />
        </div>

        <div class="filter-group">
          <label>
            <input
              type="checkbox"
              ${dateFilter.filters.showArchived ? 'checked' : ''}
              onchange="onToggleArchived(this.checked)"
            />
            Mostrar archivados
          </label>
        </div>
      </div>

      <div class="filter-presets">
        <button class="btn btn-sm" onclick="dateFilter.setLastNDays(7); render()">Última semana</button>
        <button class="btn btn-sm" onclick="dateFilter.setLastNDays(30); render()">Últimos 30 días</button>
        <button class="btn btn-sm" onclick="dateFilter.setCurrentMonth(); render()">Este mes</button>
        <button class="btn btn-sm" onclick="dateFilter.setPreviousMonth(); render()">Mes anterior</button>
        <button class="btn btn-sm" onclick="dateFilter.clearFilters(); render()">Limpiar</button>
      </div>

      <div class="filter-info">
        <small>${dateFilter.getRangeLabel()}</small>
      </div>
    </div>
  `;
}

// ── HANDLERS ────────────────────────────────────────────────────────────────

function onFilterFromDateChange(value) {
  dateFilter.setFromDate(value || null);
  render();
}

function onFilterToDateChange(value) {
  dateFilter.setToDate(value || null);
  render();
}

function onToggleArchived(checked) {
  dateFilter.setShowArchived(checked);
  render();
}

// ── ESTILOS CSS ─────────────────────────────────────────────────────────────

function getDateFilterStyles() {
  return `
    <style>
      .date-filter-container {
        background: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 15px;
        margin-bottom: 20px;
      }

      .filter-inputs {
        display: flex;
        gap: 15px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .filter-group label {
        font-size: 12px;
        font-weight: 500;
        color: #666;
        text-transform: uppercase;
      }

      .filter-group input[type="date"],
      .filter-group input[type="checkbox"] {
        padding: 8px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
      }

      .filter-group input[type="checkbox"] {
        width: auto;
        cursor: pointer;
        margin-right: 8px;
      }

      .filter-presets {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .filter-presets .btn {
        font-size: 12px;
        padding: 6px 12px;
      }

      .filter-info {
        color: #999;
        text-align: right;
      }

      @media (max-width: 768px) {
        .filter-inputs {
          flex-direction: column;
        }

        .filter-presets {
          flex-direction: column;
        }

        .filter-presets .btn {
          width: 100%;
        }
      }
    </style>
  `;
}

// ── EXPORTAR PARA USO EN DASHBOARDS ─────────────────────────────────────────

console.log('🔍 Date Filter cargado');
