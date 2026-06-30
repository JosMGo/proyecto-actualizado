#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  SIRT — Script de despliegue a un VPS con HestiaCP (vía rsync sobre SSH)
#  Sube SOLO los archivos estáticos. El backend vive en Supabase.
#
#  Uso:
#    1. Edita las variables de CONFIGURACIÓN de abajo.
#    2. Asegúrate de tener acceso SSH por clave al VPS (sin contraseña).
#    3. Ejecuta:  bash scripts/deploy.sh
#
#  Requiere: rsync y ssh en tu máquina local (en Windows: Git Bash o WSL).
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── CONFIGURACIÓN (edita esto) ──────────────────────────────────────────────
VPS_USER="tu_usuario_hestia"
VPS_HOST="tu.servidor.com"           # IP o dominio del VPS

# Arquitectura: "subcarpeta" o "subdominio"
MODO="subdominio"

# Rutas de public_html en el VPS (HestiaCP las crea así):
#   /home/<usuario>/web/<dominio>/public_html
SITIO_REMOTE="/home/${VPS_USER}/web/tudominio.com/public_html"
APP_REMOTE="/home/${VPS_USER}/web/app.tudominio.com/public_html"   # solo modo subdominio
# En modo "subcarpeta", la app va dentro del sitio:
APP_SUBCARPETA="${SITIO_REMOTE}/tickets"
# ────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

# Archivos que NUNCA se suben
EXCLUDES=(
  --exclude ".git"
  --exclude "node_modules"
  --exclude ".DS_Store"
  --exclude "Thumbs.db"
  --exclude "*.md"
  --exclude "*.sql"
)

echo "▶ Desplegando SIRT a ${VPS_USER}@${VPS_HOST} (modo: ${MODO})"

# 1) Sitio público → dominio principal
echo "  → Subiendo sirt/ a ${SITIO_REMOTE}"
rsync -avz --delete "${EXCLUDES[@]}" \
  "sirt/" "${VPS_USER}@${VPS_HOST}:${SITIO_REMOTE}/"

# 2) App de tickets → destino según el modo
if [ "$MODO" = "subdominio" ]; then
  echo "  → Subiendo tickets/ a ${APP_REMOTE}"
  rsync -avz --delete "${EXCLUDES[@]}" \
    "tickets/" "${VPS_USER}@${VPS_HOST}:${APP_REMOTE}/"
elif [ "$MODO" = "subcarpeta" ]; then
  echo "  → Subiendo tickets/ a ${APP_SUBCARPETA}"
  ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p '${APP_SUBCARPETA}'"
  rsync -avz --delete "${EXCLUDES[@]}" \
    "tickets/" "${VPS_USER}@${VPS_HOST}:${APP_SUBCARPETA}/"
else
  echo "✗ MODO inválido: usa 'subcarpeta' o 'subdominio'." >&2
  exit 1
fi

echo "✓ Despliegue completado."
echo "  Recuerda: SSL forzado en HestiaCP + dominios en Supabase Auth (Redirect URLs)."
