// ── WHATSAPP META CLOUD NOTIFICATIONS ──────────────────────────────────────
// Invoca la Supabase Edge Function que llama a Meta Cloud API.
//
// Secrets requeridos en Supabase Dashboard → Project Settings → Edge Functions:
//   WHATSAPP_TOKEN           — Access token permanente de Meta Business
//   WHATSAPP_PHONE_NUMBER_ID — ID del número de WhatsApp Business
//   ADMIN_PHONE              — Número del admin con código de país (ej: 59170297903)
//
// Templates requeridos en Meta Business Manager → WhatsApp → Plantillas:
//   sirt_nuevo_ticket   → Cuerpo: "Nuevo ticket {{1}} de *{{2}}*\nAsunto: {{3}}\nPrioridad: {{4}}"
//   sirt_cambio_estado  → Cuerpo: "Ticket {{1}} actualizado\nAsunto: {{2}}\nEstado: *{{3}}*\nEmpresa: {{4}}"

const WA_FN_URL = `${SUPABASE_URL}/functions/v1/notify-whatsapp`;

async function notifyWhatsApp(eventType, ticket, clientName, toPhone = null) {
  try {
    const res = await fetch(WA_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        event_type:  eventType,
        ticket,
        client_name: clientName,
        to_phone:    toPhone
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('WhatsApp notify failed:', err);
    }
  } catch (err) {
    console.error('WhatsApp notify error:', err);
  }
}
