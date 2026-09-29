"""Runtime integration checks implementing QA-R01 through QA-R11.
Exercises the golden slice end-to-end against real subsystem code.
"""
from __future__ import annotations

import asyncio
import json
import os
import tempfile
import unittest
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from services.api.db import connect, initialise
from services.api.main import app
from services.api.verification_seed import reset_demo
from services.intelligence.models import ExecutionEvent as IntelEvent, ScheduleActivity as IntelActivity
from services.intelligence.pipeline import IntelligencePipeline



class RuntimeIntegrationChecks(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp.name) / "test_qa_runtime.db"
        os.environ["EXECLINK_DATABASE"] = str(self.db_path)
        db = connect(self.db_path)
        initialise(db)
        reset_demo(db)
        db.close()
        self.admin_token = self.login("admin@execlink.demo")
        self.planner_token = self.login("planner@execlink.demo")
        self.supervisor_token = self.login("asha@execlink.demo")

    def tearDown(self) -> None:
        self.temp.cleanup()

    async def asgi_call(self, method: str, path: str, headers: dict = None, body: dict = None, query: str = "") -> tuple[int, any]:
        headers = headers or {}
        body_bytes = json.dumps(body).encode("utf-8") if body is not None else b""
        if body is not None and "content-type" not in [k.lower() for k in headers]:
            headers["content-type"] = "application/json"

        raw_headers = [(k.lower().encode("latin-1"), v.encode("latin-1")) for k, v in headers.items()]

        scope = {
            "type": "http",
            "http_version": "1.1",
            "method": method,
            "path": path,
            "raw_path": path.encode("latin-1"),
            "query_string": query.encode("latin-1"),
            "headers": raw_headers,
        }

        response_status = None
        response_body = []

        async def receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}

        async def send(message):
            nonlocal response_status, response_body
            if message["type"] == "http.response.start":
                response_status = message["status"]
            elif message["type"] == "http.response.body":
                response_body.append(message.get("body", b""))

        await app(scope, receive, send)
        full_body = b"".join(response_body).decode("utf-8")
        try:
            data = json.loads(full_body)
        except Exception:
            data = full_body
        return response_status, data

    def call(self, method: str, path: str, headers: dict = None, body: dict = None, query: str = "") -> tuple[int, any]:
        return asyncio.run(self.asgi_call(method, path, headers=headers, body=body, query=query))

    def login(self, email: str) -> str:
        status, response = self.call(
            "POST",
            "/api/v1/auth/login",
            body={"email": email, "password": "Demo123!"},
        )
        self.assertEqual(200, status)
        return response["token"]

    def test_qa_r01_matching_never_mutates_actuals_end_to_end(self) -> None:
        """QA-R01: matching pipeline evaluates proposals without mutating actual progress."""
        status, before_acts = self.call("GET", "/api/v1/projects/PRJ-DEMO-001/activities", headers={"authorization": f"Bearer {self.planner_token}"})
        self.assertEqual(200, status)
        initial_progress = {a["id"]: a["actualProgressPercent"] for a in before_acts["items"]}

        # Submit new event
        evt_payload = {
            "id": "EVT-R01",
            "projectId": "PRJ-DEMO-001",
            "reporterId": "USR-SUP-001",
            "observedAt": "2026-09-26T04:30:00Z",
            "evidence": {"text": "Fixed 3 tonnes of rebar at Pier P12, chainage 12+410 to 12+425."},
            "extractedFacts": {"keywords": ["rebar", "pier"]}
        }
        status, _ = self.call("POST", "/api/v1/projects/PRJ-DEMO-001/events", headers={"authorization": f"Bearer {self.supervisor_token}", "idempotency-key": "k-r01-1"}, body=evt_payload)
        self.assertEqual(201, status)

        # Generate proposal with intelligence pipeline
        status, prop = self.call("POST", "/api/v1/projects/PRJ-DEMO-001/events/EVT-R01/proposals", headers={"authorization": f"Bearer {self.planner_token}", "idempotency-key": "k-r01-2"}, body={})
        self.assertEqual(202, status)
        self.assertGreater(len(prop["candidates"]), 0)

        # Verify actual progress is completely unchanged
        status, after_acts = self.call("GET", "/api/v1/projects/PRJ-DEMO-001/activities", headers={"authorization": f"Bearer {self.planner_token}"})
        self.assertEqual(200, status)
        after_progress = {a["id"]: a["actualProgressPercent"] for a in after_acts["items"]}
        self.assertEqual(initial_progress, after_progress)

    def test_qa_r02_audit_chain_verifies_against_database_and_detects_tamper(self) -> None:
        """QA-R02: audit chain verifies in the database and detects in-place mutation."""
        # 1. Create a verified proposal so an audit entry is generated
        verify_body = {"activityId": "ACT-1.2.1", "progressPercent": 45, "expectedActivityVersion": 1, "actualQuantity": {"value": 3, "unit": "t"}}
        status, _ = self.call("POST", "/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-001/verify", headers={"authorization": f"Bearer {self.planner_token}", "idempotency-key": "k-r02-ver"}, body=verify_body)
        self.assertEqual(200, status)

        status, res = self.call("GET", "/api/v1/projects/PRJ-DEMO-001/audit/verify", headers={"authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(200, status)
        self.assertTrue(res["valid"])

        # 2. Tamper with database row
        db = connect(self.db_path)
        db.execute("UPDATE audit_entries SET canonical_payload='{\"tampered\":true}' WHERE sequence=1")
        db.close()

        status, tampered_res = self.call("GET", "/api/v1/projects/PRJ-DEMO-001/audit/verify", headers={"authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(200, status)
        self.assertFalse(tampered_res["valid"])


    def test_qa_r03_no_transition_from_rejected_to_approved(self) -> None:
        """QA-R03: rejected proposal cannot subsequently be verified."""
        status, rej = self.call("POST", "/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-002/reject", headers={"authorization": f"Bearer {self.planner_token}", "idempotency-key": "k-r03-rej"}, body={"reason": "ambiguous"})
        self.assertEqual(200, status)

        status, err = self.call("POST", "/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-002/verify", headers={"authorization": f"Bearer {self.planner_token}", "idempotency-key": "k-r03-ver"}, body={"activityId": "ACT-1.2.1", "progressPercent": 45, "expectedActivityVersion": 1})
        self.assertEqual(409, status)
        self.assertEqual("INVALID_TRANSITION", err["error"]["code"])

    def test_qa_r04_authz_matrix_enforcement(self) -> None:
        """QA-R04: supervisor forbidden (403), invalid user unauthorized (401), planner allowed."""
        verify_body = {"activityId": "ACT-1.2.1", "progressPercent": 45, "expectedActivityVersion": 1}
        # Supervisor
        status, _ = self.call("POST", "/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-001/verify", headers={"authorization": f"Bearer {self.supervisor_token}", "idempotency-key": "k-sup"}, body=verify_body)
        self.assertEqual(403, status)
        # Invalid user
        status, _ = self.call("POST", "/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-001/verify", headers={"authorization": "Bearer UNKNOWN-USER", "idempotency-key": "k-un"}, body=verify_body)
        self.assertEqual(401, status)
        # Planner
        status, _ = self.call("POST", "/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-001/verify", headers={"authorization": f"Bearer {self.planner_token}", "idempotency-key": "k-pln"}, body=verify_body)
        self.assertEqual(200, status)

    def test_qa_r10_all_five_reports_export_valid_csv(self) -> None:
        """QA-R10: all five approved reports produce non-empty CSV exports."""
        for report_type in ["schedule-variance", "verification-audit", "match-quality", "delay-register", "discipline-progress"]:
            status, csv_data = self.call("GET", f"/api/v1/projects/PRJ-DEMO-001/reports/{report_type}", headers={"authorization": f"Bearer {self.planner_token}"}, query="format=csv")
            self.assertEqual(200, status)
            self.assertTrue(len(csv_data.strip()) > 0)

    def test_qa_r11_master_golden_end_to_end_demonstration(self) -> None:
        """QA-R11: complete golden slice from field event submission to actual mutation, audit trace, and dashboard refresh."""
        # 1. Check initial activity progress
        status, acts = self.call("GET", "/api/v1/projects/PRJ-DEMO-001/activities", headers={"authorization": f"Bearer {self.planner_token}"})
        self.assertEqual(200, status)
        self.assertEqual(30, {a["id"]: a for a in acts["items"]}["ACT-1.2.1"]["actualProgressPercent"])

        # 2. Planner approves proposal MPR-DEMO-001
        status, ver = self.call(
            "POST",
            "/api/v1/projects/PRJ-DEMO-001/proposals/MPR-DEMO-001/verify",
            headers={"authorization": f"Bearer {self.planner_token}", "idempotency-key": "key-master-golden"},
            body={"activityId": "ACT-1.2.1", "progressPercent": 45, "expectedActivityVersion": 1, "actualQuantity": {"value": 3, "unit": "t"}}
        )
        self.assertEqual(200, status)
        self.assertEqual(45, ver["progressPercent"])

        # 3. Verify actual progress in activities table moved to 45%
        status, updated_acts = self.call("GET", "/api/v1/projects/PRJ-DEMO-001/activities", headers={"authorization": f"Bearer {self.planner_token}"})
        self.assertEqual(200, status)
        self.assertEqual(45, {a["id"]: a for a in updated_acts["items"]}["ACT-1.2.1"]["actualProgressPercent"])

        # 4. Verify audit chain validity
        status, audit = self.call("GET", "/api/v1/projects/PRJ-DEMO-001/audit/verify", headers={"authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(200, status)
        self.assertTrue(audit["valid"])

        # 5. Verify dashboard refresh reflects verified match
        status, dash = self.call("GET", "/api/v1/projects/PRJ-DEMO-001/dashboard", headers={"authorization": f"Bearer {self.planner_token}"})
        self.assertEqual(200, status)
        self.assertEqual(1, dash["proposalCounts"]["verified"])

    def test_qa_r12_verification_is_all_or_nothing_when_a_later_write_fails(self) -> None:
        """QA-R12: an actual-progress change is never left unrecorded.

        `verify_proposal` writes the actual *before* it appends the audit entry, so
        the only thing standing between a mid-flight failure and an unrecorded
        progress change is the transaction. Reading the code and seeing
        `with transaction(...)` is not proof, so this injects the failure.

        The injected fault is the audit append, because that is the write whose
        loss would matter: a changed actual with no audit entry is precisely the
        state this product exists to make impossible.
        """
        from unittest import mock

        from services.api.db import connect as _connect, transaction as _transaction
        from services.api.verification import verify_proposal
        from services.api.auth import Principal
        from services.api.audit import verify_chain

        db = _connect(self.db_path)
        try:
            planner = Principal("USR-DEMO-003")
            command = {"activityId": "ACT-1.2.1", "progressPercent": 45, "expectedActivityVersion": 1}
            before = db.execute("SELECT actual_progress_percent FROM activities WHERE id='ACT-1.2.1'").fetchone()[0]

            with mock.patch("services.api.verification.append_entry", side_effect=RuntimeError("audit store unavailable")):
                with self.assertRaises(RuntimeError):
                    with _transaction(db):
                        verify_proposal(db, "PRJ-DEMO-001", "MPR-DEMO-001", planner, "r12-fail", command, "REQ-R12")

            after = db.execute("SELECT actual_progress_percent FROM activities WHERE id='ACT-1.2.1'").fetchone()[0]
            if after != before:
                self.fail(
                    f"QA-R12: the audit append failed but actual progress still moved {before} -> {after}. "
                    "An actual changed with no audit entry is the one state this product must never produce."
                )
            for table, label in (("verifications", "verification record"), ("audit_entries", "audit entry"), ("idempotency_records", "idempotency record")):
                count = db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                self.assertEqual(0, count, f"QA-R12: a failed verification left a {label} behind")
            status = db.execute("SELECT status FROM match_proposals WHERE id='MPR-DEMO-001'").fetchone()[0]
            self.assertEqual("proposed", status, "QA-R12: a failed verification advanced the proposal state")

            # A failed attempt must leave nothing poisoned: the same verification
            # has to succeed on retry, with exactly one audit entry.
            with _transaction(db):
                code, result = verify_proposal(db, "PRJ-DEMO-001", "MPR-DEMO-001", planner, "r12-retry", command, "REQ-R12B")
            self.assertEqual(200, code)
            self.assertEqual(45, result["progressPercent"])
            self.assertEqual(1, db.execute("SELECT COUNT(*) FROM audit_entries").fetchone()[0])
            self.assertTrue(verify_chain(db, "PRJ-DEMO-001")["valid"], "QA-R12: the audit chain is invalid after a recovered failure")
        finally:
            db.close()
