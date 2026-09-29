from __future__ import annotations

import argparse
import sys

from .audit import verify_chain
from .auth import ROLE_PERMISSIONS, normalize_role, verify_password
from .db import connect, database_settings, initialise, migrate
from .verification_seed import seed_demo

PROJECT_ID = "PRJ-DEMO-001"


def _require_postgres() -> None:
    if database_settings().engine != "postgresql":
        raise RuntimeError("This command requires a postgresql:// DATABASE_URL.")


def verify_database() -> dict[str, int | str]:
    db = connect()
    try:
        initialise(db)
        project = db.execute("SELECT id, active_snapshot_id FROM projects WHERE id=?", (PROJECT_ID,)).fetchone()
        if not project:
            raise RuntimeError("Demo project is missing; run the seed command first.")
        asha = db.execute("SELECT id, password_hash, active FROM users WHERE email=?", ("asha@execlink.demo",)).fetchone()
        if not asha or not asha["active"] or not verify_password("Demo123!", asha["password_hash"]):
            raise RuntimeError("Seeded Asha credentials are invalid.")
        membership = db.execute(
            "SELECT role, active FROM memberships WHERE project_id=? AND user_id=?",
            (PROJECT_ID, asha["id"]),
        ).fetchone()
        if not membership or not membership["active"]:
            raise RuntimeError("Seeded Asha membership is invalid.")
        role = normalize_role(membership["role"])
        if "execution.create" not in ROLE_PERMISSIONS.get(role, []):
            raise RuntimeError("Seeded Asha role does not retain field reporting permission.")
        counts = {
            table: db.execute(f"SELECT COUNT(*) FROM {table} WHERE project_id=?", (PROJECT_ID,)).fetchone()[0]
            for table in ("activities", "execution_events", "match_proposals")
        }
        if min(counts.values()) < 1:
            raise RuntimeError("Golden-path seed data is incomplete.")
        chain = verify_chain(db, PROJECT_ID)
        if not chain["valid"]:
            raise RuntimeError(f"Audit chain is invalid: {chain['reason']}")
        return {"engine": db.engine, **counts, "auditEntries": chain["entriesChecked"]}
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="ExecLink database administration")
    parser.add_argument("command", choices=("migrate", "seed", "verify"))
    args = parser.parse_args()
    try:
        _require_postgres()
        db = connect()
        try:
            if args.command == "migrate":
                applied = migrate(db)
                print(f"PostgreSQL migrations applied: {len(applied)}")
                return
            initialise(db)
            if args.command == "seed":
                inserted = seed_demo(db)
                print("Demo seed inserted." if inserted else "Demo seed already present; no changes made.")
                return
        finally:
            db.close()
        result = verify_database()
        print(
            "Database verified: "
            f"activities={result['activities']}, events={result['execution_events']}, "
            f"proposals={result['match_proposals']}, audit={result['auditEntries']}"
        )
    except Exception as exc:
        print(f"Database command failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
