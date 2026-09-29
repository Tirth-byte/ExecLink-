from __future__ import annotations

import csv
import io
import json
import sqlite3
from collections import defaultdict
from datetime import date
from typing import Any

REPORT_TYPES = {"schedule-variance", "verification-audit", "match-quality", "delay-register", "discipline-progress"}


def build_report(db: sqlite3.Connection, project_id: str, report_type: str, report_date: str | None = None) -> list[dict[str, Any]]:
    ref_date = report_date or "2026-09-26"

    if report_type == "schedule-variance":
        # columns: wbs, activity_id, name, discipline, work_type, asset_id, planned_start, planned_finish, planned_percent, actual_percent, variance_percent, status, last_verified_at
        rows = db.execute(
            "SELECT * FROM activities WHERE project_id=? ORDER BY wbs, id",
            (project_id,)
        ).fetchall()
        result = []
        for r in rows:
            progress_val = r["actual_progress_percent"]
            # Planned percent simple schedule heuristic
            start = r["planned_start"]
            finish = r["planned_finish"]
            if ref_date < start:
                planned = 0.0
            elif ref_date >= finish:
                planned = 100.0
            else:
                planned = 50.0  # intermediate planned window
            variance = round(progress_val - planned, 2)
            if progress_val == 100:
                status = "complete"
            elif ref_date > finish and progress_val < 100:
                status = "delayed"
            elif progress_val > 0:
                status = "in_progress"
            else:
                status = "not_started"
            result.append({
                "wbs": r["wbs"],
                "activity_id": r["id"],
                "name": r["name"],
                "discipline": r["discipline"],
                "work_type": r["work_type"],
                "asset_id": r["asset_id"],
                "planned_start": r["planned_start"],
                "planned_finish": r["planned_finish"],
                "planned_percent": planned,
                "actual_percent": progress_val,
                "variance_percent": variance,
                "status": status,
                "last_verified_at": r["actual_as_of"] or "",
            })

        return result

    if report_type == "verification-audit":
        # columns: audit_sequence, decided_at, actor_id, actor_role, decision, execution_event_id, proposal_id, activity_id, wbs, previous_progress_percent, progress_percent, actual_updated, reason, audit_entry_hash
        entries = db.execute(
            "SELECT a.*, v.proposal_id, v.activity_id, v.planner_id, v.decision, v.progress_percent, v.note, act.wbs "
            "FROM audit_entries a "
            "LEFT JOIN verifications v ON v.project_id=a.project_id AND (a.entity_id=v.proposal_id OR a.entity_id=v.id) "
            "LEFT JOIN activities act ON act.id=v.activity_id AND act.project_id=v.project_id "
            "WHERE a.project_id=? AND a.action IN ('proposal.verified', 'proposal.rejected') "
            "ORDER BY a.sequence",
            (project_id,)
        ).fetchall()
        result = []
        for r in entries:
            payload = json.loads(r["canonical_payload"]) if r["canonical_payload"] else {}
            decision = "verified" if r["action"] == "proposal.verified" else "rejected"
            is_verified = (decision == "verified")
            result.append({
                "audit_sequence": r["sequence"],
                "decided_at": r["occurred_at"],
                "actor_id": r["actor_id"],
                "actor_role": "planner",
                "decision": decision,
                "execution_event_id": payload.get("executionEventId", ""),
                "proposal_id": r["entity_id"] if r["entity_type"] == "MatchProposal" else payload.get("proposalId", ""),
                "activity_id": r["activity_id"] if is_verified else "",
                "wbs": r["wbs"] if is_verified else "",
                "previous_progress_percent": payload.get("previousProgressPercent", "") if is_verified else "",
                "progress_percent": payload.get("progressPercent", "") if is_verified else "",
                "actual_updated": is_verified,
                "reason": payload.get("reason") or r["note"] or "",
                "audit_entry_hash": r["entry_hash"],
            })
        return result

    if report_type == "match-quality":
        # columns: execution_event_id, proposal_id, created_at, mode, engine_version, config_version, rank, activity_id, wbs, score, band, signal_asset, signal_discipline, signal_location, signal_text, signal_work_type, signal_temporal, missing_signals, outcome
        proposals = db.execute(
            "SELECT * FROM match_proposals WHERE project_id=? ORDER BY created_at, id",
            (project_id,)
        ).fetchall()
        result = []
        for prop in proposals:
            candidates = json.loads(prop["candidates_json"])
            for rank, c in enumerate(candidates, start=1):
                signals = {s["signal"]: s for s in c.get("explanation", [])}
                missing = [s["signal"] for s in c.get("explanation", []) if s.get("missing")]
                outcome = "selected" if prop["status"] == "verified" and rank == 1 else ("rejected" if prop["status"] == "rejected" else "pending")
                result.append({
                    "execution_event_id": prop["execution_event_id"],
                    "proposal_id": prop["id"],
                    "created_at": prop["created_at"],
                    "mode": prop["mode"],
                    "engine_version": prop["engine_version"],
                    "config_version": prop["config_version"],
                    "rank": rank,
                    "activity_id": c.get("activityId", ""),
                    "wbs": c.get("activityWbs", ""),
                    "score": round(c.get("score", 0), 4),
                    "band": c.get("band", ""),
                    "signal_asset": signals.get("asset", {}).get("contribution", 0.0),
                    "signal_discipline": signals.get("discipline", {}).get("contribution", 0.0),
                    "signal_location": signals.get("location", {}).get("contribution", 0.0),
                    "signal_text": signals.get("text", {}).get("contribution", 0.0),
                    "signal_work_type": signals.get("workType", {}).get("contribution", 0.0),
                    "signal_temporal": signals.get("temporal", {}).get("contribution", 0.0),
                    "missing_signals": "|".join(missing),
                    "outcome": outcome,
                })
        return result

    if report_type == "delay-register":
        # columns: wbs, activity_id, name, discipline, asset_id, planned_finish, actual_percent, remaining_percent, delay_days, last_verified_at, evidence_event_count
        rows = db.execute(
            "SELECT * FROM activities WHERE project_id=? AND planned_finish < ? AND actual_progress_percent < 100 ORDER BY planned_finish, wbs",
            (project_id, ref_date)
        ).fetchall()
        result = []
        for r in rows:
            p_finish = date.fromisoformat(r["planned_finish"])
            c_date = date.fromisoformat(ref_date)
            delay = (c_date - p_finish).days if c_date > p_finish else 0
            progress_val = r["actual_progress_percent"]
            result.append({
                "wbs": r["wbs"],
                "activity_id": r["id"],
                "name": r["name"],
                "discipline": r["discipline"],
                "asset_id": r["asset_id"],
                "planned_finish": r["planned_finish"],
                "actual_percent": progress_val,
                "remaining_percent": round(100.0 - progress_val, 2),
                "delay_days": delay,
                "last_verified_at": r["actual_as_of"] or "",
                "evidence_event_count": 1 if r["source_verification_id"] else 0,
            })
        return result

    if report_type == "discipline-progress":
        # columns: discipline, activity_count, started_count, complete_count, average_planned_percent, average_actual_percent, average_variance_percent, delayed_count
        rows = db.execute(
            "SELECT * FROM activities WHERE project_id=? ORDER BY discipline, id",
            (project_id,)
        ).fetchall()
        groups: dict[str, list[dict]] = defaultdict(list)
        for r in rows:
            groups[r["discipline"]].append(r)

        result = []
        for disc, acts in sorted(groups.items()):
            count = len(acts)
            started = sum(1 for a in acts if a["actual_progress_percent"] > 0)
            complete = sum(1 for a in acts if a["actual_progress_percent"] == 100)
            delayed = sum(1 for a in acts if a["planned_finish"] < ref_date and a["actual_progress_percent"] < 100)
            planned_sum = 0.0
            total_actual = sum(a["actual_progress_percent"] for a in acts)
            for a in acts:
                if ref_date < a["planned_start"]:
                    p = 0.0
                elif ref_date >= a["planned_finish"]:
                    p = 100.0
                else:
                    p = 50.0
                planned_sum += p
            avg_planned = round(planned_sum / count, 2)
            avg_actual = round(total_actual / count, 2)

            variance = round(avg_actual - avg_planned, 2)
            result.append({
                "discipline": disc,
                "activity_count": count,
                "started_count": started,
                "complete_count": complete,
                "average_planned_percent": avg_planned,
                "average_actual_percent": avg_actual,
                "average_variance_percent": variance,
                "delayed_count": delayed,
            })
        return result

    raise KeyError(report_type)


def as_csv(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "status\nno-data\n"
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()
