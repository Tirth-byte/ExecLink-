"""QA-B*/QA-S* static checks: layout, and the non-mutation guard."""
from __future__ import annotations

import re
import unittest

from qa_lib import (
    REPO_ROOT,
    find_actual_writes,
    format_violations,
    load_exceptions,
    plan_text,
    require_dirs,
    source_files_or_skip,
)

AUTHZ_MARKER = re.compile(r"require_role|membership\(|authorize")

RECOVERED_TESTS = {
    "test_explainable_matching_engine_specification": ("QA-R05", "QA-C09"),
    "test_security_invariant_matching_engine_never_mutates_actuals": ("QA-S01", "QA-R01"),
    "test_tamper_evident_audit_trail_cryptographic_integrity": ("QA-R02",),
    "test_all_five_reports_export_verification": ("QA-C06", "QA-R10"),
    "test_candidate_ranking_deterministic_tie_breaker": ("QA-R07",),
    "test_idempotent_duplicate_approval": ("QA-R09",),
    "test_invalid_user_id_returns_401": ("QA-R04",),
    "test_matching_asset_exact_and_different": ("QA-R06",),
    "test_matching_discipline_exact_and_interface": ("QA-R06",),
    "test_matching_location_overlap": ("QA-R06",),
    "test_matching_text_similarity": ("QA-R06",),
    "test_matching_work_type_synonyms": ("QA-R06",),
    "test_planner_role_authorized": ("QA-R04",),
    "test_progress_advance_to_100_percent": ("QA-R08",),
    "test_progress_semantics_and_regression_protection": ("QA-R08",),
    "test_state_transition_cannot_approve_rejected": ("QA-R03",),
    "test_supervisor_cannot_verify_match_403_forbidden": ("QA-R04",),
    "test_client_idempotency_duplicate_protection": ("QA-R09",),
    "test_golden_workflow_end_to_end_reality_check": ("QA-R11",),
    "test_golden_workflow_proves_non_mutation_sequence": ("QA-R01", "QA-R11"),
    "test_match_rejection_leaves_actual_progress_unchanged": ("QA-S01", "QA-R01", "QA-R03"),
    "test_audit_chain_tamper_detection_in_database": ("QA-R02", "QA-C08"),
    "test_master_golden_end_to_end_demonstration": ("QA-R11",),
}

FIVE_EXPORTS = (
    "Schedule Variance",
    "Verification Audit",
    "Match Quality",
    "Delay Register",
    "Discipline Progress",
)


class LayoutChecks(unittest.TestCase):
    def test_qa_b01_legacy_backend_path_absent(self) -> None:
        legacy = REPO_ROOT / "backend"
        if legacy.exists():
            offenders = sorted(p.relative_to(REPO_ROOT).as_posix() for p in legacy.rglob("*.py"))
            self.fail(
                "QA-B01: legacy `backend/` layout is back. `services/api` + "
                "`services/intelligence` are canonical per god. Offending files: "
                + (", ".join(offenders[:10]) or "(directory exists, no .py files)")
            )

    def test_qa_b05_plan_covers_every_recovered_invariant(self) -> None:
        plan = plan_text()
        unmapped = sorted(name for name in RECOVERED_TESTS if name not in plan)
        self.assertEqual(
            [],
            unmapped,
            "QA-B05: qa/README.md no longer names these recovered invariants. The plan "
            "must not silently lose coverage: " + ", ".join(unmapped),
        )
        missing_ids = sorted(
            {
                check_id
                for ids in RECOVERED_TESTS.values()
                for check_id in ids
                if check_id not in plan
            }
        )
        self.assertEqual(
            [],
            missing_ids,
            "QA-B05: these check IDs are referenced by the coverage map but are not "
            "defined in qa/README.md: " + ", ".join(missing_ids),
        )

    def test_qa_b06_plan_states_the_five_exports(self) -> None:
        plan = plan_text()
        missing = [name for name in FIVE_EXPORTS if name not in plan]
        self.assertEqual([], missing, "QA-B06: plan must name all five exports; missing " + ", ".join(missing))


