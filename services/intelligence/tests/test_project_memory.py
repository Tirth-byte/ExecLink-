"""Unit tests for Expanded Disciplines and Project Memory Intelligence (ELN-10)."""
import unittest

from services.intelligence.config import EXPANDED_DISCIPLINES, MatchingConfig
from services.intelligence.extractor import FactExtractor
from services.intelligence.matcher import SignalScorer
from services.intelligence.memory import (
    HISTORICAL_PATTERNS,
    HistoricalActivityPattern,
    MemoryQueryResult,
    ProjectMemory,
    TypicalDelay,
)
from services.intelligence.models import (
    ExecutionEvent,
    ExtractedFacts,
    LocationInterval,
    MatchBand,
    MatchCandidate,
    ScheduleActivity,
)
from services.intelligence.pipeline import IntelligencePipeline


class TestExpandedDisciplinesMatching(unittest.TestCase):
    """Verifies extraction and 6-signal hybrid matching across all 8 expanded disciplines."""

    def setUp(self) -> None:
        self.extractor = FactExtractor()
        self.config = MatchingConfig()
        self.pipeline = IntelligencePipeline(self.config)
        self.scorer = SignalScorer(self.config)

    def test_all_eight_disciplines_configured(self) -> None:
        expected = {
            "civil",
            "structural",
            "piping",
            "static equipment",
            "rotating equipment",
            "electrical",
            "instrumentation",
            "hse",
        }
        self.assertEqual(set(EXPANDED_DISCIPLINES), expected)

    def test_expanded_disciplines_extraction(self) -> None:
        samples = [
            ("Static equipment vertical vessel erection at Pier P12 completed", "static equipment", "vessel-erection"),
            ("Rotating equipment centrifugal pump alignment and dial gauge check", "rotating equipment", "pump-alignment"),
            ("Electrical cable laying 400m in cable tray corridor", "electrical", "cable-laying"),
            ("Instrumentation loop checking for pressure transmitter PT-101", "instrumentation", "loop-checking"),
            ("HSE site safety audit conducted for elevated work", "hse", "safety-inspection"),
        ]
        for text, expected_discipline, expected_work_type in samples:
            res = self.extractor.extract(text)
            facts = res.facts
            self.assertEqual(facts.discipline, expected_discipline, f"Failed discipline extraction for: {text}")
            self.assertEqual(facts.workType, expected_work_type, f"Failed work type extraction for: {text}")

    def test_expanded_discipline_cross_interface_scoring(self) -> None:
        # Static Equipment to Piping is a registered interface (near-miss = 0.60)
        exp_interface = self.scorer.score_discipline("static equipment", "piping")
        self.assertAlmostEqual(exp_interface.score, 0.60, places=4)

        # Exact match = 1.00
        exp_exact = self.scorer.score_discipline("static equipment", "static equipment")
        self.assertAlmostEqual(exp_exact.score, 1.00, places=4)

        # Electrical to Instrumentation interface
        exp_ele_ins = self.scorer.score_discipline("electrical", "instrumentation")
        self.assertAlmostEqual(exp_ele_ins.score, 0.60, places=4)

        # Unrelated discipline pair (Civil and Instrumentation have no registered interface)
        exp_unrelated = self.scorer.score_discipline("civil", "instrumentation")
        self.assertAlmostEqual(exp_unrelated.score, 0.00, places=4)

    def test_end_to_end_matching_for_rotating_equipment(self) -> None:
        from services.intelligence.models import Evidence
        activity = ScheduleActivity(
            id="ACT-ROT-101",
            projectId="PRJ-DEMO",
            snapshotId="SNP-001",
            wbs="1.3.4.1",
            level=6,
            name="P-101 Suction Pump Cold Alignment",
            discipline="rotating equipment",
            workType="pump-alignment",
            assetId="P-101",
            location=LocationInterval(start=1200, end=1250),
            plannedStart="2026-03-01T00:00:00Z",
            plannedFinish="2026-03-05T00:00:00Z",
        )
        text = "Rotating equipment centrifugal pump P-101 cold alignment at ch. 1+200 - 1+250 completed"
        event = ExecutionEvent(
            id="EVT-001",
            projectId="PRJ-DEMO",
            reporterId="REP-001",
            observedAt="2026-03-02T10:00:00Z",
            receivedAt="2026-03-02T10:05:00Z",
            evidence=Evidence(text=text),
            extractedFacts=self.extractor.extract(text).facts,
        )
        proposal = self.pipeline.process_event(event, [activity])
        self.assertTrue(len(proposal.candidates) > 0)
        cand = proposal.candidates[0]
        self.assertEqual(cand.activityId, "ACT-ROT-101")
        self.assertEqual(cand.band, "auto_suggest")
        self.assertGreaterEqual(cand.score, 0.90)


