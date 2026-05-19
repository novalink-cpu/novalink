#!/usr/bin/env bash
# Production frontend build — run on Vultr app server or CI
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

: "${VITE_API_BASE_URL:?Set VITE_API_BASE_URL=https://api.domain.com in .env}"

export VITE_BASE_PATH="${VITE_BASE_PATH:-/}"
npm ci
npm run build
echo "Built to dist/ — copy or symlink to /var/www/novalink/dist"
