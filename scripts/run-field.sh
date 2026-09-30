#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVICE_ID="${1:-}"
API_URL="${EXECLINK_API_BASE_URL:-https://execlink-api.onrender.com/api/v1}"
APP_ENVIRONMENT="${EXECLINK_ENVIRONMENT:-production}"

DEVICE_JSON=$(cd "$ROOT/apps/field" && flutter devices --machine)
DEVICE_INFO=$(DEVICE_JSON="$DEVICE_JSON" DEVICE_ID="$DEVICE_ID" python3 - <<'PY'
import json, os, sys
devices = [d for d in json.loads(os.environ["DEVICE_JSON"]) if d.get("targetPlatform") == "ios" and d.get("isSupported")]
requested = os.environ["DEVICE_ID"]
if requested:
    devices = [d for d in devices if d.get("id") == requested]
if len(devices) != 1:
    print("Expected exactly one iOS device. Pass its device ID: ./scripts/run-field.sh <device-id>", file=sys.stderr)
    sys.exit(1)
d = devices[0]
print(d["id"])
PY
)

if ! curl --silent --fail --max-time 3 "$API_URL/health" >/dev/null; then
  echo "Configured ExecLink API is not reachable: $API_URL"
  exit 1
fi

echo "Launching ExecLink Field"
echo "Device: $DEVICE_INFO"
echo "API: $API_URL"
cd "$ROOT/apps/field"
exec flutter run -d "$DEVICE_INFO" \
  --dart-define="EXECLINK_API_BASE_URL=$API_URL" \
  --dart-define="EXECLINK_ENVIRONMENT=$APP_ENVIRONMENT"
