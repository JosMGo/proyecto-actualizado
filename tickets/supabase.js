// ── Configuración de Supabase ───────────────────────────────────────────────
// SUPABASE_KEY es la "publishable key" (anon): está DISEÑADA para vivir en el
// navegador y es segura de exponer. La seguridad real NO depende de ocultarla,
// sino de las políticas RLS de la base de datos (ver setup.sql).
//
// ⚠ NUNCA pongas aquí la "service_role key" ni ninguna API key privada
//   (Anthropic, WhatsApp, etc.): esas deben vivir SOLO en Edge Functions /
//   variables de entorno del servidor, jamás en código que llega al cliente.
const SUPABASE_URL = 'https://ewcfuyemmxsigvcmpeqd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Z3Wsk5PA7gDtffFr5NCqXA_Ned41lTs';
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
