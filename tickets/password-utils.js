// ── UTILIDADES DE CONTRASEÑA SEGURA ─────────────────────────────────────────
// Usa bcryptjs para hashear y verificar contraseñas de forma segura.
// CDN: https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.js

// Espera a que bcryptjs esté disponible globalmente
let _bcryptReady = false;
const _bcryptPromise = new Promise((resolve) => {
  const checkBcrypt = () => {
    if (typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) {
      _bcryptReady = true;
      resolve();
    } else {
      setTimeout(checkBcrypt, 50);
    }
  };
  checkBcrypt();
});

async function ensureBcryptReady() {
  await _bcryptPromise;
}

// Hashea una contraseña con bcryptjs (12 rounds = ~100ms en navegador moderno)
async function hashPassword(password) {
  await ensureBcryptReady();
  if (!_bcryptReady || typeof dcodeIO === 'undefined') {
    console.warn('bcryptjs no disponible, retornando contraseña sin hashear');
    return password;
  }
  return dcodeIO.bcrypt.hashSync(password, 10);
}

// Verifica una contraseña contra su hash
async function verifyPassword(password, hash) {
  await ensureBcryptReady();
  if (!_bcryptReady || typeof dcodeIO === 'undefined') {
    console.warn('bcryptjs no disponible, verificación fallida');
    return false;
  }
  try {
    return dcodeIO.bcrypt.compareSync(password, hash);
  } catch (e) {
    console.error('Error al verificar contraseña:', e);
    return false;
  }
}

// Comprueba si una contraseña ya está hasheada (empieza con $2a$, $2b$ o $2y$)
function isPasswordHashed(value) {
  return typeof value === 'string' && /^\$2[aby]\$/.test(value);
}
