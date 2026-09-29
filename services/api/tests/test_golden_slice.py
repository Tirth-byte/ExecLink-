from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from services.api.audit import verify_chain
from services.api.auth import Principal
from services.api.db import connect, initialise, transaction
from services.api.errors import ApiProblem
from services.api.reports import REPORT_TYPES, as_csv, build_report
from services.api.verification_seed import reset_demo
from services.api.verification import reject_proposal, verify_proposal

PROJECT = "PRJ-METRO-001"
PLANNER = Principal("USR-PLN-001")


class GoldenSliceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.db = connect(Path(self.temp.name) / "test.db")
        initialise(self.db)
        reset_demo(self.db)

    def tearDown(self) -> None:
        self.db.close()
        self.temp.cleanup()

    def command(self, progress: float = 45) -> dict:
        return {"activityId": "ACT-1.2.1", "progressPercent": progress, "actualQuantity": {"value": 3, "unit": "t"}, "expectedActivityVersion": 1}

    def test_planner_verification_updates_actual_and_audit_atomically(self) -> None:
        with transaction(self.db):
            status, result = verify_proposal(self.db, PROJECT, "MPR-DEMO-001", PLANNER, "verify-1", self.command(), "REQ-1")
        self.assertEqual(200, status)
        self.assertEqual(45, self.db.execute("SELECT actual_progress_percent FROM activities WHERE id='ACT-1.2.1'").fetchone()[0])
        self.assertEqual("verified", self.db.execute("SELECT status FROM match_proposals WHERE id='MPR-DEMO-001'").fetchone()[0])
        self.assertEqual(1, result["auditSequence"])
        self.assertTrue(verify_chain(self.db, PROJECT)["valid"])

    def test_duplicate_verification_replays_without_duplicate_change(self) -> None:
        with transaction(self.db): first = verify_proposal(self.db, PROJECT, "MPR-DEMO-001", PLANNER, "same", self.command(), "REQ-1")
        with transaction(self.db): second = verify_proposal(self.db, PROJECT, "MPR-DEMO-001", PLANNER, "same", self.command(), "REQ-2")
        self.assertEqual(first, second)
        self.assertEqual(1, self.db.execute("SELECT COUNT(*) FROM verifications").fetchone()[0])
        self.assertEqual(1, self.db.execute("SELECT COUNT(*) FROM audit_entries").fetchone()[0])

    def test_same_idempotency_key_with_changed_body_conflicts(self) -> None:
        with transaction(self.db): verify_proposal(self.db, PROJECT, "MPR-DEMO-001", PLANNER, "same", self.command(), "REQ-1")
        with self.assertRaises(ApiProblem) as caught:
            with transaction(self.db): verify_proposal(self.db, PROJECT, "MPR-DEMO-001", PLANNER, "same", self.command(46), "REQ-2")
        self.assertEqual("IDEMPOTENCY_CONFLICT", caught.exception.code)

    def test_reject_never_changes_actual_and_approve_after_reject_conflicts(self) -> None:
        before = self.db.execute("SELECT actual_progress_percent FROM activities WHERE id='ACT-1.2.1'").fetchone()[0]
        with transaction(self.db): reject_proposal(self.db, PROJECT, "MPR-DEMO-002", PLANNER, "reject-1", {"reason": "ambiguous"}, "REQ-1")
        self.assertEqual(before, self.db.execute("SELECT actual_progress_percent FROM activities WHERE id='ACT-1.2.1'").fetchone()[0])
        with self.assertRaises(ApiProblem) as caught:
            with transaction(self.db): verify_proposal(self.db, PROJECT, "MPR-DEMO-002", PLANNER, "verify-late", self.command(), "REQ-2")
        self.assertEqual((409, "INVALID_TRANSITION"), (caught.exception.status, caught.exception.code))

    def test_role_matrix(self) -> None:
        with self.assertRaises(ApiProblem) as supervisor:
            with transaction(self.db): verify_proposal(self.db, PROJECT, "MPR-DEMO-001", Principal("USR-SUP-001"), "x", self.command(), "REQ")
        self.assertEqual((403, "FORBIDDEN"), (supervisor.exception.status, supervisor.exception.code))
        with self.assertRaises(ApiProblem) as invalid:
            with transaction(self.db): verify_proposal(self.db, PROJECT, "MPR-DEMO-001", Principal("missing"), "x", self.command(), "REQ")
        self.assertEqual((401, "INVALID_USER"), (invalid.exception.status, invalid.exception.code))

    def test_progress_range_regression_and_version_rules(self) -> None:
        for value in (-1, 29, 101):
            with self.assertRaises(ApiProblem):
                with transaction(self.db): verify_proposal(self.db, PROJECT, "MPR-DEMO-001", PLANNER, f"bad-{value}", self.command(value), "REQ")
        wrong = self.command(); wrong["expectedActivityVersion"] = 9
        with self.assertRaises(ApiProblem) as caught:
            with transaction(self.db): verify_proposal(self.db, PROJECT, "MPR-DEMO-001", PLANNER, "bad-version", wrong, "REQ")
        self.assertEqual("VERSION_CONFLICT", caught.exception.code)

    def test_progress_can_advance_to_100(self) -> None:
        with transaction(self.db): verify_proposal(self.db, PROJECT, "MPR-DEMO-001", PLANNER, "complete", self.command(100), "REQ")
        self.assertEqual(100, self.db.execute("SELECT actual_progress_percent FROM activities WHERE id='ACT-1.2.1'").fetchone()[0])

    def test_persisted_audit_tamper_is_detected(self) -> None:
        with transaction(self.db): verify_proposal(self.db, PROJECT, "MPR-DEMO-001", PLANNER, "verify", self.command(), "REQ")
        self.db.execute("UPDATE audit_entries SET canonical_payload='{}' WHERE sequence=1")
        result = verify_chain(self.db, PROJECT)
        self.assertFalse(result["valid"])
        self.assertEqual(1, result["failedSequence"])

    def test_exactly_five_reports_export_json_rows_and_csv(self) -> None:
        self.assertEqual({"schedule-variance", "verification-audit", "match-quality", "delay-register", "discipline-progress"}, REPORT_TYPES)
        for report_type in REPORT_TYPES:
            rows = build_report(self.db, PROJECT, report_type)
            self.assertIsInstance(rows, list)
            self.assertTrue(as_csv(rows).strip())


if __name__ == "__main__":
    unittest.main()
