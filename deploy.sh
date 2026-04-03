#!/usr/bin/env bash
set -euo pipefail

HOST="pppp-mint"
BACKEND_REMOTE="/data/dodobox/"
FRONTEND_REMOTE="/data/web/dodobox/"

DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true

# Parse flags: --backend-only / --frontend-only
for arg in "$@"; do
  case $arg in
    --backend-only)  DEPLOY_FRONTEND=false ;;
    --frontend-only) DEPLOY_BACKEND=false ;;
  esac
done

echo "=== Dodobox Deploy ==="

# ── Backend ──────────────────────────────────────────────────────────────
if $DEPLOY_BACKEND; then
  echo "[backend] Building..."
  (cd backend && GOOS=linux GOARCH=amd64 go build -o ../dodobox .)

  echo "[backend] Uploading..."
  scp.exe dodobox "$HOST:${BACKEND_REMOTE}dodobox"

  rm -f dodobox
  echo "[backend] Done."
fi

# ── Frontend ─────────────────────────────────────────────────────────────
if $DEPLOY_FRONTEND; then
  echo "[frontend] Installing dependencies..."
  npm --prefix frontend install --legacy-peer-deps

  echo "[frontend] Building..."
  npm --prefix frontend run build

  echo "[frontend] Uploading..."
  tar -czf - -C frontend/build . | ssh.exe "$HOST" "tar -xzf - -C $FRONTEND_REMOTE --no-same-owner"

  echo "[frontend] Done."
fi

echo "=== Deploy complete ==="
