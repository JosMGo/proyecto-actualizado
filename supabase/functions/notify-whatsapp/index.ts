
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { event_type, ticket, client_name, to_phone } = await req.json();

    const TOKEN    = Deno.env.get('WHATSAPP_TOKEN')!;
    const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!;
    const ADMIN    = Deno.env.get('ADMIN_PHONE')!;

    const destination = to_phone ?? ADMIN;

    let template: object;

    if (event_type === 'new_ticket') {
      // Template: "Nuevo ticket {{1}} de *{{2}}*\nAsunto: {{3}}\nPrioridad: {{4}}"
      template = {
        name: 'sirt_nuevo_ticket',
        language: { code: 'es' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: String(ticket.id) },
            { type: 'text', text: client_name },
            { type: 'text', text: ticket.title },
            { type: 'text', text: ticket.prio },
          ],
        }],
      };
    } else if (event_type === 'status_change') {
      // Template: "Ticket {{1}} actualizado\nAsunto: {{2}}\nEstado: *{{3}}*\nEmpresa: {{4}}"
      template = {
        name: 'sirt_cambio_estado',
        language: { code: 'es' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: String(ticket.id) },
            { type: 'text', text: ticket.title },
            { type: 'text', text: ticket.status },
            { type: 'text', text: client_name },
          ],
        }],
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'event_type inválido' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const waRes = await fetch(
      `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: destination,
          type: 'template',
          template,
        }),
      }
    );

    const data = await waRes.json();

    if (!waRes.ok) {
      console.error('Meta API error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Error al enviar WhatsApp', detail: data }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, message_id: data.messages?.[0]?.id }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
