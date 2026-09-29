import json
from pathlib import Path

content = Path("verification_seed.py").read_text()

replacement = """
        for user in project_doc["users"]:
            email = f"{user['name'].split()[0].lower()}@execlink.demo"
            db.execute(
                "INSERT INTO users(id, full_name, email, password_hash, active) VALUES(?,?,?,?,1)",
                (user["id"], user["name"], email, "pbkdf2:sha256:100000$demo$f9e830e20f2eb1179fb323ce90c4fb3158c353f06915b222c34d40232fbafb4d")
            )
            db.execute(
                "INSERT INTO memberships(project_id, user_id, role, active) VALUES(?,?,?,1)",
                (project["id"], user["id"], user["role"])
            )

        # Ensure our specific demo users exist
        demo_users = [
            ("USR-DEMO-001", "Admin User", "admin@execlink.demo", "ADMIN"),
            ("USR-DEMO-002", "Project Manager", "manager@execlink.demo", "PROJECT_MANAGER"),
            ("USR-DEMO-003", "Lead Planner", "planner@execlink.demo", "LEAD_PLANNER"),
            ("USR-DEMO-004", "Planning Engineer", "engineer@execlink.demo", "PLANNING_ENGINEER"),
            ("USR-DEMO-005", "Asha Rao", "asha@execlink.demo", "FIELD_SUPERVISOR"),
            ("USR-DEMO-006", "Viewer Stakeholder", "viewer@execlink.demo", "VIEWER")
        ]

        from services.api.auth import hash_password
        pwd_hash = hash_password("Demo123!")

        # They should belong to PRJ-DEMO-001
        db.execute("INSERT OR IGNORE INTO projects(id, name, timezone, active_snapshot_id, seed_version) VALUES(?, ?, ?, ?, ?)", 
                  ("PRJ-DEMO-001", "North River Expansion", "Asia/Kolkata", "SNP-DEMO-001", project_doc["seedVersion"]))
        # Give PRJ-DEMO-001 the same snapshot
        db.execute("INSERT OR IGNORE INTO schedule_snapshots VALUES(?,?,?,?)", ("SNP-DEMO-001", "PRJ-DEMO-001", "2026-09-26T00:00:00Z", source_hash))

        for (u_id, u_name, u_email, u_role) in demo_users:
            db.execute(
                "INSERT OR IGNORE INTO users(id, full_name, email, password_hash, active) VALUES(?,?,?,?,1)",
                (u_id, u_name, u_email, pwd_hash)
            )
            scope = "Area B · Civil & Structural" if u_id == "USR-DEMO-005" else None
            db.execute(
                "INSERT OR IGNORE INTO memberships(project_id, user_id, role, active, reporting_scope) VALUES(?,?,?,1,?)",
                ("PRJ-DEMO-001", u_id, u_role, scope)
            )
            db.execute(
                "INSERT OR IGNORE INTO memberships(project_id, user_id, role, active) VALUES(?,?,?,1)",
                ("PRJ-METRO-001", u_id, u_role)
            )
"""

content = content.replace("""        for user in project_doc["users"]:
            db.execute("INSERT INTO users VALUES(?,?)", (user["id"], user["name"]))
            db.execute("INSERT INTO memberships VALUES(?,?,?)", (project["id"], user["id"], user["role"]))""", replacement)

Path("verification_seed.py").write_text(content)
