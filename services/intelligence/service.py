"""CLI entry point and service helpers for ExecLink intelligence."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure repository root is on sys.path for direct invocation
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from services.intelligence.config import MatchingConfig
from services.intelligence.eval import evaluate_dataset
from services.intelligence.extractor import FactExtractor
from services.intelligence.models import ExecutionEvent, MatchProposal, ScheduleActivity
from services.intelligence.pipeline import IntelligencePipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="ExecLink Deterministic Intelligence CLI")
    subparsers = parser.add_subparsers(dest="command", help="Sub-commands")

    # Extract command
    extract_parser = subparsers.add_parser("extract", help="Extract structured facts from text")
    extract_parser.add_argument("text", help="Raw evidence or transcription text")

    # Match command
    match_parser = subparsers.add_parser("match", help="Match an event against schedule activities")
    match_parser.add_argument("--event", required=True, help="Path to execution event JSON file")
    match_parser.add_argument("--activities", required=True, help="Path to schedule activities JSON file")
    match_parser.add_argument("--config", help="Optional path to matching config JSON file")
    match_parser.add_argument("--fallback", action="store_true", help="Force deterministic fallback mode")

    # Benchmark / Eval command
    eval_parser = subparsers.add_parser("benchmark", help="Run benchmark across labeled dataset")
    eval_parser.add_argument("--events", required=True, help="Path to execution events JSON file")
    eval_parser.add_argument("--activities", required=True, help="Path to schedule activities JSON file")
    eval_parser.add_argument("--expected", required=True, help="Path to expected match proposals JSON file")
    eval_parser.add_argument("--config", help="Optional path to matching config JSON file")

    # Memory command
    mem_parser = subparsers.add_parser("memory", help="Query Project Memory historical benchmarks")
    mem_parser.add_argument("--discipline", help="Filter by discipline")
    mem_parser.add_argument("--work-type", help="Filter by work type")
    mem_parser.add_argument("--keywords", nargs="*", help="Keywords to search")

    args = parser.parse_args()

    if args.command == "extract":
        res = FactExtractor.extract(args.text)
        print(json.dumps(res.to_dict(), indent=2))

    elif args.command == "match":
        with open(args.event, "r", encoding="utf-8") as f:
            evt_data = json.load(f)
        with open(args.activities, "r", encoding="utf-8") as f:
            act_data = json.load(f)

        config = MatchingConfig.from_file(args.config) if args.config else MatchingConfig()
        pipeline = IntelligencePipeline(config)

        event = ExecutionEvent.from_dict(evt_data)
        activities = [ScheduleActivity.from_dict(a) for a in act_data]
        mode = "deterministic_fallback" if args.fallback else "primary"

        proposal = pipeline.process_event(event, activities, mode=mode)
        print(json.dumps(proposal.to_dict(), indent=2))

    elif args.command == "benchmark":
        config = MatchingConfig.from_file(args.config) if args.config else MatchingConfig()
        report = evaluate_dataset(
            events_json_path=args.events,
            activities_json_path=args.activities,
            expected_proposals_json_path=args.expected,
            config=config,
        )
        print(json.dumps(report.to_dict(), indent=2))

    elif args.command == "memory":
        from services.intelligence.memory import ProjectMemory
        mem = ProjectMemory()
        res = mem.query_context(
            discipline=args.discipline,
            work_type=args.work_type,
            keywords=args.keywords,
        )
        print(json.dumps(res.to_dict(), indent=2))

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
