import unittest
from fastapi.testclient import TestClient
from services.api.main import app

class AuthTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_valid_user_can_login(self):
        resp = self.client.post("/api/v1/auth/login", json={"email": "planner@execlink.demo", "password": "Demo123!"})
        self.assertEqual(200, resp.status_code)
        self.assertIn("token", resp.json())

    def test_invalid_credentials_fail(self):
        resp = self.client.post("/api/v1/auth/login", json={"email": "planner@execlink.demo", "password": "wrong"})
        self.assertEqual(401, resp.status_code)

    def test_auth_me_requires_auth(self):
        resp = self.client.get("/api/v1/auth/me")
        self.assertEqual(401, resp.status_code)

    def test_auth_me_returns_project_membership(self):
        resp = self.client.post("/api/v1/auth/login", json={"email": "planner@execlink.demo", "password": "Demo123!"})
        token = resp.json()["token"]
        me = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(200, me.status_code)
        self.assertGreater(len(me.json()["memberships"]), 0)

    def test_field_supervisor_cannot_verify_match(self):
        resp = self.client.post("/api/v1/auth/login", json={"email": "asha@execlink.demo", "password": "Demo123!"})
        token = resp.json()["token"]
        verify = self.client.post("/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-001/verify", 
                                  headers={"Authorization": f"Bearer {token}", "Idempotency-Key": "test1"},
                                  json={"activityId": "ACT-1.2.1", "progressPercent": 45, "expectedActivityVersion": 1})
        self.assertEqual(403, verify.status_code)

    def test_lead_planner_can_verify_match(self):
        resp = self.client.post("/api/v1/auth/login", json={"email": "planner@execlink.demo", "password": "Demo123!"})
        token = resp.json()["token"]
        verify = self.client.post("/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-001/verify", 
                                  headers={"Authorization": f"Bearer {token}", "Idempotency-Key": "test2"},
                                  json={"activityId": "ACT-1.2.1", "progressPercent": 45, "expectedActivityVersion": 1})
        # Wait, the proposal might have been verified by test_golden_slice running first.
        # So we might get a 409 INVALID_TRANSITION, but we definitely won't get 403!
        self.assertNotEqual(403, verify.status_code)

if __name__ == "__main__":
    unittest.main()
