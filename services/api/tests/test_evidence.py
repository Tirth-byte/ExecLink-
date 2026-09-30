from __future__ import annotations

import hashlib
import io
import tempfile
import unittest
from pathlib import Path
from starlette.testclient import TestClient

from services.api.auth import create_jwt
from services.api.db import connect, initialise, transaction
from services.api.main import app
from services.api.storage import LocalEvidenceStorage, set_storage
from services.api.verification import verify_proposal
from services.api.verification_seed import reset_demo
from services.api.auth import Principal

PROJECT = "PRJ-DEMO-001"
SUPERVISOR_ID = "USR-DEMO-001"  # Asha Rao (Supervisor)
PLANNER_ID = "USR-DEMO-003"     # T. Patel (Lead Planner)
VIEWER_ID = "USR-DEMO-004"      # Viewer


class EvidenceApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.storage_dir = Path(self.temp_dir.name) / "storage"
        self.storage = LocalEvidenceStorage(self.storage_dir)
        set_storage(self.storage)

        self.db_path = Path(self.temp_dir.name) / "test.db"
        self.db = connect(self.db_path)
        initialise(self.db)
        reset_demo(self.db)
        self.db.close()

        # Point app db to test db
        import os
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_path}"

        self.client = TestClient(app)
        self.supervisor_token = create_jwt({"sub": SUPERVISOR_ID, "email": "asha.rao@execlink.local", "name": "Asha Rao"})
        self.planner_token = create_jwt({"sub": PLANNER_ID, "email": "t.patel@execlink.local", "name": "T. Patel"})
        self.viewer_token = create_jwt({"sub": VIEWER_ID, "email": "viewer@execlink.local", "name": "Project Viewer"})

    def tearDown(self) -> None:
        set_storage(None)
        self.temp_dir.cleanup()

    def test_upload_photo_success(self) -> None:
        fake_photo = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"fake_jpeg_content_12345"
        captured_time = "2026-09-26T09:15:00Z"
        
        response = self.client.post(
            f"/api/v1/projects/{PROJECT}/evidence/upload",
            headers={"Authorization": f"Bearer {self.supervisor_token}"},
            files={"file": ("site_p110.jpg", io.BytesIO(fake_photo), "image/jpeg")},
            data={"type": "photo", "captured_at": captured_time, "source_capture_id": "CAP-001"},
        )
        self.assertEqual(201, response.status_code)
        data = response.json()
        self.assertTrue(data["id"].startswith("EVD-"))
        self.assertEqual("photo", data["type"])
        self.assertEqual("image/jpeg", data["mimeType"])
        self.assertEqual(len(fake_photo), data["fileSize"])
        self.assertEqual(captured_time, data["capturedAt"])
        self.assertNotEqual(captured_time, data["uploadedAt"])
        self.assertEqual(hashlib.sha256(fake_photo).hexdigest(), data["sha256"])
        self.assertTrue(data["mediaUrl"].startswith(f"/api/v1/projects/{PROJECT}/evidence/"))

        # Verify retrieval
        get_res = self.client.get(
            f"/api/v1/projects/{PROJECT}/evidence/{data['id']}",
            headers={"Authorization": f"Bearer {self.planner_token}"},
        )
        self.assertEqual(200, get_res.status_code)
        self.assertEqual(data["id"], get_res.json()["id"])

        # Verify media streaming
        media_res = self.client.get(
            f"/api/v1/projects/{PROJECT}/evidence/{data['id']}/media",
            headers={"Authorization": f"Bearer {self.planner_token}"},
        )
        self.assertEqual(200, media_res.status_code)
        self.assertEqual("image/jpeg", media_res.headers["content-type"])
        self.assertEqual(fake_photo, media_res.content)

    def test_upload_video_success(self) -> None:
        fake_video = b"\x00\x00\x00\x20ftypisom" + b"fake_mp4_stream_data_67890"
        response = self.client.post(
            f"/api/v1/projects/{PROJECT}/evidence/upload",
            headers={"Authorization": f"Bearer {self.supervisor_token}"},
            files={"file": ("blocker.mp4", io.BytesIO(fake_video), "video/mp4")},
            data={"type": "video", "duration_ms": "45000"},
        )
        self.assertEqual(201, response.status_code)
        data = response.json()
        self.assertEqual("video", data["type"])
        self.assertEqual("video/mp4", data["mimeType"])
        self.assertEqual(45000, data["durationMs"])

    def test_unsupported_mime_rejected(self) -> None:
        bad_file = b"MZ\x90\x00executable"
        response = self.client.post(
            f"/api/v1/projects/{PROJECT}/evidence/upload",
            headers={"Authorization": f"Bearer {self.supervisor_token}"},
            files={"file": ("malware.exe", io.BytesIO(bad_file), "application/x-msdownload")},
            data={"type": "document"},
        )
        self.assertEqual(415, response.status_code)
        self.assertEqual("UNSUPPORTED_MEDIA_TYPE", response.json()["error"]["code"])

    def test_oversized_file_rejected(self) -> None:
        huge_data = b"0" * (21 * 1024 * 1024)  # 21MB for photo (max 20MB)
        response = self.client.post(
            f"/api/v1/projects/{PROJECT}/evidence/upload",
            headers={"Authorization": f"Bearer {self.supervisor_token}"},
            files={"file": ("huge.jpg", io.BytesIO(huge_data), "image/jpeg")},
            data={"type": "photo"},
        )
        self.assertEqual(413, response.status_code)
        self.assertEqual("PAYLOAD_TOO_LARGE", response.json()["error"]["code"])

    def test_viewer_cannot_upload_evidence(self) -> None:
        fake_photo = b"\xff\xd8\xff\xe0" + b"sample"
        response = self.client.post(
            f"/api/v1/projects/{PROJECT}/evidence/upload",
            headers={"Authorization": f"Bearer {self.viewer_token}"},
            files={"file": ("photo.jpg", io.BytesIO(fake_photo), "image/jpeg")},
            data={"type": "photo"},
        )
        self.assertEqual(403, response.status_code)

    def test_event_submission_with_evidence_and_multi_fact_linking(self) -> None:
        # 1. Upload photo 1 and video 2
        p1 = self.client.post(
            f"/api/v1/projects/{PROJECT}/evidence/upload",
            headers={"Authorization": f"Bearer {self.supervisor_token}"},
            files={"file": ("p110.jpg", io.BytesIO(b"p110_photo"), "image/jpeg")},
            data={"type": "photo"},
        ).json()["id"]

        v2 = self.client.post(
            f"/api/v1/projects/{PROJECT}/evidence/upload",
            headers={"Authorization": f"Bearer {self.supervisor_token}"},
            files={"file": ("hydrotest_blocker.mp4", io.BytesIO(b"hydrotest_video"), "video/mp4")},
            data={"type": "video"},
        ).json()["id"]

        # 2. Submit Fact 1 (P-110 Erection) linked to p1
        evt1_res = self.client.post(
            f"/api/v1/projects/{PROJECT}/events",
            headers={"Authorization": f"Bearer {self.supervisor_token}", "Idempotency-Key": "evt-fact-1"},
            json={
                "projectId": PROJECT,
                "observedAt": "2026-09-26T10:35:00Z",
                "evidence": {
                    "text": "Line 24 P-110 erection completed at 10:35",
                    "attachmentIds": [p1],
                },
                "extractedFacts": {
                    "activityId": "ACT-1.2.1",
                    "status": "completed",
                    "progress": 100,
                },
            },
        )
        self.assertEqual(201, evt1_res.status_code)
        evt1_data = evt1_res.json()
        self.assertEqual([p1], evt1_data["evidence"]["attachmentIds"])
        self.assertEqual(1, len(evt1_data["evidence"]["attachments"]))

        # 3. Submit Fact 2 (Hydrotest Blocker) linked to v2
        evt2_res = self.client.post(
            f"/api/v1/projects/{PROJECT}/events",
            headers={"Authorization": f"Bearer {self.supervisor_token}", "Idempotency-Key": "evt-fact-2"},
            json={
                "projectId": PROJECT,
                "observedAt": "2026-09-26T10:35:00Z",
                "evidence": {
                    "text": "Hydrotest blocked due to permit",
                    "attachmentIds": [v2],
                },
                "extractedFacts": {
                    "discipline": "piping",
                    "status": "blocked",
                },
            },
        )
        self.assertEqual(201, evt2_res.status_code)
        evt2_data = evt2_res.json()
        self.assertEqual([v2], evt2_data["evidence"]["attachmentIds"])

        # 4. Verify match proposal creation from evt1
        prop_res = self.client.post(
            f"/api/v1/projects/{PROJECT}/events/{evt1_data['id']}/proposals",
            headers={"Authorization": f"Bearer {self.planner_token}", "Idempotency-Key": "prop-fact-1"},
            json={"candidates": [{"activityId": "ACT-1.2.1", "score": 95}]},
        )
        self.assertEqual(202, prop_res.status_code)
        prop_id = prop_res.json()["id"]

        # 5. Planner verifies proposal -> audit chain references evidence ID
        db = connect(self.db_path)
        try:
            with transaction(db):
                status, ver_res = verify_proposal(
                    db,
                    PROJECT,
                    prop_id,
                    Principal(PLANNER_ID),
                    "ver-fact-1",
                    {"activityId": "ACT-1.2.1", "progressPercent": 100, "expectedActivityVersion": 1},
                    "REQ-VER-1",
                )
            self.assertEqual(200, status)
            self.assertIn("evidenceIds", ver_res)
            self.assertEqual([p1], ver_res["evidenceIds"])

            # Verify audit trail contains evidenceIds
            audit_row = db.execute("SELECT canonical_payload FROM audit_entries WHERE project_id=? AND sequence=?", (PROJECT, ver_res["auditSequence"])).fetchone()
            self.assertIn(p1, audit_row["canonical_payload"])
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
