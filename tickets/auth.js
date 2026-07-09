// Los usuarios admin se gestionan en Supabase Authentication.
// Los usuarios cliente se gestionan en la tabla client_users.

// ── CONFIGURACIÓN DE BLOQUEO ────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCK_MS      = 15 * 60 * 1000; // 15 minutos

// ── BLOQUEO POR FUERZA BRUTA ────────────────────────────────────────────────

function _lockKey(portal) {
  return `soporte_lock_${portal}`;
}

function getLockData(portal) {
  try {
    return JSON.parse(localStorage.getItem(_lockKey(portal))) || { attempts: 0, lockedUntil: null };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function _saveLockData(portal, data) {
  localStorage.setItem(_lockKey(portal), JSON.stringify(data));
}

// Devuelve el timestamp de desbloqueo si sigue bloqueado, o false si no lo está.
function checkLock(portal) {
  const d = getLockData(portal);
  if (!d.lockedUntil) return false;
  if (Date.now() < d.lockedUntil) return d.lockedUntil;
  _saveLockData(portal, { attempts: 0, lockedUntil: null }); // expiró, limpiar
  return false;
}

// Registra un intento fallido. Devuelve el estado actualizado.
function registerFail(portal) {
  const d = getLockData(portal);
  d.attempts = (d.attempts || 0) + 1;
  if (d.attempts >= MAX_ATTEMPTS) d.lockedUntil = Date.now() + LOCK_MS;
  _saveLockData(portal, d);
  return d;
}

function resetLock(portal) {
  _saveLockData(portal, { attempts: 0, lockedUntil: null });
}

// ── SESIÓN ──────────────────────────────────────────────────────────────────

const AUTH_KEY = 'soporte_auth';

function getAuth() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_KEY)); } catch { return null; }
}

function setAuth(data) {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

function requireAuth(expectedRole, redirectUrl) {
  const auth = getAuth();
  if (!auth || auth.role !== expectedRole) {
    window.location.replace(redirectUrl);
    return null;
  }
  return auth;
}

async function logout() {
  if (typeof _sb !== 'undefined') try { await _sb.auth.signOut(); } catch (e) { console.warn('logout:', e); }
  sessionStorage.removeItem(AUTH_KEY);
  const isAdmin = window.location.href.includes('admin');
  window.location.href = isAdmin ? 'login-admin.html' : 'login-client.html';
}
