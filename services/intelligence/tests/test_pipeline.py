"""Pipeline and end-to-end integration tests for ExecLink intelligence."""
from __future__ import annotations

import json
from pathlib import Path
import unittest

from services.intelligence.config import MatchingConfig
from services.intelligence.eval import evaluate_dataset
from services.intelligence.extractor import FactExtractor
from services.intelligence.models import (
    Evidence,
    ExecutionEvent,
    ExtractedFacts,
    LocationInterval,
    MatchCandidate,
    ScheduleActivity,
)
from services.intelligence.pipeline import IntelligencePipeline

REPO_ROOT = Path(__file__).resolve().parents[3]
DEMO_DIR = REPO_ROOT / "data" / "demo"


class TestPipeline(unittest.TestCase):
    def setUp(self) -> None:
        self.config = MatchingConfig.from_file(DEMO_DIR / "matching-config.json")
        self.pipeline = IntelligencePipeline(self.config)

        with open(DEMO_DIR / "schedule-activities.json", "r", encoding="utf-8") as f:
            self.activities = [ScheduleActivity.from_dict(d) for d in json.load(f)]
        with open(DEMO_DIR / "execution-events.json", "r", encoding="utf-8") as f:
            self.events = [ExecutionEvent.from_dict(d) for d in json.load(f)]
        with open(DEMO_DIR / "match-proposals.json", "r", encoding="utf-8") as f:
            self.expected_proposals = {p["id"]: p for p in json.load(f)}

    def test_demo_fixture_event_1_auto_suggest(self) -> None:
        """EVT-DEMO-001 must produce ACT-1.2.1 candidate at 0.9700 score in auto_suggest band."""
        evt1 = self.events[0]
        self.assertEqual("EVT-DEMO-001", evt1.id)

        proposal = self.pipeline.process_event(evt1, self.activities)

        self.assertEqual("MPR-DEMO-001", proposal.id)
        self.assertEqual("primary", proposal.mode)
        self.assertEqual("proposed", proposal.status)
        self.assertEqual(1, len(proposal.candidates))

        cand = proposal.candidates[0]
        self.assertEqual("ACT-1.2.1", cand.activityId)
        self.assertEqual("1.2.1", cand.activityWbs)
        self.assertEqual(0.9700, cand.score)
        self.assertEqual("auto_suggest", cand.band)
        self.assertEqual(6, len(cand.explanation))

    def test_demo_fixture_event_2_ambiguous_review(self) -> None:
        """EVT-DEMO-002 must produce two candidates under .90 in review band."""
        evt2 = self.events[1]
        self.assertEqual("EVT-DEMO-002", evt2.id)

        proposal = self.pipeline.process_event(evt2, self.activities)

        self.assertEqual("MPR-DEMO-002", proposal.id)
        self.assertEqual("primary", proposal.mode)
        self.assertEqual(2, len(proposal.candidates))

        # Check candidate 1: ACT-1.2.1
        c1 = proposal.candidates[0]
        self.assertEqual("ACT-1.2.1", c1.activityId)
        self.assertEqual(0.7900, c1.score)
        self.assertEqual("review", c1.band)

        # Check candidate 2: ACT-1.2.2
        c2 = proposal.candidates[1]
        self.assertEqual("ACT-1.2.2", c2.activityId)
        self.assertEqual(0.7800, c2.score)
        self.assertEqual("review", c2.band)

        # Order must be score descending
        self.assertGreater(c1.score, c2.score)

    def test_demo_fixture_event_3_unmatched_fallback(self) -> None:
        """EVT-DEMO-003 must produce empty candidates list and deterministic_fallback mode."""
        evt3 = self.events[2]
        self.assertEqual("EVT-DEMO-003", evt3.id)

        proposal = self.pipeline.process_event(evt3, self.activities)

        self.assertEqual("MPR-DEMO-003", proposal.id)
        self.assertEqual("deterministic_fallback", proposal.mode)
        self.assertEqual([], proposal.candidates)

    def test_p110_sentence_extraction_and_matching(self) -> None:
        """
        Extraction of the P-110 sentence produces an auto_suggest proposal
        against a schedule activity for P-110 equipment erection.
        """
        sentence = "Line 24 P-110 equipment erection completed at chainage 18+200 to 18+250."
        extracted = FactExtractor.extract(sentence)

        event = ExecutionEvent(
            id="EVT-P110-001",
            projectId="PRJ-METRO-001",
            reporterId="USR-SUP-001",
            observedAt="2026-09-26T06:00:00Z",
            receivedAt="2026-09-26T06:01:00Z",
            evidence=Evidence(text=sentence),
            extractedFacts=extracted.facts,
        )

        p110_activity = ScheduleActivity(
            id="ACT-3.1.1",
            projectId="PRJ-METRO-001",
            snapshotId="SNP-DEMO-001",
            wbs="3.1.1",
            level=6,
            name="Line 24 P-110 equipment erection",
            discipline="mechanical",
            workType="erection",
            assetId="P-110",
            location=LocationInterval(kind="chainage", alignment="BL", start=18200, end=18250, unit="m"),
            plannedStart="2026-09-26",
            plannedFinish="2026-09-29",
        )

        proposal = self.pipeline.process_event(event, [p110_activity])
        self.assertEqual(1, len(proposal.candidates))
        cand = proposal.candidates[0]
        self.assertEqual("ACT-3.1.1", cand.activityId)
        self.assertGreaterEqual(cand.score, 0.90)
        self.assertEqual("auto_suggest", cand.band)

    def test_deterministic_tie_breaker_order(self) -> None:
        """
        When two candidates have the exact same score, ordering breaks ties by:
        1. score:desc
        2. activityWbs:asc
        3. activityId:asc
        """
        event = ExecutionEvent(
            id="EVT-TIE-001",
            projectId="PRJ-METRO-001",
            reporterId="USR-SUP-001",
            observedAt="2026-09-26T04:30:00Z",
            receivedAt="2026-09-26T04:31:00Z",
            evidence=Evidence(text="General civil work."),
            extractedFacts=ExtractedFacts(discipline="civil", keywords=["general", "civil"]),
        )

        # Two activities with identical score, different WBS
        act_b = ScheduleActivity(
            id="ACT-TIE-B",
            projectId="PRJ-METRO-001",
            snapshotId="SNP-DEMO-001",
            wbs="2.2.1",
            level=6,
            name="Civil earthworks B",
            discipline="civil",
            workType="earthwork",
            assetId="CIV-02",
            location=LocationInterval(kind="chainage", alignment="BL", start=1000, end=2000, unit="m"),
            plannedStart="2026-09-01",
            plannedFinish="2026-09-30",
        )
        act_a = ScheduleActivity(
            id="ACT-TIE-A",
            projectId="PRJ-METRO-001",
            snapshotId="SNP-DEMO-001",
            wbs="1.1.2",
            level=6,
            name="Civil earthworks A",
            discipline="civil",
            workType="earthwork",
            assetId="CIV-01",
            location=LocationInterval(kind="chainage", alignment="BL", start=1000, end=2000, unit="m"),
            plannedStart="2026-09-01",
            plannedFinish="2026-09-30",
        )

        cand_a = self.pipeline.engine.evaluate_candidate(event, act_a)
        cand_b = self.pipeline.engine.evaluate_candidate(event, act_b)
        self.assertEqual(cand_a.score, cand_b.score)

        # Pipeline sort: WBS 1.1.2 must appear before WBS 2.2.1
        proposal = self.pipeline.process_event(event, [act_b, act_a])
        if proposal.candidates:
            self.assertEqual("ACT-TIE-A", proposal.candidates[0].activityId)

    def test_evaluation_dataset_report(self) -> None:
        """Run evaluation benchmark across demo dataset."""
        report = evaluate_dataset(
            events_json_path=DEMO_DIR / "execution-events.json",
            activities_json_path=DEMO_DIR / "schedule-activities.json",
            expected_proposals_json_path=DEMO_DIR / "match-proposals.json",
            config=self.config,
        )

        self.assertEqual(3, report.total_events)
        self.assertEqual(1.0, report.top1_accuracy)
        self.assertEqual(1.0, report.top3_accuracy)
        self.assertEqual(1.0, report.unmatched_precision)
        self.assertEqual(1.0, report.unmatched_recall)
        self.assertTrue(report.deterministic_replay_equality)


if __name__ == "__main__":
    unittest.main()