class TestProjectMemoryIntelligence(unittest.TestCase):
    """Verifies Project Memory retrieval, benchmark queries, and candidate enrichment."""

    def setUp(self) -> None:
        self.memory = ProjectMemory()

    def test_curated_patterns_exist_for_all_disciplines(self) -> None:
        disciplines_in_memory = {p.discipline for p in self.memory.patterns}
        for disc in EXPANDED_DISCIPLINES:
            self.assertIn(disc, disciplines_in_memory, f"Missing historical pattern for {disc}")

    def test_synthetic_source_label_on_all_patterns(self) -> None:
        for p in self.memory.patterns:
            self.assertEqual(p.source_label, "synthetic/historical demo knowledge")

    def test_query_productivity_benchmark(self) -> None:
        benchmark = self.memory.get_productivity_benchmark("piping", "spool-erection")
        self.assertIsNotNone(benchmark)
        self.assertEqual(benchmark["discipline"], "piping")
        self.assertEqual(benchmark["work_type"], "spool-erection")
        self.assertEqual(benchmark["unit"], "spools")
        self.assertGreater(benchmark["avg_daily_rate"], 0.0)
        self.assertGreater(benchmark["sample_count"], 10)
        self.assertGreaterEqual(benchmark["confidence"], 0.85)

    def test_query_typical_delays(self) -> None:
        delays = self.memory.get_typical_delays("static equipment", "vessel-erection")
        self.assertTrue(len(delays) > 0)
        first_delay = delays[0]
        self.assertIn("cause", first_delay)
        self.assertIn("frequency_pct", first_delay)
        self.assertIn("avg_delay_days", first_delay)
        self.assertIn("mitigation", first_delay)
        self.assertGreater(first_delay["frequency_pct"], 0.0)
        self.assertGreater(first_delay["avg_delay_days"], 0.0)

    def test_query_context_aggregation(self) -> None:
        result = self.memory.query_context(discipline="structural", work_type="rebar-fixing")
        self.assertIsInstance(result, MemoryQueryResult)
        self.assertGreater(result.total_samples, 50)
        self.assertGreater(result.confidence_score, 0.90)
        self.assertIsNotNone(result.productivity_benchmark)
        self.assertTrue(len(result.top_delay_risks) > 0)
        self.assertIn("Synthetic historical benchmark reference", result.disclaimer)

        d = result.to_dict()
        self.assertEqual(d["query"]["discipline"], "structural")
        self.assertIn("matched_patterns", d)

    def test_enrich_candidate_side_effect_free(self) -> None:
        from services.intelligence.models import Evidence
        candidate = MatchCandidate(
            activityId="ACT-CIV-001",
            activityWbs="1.1.1",
            score=0.95,
            band="auto_suggest",
            explanation=[],
        )
        event = ExecutionEvent(
            id="EVT-010",
            projectId="PRJ-DEMO",
            reporterId="REP-001",
            observedAt="2026-03-01T00:00:00Z",
            receivedAt="2026-03-01T00:05:00Z",
            evidence=Evidence(text="Civil excavation 250m3 completed"),
            extractedFacts=ExtractedFacts(discipline="civil", workType="excavation"),
        )
        enriched = self.memory.enrich_candidate(candidate, event)
        self.assertEqual(enriched["activityId"], "ACT-CIV-001")
        self.assertEqual(enriched["score"], 0.95)
        self.assertIsNotNone(enriched["historical_benchmark"])
        self.assertEqual(enriched["historical_benchmark"]["unit"], "m3")
        self.assertIn("Historical average for civil / excavation", enriched["advisory_note"])
        # Ensure candidate was not mutated
        self.assertEqual(candidate.score, 0.95)

    def test_project_memory_deterministic(self) -> None:
        res1 = self.memory.query_context("electrical", "cable-laying")
        res2 = self.memory.query_context("electrical", "cable-laying")
        self.assertEqual(res1.to_dict(), res2.to_dict())


if __name__ == "__main__":
    unittest.main()
