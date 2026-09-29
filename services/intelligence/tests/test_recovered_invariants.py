"""
Recovered invariant tests from prior implementation cache.
Directly implements the 8 intelligence-owned recovered tests.
"""
from __future__ import annotations

import unittest

from services.intelligence.matcher import MatchingEngine


class TestRecoveredInvariants(unittest.TestCase):
    def test_explainable_matching_engine_specification(self) -> None:
        """
        Tests the user-specified matching example:
        Field: "24 inch spool erection completed" Piping Unit B P204
        Candidate: PIP-301 "Erect 24 inch Process Line P204 — Unit B"
        Expected: >=90% confidence, Asset 100, Discipline 100, Location 100, Work Type >=85, Text >=70
        """
        field_update = {
            "description": "24 inch spool erection completed",
            "discipline": "Piping",
            "location": "Unit B",
            "asset_tag": "P204",
        }

        candidate = {
            "id": "PIP-301",
            "activity_code": "PIP-301",
            "activity_name": "Erect 24 inch Process Line P204 — Unit B",
            "discipline": "Piping",
            "location": "Unit B",
            "wbs_path": "1.3.2 Piping / Unit B / Process Lines",
        }

        result = MatchingEngine.evaluate_match(field_update, candidate)

        self.assertGreaterEqual(result["overall_confidence"], 90)
        self.assertEqual(100, result["signals"]["asset"]["score"])
        self.assertEqual(100, result["signals"]["discipline"]["score"])
        self.assertEqual(100, result["signals"]["location"]["score"])
        self.assertGreaterEqual(result["signals"]["work_type"]["score"], 85)
        self.assertGreaterEqual(result["signals"]["text_similarity"]["score"], 70)
        self.assertIn("P204", result["explanation_synthesis"])

    def test_security_invariant_matching_engine_never_mutates_actuals(self) -> None:
        """
        The matching engine must be side-effect free and advisory.
        It returns evaluations and proposals, but NEVER alters actual progress.
        """
        activity = {
            "id": "PIP-301",
            "activity_code": "PIP-301",
            "activity_name": "Erect 24 inch Process Line P204 — Unit B",
            "discipline": "Piping",
            "location": "Unit B",
            "baseline_progress": 65.0,
        }

        field_update = {
            "description": "24 inch spool erection completed",
            "discipline": "Piping",
            "location": "Unit B",
            "asset_tag": "P204",
            "claimed_progress": "100% completed",
        }

        initial_val = activity.get("baseline_progress")
        proposal = MatchingEngine.evaluate_match(field_update, activity)

        # Baseline progress in activity must remain untouched
        self.assertEqual(activity.get("baseline_progress"), initial_val)
        self.assertFalse(proposal["verified"])

    def test_matching_asset_exact_and_different(self) -> None:
        exact = MatchingEngine.match_asset("P204", "Erect 24 inch Process Line P204 — Unit B")
        self.assertEqual(100, exact["score"])
        self.assertIn("Exact tag match", exact["reason"])

        norm = MatchingEngine.match_asset("P-204", "Line P204 Unit B")
        self.assertEqual(85, norm["score"])

        diff = MatchingEngine.match_asset("P999", "Erect 24 inch Process Line P204 — Unit B")
        self.assertEqual(10, diff["score"])
        self.assertIn("not referenced", diff["reason"])

    def test_matching_discipline_exact_and_interface(self) -> None:
        exact = MatchingEngine.match_discipline("Piping", "Piping")
        self.assertEqual(100, exact["score"])

        cross = MatchingEngine.match_discipline("Civil", "Structural")
        self.assertEqual(60, cross["score"])

        mismatch = MatchingEngine.match_discipline("Piping", "Electrical")
        self.assertEqual(0, mismatch["score"])

    def test_matching_location_overlap(self) -> None:
        overlap = MatchingEngine.match_location("Unit B - Zone 1", "Unit B")
        self.assertGreaterEqual(overlap["score"], 70)

        diff = MatchingEngine.match_location("North Corridor", "Unit B")
        self.assertEqual(20, diff["score"])

    def test_matching_work_type_synonyms(self) -> None:
        erect = MatchingEngine.match_work_type("24 inch spool erection completed", "Erect Process Line P204")
        self.assertEqual(90, erect["score"])

        pour = MatchingEngine.match_work_type("80m3 concreting completed for raft", "Pour Foundation Raft")
        self.assertEqual(90, pour["score"])

    def test_matching_text_similarity(self) -> None:
        sim = MatchingEngine.match_text_similarity(
            "24 inch spool erection completed",
            "Erect 24 inch Process Line P204 — Unit B",
        )
        self.assertGreaterEqual(sim["score"], 70)

    def test_candidate_ranking_deterministic_tie_breaker(self) -> None:
        update = {
            "discipline": "Civil",
            "location": "Unit B",
            "description": "General civil inspection",
        }
        act_a = {
            "id": "CIV-A",
            "activity_code": "CIV-101",
            "activity_name": "Civil Works Section A",
            "discipline": "Civil",
            "location": "Unit B",
            "wbs_path": "1.1 Civil",
        }
        act_b = {
            "id": "CIV-B",
            "activity_code": "CIV-102",
            "activity_name": "Civil Works Section A",
            "discipline": "Civil",
            "location": "Unit B",
            "wbs_path": "1.1 Civil",
        }
        res_a = MatchingEngine.evaluate_match(update, act_a)
        res_b = MatchingEngine.evaluate_match(update, act_b)
        self.assertEqual(res_a["overall_confidence"], res_b["overall_confidence"])


if __name__ == "__main__":
    unittest.main()
