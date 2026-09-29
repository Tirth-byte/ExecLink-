from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

from .db import ROOT, connect, initialise, transaction
from .util import canonical

DEMO = ROOT / "data" / "demo"
TABLES = ("outbox_events", "audit_entries", "idempotency_records", "verifications", "match_proposals", "execution_events", "activities", "schedule_snapshots", "memberships", "users", "projects")

def reset_demo(db: sqlite3.Connection) -> None:
    project_doc = json.loads((DEMO / "project.json").read_text())
    activities = json.loads((DEMO / "schedule-activities.json").read_text())
    events = json.loads((DEMO / "execution-events.json").read_text())
    proposals = json.loads((DEMO / "match-proposals.json").read_text())
    source_hash = hashlib.sha256(b"".join((DEMO / name).read_bytes() for name in ("project.json", "schedule-activities.json"))).hexdigest()
    with transaction(db):
        for table in TABLES:
            db.execute(f"DELETE FROM {table}")
        project = project_doc["project"]
        db.execute("INSERT INTO projects VALUES(?,?,?,?,?)", (project["id"], project["name"], project["timezone"], project["activeSnapshotId"], project_doc["seedVersion"]))
        
        from services.api.auth import hash_password
        pwd_hash = hash_password("Demo123!")
        
        for user in project_doc["users"]:
            if user["id"] == "USR-DEMO-001": email = "admin@execlink.demo"
            elif user["id"] == "USR-DEMO-002": email = "manager@execlink.demo"
            elif user["id"] == "USR-DEMO-003": email = "planner@execlink.demo"
            elif user["id"] == "USR-DEMO-004": email = "engineer@execlink.demo"
            elif user["id"] == "USR-DEMO-005": email = "asha@execlink.demo"
            else: email = "viewer@execlink.demo"
            db.execute("INSERT INTO users(id, full_name, email, password_hash, active) VALUES(?,?,?,?,1)", (user["id"], user["name"], email, pwd_hash))
            scope = "Area B · Civil & Structural" if user["id"] == "USR-DEMO-005" else None
            db.execute("INSERT INTO memberships(project_id, user_id, role, active, reporting_scope) VALUES(?,?,?,1,?)", (project["id"], user["id"], user["role"], scope))
            
        db.execute("INSERT INTO schedule_snapshots VALUES(?,?,?,?)", (project["activeSnapshotId"], project["id"], "2026-09-26T00:00:00Z", source_hash))
        for item in activities:
            db.execute(
                "INSERT INTO activities(id,project_id,snapshot_id,wbs,level,name,discipline,work_type,asset_id,location_json,planned_start,planned_finish,planned_quantity_json,actual_progress_percent,version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)",
                (item["id"], item["projectId"], item["snapshotId"], item["wbs"], item["level"], item["name"], item["discipline"], item["workType"], item["assetId"], canonical(item["location"]), item["plannedStart"], item["plannedFinish"], canonical(item.get("plannedQuantity")) if item.get("plannedQuantity") else None, item["actualProgressPercent"]),
            )
        for item in events:
            db.execute(
                "INSERT INTO execution_events(id,project_id,reporter_id,observed_at,received_at,evidence_json,extracted_facts_json,status) VALUES(?,?,?,?,?,?,?,?)",
                (item["id"], item["projectId"], item["reporterId"], item["observedAt"], item["receivedAt"], canonical(item["evidence"]), canonical(item["extractedFacts"]), item["status"]),
            )
        for item in proposals:
            db.execute(
                "INSERT INTO match_proposals(id,project_id,execution_event_id,snapshot_id,engine_version,config_version,mode,status,candidates_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (item["id"], item["projectId"], item["executionEventId"], item["snapshotId"], item["engineVersion"], item["configVersion"], item["mode"], item["status"], canonical(item["candidates"]), item["createdAt"]),
            )
            db.execute("UPDATE execution_events SET status='proposed' WHERE id=?", (item["executionEventId"],))

def main() -> None:
    parser = argparse.ArgumentParser(description="Reset ExecLink's deterministic pre-verification demo database")
    parser.add_argument("--database", type=Path)
    parser.add_argument("--seed-version", default="demo-v1", choices=["demo-v1"])
    args = parser.parse_args()
    db = connect(args.database)
    initialise(db)
    reset_demo(db)
    print(f"Reset {args.seed_version} at {args.database or 'services/api/execlink.db'}")

if __name__ == "__main__":
    main()
