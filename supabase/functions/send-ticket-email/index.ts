// ── NOTIFICACIÓN DE TICKETS POR SMTP (Banahost) ────────────────────────────
// Reemplazo de EmailJS: envía el correo directamente vía SMTP usando la
// cuenta de correo de Banahost, evitando la dependencia OAuth de EmailJS.
//
// Secrets requeridos en Supabase Dashboard → Project Settings → Edge Functions:
//   SMTP_HOST     — ej: mail.sirtsc.com
//   SMTP_PORT     — ej: 465 (SSL) o 587 (TLS)
//   SMTP_USER     — sistemas@sirtsc.com
//   SMTP_PASS     — contraseña de esa cuenta de correo
//   NOTIFY_TO     — destinatario(s) de las notificaciones, ej: sistemas@sirtsc.com

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const PRIO_LABEL: Record<string, string> = {
  alta: 'Alta', media: 'Media', baja: 'Baja',
  low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { ticket_id, ticket_titulo, usuario_nombre, empresa, prioridad, descripcion } = await req.json();

    if (!ticket_id || !ticket_titulo) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos del ticket' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const HOST = Deno.env.get('SMTP_HOST')!;
    const PORT = Number(Deno.env.get('SMTP_PORT') ?? '465');
    const USER = Deno.env.get('SMTP_USER')!;
    const PASS = Deno.env.get('SMTP_PASS')!;
    const TO   = Deno.env.get('NOTIFY_TO') ?? USER;

    const client = new SMTPClient({
      connection: {
        hostname: HOST,
        port: PORT,
        tls: PORT === 465,
        auth: { username: USER, password: PASS },
      },
    });

    const prioLabel = PRIO_LABEL[String(prioridad).toLowerCase()] ?? prioridad;

    await client.send({
      from: USER,
      to: TO,
      subject: `Nuevo ticket ${ticket_id}: ${ticket_titulo}`,
      content: 'auto',
      html: `
        <h2>Nuevo ticket ${ticket_id}</h2>
        <p><b>Asunto:</b> ${ticket_titulo}</p>
        <p><b>Empresa:</b> ${empresa ?? '—'}</p>
        <p><b>Usuario:</b> ${usuario_nombre ?? '—'}</p>
        <p><b>Prioridad:</b> ${prioLabel ?? '—'}</p>
        <p><b>Descripción:</b><br>${(descripcion ?? 'Sin descripción').replace(/\n/g, '<br>')}</p>
      `,
    });

    await client.close();

    return new Response(
      JSON.stringify({ ok: true }),
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
