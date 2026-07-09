import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Método no permitido' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { username, password } = await req.json();
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (!normalizedUsername || !normalizedPassword) {
      return new Response(JSON.stringify({ ok: false, error: 'Usuario y contraseña requeridos' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Configuración del servidor incompleta' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [horasRes, trabajoRes] = await Promise.all([
      supabase.from('client_users').select('id,name,username,client_id,pass').eq('username', normalizedUsername).maybeSingle(),
      supabase.from('work_users').select('id,name,username,client_id,pass').eq('username', normalizedUsername).maybeSingle(),
    ]);

    const matched = horasRes.data || trabajoRes.data;
    const portal = horasRes.data ? 'horas' : trabajoRes.data ? 'trabajo' : null;

    if (!matched || !matched.pass || String(matched.pass) !== normalizedPassword) {
      return new Response(JSON.stringify({ ok: false, error: 'Credenciales inválidas' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      portal,
      clientId: matched.client_id ?? null,
      userId: matched.id ?? null,
      userName: matched.name ?? null,
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('verify-client-login error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Error interno' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
