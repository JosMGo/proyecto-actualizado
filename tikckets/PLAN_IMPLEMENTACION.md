# 📋 PLAN DE IMPLEMENTACIÓN - Sistema de Gestión Histórica de Tickets

**Fecha:** 2026-06-24  
**Estado:** En desarrollo  
**Prioridad:** Rendimiento/Base de datos  

---

## 🎯 OBJETIVOS

1. ✅ Archivado automático de tickets 30 días después de cerrados
2. ✅ Retención permanente (sin eliminación automática)
3. ✅ Generación automática de reportes mensuales
4. ✅ Descarga manual de reportes PDF/Excel
5. ✅ Envío automático de reportes por email
6. ✅ Filtros de fecha en dashboards
7. ✅ Vistas separadas: Activos vs Archivados

---

## 📊 CAMBIOS EN BASE DE DATOS

### Tabla `tickets` - Nuevos campos

```sql
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS (
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP NULL,
  report_id TEXT NULL
);
```

### Nueva tabla `monthly_reports`

```sql
CREATE TABLE IF NOT EXISTS monthly_reports (
  id TEXT PRIMARY KEY,
  client_id INTEGER NOT NULL,
  month TEXT NOT NULL,  -- "2026-06"
  year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Resumen
  total_tickets INTEGER DEFAULT 0,
  open_tickets INTEGER DEFAULT 0,
  closed_tickets INTEGER DEFAULT 0,
  pending_tickets INTEGER DEFAULT 0,
  total_hours DECIMAL DEFAULT 0,
  
  -- Archivo PDF/JSON
  pdf_url TEXT NULL,
  data JSONB NULL,  -- Resumen de datos
  
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP NULL,
  
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

### Nueva tabla `archive_logs`

```sql
CREATE TABLE IF NOT EXISTS archive_logs (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  client_id INTEGER NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW(),
  reason TEXT DEFAULT 'Auto-archivado por política de retención',
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

---

## 📁 ARCHIVOS A CREAR/MODIFICAR

### 1. **archive-policy.js** (NUEVO)
   - Lógica de archivado automático
   - Trigger de 30 días después de cerrado
   - Verificación diaria

### 2. **reports-generator.js** (NUEVO)
   - Generación de reportes mensuales
   - Formato PDF/Excel
   - Cálculo de resúmenes

### 3. **email-reports.js** (NUEVO)
   - Envío automático de reportes por email
   - Templates de email
   - Registro de envíos

### 4. **archive-ui.js** (NUEVO)
   - UI para ver archivados
   - Restaurar tickets
   - Visualización de históricos

### 5. **date-filter.js** (NUEVO)
   - Filtro de fechas en dashboards
   - Búsqueda por rango
   - Persistencia de filtros

### 6. **admin.js** (MODIFICAR)
   - Agregar tabs para "Archivados"
   - Integrar filtro de fechas
   - Botón de generación de reportes

### 7. **client.js** (MODIFICAR)
   - Agregar vista de "Históricos"
   - Filtro de fechas
   - Descarga de reportes personales

### 8. **app.js** (MODIFICAR)
   - Agregar funciones de lectura/escritura para archivados
   - Integración con reportes
   - Sincronización de datos

---

## 🔄 FLUJO DE PROCESOS

### Proceso 1: Archivado Automático
```
Cada día a las 00:00 UTC
  ↓
Buscar tickets con status='closed' Y 
  (NOW() - closed_at) >= 30 días
  ↓
Mover a estado 'archived'
  ↓
Actualizar archived_at = NOW()
  ↓
Registrar en archive_logs
  ↓
Remover de vista principal de dashboards
```

### Proceso 2: Generación de Reportes
```
Último día del mes a las 23:00 UTC
  ↓
Para cada cliente:
  - Contar tickets (open, closed, pending)
  - Sumar horas totales
  - Generar gráficas
  - Crear PDF
  ↓
Guardar en monthly_reports
  ↓
Crear cola para envío de email
```

### Proceso 3: Envío de Reportes
```
Primero de mes a las 08:00 UTC
  ↓
Para cada cliente con email_sent=false
  - Obtener reporte del mes anterior
  - Enviar por EmailJS
  - Marcar email_sent = true
  ↓
Registrar email_sent_at
```

### Proceso 4: Filtrado en UI
```
Usuario selecciona fechas (From/To)
  ↓
Filtrar tickets donde:
  created_at >= from_date AND
  created_at <= to_date AND
  (archived = false OR mostrar_archivados = true)
  ↓
Mostrar solo tickets en rango
  ↓
Guardar filtro en sessionStorage
```

---

## 🎨 CAMBIOS EN UI/UX

### Dashboard Admin

**Antes:**
```
[Tickets] [Clientes] [Técnicos] [Eventos]
└─ Tabla única con todos los tickets
```

**Después:**
```
[Tickets Activos] [Archivados] [Reportes] [Clientes] [Técnicos]
├─ Tickets Activos
│  ├─ Filtro de fechas (From/To)
│  └─ Tabla (excluye archived=true)
├─ Archivados
│  ├─ Filtro de fechas
│  ├─ Búsqueda
│  └─ Botón "Restaurar"
└─ Reportes
   ├─ Histórico de reportes
   ├─ Descargar PDF/Excel
   └─ Resend email
```

### Dashboard Cliente

**Antes:**
```
Horas | Tickets | Calendario
└─ Tabla con todos mis tickets
```

**Después:**
```
Horas | Tickets Activos | Históricos | Reportes | Calendario
├─ Tickets Activos
│  ├─ Filtro de fechas
│  └─ Tabla (últimos 30 días por default)
├─ Históricos
│  ├─ Vista archivados
│  └─ Gráfica anual
└─ Reportes
   ├─ Descargar resumen mes
   └─ Exportar a Excel
```

---

## ⚙️ CONFIGURACIÓN

Archivo `config-archive.js`:
```javascript
const ARCHIVE_CONFIG = {
  // Archivado automático
  archiveAfterDays: 30,        // Días después de cerrado
  archiveCheckTime: '00:00',   // Hora del chequeo (UTC)
  
  // Reportes
  reportGenerationDay: 28,     // Generar reportes el día 28
  reportGenerationTime: '23:00',
  
  // Envío de email
  reportSendDay: 1,            // Enviar reporte el día 1 del mes
  reportSendTime: '08:00',
  
  // Retención
  deleteArchivedAfterDays: null,  // null = nunca borrar
  
  // Emails para reportes
  adminEmail: 'admin@sirtsc.com',
  reportFrom: 'reportes@sirtsc.com',
};
```

---

## 📈 IMPACTO ESPERADO

| Métrica | Antes | Después |
|---------|-------|---------|
| Tickets en vista principal | ∞ (crece diario) | ~200-500 (últimos 30 días) |
| Tiempo de carga | 🐌 Lento | ⚡ Rápido |
| Tamaño tabla activa | Crece anualmente | Constante |
| Searchabilidad | Difícil (sin filtros) | ✅ Fácil (con filtros) |
| Auditoría/Cumplimiento | ❌ No | ✅ Sí (reportes) |

---

## 📅 CRONOGRAMA IMPLEMENTACIÓN

- [ ] **Fase 1 (Hoy):** Base de datos + funciones core
- [ ] **Fase 2 (Hoy):** UI de filtros + archivados
- [ ] **Fase 3 (Hoy):** Generador de reportes
- [ ] **Fase 4 (Hoy):** Envío de emails automático
- [ ] **Pruebas:** Validar archivado, reportes, emails
- [ ] **Deploy:** Activación en producción

---

## ✅ CHECKLIST DE VALIDACIÓN

- [ ] Campo `archived` existe y funciona
- [ ] Archivado automático se ejecuta cada día
- [ ] Reportes se generan el 28 de cada mes
- [ ] Reportes se envían por email el 1 de mes
- [ ] Filtros de fecha funcionan en admin y cliente
- [ ] Vista de "Archivados" es funcional
- [ ] Botón "Restaurar ticket" funciona
- [ ] PDFs se descargan correctamente
- [ ] Rendimiento mejora (carga de dashboards)
- [ ] No hay pérdida de datos (archivados se guardan)

---

**Siguiente paso:** Implementar Fase 1 - Base de datos y funciones core
