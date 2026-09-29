from __future__ import annotations

import hashlib
import json
import sqlite3
from typing import Any

from .util import canonical

GENESIS_HASH = "0" * 64


def append_entry(
    db: sqlite3.Connection, *, project_id: str, actor_id: str, action: str,
    entity_type: str, entity_id: str, occurred_at: str, request_id: str,
    payload: dict[str, Any],
) -> tuple[int, str]:
    previous = db.execute(
        "SELECT sequence, entry_hash FROM audit_entries WHERE project_id=? ORDER BY sequence DESC LIMIT 1",
        (project_id,),
    ).fetchone()
    sequence = (previous["sequence"] + 1) if previous else 1
    previous_hash = previous["entry_hash"] if previous else GENESIS_HASH
    chain_payload = {
        "previousHash": previous_hash,
        "sequence": sequence,
        "actor": actor_id,
        "action": action,
        "entity": {"type": entity_type, "id": entity_id},
        "timestamp": occurred_at,
        "requestId": request_id,
        "payload": payload,
    }
    serialized = canonical(chain_payload)
    entry_hash = hashlib.sha256(serialized.encode()).hexdigest()
    db.execute(
        "INSERT INTO audit_entries(project_id,sequence,previous_hash,entry_hash,canonical_payload,actor_id,action,entity_type,entity_id,occurred_at,request_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (project_id, sequence, previous_hash, entry_hash, serialized, actor_id, action, entity_type, entity_id, occurred_at, request_id),
    )
    return sequence, entry_hash


def verify_chain(db: sqlite3.Connection, project_id: str) -> dict[str, Any]:
    rows = db.execute(
        "SELECT * FROM audit_entries WHERE project_id=? ORDER BY sequence", (project_id,)
    ).fetchall()
    expected_previous = GENESIS_HASH
    for expected_sequence, row in enumerate(rows, start=1):
        try:
            decoded = json.loads(row["canonical_payload"])
        except (TypeError, json.JSONDecodeError):
            return _invalid(row, "INVALID_CANONICAL_PAYLOAD")
        calculated = hashlib.sha256(canonical(decoded).encode()).hexdigest()
        if row["sequence"] != expected_sequence:
            return _invalid(row, "SEQUENCE_GAP")
        if row["previous_hash"] != expected_previous or decoded.get("previousHash") != expected_previous:
            return _invalid(row, "PREVIOUS_HASH_MISMATCH")
        if decoded.get("sequence") != expected_sequence:
            return _invalid(row, "PAYLOAD_SEQUENCE_MISMATCH")
        if calculated != row["entry_hash"]:
            return _invalid(row, "ENTRY_HASH_MISMATCH")
        expected_previous = row["entry_hash"]
    return {"valid": True, "entriesChecked": len(rows), "lastHash": expected_previous}


def _invalid(row: sqlite3.Row, reason: str) -> dict[str, Any]:
    return {"valid": False, "entriesChecked": max(0, int(row["sequence"]) - 1), "failedSequence": row["sequence"], "reason": reason}
