"""Evaluation metrics and benchmark runner for ExecLink matching engine."""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import MatchingConfig
from .models import ExecutionEvent, MatchProposal, ScheduleActivity
from .pipeline import IntelligencePipeline


@dataclass
class EvaluationReport:
    total_events: int
    top1_accuracy: float
    top3_accuracy: float
    unmatched_precision: float
    unmatched_recall: float
    threshold_buckets: Dict[str, int]
    avg_latency_ms: float
    fallback_rate: float
    deterministic_replay_equality: bool
    details: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_events": self.total_events,
            "top1_accuracy": round(self.top1_accuracy, 4),
            "top3_accuracy": round(self.top3_accuracy, 4),
            "unmatched_precision": round(self.unmatched_precision, 4),
            "unmatched_recall": round(self.unmatched_recall, 4),
            "threshold_buckets": self.threshold_buckets,
            "avg_latency_ms": round(self.avg_latency_ms, 2),
            "fallback_rate": round(self.fallback_rate, 4),
            "deterministic_replay_equality": self.deterministic_replay_equality,
            "details": self.details,
        }


def evaluate_dataset(
    events_json_path: str | Path,
    activities_json_path: str | Path,
    expected_proposals_json_path: str | Path,
    config: Optional[MatchingConfig] = None,
) -> EvaluationReport:
    """
    Evaluates pipeline against a frozen labeled fixture set.
    Reports top-1/top-3 accuracy, unmatched precision/recall,
    threshold buckets, latency, fallback rate, and deterministic replay equality.
    """
    with open(events_json_path, "r", encoding="utf-8") as f:
        events_data = json.load(f)
    with open(activities_json_path, "r", encoding="utf-8") as f:
        activities_data = json.load(f)
    with open(expected_proposals_json_path, "r", encoding="utf-8") as f:
        expected_proposals_data = json.load(f)

    events = [ExecutionEvent.from_dict(d) for d in events_data]
    activities = [ScheduleActivity.from_dict(d) for d in activities_data]
    expected_map = {p["executionEventId"]: p for p in expected_proposals_data}

    pipeline = IntelligencePipeline(config or MatchingConfig())

    correct_top1 = 0
    correct_top3 = 0
    expected_unmatched_count = 0
    true_unmatched = 0
    predicted_unmatched = 0
    buckets = {"auto_suggest": 0, "review": 0, "unmatched": 0}
    fallback_count = 0
    latencies: List[float] = []
    details: List[Dict[str, Any]] = []

    # Run pass 1
    run1_proposals: List[Dict[str, Any]] = []
    for event in events:
        start_t = time.perf_counter()
        proposal = pipeline.process_event(event, activities)
        latency = (time.perf_counter() - start_t) * 1000.0
        latencies.append(latency)

        p_dict = proposal.to_dict()
        run1_proposals.append(p_dict)

        if proposal.mode == "deterministic_fallback":
            fallback_count += 1

        exp = expected_map.get(event.id)
        exp_candidates = exp.get("candidates", []) if exp else []
        exp_top_id = exp_candidates[0]["activityId"] if exp_candidates else None
        is_expected_unmatched = (exp_top_id is None)

        predicted_candidates = proposal.candidates
        pred_top_id = predicted_candidates[0].activityId if predicted_candidates else None
        is_pred_unmatched = (pred_top_id is None)

        if is_expected_unmatched:
            expected_unmatched_count += 1

        if is_pred_unmatched:
            predicted_unmatched += 1
            buckets["unmatched"] += 1
            if is_expected_unmatched:
                true_unmatched += 1
                correct_top1 += 1
                correct_top3 += 1
        else:
            top_cand = predicted_candidates[0]
            buckets[top_cand.band] += 1
            if top_cand.activityId == exp_top_id:
                correct_top1 += 1
            pred_top3_ids = [c.activityId for c in predicted_candidates[:3]]
            if exp_top_id in pred_top3_ids:
                correct_top3 += 1

        details.append({
            "eventId": event.id,
            "expectedTopActivity": exp_top_id,
            "predictedTopActivity": pred_top_id,
            "predictedBand": predicted_candidates[0].band if predicted_candidates else "unmatched",
            "predictedScore": predicted_candidates[0].score if predicted_candidates else 0.0,
            "latencyMs": round(latency, 2),
        })

    # Run pass 2 for deterministic replay equality check
    run2_proposals: List[Dict[str, Any]] = []
    for event in events:
        proposal = pipeline.process_event(event, activities)
        run2_proposals.append(proposal.to_dict())

    replay_equal = (json.dumps(run1_proposals, sort_keys=True) == json.dumps(run2_proposals, sort_keys=True))

    n = len(events)
    top1_acc = (correct_top1 / n) if n > 0 else 1.0
    top3_acc = (correct_top3 / n) if n > 0 else 1.0
    precision_unmatched = (true_unmatched / predicted_unmatched) if predicted_unmatched > 0 else 1.0
    recall_unmatched = (true_unmatched / expected_unmatched_count) if expected_unmatched_count > 0 else 1.0
    avg_latency = (sum(latencies) / len(latencies)) if latencies else 0.0
    fallback_rate = (fallback_count / n) if n > 0 else 0.0

    return EvaluationReport(
        total_events=n,
        top1_accuracy=top1_acc,
        top3_accuracy=top3_acc,
        unmatched_precision=precision_unmatched,
        unmatched_recall=recall_unmatched,
        threshold_buckets=buckets,
        avg_latency_ms=avg_latency,
        fallback_rate=fallback_rate,
        deterministic_replay_equality=replay_equal,
        details=details,
    )
