# SIRT — Sitio web + Sistema de tickets

Proyecto de **SIRT** (Redes y Telecomunicaciones, Bolivia). Contiene dos piezas
que se despliegan por separado y un backend en Supabase.

## 📁 Estructura

```
.
├── sirt/        → Sitio web público (marketing). Estático: HTML/CSS/JS.
├── tickets/     → Aplicación de tickets (portal cliente + dashboard admin). Estático.
├── supabase/    → Backend: esquemas SQL, políticas RLS y Edge Functions.
│   ├── security-rls.sql      → Endurecimiento de RLS (aplicar en SQL Editor).
│   ├── work-schema.sql       → Esquema del módulo "trabajo".
│   └── functions/            → Edge Functions (Deno).
├── _archivo/    → Material viejo que NO se despliega (mockups, etc.).
└── package.json → Solo para tooling local (CLI de Supabase). No se despliega.
```

> **Backend:** la app no necesita un servidor Node en el VPS. Todo el backend
> (base de datos, auth, funciones) vive en **Supabase**. El VPS solo sirve
> archivos estáticos.

## 🧩 Requisitos

- Una cuenta y proyecto de **Supabase** (ya configurado en `tickets/supabase.js`).
- Un VPS con **HestiaCP** y un dominio con **SSL (Let's Encrypt)**.
- (Opcional, solo para tooling) Node.js + `npm install`.

## 🖥️ Desarrollo local

Al ser estático, basta con servir las carpetas con cualquier servidor estático:

```bash
# Sitio público
npx serve sirt
# App de tickets
npx serve tickets
```

## 🔍 Antes de publicar: configurar el dominio (SEO)

Las etiquetas SEO usan el placeholder `https://www.tudominio.com`. Reemplázalo
por tu dominio real en todo `sirt/` (incluye `robots.txt` y `sitemap.xml`):

```bash
# Desde la raíz del proyecto (ajusta tu dominio):
grep -rl "www.tudominio.com" sirt/ | xargs sed -i 's#https://www.tudominio.com#https://TU-DOMINIO-REAL.com#g'
```

## 🚀 Despliegue en HestiaCP

Tienes dos arquitecturas posibles. Elige una:

### Opción A — Subcarpeta (más simple, sin CORS extra)
- `tudominio.com`         → contenido de `sirt/`
- `tudominio.com/tickets` → contenido de `tickets/`

Los enlaces relativos (`../tickets/login-client.html`) funcionan tal cual.

### Opción B — Subdominio (más profesional, recomendado)
- `tudominio.com`     → `sirt/`
- `app.tudominio.com` → `tickets/`

En este caso, **edita los enlaces** de `sirt/soporte.html` para que apunten al
subdominio absoluto, p.ej. `https://app.tudominio.com/login-client.html`.

### Pasos en HestiaCP
1. **WEB → Add Web Domain** para el dominio (y el subdominio si usas la Opción B).
2. **Edit Web Domain →** activa **SSL Support + Let's Encrypt + Force HTTPS**.
3. Sube los archivos (ver `scripts/deploy.sh` o el File Manager).
4. En **Supabase → Authentication → URL Configuration**, agrega tu(s) dominio(s)
   a las *Redirect URLs* y *Site URL*.

### Qué se sube y qué NO
| Sube | NO subas |
|------|----------|
| `sirt/` y `tickets/` (html, css, js, img) | `node_modules/`, `.git/` |
| `robots.txt`, `sitemap.xml` | `supabase/`, `*.sql`, `*.md`, `_archivo/` |

## 🔐 Aplicar la seguridad de base de datos

Antes (o justo después) de publicar, ejecuta en **Supabase → SQL Editor**:

1. `supabase/security-rls.sql` — restringe escritura/borrado al admin autenticado.

Ver el encabezado de ese archivo para saber qué protege y qué queda pendiente
(migración del login de clientes a Supabase Auth).

## 🔑 Secretos / variables

- `tickets/supabase.js` contiene la **publishable key** de Supabase: es **pública
  por diseño**, no es un secreto. La seguridad la dan las políticas RLS.
- **Nunca** pongas en el cliente la `service_role key` ni API keys privadas
  (Anthropic, WhatsApp): esas van **solo** en Edge Functions / variables de
  entorno del servidor.

## 🛡️ Estado de seguridad

- ✅ XSS almacenado mitigado (escape de datos de usuario en todos los renders).
- ✅ RLS endurecido para escritura/borrado (`security-rls.sql`).
- ⏳ Pendiente: login de clientes con Supabase Auth, bloqueo de fuerza bruta en
  servidor, y CORS restringido en la Edge Function de WhatsApp.
