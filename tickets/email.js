// ── NOTIFICACIÓN DE TICKETS POR CORREO (SMTP Banahost) ─────────────────────
// Invoca la Supabase Edge Function que envía el correo vía SMTP.
// Reemplaza a EmailJS (dependía de OAuth de Outlook, que expiraba).
//
// Secrets requeridos en Supabase Dashboard → Project Settings → Edge Functions:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_TO

const EMAIL_FN_URL = `${SUPABASE_URL}/functions/v1/send-ticket-email`;

async function sendTicketEmail({ ticket_id, ticket_titulo, usuario_nombre, empresa, prioridad, descripcion }) {
  try {
    const res = await fetch(EMAIL_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ ticket_id, ticket_titulo, usuario_nombre, empresa, prioridad, descripcion })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Email notify failed:', err);
    }
  } catch (err) {
    console.error('Email notify error:', err);
  }
}
