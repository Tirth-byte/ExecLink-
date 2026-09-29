#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${EXECLINK_API_BASE_URL:-http://127.0.0.1:8000/api/v1}"
FAILED=0

status() {
  printf '%-22s %s\n' "$1" "$2"
  [[ "$2" == "PASS" ]] || FAILED=1
}

echo "ExecLink Development Preflight"
echo

if lsof -nP -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
  status "API process" "PASS"
else
  status "API process" "FAIL"
fi

if curl --silent --fail --max-time 3 "$BASE_URL/health" >/dev/null; then
  status "Health" "PASS"
else
  status "Health" "FAIL"
fi

AUTH_CODE=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 5 \
  -H 'Content-Type: application/json' \
  -d '{"email":"asha@execlink.demo","password":"Demo123!"}' \
  "$BASE_URL/auth/login" 2>/dev/null || true)
if [[ "$AUTH_CODE" == "200" ]]; then
  status "Authentication" "PASS"
else
  status "Authentication" "FAIL"
fi

echo
if (( FAILED == 0 )); then
  echo "Ready for Flutter."
else
  echo "Start:"
  echo "cd $ROOT && ./scripts/dev.sh"
fi

exit "$FAILED"
