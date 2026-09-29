#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVICE_ID="${1:-}"

"$ROOT/scripts/check-dev.sh"

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
print(f'{d["id"]}|{"simulator" if d.get("emulator") else "physical"}')
PY
)

DEVICE_ID="${DEVICE_INFO%%|*}"
DEVICE_KIND="${DEVICE_INFO##*|}"

if [[ "$DEVICE_KIND" == "simulator" ]]; then
  API_HOST="127.0.0.1"
else
  ROUTE_IFACE=$(route -n get default 2>/dev/null | awk '/interface:/{print $2}')
  API_HOST=$(ipconfig getifaddr "$ROUTE_IFACE" 2>/dev/null || true)
  if [[ -z "$API_HOST" ]]; then
    echo "Could not determine the Mac LAN IP. Pass the Flutter command an explicit EXECLINK_API_BASE_URL."
    exit 1
  fi
fi

API_URL="http://${API_HOST}:8000/api/v1"
if ! curl --silent --fail --max-time 3 "$API_URL/health" >/dev/null; then
  echo "Selected device API is not reachable from the Mac: $API_URL"
  exit 1
fi

echo "Launching ExecLink Field"
echo "Device: $DEVICE_ID ($DEVICE_KIND)"
echo "API: $API_URL"
cd "$ROOT/apps/field"
exec flutter run -d "$DEVICE_ID" \
  --dart-define="EXECLINK_API_BASE_URL=$API_URL" \
  --dart-define=EXECLINK_ENVIRONMENT=development
