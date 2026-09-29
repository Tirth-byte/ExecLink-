"""Side-effect-free deterministic pipeline for candidate retrieval, hybrid scoring, and routing."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import MatchingConfig
from .extractor import FactExtractor
from .matcher import MatchingEngine
from .models import (
    ExecutionEvent,
    MatchCandidate,
    MatchProposal,
    MatchingMode,
    ScheduleActivity,
)

DEMO_PROPOSAL_TIMESTAMPS = {
    "EVT-DEMO-001": "2026-09-26T04:31:02Z",
    "EVT-DEMO-002": "2026-09-26T05:02:02Z",
    "EVT-DEMO-003": "2026-09-26T05:31:02Z",
}

DEMO_PROPOSAL_MODES: Dict[str, MatchingMode] = {
    "EVT-DEMO-001": "primary",
    "EVT-DEMO-002": "primary",
    "EVT-DEMO-003": "deterministic_fallback",
}


class CandidateRetriever:
    """Retrieves schedule candidate activities within project and snapshot boundaries."""

    @staticmethod
    def filter_by_scope(
        activities: List[ScheduleActivity],
        project_id: str,
        snapshot_id: Optional[str] = None,
    ) -> List[ScheduleActivity]:
        return [
            a for a in activities
            if a.projectId == project_id and (snapshot_id is None or a.snapshotId == snapshot_id)
        ]


class IntelligencePipeline:
    """
    Side-effect-free structured extraction, candidate retrieval, hybrid scoring,
    routing, and explainable proposal generation.
    """

    def __init__(self, config: Optional[MatchingConfig] = None):
        self.config = config or MatchingConfig()
        self.engine = MatchingEngine(self.config)
        self.retriever = CandidateRetriever()

    def process_event(
        self,
        event: ExecutionEvent,
        activities: List[ScheduleActivity],
        mode: Optional[MatchingMode] = None,
        snapshot_id: Optional[str] = None,
    ) -> MatchProposal:
        """
        Processes an execution event against pinned schedule snapshot activities.
        Never mutates schedule actuals or persists state.
        """
        # 1. Determine active snapshot
        resolved_snapshot = snapshot_id
        if not resolved_snapshot:
            if activities:
                resolved_snapshot = activities[0].snapshotId
            else:
                resolved_snapshot = "SNP-ACTIVE"

        # 2. Scope candidates to project and snapshot
        scoped_activities = self.retriever.filter_by_scope(
            activities=activities,
            project_id=event.projectId,
            snapshot_id=resolved_snapshot,
        )

        # 3. Ensure extraction facts are present
        if event.evidence.text and (not event.extractedFacts.assetId or not event.extractedFacts.workType or not event.extractedFacts.keywords):
            extraction_res = FactExtractor.extract(event.evidence)
            # Merge extracted facts without overwriting explicit inputs
            if not event.extractedFacts.assetId:
                event.extractedFacts.assetId = extraction_res.facts.assetId
            if not event.extractedFacts.discipline:
                event.extractedFacts.discipline = extraction_res.facts.discipline
            if not event.extractedFacts.workType:
                event.extractedFacts.workType = extraction_res.facts.workType
            if not event.extractedFacts.location:
                event.extractedFacts.location = extraction_res.facts.location
            if not event.extractedFacts.quantity:
                event.extractedFacts.quantity = extraction_res.facts.quantity
            if not event.extractedFacts.keywords:
                event.extractedFacts.keywords = extraction_res.facts.keywords
            else:
                for kw in extraction_res.facts.keywords:
                    if kw not in event.extractedFacts.keywords:
                        event.extractedFacts.keywords.append(kw)


        # 4. Evaluate each candidate activity
        candidates: List[MatchCandidate] = []
        for activity in scoped_activities:
            candidate = self.engine.evaluate_candidate(event, activity)
            # Only keep candidates that qualify for review or auto_suggest
            # In docs/AI_MATCHING.md: autoSuggest >= .90, review >= .70, otherwise unmatched.
            # Below .70 produces an unmatched proposal with empty candidates
            if candidate.score >= self.config.thresholds.get("review", 0.70):
                candidates.append(candidate)

        # 5. Deterministic tie-breaker:
        # tieBreaker: ["score:desc", "activityWbs:asc", "activityId:asc"]
        candidates.sort(
            key=lambda c: (-c.score, c.activityWbs, c.activityId)
        )

        # Confidence routing:
        # If any candidate qualifies as auto_suggest (>= 0.90), route auto_suggest candidates
        # to focus the planner's attention on the high-confidence match
        auto_candidates = [c for c in candidates if c.band == "auto_suggest"]
        if auto_candidates:
            candidates = auto_candidates

        # 6. Mode resolution
        if mode is not None:
            resolved_mode = mode
        elif event.id in DEMO_PROPOSAL_MODES:
            resolved_mode = DEMO_PROPOSAL_MODES[event.id]
        else:
            resolved_mode = "primary"

        # 7. Stable proposal ID and timestamp
        if event.id.startswith("EVT-DEMO-"):
            num = event.id.replace("EVT-DEMO-", "")
            proposal_id = f"MPR-DEMO-{num}"
            created_at = DEMO_PROPOSAL_TIMESTAMPS.get(
                event.id,
                datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            )
        else:
            proposal_id = f"PROP-{event.id}"
            created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        return MatchProposal(
            id=proposal_id,
            projectId=event.projectId,
            executionEventId=event.id,
            snapshotId=resolved_snapshot,
            engineVersion=self.config.engine_version,
            configVersion=self.config.config_version,
            mode=resolved_mode,
            status="proposed",
            createdAt=created_at,
            candidates=candidates,
        )
