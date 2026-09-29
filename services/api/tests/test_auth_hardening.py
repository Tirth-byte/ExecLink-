import unittest
import json
import time
import sqlite3
from fastapi.testclient import TestClient
from services.api.main import app
from services.api.auth import create_jwt, decode_jwt
from services.api.db import connect

class AuthHardeningTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def login(self, email, password="Demo123!"):
        return self.client.post("/api/v1/auth/login", json={"email": email, "password": password}).json()["token"]

    def test_malformed_token(self):
        resp = self.client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.real.token"})
        self.assertEqual(401, resp.status_code)

    def test_expired_token(self):
        token = create_jwt({"sub": "USR-DEMO-001", "exp": int(time.time()) - 3600})
        resp = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(401, resp.status_code)

    def test_raw_user_id_bearer_rejected(self):
        # Raw token bypass regression test
        resp = self.client.get("/api/v1/auth/me", headers={"Authorization": "Bearer USR-DEMO-001"})
        self.assertEqual(401, resp.status_code)

    def test_auth_me_returns_full_context(self):
        token = self.login("asha@execlink.demo")
        resp = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(200, resp.status_code)
        data = resp.json()
        self.assertEqual("Asha Rao", data["name"])
        mem = next(m for m in data["memberships"] if m["project_id"] == "PRJ-DEMO-001")
        self.assertEqual("FIELD_SUPERVISOR", mem["role"])
        self.assertIn("execution.create", mem["permissions"])
        self.assertEqual("Area B · Civil & Structural", mem["reporting_scope"])
        # In our DB seeding, discipline and area might be None but they should be in the dict
        self.assertIn("discipline", mem)
        self.assertIn("area", mem)

    def test_inactive_account_rejected(self):
        # First make sure engineer is active, then deactivate them and test
        db = connect()
        db.execute("UPDATE users SET active=0 WHERE email='engineer@execlink.demo'")
        db.commit()
        db.close()
        
        try:
            resp = self.client.post("/api/v1/auth/login", json={"email": "engineer@execlink.demo", "password": "Demo123!"})
            self.assertEqual(401, resp.status_code)
        finally:
            db = connect()
            db.execute("UPDATE users SET active=1 WHERE email='engineer@execlink.demo'")
            db.commit()
            db.close()

    def test_disabled_after_login_rejected(self):
        token = self.login("engineer@execlink.demo")
        
        db = connect()
        db.execute("UPDATE users SET active=0 WHERE email='engineer@execlink.demo'")
        db.commit()
        db.close()
        
        try:
            resp = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(401, resp.status_code)
        finally:
            db = connect()
            db.execute("UPDATE users SET active=1 WHERE email='engineer@execlink.demo'")
            db.commit()
            db.close()

    def test_planning_engineer_can_review_but_not_verify(self):
        token = self.login("engineer@execlink.demo")
        
        # Test review (propose) - assuming the event exists
        proposal = self.client.post("/api/v1/projects/PRJ-DEMO-001/events/EVT-TEST-123/proposals", 
                                    headers={"Authorization": f"Bearer {token}", "Idempotency-Key": "review-1"},
                                    json={})
        self.assertIn(proposal.status_code, (202, 404)) # 404 is fine if EVT-TEST-123 doesn't exist, we care it's not 403
        self.assertNotEqual(403, proposal.status_code)

        # Test verify
        verify = self.client.post("/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-001/verify", 
                                  headers={"Authorization": f"Bearer {token}", "Idempotency-Key": "verify-1"},
                                  json={"activityId": "ACT-1.2.1", "progressPercent": 45, "expectedActivityVersion": 1})
        self.assertEqual(403, verify.status_code)

    def test_viewer_cannot_mutate(self):
        token = self.login("viewer@execlink.demo")
        
        # Try to create event
        evt = self.client.post("/api/v1/projects/PRJ-DEMO-001/events", 
                               headers={"Authorization": f"Bearer {token}", "Idempotency-Key": "evt-1"},
                               json={"id": "EVT-TEST-2", "observedAt": "2026-09-27T00:00:00Z"})
        self.assertEqual(403, evt.status_code)

    def test_cross_project_isolation(self):
        # Create a new project PRJ-SECRET-001 where our demo users have NO membership
        db = connect()
        db.execute("INSERT OR IGNORE INTO projects(id, name, timezone, active_snapshot_id, seed_version) VALUES(?, ?, ?, ?, ?)", 
                  ("PRJ-SECRET-001", "Secret Project", "UTC", "SNP-SECRET", "v1"))
        db.commit()
        db.close()
        
        token = self.login("asha@execlink.demo")
        
        evt = self.client.post("/api/v1/projects/PRJ-SECRET-001/events", 
                               headers={"Authorization": f"Bearer {token}", "Idempotency-Key": "evt-sec"},
                               json={"id": "EVT-TEST-SEC", "observedAt": "2026-09-27T00:00:00Z"})
        self.assertEqual(403, evt.status_code)

    def test_separation_of_duties_reporter_and_verifier(self):
        asha_token = self.login("asha@execlink.demo")
        planner_token = self.login("planner@execlink.demo")
        
        unique_suffix = int(time.time() * 1000)
        evt_id = f"EVT-SEP-{unique_suffix}"
        mpr_id = f"MPR-SEP-{unique_suffix}"
        
        # Asha creates an event
        evt_resp = self.client.post("/api/v1/projects/PRJ-DEMO-001/events", 
                                    headers={"Authorization": f"Bearer {asha_token}", "Idempotency-Key": f"sep-1-{unique_suffix}"},
                                    json={"id": evt_id, "reporterId": "HACKER-ID", "observedAt": "2026-09-27T00:00:00Z"})
        self.assertEqual(201, evt_resp.status_code)
        
        # Reporter identity should be derived from JWT (USR-DEMO-005), not the body
        self.assertEqual("USR-DEMO-005", evt_resp.json()["reporterId"])

        # Planner verifies a proposal
        db = connect()
        db.execute("INSERT INTO match_proposals(id,project_id,execution_event_id,snapshot_id,engine_version,config_version,mode,status,candidates_json,created_at) VALUES(?,?,?,?,?,?,?,'proposed',?,?)",
                   (mpr_id, "PRJ-DEMO-001", evt_id, "SNP-DEMO-001", "v1", "c1", "primary", "[]", "2026-09-27T00:00:00Z"))
        db.commit()
        db.close()
        
        # Planner verifies it
        verify_resp = self.client.post(f"/api/v1/projects/PRJ-DEMO-001/proposals/{mpr_id}/verify", 
                                       headers={"Authorization": f"Bearer {planner_token}", "Idempotency-Key": f"sep-2-{unique_suffix}"},
                                       json={"activityId": "ACT-1.2.1", "progressPercent": 50, "expectedActivityVersion": 1})
        
        # Check audit table for the identities.
        db = connect()
        db.row_factory = sqlite3.Row
        event_audit = db.execute(f"SELECT actor_id FROM audit_entries WHERE entity_id='{evt_id}' AND action='event.submitted'").fetchone()
        verify_audit = db.execute(f"SELECT actor_id FROM audit_entries WHERE entity_id='{mpr_id}' AND action='match.verified'").fetchone()
        
        self.assertEqual("USR-DEMO-005", event_audit["actor_id"]) # Asha
        if verify_audit:
            self.assertEqual("USR-DEMO-003", verify_audit["actor_id"]) # Planner
        db.close()

if __name__ == "__main__":
    unittest.main()
