from __future__ import annotations

import hashlib
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any


def _normalize_numbers(val: Any) -> Any:
    if val is None or isinstance(val, (bool, str)):
        return val
    if isinstance(val, float):
        if val == 0:
            return 0
        if val.is_integer() and abs(val) < 1e21:
            return int(val)
        return val
    if isinstance(val, list):
        return [_normalize_numbers(x) for x in val]
    if isinstance(val, dict):
        return {k: _normalize_numbers(v) for k, v in val.items()}
    return val


def canonical(value: Any) -> str:
    dumped = json.dumps(_normalize_numbers(value), sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return re.sub(r'(?<=[0-9])e([+-])?0*(\d+)(?=[,\]\}]|$)', lambda m: f"e{'-' if m.group(1)=='-' else ''}{m.group(2)}", dumped)


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex}"


def loads(value: str | None) -> Any:
    return json.loads(value) if value is not None else None
