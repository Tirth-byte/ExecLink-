from __future__ import annotations

from .db import DatabaseRow
from .util import loads


def activity(row: DatabaseRow) -> dict:
    return {"id": row["id"], "projectId": row["project_id"], "snapshotId": row["snapshot_id"], "wbs": row["wbs"], "level": row["level"], "name": row["name"], "discipline": row["discipline"], "workType": row["work_type"], "assetId": row["asset_id"], "location": loads(row["location_json"]), "plannedStart": row["planned_start"], "plannedFinish": row["planned_finish"], "plannedQuantity": loads(row["planned_quantity_json"]), "actualProgressPercent": row["actual_progress_percent"], "actualQuantity": loads(row["actual_quantity_json"]), "actualAsOf": row["actual_as_of"], "version": row["version"]}


def event(row: DatabaseRow) -> dict:
    return {"id": row["id"], "projectId": row["project_id"], "reporterId": row["reporter_id"], "observedAt": row["observed_at"], "receivedAt": row["received_at"], "evidence": loads(row["evidence_json"]), "extractedFacts": loads(row["extracted_facts_json"]), "status": row["status"]}


def proposal(row: DatabaseRow) -> dict:
    return {"id": row["id"], "projectId": row["project_id"], "executionEventId": row["execution_event_id"], "snapshotId": row["snapshot_id"], "engineVersion": row["engine_version"], "configVersion": row["config_version"], "mode": row["mode"], "status": row["status"], "candidates": loads(row["candidates_json"]), "createdAt": row["created_at"]}
