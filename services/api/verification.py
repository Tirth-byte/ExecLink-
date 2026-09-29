from __future__ import annotations

import sqlite3
from typing import Any

from .audit import append_entry
from .auth import Principal, require_role
from .errors import ApiProblem, not_found
from .idempotency import replay, store
from .util import canonical, loads, new_id, now


def verify_proposal(db: sqlite3.Connection, project_id: str, proposal_id: str, actor: Principal, key: str, command: dict[str, Any], request_id: str) -> tuple[int, dict[str, Any]]:
    require_role(db, project_id, actor, "planner")
    route = f"/projects/{project_id}/proposals/{proposal_id}/verify"
    prior = replay(db, project_id, actor.user_id, route, key, command)
    if prior:
        return prior
    proposal = db.execute("SELECT * FROM match_proposals WHERE id=? AND project_id=?", (proposal_id, project_id)).fetchone()
    if not proposal:
        raise not_found("proposal", proposal_id)
    if proposal["status"] != "proposed":
        raise ApiProblem(409, "INVALID_TRANSITION", f"Cannot verify a {proposal['status']} proposal")
    activity_id = command.get("activityId")
    candidate_ids = {c["activityId"] for c in loads(proposal["candidates_json"])}
    if activity_id not in candidate_ids:
        raise ApiProblem(422, "INVALID_ACTIVITY", "Activity is not a proposal candidate")
    activity = db.execute("SELECT * FROM activities WHERE id=? AND project_id=? AND snapshot_id=?", (activity_id, project_id, proposal["snapshot_id"])).fetchone()
    if not activity:
        raise ApiProblem(422, "INVALID_ACTIVITY", "Activity is outside the pinned project snapshot")
    progress = command.get("progressPercent")
    if not isinstance(progress, (int, float)) or isinstance(progress, bool) or not 0 <= progress <= 100:
        raise ApiProblem(422, "INVALID_PROGRESS", "progressPercent must be between 0 and 100")
    if progress < activity["actual_progress_percent"]:
        raise ApiProblem(422, "INVALID_PROGRESS", "Normal verification cannot regress progress", {"currentProgressPercent": activity["actual_progress_percent"]})
    if command.get("expectedActivityVersion") != activity["version"]:
        raise ApiProblem(409, "VERSION_CONFLICT", "Activity version changed", {"currentVersion": activity["version"]})
    timestamp, verification_id = now(), new_id("VER")
    quantity = command.get("actualQuantity")
    db.execute(
        "INSERT INTO verifications VALUES(?,?,?,?,?,?,?,?,?,?)",
        (verification_id, project_id, proposal_id, activity_id, actor.user_id, "verified", progress, canonical(quantity) if quantity else None, command.get("note"), timestamp),
    )
    # Authorized actual-progress write: this module is the sole verification path.
    db.execute(
        "UPDATE activities SET actual_progress_percent=?,actual_quantity_json=?,actual_as_of=?,source_verification_id=?,version=version+1 WHERE id=?",
        (progress, canonical(quantity) if quantity else activity["actual_quantity_json"], timestamp, verification_id, activity_id),
    )
    db.execute("UPDATE match_proposals SET status='verified',version=version+1 WHERE id=?", (proposal_id,))
    db.execute("UPDATE execution_events SET status='verified',version=version+1 WHERE id=?", (proposal["execution_event_id"],))
    audit_sequence, _ = append_entry(db, project_id=project_id, actor_id=actor.user_id, action="proposal.verified", entity_type="MatchProposal", entity_id=proposal_id, occurred_at=timestamp, request_id=request_id, payload={"verificationId": verification_id, "activityId": activity_id, "previousProgressPercent": activity["actual_progress_percent"], "progressPercent": progress, "activityVersion": activity["version"] + 1})
    response = {"verificationId": verification_id, "proposalId": proposal_id, "activityId": activity_id, "previousProgressPercent": activity["actual_progress_percent"], "progressPercent": progress, "activityVersion": activity["version"] + 1, "auditSequence": audit_sequence}
    db.execute("INSERT INTO outbox_events VALUES(?,?,?,?,?,?,?,NULL)", (new_id("OBX"), project_id, "activity", activity_id, "activity.progress_verified", canonical(response), timestamp))
    store(db, project_id, actor.user_id, route, key, command, 200, response)
    return 200, response


def reject_proposal(db: sqlite3.Connection, project_id: str, proposal_id: str, actor: Principal, key: str, command: dict[str, Any], request_id: str) -> tuple[int, dict[str, Any]]:
    require_role(db, project_id, actor, "planner")
    route = f"/projects/{project_id}/proposals/{proposal_id}/reject"
    prior = replay(db, project_id, actor.user_id, route, key, command)
    if prior:
        return prior
    proposal = db.execute("SELECT * FROM match_proposals WHERE id=? AND project_id=?", (proposal_id, project_id)).fetchone()
    if not proposal:
        raise not_found("proposal", proposal_id)
    if proposal["status"] != "proposed":
        raise ApiProblem(409, "INVALID_TRANSITION", f"Cannot reject a {proposal['status']} proposal")
    timestamp, verification_id = now(), new_id("VER")
    db.execute("INSERT INTO verifications VALUES(?,?,?,?,?,?,?,?,?,?)", (verification_id, project_id, proposal_id, None, actor.user_id, "rejected", None, None, command.get("reason"), timestamp))
    db.execute("UPDATE match_proposals SET status='rejected',version=version+1 WHERE id=?", (proposal_id,))
    db.execute("UPDATE execution_events SET status='rejected',version=version+1 WHERE id=?", (proposal["execution_event_id"],))
    audit_sequence, _ = append_entry(db, project_id=project_id, actor_id=actor.user_id, action="proposal.rejected", entity_type="MatchProposal", entity_id=proposal_id, occurred_at=timestamp, request_id=request_id, payload={"verificationId": verification_id, "reason": command.get("reason")})
    response = {"verificationId": verification_id, "proposalId": proposal_id, "status": "rejected", "auditSequence": audit_sequence}
    db.execute("INSERT INTO outbox_events VALUES(?,?,?,?,?,?,?,NULL)", (new_id("OBX"), project_id, "proposal", proposal_id, "proposal.rejected", canonical(response), timestamp))
    store(db, project_id, actor.user_id, route, key, command, 200, response)
    return 200, response
