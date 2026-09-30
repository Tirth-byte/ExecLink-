from __future__ import annotations

from .db import DatabaseRow
from .util import loads


def activity(row: DatabaseRow) -> dict:
    return {
        "id": row["id"],
        "projectId": row["project_id"],
        "snapshotId": row["snapshot_id"],
        "wbs": row["wbs"],
        "level": row["level"],
        "name": row["name"],
        "discipline": row["discipline"],
        "workType": row["work_type"],
        "assetId": row["asset_id"],
        "location": loads(row["location_json"]),
        "plannedStart": row["planned_start"],
        "plannedFinish": row["planned_finish"],
        "plannedQuantity": loads(row["planned_quantity_json"]),
        "actualProgressPercent": row["actual_progress_percent"],
        "actualQuantity": loads(row["actual_quantity_json"]),
        "actualAsOf": row["actual_as_of"],
        "version": row["version"],
    }


def event(row: DatabaseRow) -> dict:
    return {
        "id": row["id"],
        "projectId": row["project_id"],
        "reporterId": row["reporter_id"],
        "observedAt": row["observed_at"],
        "receivedAt": row["received_at"],
        "evidence": loads(row["evidence_json"]),
        "extractedFacts": loads(row["extracted_facts_json"]),
        "status": row["status"],
    }


def proposal(row: DatabaseRow) -> dict:
    return {
        "id": row["id"],
        "projectId": row["project_id"],
        "executionEventId": row["execution_event_id"],
        "snapshotId": row["snapshot_id"],
        "engineVersion": row["engine_version"],
        "configVersion": row["config_version"],
        "mode": row["mode"],
        "status": row["status"],
        "candidates": loads(row["candidates_json"]),
        "createdAt": row["created_at"],
    }


def evidence_item(row: DatabaseRow) -> dict:
    return {
        "id": row["id"],
        "projectId": row["project_id"],
        "sourceCaptureId": row["source_capture_id"],
        "type": row["type"],
        "storageKey": row["storage_key"],
        "mimeType": row["mime_type"],
        "fileName": row["file_name"],
        "fileSize": row["file_size"],
        "thumbnailUrl": row["thumbnail_url"],
        "mediaUrl": row["media_url"],
        "capturedAt": row["captured_at"],
        "uploadedAt": row["uploaded_at"],
        "capturedBy": row["captured_by"],
        "durationMs": row["duration_ms"],
        "width": row["width"],
        "height": row["height"],
        "sha256": row["sha256"],
        "syncStatus": row["sync_status"],
        "metadata": loads(row["metadata_json"]) if row.get("metadata_json") else {},
        "createdAt": row["created_at"],
    }
