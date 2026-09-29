#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=8000
HEALTH_URL="http://127.0.0.1:${PORT}/api/v1/health"
API_PID=""

cleanup() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ExecLink API cannot start: port $PORT is already occupied."
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN
  exit 1
fi

command -v python3 >/dev/null || { echo "python3 is required."; exit 1; }
cd "$ROOT"

export EXECLINK_JWT_SECRET="${EXECLINK_JWT_SECRET:-execlink-local-development-only}"

echo "ExecLink API starting..."
if python3 -c 'from services.api.db import database_settings; raise SystemExit(0 if database_settings().engine == "sqlite" else 1)'; then
  python3 -m services.api.verification_seed --seed-version demo-v1
else
  echo "PostgreSQL configured; expecting explicit migrate/seed commands to be complete."
fi
python3 -m uvicorn services.api.main:app --host 0.0.0.0 --port "$PORT" &
API_PID=$!

for _ in {1..50}; do
  if curl --silent --fail --max-time 1 "$HEALTH_URL" >/dev/null; then
    echo "API ready: http://127.0.0.1:$PORT/api/v1"
    echo "Health: PASS"
    wait "$API_PID"
    exit $?
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    wait "$API_PID"
    exit $?
  fi
  sleep 0.1
done

echo "ExecLink API failed its health check: $HEALTH_URL"
exit 1
