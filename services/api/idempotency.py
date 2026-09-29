from __future__ import annotations

import json
import sqlite3
from typing import Any

from .errors import ApiProblem
from .util import canonical, digest, now


def replay(db: sqlite3.Connection, project_id: str, actor_id: str, route: str, key: str, body: Any) -> tuple[int, Any] | None:
    row = db.execute(
        "SELECT request_hash,response_json,response_status FROM idempotency_records WHERE project_id=? AND actor_id=? AND route=? AND key=?",
        (project_id, actor_id, route, key),
    ).fetchone()
    if not row:
        return None
    if row["request_hash"] != digest(body):
        raise ApiProblem(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was already used with a different request")
    return row["response_status"], json.loads(row["response_json"])


def store(db: sqlite3.Connection, project_id: str, actor_id: str, route: str, key: str, body: Any, status: int, response: Any) -> None:
    db.execute(
        "INSERT INTO idempotency_records VALUES(?,?,?,?,?,?,?,?)",
        (project_id, actor_id, route, key, digest(body), canonical(response), status, now()),
    )
