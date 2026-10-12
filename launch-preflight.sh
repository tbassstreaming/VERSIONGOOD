#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
echo "T-BASS V19 preflight"
command -v node >/dev/null || { echo "ERROR: Node.js is required"; exit 1; }
node --check server.js
test -f package.json
test -f Dockerfile
test -f docker-compose.yml
test -f public/index.html
test -f public/dashboard.html
mkdir -p data/uploads
if [[ "${NODE_ENV:-}" == "production" ]]; then
  : "${TBASS_ADMIN_PASSWORD:?Set TBASS_ADMIN_PASSWORD in production}"
  : "${SESSION_SECRET:?Set SESSION_SECRET in production}"
  if [[ "${TBASS_ADMIN_PASSWORD}" == "TBASS@2026!" ]]; then
    echo "ERROR: Change the demo admin password before production."
    exit 1
  fi
  if [[ "${SESSION_SECRET}" == "CHANGE_THIS_SESSION_SECRET" ]]; then
    echo "ERROR: Change SESSION_SECRET before production."
    exit 1
  fi
fi
echo "PASS: syntax, required files, storage path, and production secret checks."