class NonMutationGuard(unittest.TestCase):
    def assert_no_actual_writes(self, files: list, subsystem: str, escape: str) -> None:
        violations = find_actual_writes(files)
        self.assertEqual(
            [],
            violations,
            f"{subsystem} must never write actual-progress fields. Matching proposes; "
            f"only authorized planner verification may update actuals.\n"
            f"{format_violations(violations)}\n"
            f"If a line is legitimate, add it to qa/non_mutation_exceptions.txt as "
            f"'<path> :: <reason>'. {escape}",
        )

    def test_qa_s01_intelligence_never_writes_actuals(self) -> None:
        require_dirs(self, "services_intel")
        files = source_files_or_skip(self, "services/intelligence")
        self.assert_no_actual_writes(
            files,
            "QA-S01 services/intelligence",
            "The verifier lives in services/api, not in the matching engine.",
        )

    def test_qa_s02_field_never_writes_actuals(self) -> None:
        require_dirs(self, "apps_field")
        files = source_files_or_skip(self, "apps/field")
        self.assert_no_actual_writes(
            files,
            "QA-S02 apps/field",
            "Field submits proposals only; it never writes actual progress.",
        )

    def test_qa_b02_web_never_writes_actuals(self) -> None:
        require_dirs(self, "apps_web")
        files = source_files_or_skip(self, "apps/web")
        self.assert_no_actual_writes(
            files,
            "QA-B02 apps/web",
            "The dashboard is a read surface.",
        )

    def test_qa_s03_api_actuals_writes_are_authorization_gated(self) -> None:
        require_dirs(self, "services_api")
        files = source_files_or_skip(self, "services/api")
        writers = [p for p in files if find_actual_writes([p])]
        if not writers:
            self.skipTest(
                "PENDING: services/api exists but contains no actual-progress write yet; "
                "check activates when the authorized verifier lands"
            )
        ungated = [
            p.relative_to(REPO_ROOT).as_posix()
            for p in writers
            if not AUTHZ_MARKER.search(p.read_text(errors="replace"))
        ]
        self.assertEqual(
            [],
            ungated,
            "QA-S03: these services/api modules write actual-progress fields without "
            "enforcing a role check. Only authorized planner verification may update "
            "actuals, and authorization is a property of the code, not of the file "
            f"name: {', '.join(ungated)}. Call require_role(...) before writing, or — if "
            "the write is a reviewed non-runtime path such as the deterministic demo "
            "reset — record a line-scoped exception in qa/non_mutation_exceptions.txt "
            "with the evidence that it cannot be reached from a request.",
        )


class ExceptionHygiene(unittest.TestCase):
    def test_qa_b08_exception_file_has_no_unexplained_entries(self) -> None:
        exceptions = load_exceptions()
        stale = [rel for rel in exceptions if not (REPO_ROOT / rel).exists()]
        self.assertEqual(
            [],
            stale,
            "qa/non_mutation_exceptions.txt lists paths that do not exist. Remove them so "
            "the exception list cannot rot into a blanket amnesty: " + ", ".join(stale),
        )
        unjustified = [rel for rel, e in exceptions.items() if len(e["reason"]) < 15]
        self.assertEqual(
            [],
            unjustified,
            "these exceptions have no real reason recorded: " + ", ".join(unjustified),
        )

    def test_qa_b09_line_scoped_exceptions_are_still_needed(self) -> None:
        exceptions = load_exceptions()
        for rel, entry in exceptions.items():
            if not entry["lines"]:
                continue
            target = REPO_ROOT / rel
            if not target.is_file():
                continue
            total = len(target.read_text(errors="replace").splitlines())
            out_of_range = sorted(n for n in entry["lines"] if n > total)
            self.assertEqual(
                [],
                out_of_range,
                f"{rel} exempts line(s) {out_of_range} but the file has only {total} lines",
            )
            live = {v.line_no for v in find_actual_writes([target], use_exceptions=False)}
            redundant = sorted(entry["lines"] - live)
            self.assertEqual(
                [],
                redundant,
                f"{rel} exempts line(s) {redundant} which no longer violate the guard. "
                "A stale exception is dead weight that hides future drift — narrow it or "
                "remove it.",
            )


if __name__ == "__main__":
    unittest.main()
