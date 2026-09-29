"""Tests for the six individual matching signals and their explainability."""
from __future__ import annotations

import unittest

from services.intelligence.config import MatchingConfig
from services.intelligence.matcher import MatchingEngine, SignalScorer
from services.intelligence.models import (
    Evidence,
    ExecutionEvent,
    ExtractedFacts,
    LocationInterval,
    Quantity,
    ScheduleActivity,
)


class TestMatchingSignals(unittest.TestCase):
    def setUp(self) -> None:
        self.config = MatchingConfig()
        self.scorer = SignalScorer(self.config)
        self.engine = MatchingEngine(self.config)

    def test_asset_signal_exact_normalized_and_mismatch(self) -> None:
        # Exact match
        exact = self.scorer.score_asset("PIER-P12", "PIER-P12")
        self.assertEqual(1.0, exact.score)
        self.assertEqual(0.40, exact.contribution)
        self.assertFalse(exact.missing)

        # Normalized match (hyphens/spaces)
        norm = self.scorer.score_asset("P-204", "P204")
        self.assertEqual(0.85, norm.score)
        self.assertFalse(norm.missing)

        # Asset in activity name
        in_name = self.scorer.score_asset("P12", "PIER-P12", act_name="Pier P12 reinforcement")
        self.assertEqual(0.85, in_name.score)

        # Mismatch
        mismatch = self.scorer.score_asset("P999", "PIER-P12")
        self.assertEqual(0.10, mismatch.score)
        self.assertFalse(mismatch.missing)

        # Missing
        missing = self.scorer.score_asset(None, "PIER-P12")
        self.assertEqual(0.0, missing.score)
        self.assertTrue(missing.missing)

    def test_discipline_near_miss_interface_is_not_equal(self) -> None:
        # Exact discipline
        exact = self.scorer.score_discipline("structural", "structural")
        self.assertEqual(1.0, exact.score)
        self.assertEqual(0.20, exact.contribution)

        # Near-miss cross-disciplinary interface: civil ↔ structural
        # Must be 0.60 per contract, NOT equal to 1.0
        near_miss = self.scorer.score_discipline("Civil", "Structural")
        self.assertEqual(0.60, near_miss.score)
        self.assertEqual(0.12, near_miss.contribution)
        self.assertIn("interface", near_miss.explanation.lower())

        # Electrical ↔ instrumentation interface
        elec_inst = self.scorer.score_discipline("Electrical", "Instrumentation")
        self.assertEqual(0.60, elec_inst.score)

        # Distinct discipline mismatch
        mismatch = self.scorer.score_discipline("Piping", "Electrical")
        self.assertEqual(0.0, mismatch.score)
        self.assertIn("mismatch", mismatch.explanation.lower())

        # Missing
        missing = self.scorer.score_discipline(None, "Piping")
        self.assertEqual(0.0, missing.score)
        self.assertTrue(missing.missing)

    def test_location_overlap_and_enclosure(self) -> None:
        act_loc = LocationInterval(kind="chainage", alignment="BL", start=12400, end=12430, unit="m")

        # Event inside activity interval
        evt_inside = LocationInterval(kind="chainage", alignment="BL", start=12410, end=12425, unit="m")
        inside_res = self.scorer.score_location(evt_inside, act_loc)
        self.assertEqual(1.0, inside_res.score)
        self.assertEqual(0.15, inside_res.contribution)
        self.assertIn("inside", inside_res.explanation.lower())

        # Partial overlap
        evt_partial = LocationInterval(kind="chainage", alignment="BL", start=12420, end=12440, unit="m")
        partial_res = self.scorer.score_location(evt_partial, act_loc)
        self.assertGreaterEqual(partial_res.score, 0.70)
        self.assertIn("overlap", partial_res.explanation.lower())

        # Disjoint chainage
        evt_disjoint = LocationInterval(kind="chainage", alignment="BL", start=15800, end=16100, unit="m")
        disjoint_res = self.scorer.score_location(evt_disjoint, act_loc)
        self.assertEqual(0.0, disjoint_res.score)

        # Missing location
        missing_res = self.scorer.score_location(None, act_loc)
        self.assertEqual(0.0, missing_res.score)
        self.assertTrue(missing_res.missing)

    def test_text_similarity(self) -> None:
        # Strong lexical overlap
        sim1 = self.scorer.score_text(
            event_text="Fixed 3 tonnes of rebar at Pier P12, chainage 12+410 to 12+425.",
            act_name="Pier P12 reinforcement fixing",
            event_keywords=["pier", "rebar", "fixed"],
        )
        self.assertEqual(0.80, sim1.score)
        self.assertEqual(0.08, sim1.contribution)

        # Very weak lexical overlap
        sim2 = self.scorer.score_text(
            event_text="Crew working at P12; preparation continuing.",
            act_name="Pier P12 formwork installation",
            event_keywords=["crew", "preparation"],
        )
        self.assertEqual(0.10, sim2.score)

    def test_work_type_versioned_synonyms(self) -> None:
        # Exact
        exact = self.scorer.score_work_type("reinforcement", "reinforcement")
        self.assertEqual(1.0, exact.score)

        # Versioned synonym: rebar-fixing ↔ reinforcement
        syn1 = self.scorer.score_work_type("rebar-fixing", "reinforcement")
        self.assertEqual(1.0, syn1.score)
        self.assertIn("synonym", syn1.explanation.lower())

        # Versioned synonym: cable-laying ↔ cable-installation
        syn2 = self.scorer.score_work_type("cable-laying", "cable-installation")
        self.assertEqual(1.0, syn2.score)

        # Missing work type
        missing = self.scorer.score_work_type(None, "reinforcement")
        self.assertEqual(0.0, missing.score)
        self.assertTrue(missing.missing)

    def test_temporal_proximity(self) -> None:
        # Event observed during planned window
        during = self.scorer.score_temporal(
            observed_at="2026-09-26T04:30:00Z",
            planned_start="2026-09-24",
            planned_finish="2026-09-28",
        )
        self.assertEqual(0.80, during.score)
        self.assertEqual(0.04, during.contribution)

        # Event observed near planned window (<= 7 days)
        near = self.scorer.score_temporal(
            observed_at="2026-09-26T05:00:00Z",
            planned_start="2026-10-01",
            planned_finish="2026-10-12",
        )
        self.assertEqual(0.40, near.score)

        # Event far outside planned window
        far = self.scorer.score_temporal(
            observed_at="2026-09-26T05:00:00Z",
            planned_start="2026-11-15",
            planned_finish="2026-11-30",
        )
        self.assertEqual(0.0, far.score)

    def test_candidate_carries_six_signals_and_no_redistribution(self) -> None:
        """Every candidate carries exactly six signals; missing signals score zero without redistribution."""
        event = ExecutionEvent(
            id="EVT-TEST-001",
            projectId="PRJ-METRO-001",
            reporterId="USR-SUP-001",
            observedAt="2026-09-26T04:30:00Z",
            receivedAt="2026-09-26T04:31:00Z",
            evidence=Evidence(text="Inspected site."),
            extractedFacts=ExtractedFacts(keywords=["inspected", "site"]),
        )
        activity = ScheduleActivity(
            id="ACT-1.2.1",
            projectId="PRJ-METRO-001",
            snapshotId="SNP-DEMO-001",
            wbs="1.2.1",
            level=6,
            name="Pier P12 reinforcement fixing",
            discipline="structural",
            workType="reinforcement",
            assetId="PIER-P12",
            location=LocationInterval(kind="chainage", alignment="BL", start=12400, end=12430, unit="m"),
            plannedStart="2026-09-24",
            plannedFinish="2026-09-28",
        )

        candidate = self.engine.evaluate_candidate(event, activity)
        self.assertEqual(6, len(candidate.explanation))

        signal_names = [e.signal for e in candidate.explanation]
        self.assertEqual(["asset", "discipline", "location", "text", "workType", "temporal"], signal_names)

        # Missing signals (asset, discipline, location, workType) must have score 0.0
        by_name = {e.signal: e for e in candidate.explanation}
        self.assertTrue(by_name["asset"].missing)
        self.assertEqual(0.0, by_name["asset"].score)
        self.assertTrue(by_name["discipline"].missing)
        self.assertEqual(0.0, by_name["discipline"].score)
        self.assertTrue(by_name["location"].missing)
        self.assertEqual(0.0, by_name["location"].score)
        self.assertTrue(by_name["workType"].missing)
        self.assertEqual(0.0, by_name["workType"].score)


if __name__ == "__main__":
    unittest.main()
