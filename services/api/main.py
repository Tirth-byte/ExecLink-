import asyncio
import hashlib
import json
import logging
import re
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import Depends, FastAPI, File, Form, Header, Query, Request, Response, UploadFile
from pydantic import BaseModel
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse

from .audit import append_entry, verify_chain
from .auth import Principal, authenticate, membership, require_permission, verify_password, create_jwt, normalize_role, ROLE_PERMISSIONS
from .db import close_pool, connect, initialise, is_integrity_error, transaction
from .errors import ApiProblem, not_found
from .idempotency import replay, store
from .reports import REPORT_TYPES, as_csv, build_report
from .serializers import activity, event, proposal, evidence_item
from .storage import get_storage
from .util import canonical, new_id, now
from .verification import reject_proposal, verify_proposal

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    db = connect()
    try:
        initialise(db)
    finally:
        db.close()
    try:
        yield
    finally:
        close_pool()


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ExecLink API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def problem_response(problem: ApiProblem, request_id: str) -> JSONResponse:
    return JSONResponse(status_code=problem.status, content={"error": {"code": problem.code, "message": problem.message, "requestId": request_id, "details": problem.details}})


@app.exception_handler(ApiProblem)
async def api_problem(request: Request, exc: ApiProblem) -> JSONResponse:
    return problem_response(exc, getattr(request.state, "request_id", new_id("REQ")))


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
    return problem_response(ApiProblem(422, "VALIDATION_ERROR", "Request did not match the API contract", {"errors": exc.errors()}), getattr(request.state, "request_id", new_id("REQ")))


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = request.headers.get("X-Request-Id") or new_id("REQ")
    response = await call_next(request)
    response.headers["X-Request-Id"] = request.state.request_id
    return response


def require_key(key: str | None) -> str:
    if not key:
        raise ApiProblem(422, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required")
    return key



class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/v1/auth/login")
def login(request: LoginRequest):
    db = connect()
    try:
        user = db.execute("SELECT * FROM users WHERE email=? AND active=TRUE", (request.email,)).fetchone()
        if not user or not user["password_hash"] or not verify_password(request.password, user["password_hash"]):
            raise ApiProblem(401, "UNAUTHORIZED", "Invalid email or password")

        token = create_jwt({
            "sub": user["id"],
            "email": user["email"],
            "name": user["full_name"]
        })
        return {"token": token, "user": {"id": user["id"], "name": user["full_name"], "email": user["email"]}}
    finally:
        db.close()

@app.get("/api/v1/auth/me")
def get_me(principal: Principal = Depends(authenticate)):
    db = connect()
    try:
        user = db.execute("SELECT * FROM users WHERE id=? AND active=TRUE", (principal.user_id,)).fetchone()
        if not user:
            raise ApiProblem(401, "UNAUTHORIZED", "User not found")
        members = db.execute("SELECT project_id, role, reporting_scope, discipline, area FROM memberships WHERE user_id=? AND active=TRUE", (principal.user_id,)).fetchall()
        projects = []
        for m in members:
            proj = db.execute("SELECT name FROM projects WHERE id=?", (m["project_id"],)).fetchone()
            if proj:
                norm_role = normalize_role(m["role"])
                projects.append({
                    "project_id": m["project_id"],
                    "project_name": proj["name"],
                    "role": norm_role,
                    "reporting_scope": m["reporting_scope"],
                    "discipline": m["discipline"],
                    "area": m["area"],
                    "permissions": ROLE_PERMISSIONS.get(norm_role, [])
                })
        return {
            "id": user["id"],
            "name": user["full_name"],
            "email": user["email"],
            "active": bool(user["active"]),
            "memberships": projects
        }
    finally:
        db.close()

@app.get("/api/v1/health")

def health() -> JSONResponse:
    db = None
    try:
        db = connect()
        db.execute("SELECT 1").fetchone()
        return JSONResponse({"status": "ok", "database": "ok"})
    except Exception:
        logger.exception("Database health check failed")
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "unavailable"})
    finally:
        if db is not None:
            db.close()


ALLOWED_MIME_TYPES = {
    # Photos
    "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
    # Videos
    "video/mp4", "video/quicktime", "video/x-m4v", "video/webm",
    # Audio
    "audio/m4a", "audio/mp4", "audio/aac", "audio/mpeg", "audio/wav", "audio/x-m4a",
    # Documents
    "application/pdf", "text/plain", "text/csv",
}
MAX_FILE_SIZES = {
    "photo": 20 * 1024 * 1024,      # 20MB
    "video": 100 * 1024 * 1024,    # 100MB
    "audio": 25 * 1024 * 1024,     # 25MB
    "document": 25 * 1024 * 1024,  # 25MB
}


def link_event_evidence(db, project_id: str, event_id: str, attachment_ids: list[str]) -> list[dict[str, Any]]:
    linked_items = []
    for ev_id in attachment_ids:
        ev_row = db.execute("SELECT * FROM evidence WHERE (id=? OR source_capture_id=?) AND project_id=?", (ev_id, ev_id, project_id)).fetchone()
        if ev_row:
            real_id = ev_row["id"]
            if db.engine == "postgresql":
                db.execute("INSERT INTO event_evidence(execution_event_id, evidence_id) VALUES(?,?) ON CONFLICT DO NOTHING", (event_id, real_id))
            else:
                db.execute("INSERT OR IGNORE INTO event_evidence(execution_event_id, evidence_id) VALUES(?,?)", (event_id, real_id))
            linked_items.append(evidence_item(ev_row))
    return linked_items


@app.post("/api/v1/projects/{project_id}/evidence/upload", status_code=201)
async def upload_evidence(
    project_id: str,
    file: UploadFile = File(...),
    type: str = Form(default="photo"),
    captured_at: str | None = Form(default=None),
    source_capture_id: str | None = Form(default=None),
    duration_ms: int | None = Form(default=None),
    width: int | None = Form(default=None),
    height: int | None = Form(default=None),
    metadata: str | None = Form(default="{}"),
    principal: Principal = Depends(authenticate),
):
    db = connect()
    initialise(db)
    try:
        require_permission(db, project_id, principal, "execution.create")
        
        content = await file.read()
        file_size = len(content)
        
        raw_mime = (file.content_type or "").lower().split(";")[0].strip()
        filename = file.filename or "evidence_file"
        
        if not raw_mime or raw_mime == "application/octet-stream":
            import os
            ext = os.path.splitext(filename)[1].lower()
            mime_map = {
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                ".heic": "image/heic", ".heif": "image/heif", ".webp": "image/webp",
                ".mp4": "video/mp4", ".mov": "video/quicktime", ".m4v": "video/x-m4v", ".webm": "video/webm",
                ".m4a": "audio/m4a", ".aac": "audio/aac", ".mp3": "audio/mpeg", ".wav": "audio/wav",
                ".pdf": "application/pdf", ".txt": "text/plain", ".csv": "text/csv"
            }
            raw_mime = mime_map.get(ext, raw_mime)

        if raw_mime not in ALLOWED_MIME_TYPES:
            raise ApiProblem(415, "UNSUPPORTED_MEDIA_TYPE", f"MIME type '{raw_mime}' is not supported for field evidence", {"allowed": sorted(ALLOWED_MIME_TYPES)})
        
        norm_type = type.lower()
        if norm_type not in ("photo", "video", "audio", "document"):
            norm_type = "video" if raw_mime.startswith("video/") else "audio" if raw_mime.startswith("audio/") else "photo"

        max_limit = MAX_FILE_SIZES.get(norm_type, 20 * 1024 * 1024)
        if file_size > max_limit:
            raise ApiProblem(413, "PAYLOAD_TOO_LARGE", f"File size ({file_size} bytes) exceeds maximum limit of {max_limit} bytes for {norm_type}")

        sha256_hash = hashlib.sha256(content).hexdigest()
        evidence_id = new_id("EVD")
        safe_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', os.path.basename(filename) if "os" in globals() or "os" in locals() else filename)
        storage_key = f"{project_id}/{evidence_id}_{safe_name}"
        
        storage = get_storage()
        storage.save(storage_key, content, raw_mime)
        media_url = storage.get_url(storage_key, project_id, evidence_id)
        
        upload_time = now()
        capture_time = captured_at or upload_time
        
        try:
            meta_dict = json.loads(metadata) if metadata else {}
        except Exception:
            meta_dict = {}

        with transaction(db):
            db.execute(
                "INSERT INTO evidence(id, project_id, source_capture_id, type, storage_key, mime_type, file_name, file_size, thumbnail_url, media_url, captured_at, uploaded_at, captured_by, duration_ms, width, height, sha256, sync_status, metadata_json, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced',?,?)",
                (
                    evidence_id, project_id, source_capture_id, norm_type, storage_key, raw_mime, safe_name, file_size, None, media_url, capture_time, upload_time, principal.user_id, duration_ms, width, height, sha256_hash, canonical(meta_dict), upload_time
                )
            )
            row = db.execute("SELECT * FROM evidence WHERE id=?", (evidence_id,)).fetchone()
            return JSONResponse(status_code=201, content=evidence_item(row))
    finally:
        db.close()


@app.get("/api/v1/projects/{project_id}/evidence/{evidence_id}")
def get_evidence_item(project_id: str, evidence_id: str, principal: Principal = Depends(authenticate)):
    db = connect()
    try:
        membership(db, project_id, principal)
        row = db.execute("SELECT * FROM evidence WHERE id=? AND project_id=?", (evidence_id, project_id)).fetchone()
        if not row:
            raise not_found("evidence", evidence_id)
        res = evidence_item(row)
        res["mediaUrl"] = get_storage().get_url(row["storage_key"], project_id, evidence_id)
        return res
    finally:
        db.close()


@app.get("/api/v1/projects/{project_id}/evidence/{evidence_id}/media")
def get_evidence_media(
    project_id: str,
    evidence_id: str,
    authorization: str | None = Header(default=None),
    token: str | None = Query(default=None),
):
    db = connect()
    try:
        row = db.execute("SELECT * FROM evidence WHERE id=? AND project_id=?", (evidence_id, project_id)).fetchone()
        if not row:
            raise not_found("evidence", evidence_id)
        storage = get_storage()
        try:
            data, content_type = storage.read(row["storage_key"])
        except FileNotFoundError:
            raise not_found("evidence_file", evidence_id)
        return Response(
            content=data,
            media_type=content_type or row["mime_type"],
            headers={
                "Content-Disposition": f'inline; filename="{row["file_name"]}"',
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=86400",
            },
        )
    finally:
        db.close()


@app.get("/api/v1/projects/{project_id}/events/{event_id}/evidence")
def list_event_evidence(project_id: str, event_id: str, principal: Principal = Depends(authenticate)):
    db = connect()
    try:
        membership(db, project_id, principal)
        rows = db.execute(
            "SELECT e.* FROM evidence e JOIN event_evidence ee ON e.id = ee.evidence_id WHERE ee.execution_event_id = ? AND e.project_id = ?",
            (event_id, project_id),
        ).fetchall()
        return {"items": [evidence_item(r) for r in rows]}
    finally:
        db.close()


@app.post("/api/v1/projects/{project_id}/events/{event_id}/evidence")
def associate_event_evidence(project_id: str, event_id: str, body: dict[str, Any], principal: Principal = Depends(authenticate)):
    db = connect()
    initialise(db)
    try:
        with transaction(db):
            require_permission(db, project_id, principal, "execution.create")
            event_row = db.execute("SELECT * FROM execution_events WHERE id=? AND project_id=?", (event_id, project_id)).fetchone()
            if not event_row:
                raise not_found("event", event_id)
            evidence_ids = body.get("evidenceIds", [])
            linked = link_event_evidence(db, project_id, event_id, evidence_ids)
            return {"linkedCount": len(linked), "items": linked}
    finally:
        db.close()


@app.get("/api/v1/projects/{project_id}/events")
def list_events(
    project_id: str,
    principal: Principal = Depends(authenticate),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    db = connect()
    try:
        membership(db, project_id, principal)
        query = "SELECT * FROM execution_events WHERE project_id=?"
        params: list[Any] = [project_id]
        if status:
            query += " AND status=?"
            params.append(status)
        query += " ORDER BY received_at DESC, id DESC LIMIT ?"
        params.append(limit)
        rows = db.execute(query, tuple(params)).fetchall()

        items = []
        for r in rows:
            ev = event(r)
            ev_id = r["id"]
            ev_rows = db.execute(
                "SELECT e.* FROM evidence e JOIN event_evidence ee ON e.id=ee.evidence_id WHERE ee.execution_event_id=? AND e.project_id=? ORDER BY e.created_at ASC, e.id ASC",
                (ev_id, project_id),
            ).fetchall()
            if not ev_rows:
                ev_rows = db.execute(
                    "SELECT * FROM evidence WHERE (execution_event_id=? OR source_capture_id=?) AND project_id=? ORDER BY created_at ASC, id ASC",
                    (ev_id, ev_id, project_id),
                ).fetchall()
            if ev_rows:
                ev["evidence"]["attachments"] = [evidence_item(er) for er in ev_rows]
                ev["evidence"]["attachmentIds"] = [er["id"] for er in ev_rows]
            p = db.execute("SELECT id,status FROM match_proposals WHERE execution_event_id=?", (ev_id,)).fetchone()
            ev["proposal"] = dict(p) if p else None
            items.append(ev)
        return {"items": items}
    finally:
        db.close()


@app.post("/api/v1/projects/{project_id}/events", status_code=201)
def create_event(project_id: str, body: dict[str, Any], request: Request, principal: Principal = Depends(authenticate), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    key = require_key(idempotency_key); db = connect(); initialise(db)
    try:
        with transaction(db):
            require_permission(db, project_id, principal, "execution.create")
            route = f"/projects/{project_id}/events"
            prior = replay(db, project_id, principal.user_id, route, key, body)
            if prior: return JSONResponse(status_code=prior[0], content=prior[1])
            event_id = body.get("id") or new_id("EVT")
            if body.get("projectId", project_id) != project_id: raise ApiProblem(422, "PROJECT_MISMATCH", "Body projectId differs from route")
            timestamp = now()
            
            raw_evidence = body.get("evidence", {"text": "", "attachmentIds": []})
            attachment_ids = raw_evidence.get("attachmentIds") or body.get("evidenceIds") or []
            
            document = {
                "id": event_id,
                "projectId": project_id,
                "reporterId": principal.user_id,
                "observedAt": body.get("observedAt", timestamp),
                "receivedAt": timestamp,
                "evidence": raw_evidence,
                "extractedFacts": body.get("extractedFacts", {"keywords": []}),
                "status": "submitted"
            }
            try:
                db.execute(
                    "INSERT INTO execution_events(id,project_id,reporter_id,observed_at,received_at,evidence_json,extracted_facts_json,status) VALUES(?,?,?,?,?,?,?,'submitted')",
                    (event_id, project_id, principal.user_id, document["observedAt"], timestamp, canonical(document["evidence"]), canonical(document["extractedFacts"]))
                )
            except Exception as exc:
                if not is_integrity_error(exc):
                    raise
                raise ApiProblem(409, "RESOURCE_CONFLICT", "Event identifier already exists") from exc
            
            linked_evidence = link_event_evidence(db, project_id, event_id, attachment_ids)
            if linked_evidence:
                document["evidence"]["attachments"] = linked_evidence
                
            append_entry(
                db,
                project_id=project_id,
                actor_id=principal.user_id,
                action="event.submitted",
                entity_type="ExecutionEvent",
                entity_id=event_id,
                occurred_at=timestamp,
                request_id=request.state.request_id,
                payload={"observedAt": document["observedAt"], "evidenceIds": attachment_ids}
            )
            db.execute("INSERT INTO outbox_events VALUES(?,?,?,?,?,?,?,NULL)", (new_id("OBX"), project_id, "event", event_id, "event.submitted", canonical(document), timestamp))

            # Automatically generate intelligent match proposal if activities exist
            try:
                from services.intelligence.pipeline import IntelligencePipeline
                from services.intelligence.models import ExecutionEvent as IntelEvent, ScheduleActivity as IntelActivity
                from services.intelligence.config import MatchingConfig

                project_row = db.execute("SELECT active_snapshot_id FROM projects WHERE id=?", (project_id,)).fetchone()
                snapshot_id = project_row["active_snapshot_id"] if project_row else "SNP-2026-09-BASE"
                act_rows = db.execute("SELECT * FROM activities WHERE project_id=? AND snapshot_id=?", (project_id, snapshot_id)).fetchall()
                if act_rows:
                    intel_activities = [IntelActivity.from_dict(activity(r)) for r in act_rows]
                    intel_event = IntelEvent.from_dict(document)
                    pipeline = IntelligencePipeline(MatchingConfig())
                    intel_proposal = pipeline.process_event(intel_event, intel_activities, snapshot_id=snapshot_id)
                    candidates = [c.to_dict() for c in intel_proposal.candidates]
                    
                    proposal_id = new_id("MPR")
                    prop_doc = {
                        "id": proposal_id,
                        "projectId": project_id,
                        "executionEventId": event_id,
                        "snapshotId": snapshot_id,
                        "engineVersion": intel_proposal.engineVersion,
                        "configVersion": intel_proposal.configVersion,
                        "mode": intel_proposal.mode,
                        "status": "proposed",
                        "candidates": candidates,
                        "createdAt": timestamp,
                    }
                    db.execute(
                        "INSERT INTO match_proposals(id,project_id,execution_event_id,snapshot_id,engine_version,config_version,mode,status,candidates_json,created_at) VALUES(?,?,?,?,?,?,?,'proposed',?,?)",
                        (proposal_id, project_id, event_id, snapshot_id, intel_proposal.engineVersion, intel_proposal.configVersion, intel_proposal.mode, canonical(candidates), timestamp)
                    )
                    db.execute("UPDATE execution_events SET status='proposed',version=version+1 WHERE id=?", (event_id,))
                    document["proposal"] = prop_doc
                    document["status"] = "proposed"
            except Exception:
                # Do not block event creation if pipeline fails
                pass

            store(db, project_id, principal.user_id, route, key, body, 201, document)
            return document
    finally: db.close()


@app.get("/api/v1/projects/{project_id}/events/{event_id}")
def get_event(project_id: str, event_id: str, principal: Principal = Depends(authenticate)):
    db=connect()
    try:
        membership(db, project_id, principal); row=db.execute("SELECT * FROM execution_events WHERE id=? AND project_id=?",(event_id,project_id)).fetchone()
        if not row: raise not_found("event",event_id)
        result=event(row)
        ev_rows = db.execute("SELECT e.* FROM evidence e JOIN event_evidence ee ON e.id=ee.evidence_id WHERE ee.execution_event_id=? AND e.project_id=?", (event_id, project_id)).fetchall()
        if ev_rows:
            result["evidence"]["attachments"] = [evidence_item(r) for r in ev_rows]
            result["evidence"]["attachmentIds"] = [r["id"] for r in ev_rows]
        p=db.execute("SELECT id,status FROM match_proposals WHERE execution_event_id=?",(event_id,)).fetchone()
        result["proposal"] = dict(p) if p else None
        return result
    finally: db.close()


@app.get("/api/v1/projects/{project_id}/proposals")
def list_proposals(
    project_id: str,
    principal: Principal = Depends(authenticate),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    db = connect()
    try:
        membership(db, project_id, principal)
        query = "SELECT * FROM match_proposals WHERE project_id=?"
        params: list[Any] = [project_id]
        if status:
            query += " AND status=?"
            params.append(status)
        query += " ORDER BY created_at DESC, id DESC LIMIT ?"
        params.append(limit)
        rows = db.execute(query, tuple(params)).fetchall()

        items = []
        for r in rows:
            prop = proposal(r)
            evt_row = db.execute("SELECT * FROM execution_events WHERE id=?", (prop["executionEventId"],)).fetchone()
            if evt_row:
                ev = event(evt_row)
                ev_rows = db.execute(
                    "SELECT e.* FROM evidence e JOIN event_evidence ee ON e.id=ee.evidence_id WHERE ee.execution_event_id=? AND e.project_id=? ORDER BY e.created_at ASC, e.id ASC",
                    (prop["executionEventId"], project_id),
                ).fetchall()
                if not ev_rows:
                    ev_rows = db.execute(
                        "SELECT * FROM evidence WHERE (execution_event_id=? OR source_capture_id=?) AND project_id=? ORDER BY created_at ASC, id ASC",
                        (prop["executionEventId"], prop["executionEventId"], project_id),
                    ).fetchall()
                if ev_rows:
                    ev["evidence"]["attachments"] = [evidence_item(er) for er in ev_rows]
                    ev["evidence"]["attachmentIds"] = [er["id"] for er in ev_rows]
                prop["event"] = ev
            items.append(prop)
        return {"items": items}
    finally:
        db.close()


@app.post("/api/v1/projects/{project_id}/events/{event_id}/proposals", status_code=202)
def create_proposal(project_id: str, event_id: str, body: dict[str, Any], principal: Principal = Depends(authenticate), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    key=require_key(idempotency_key); db=connect(); initialise(db)
    try:
        with transaction(db):
            require_permission(db, project_id, principal, "match.review"); route=f"/projects/{project_id}/events/{event_id}/proposals"
            prior=replay(db,project_id,principal.user_id,route,key,body)
            if prior: return JSONResponse(status_code=prior[0],content=prior[1])
            source=db.execute("SELECT * FROM execution_events WHERE id=? AND project_id=?",(event_id,project_id)).fetchone()
            if not source: raise not_found("event",event_id)
            project=db.execute("SELECT active_snapshot_id FROM projects WHERE id=?",(project_id,)).fetchone()
            snapshot_id = body.get("snapshotId", project["active_snapshot_id"])
            proposal_id=body.get("id") or new_id("MPR"); timestamp=body.get("createdAt") or now()

            candidates = body.get("candidates")
            mode = body.get("mode", "primary")
            engine_version = body.get("engineVersion", "matcher-v1")
            config_version = body.get("configVersion", "match-config-v1")

            if candidates is None:
                # Automatically run intelligence pipeline against snapshot activities
                from services.intelligence.pipeline import IntelligencePipeline
                from services.intelligence.models import ExecutionEvent as IntelEvent, ScheduleActivity as IntelActivity
                from services.intelligence.config import MatchingConfig

                act_rows = db.execute("SELECT * FROM activities WHERE project_id=? AND snapshot_id=?", (project_id, snapshot_id)).fetchall()
                intel_activities = [IntelActivity.from_dict(activity(r)) for r in act_rows]
                evt_dict = event(source)
                intel_event = IntelEvent.from_dict(evt_dict)

                pipeline = IntelligencePipeline(MatchingConfig())
                intel_proposal = pipeline.process_event(intel_event, intel_activities, snapshot_id=snapshot_id)
                candidates = [c.to_dict() for c in intel_proposal.candidates]
                mode = intel_proposal.mode
                engine_version = intel_proposal.engineVersion
                config_version = intel_proposal.configVersion

            document = {
                "id": proposal_id,
                "projectId": project_id,
                "executionEventId": event_id,
                "snapshotId": snapshot_id,
                "engineVersion": engine_version,
                "configVersion": config_version,
                "mode": mode,
                "status": "proposed",
                "candidates": candidates,
                "createdAt": timestamp,
            }

            existing_prop = db.execute("SELECT id FROM match_proposals WHERE execution_event_id=?", (event_id,)).fetchone()
            if existing_prop:
                proposal_id = existing_prop["id"]
                document["id"] = proposal_id
                db.execute(
                    "UPDATE match_proposals SET snapshot_id=?, engine_version=?, config_version=?, mode=?, status='proposed', candidates_json=? WHERE id=?",
                    (document["snapshotId"], document["engineVersion"], document["configVersion"], document["mode"], canonical(document["candidates"]), proposal_id)
                )
            else:
                db.execute(
                    "INSERT INTO match_proposals(id,project_id,execution_event_id,snapshot_id,engine_version,config_version,mode,status,candidates_json,created_at) VALUES(?,?,?,?,?,?,?,'proposed',?,?)",
                    (proposal_id, project_id, event_id, document["snapshotId"], document["engineVersion"], document["configVersion"], document["mode"], canonical(document["candidates"]), timestamp)
                )
            db.execute("UPDATE execution_events SET status='proposed',version=version+1 WHERE id=?",(event_id,))
            store(db,project_id,principal.user_id,route,key,body,202,document)
            return JSONResponse(status_code=202,content=document)
    finally: db.close()



@app.get("/api/v1/projects/{project_id}/proposals/{proposal_id}")
def get_proposal(project_id: str, proposal_id: str, principal: Principal = Depends(authenticate)):
    db=connect()
    try:
        membership(db,project_id,principal); row=db.execute("SELECT * FROM match_proposals WHERE id=? AND project_id=?",(proposal_id,project_id)).fetchone()
        if not row: raise not_found("proposal",proposal_id)
        return proposal(row)
    finally: db.close()


@app.post("/api/v1/projects/{project_id}/proposals/{proposal_id}/verify")
def verify(project_id: str, proposal_id: str, body: dict[str, Any], request: Request, principal: Principal=Depends(authenticate), idempotency_key: str | None=Header(default=None,alias="Idempotency-Key")):
    key=require_key(idempotency_key); db=connect(); initialise(db)
    try:
        with transaction(db): status,result=verify_proposal(db,project_id,proposal_id,principal,key,body,request.state.request_id)
        return JSONResponse(status_code=status,content=result)
    finally: db.close()


@app.post("/api/v1/projects/{project_id}/proposals/{proposal_id}/reject")
def reject(project_id: str, proposal_id: str, body: dict[str, Any], request: Request, principal: Principal=Depends(authenticate), idempotency_key: str | None=Header(default=None,alias="Idempotency-Key")):
    key=require_key(idempotency_key); db=connect(); initialise(db)
    try:
        with transaction(db): status,result=reject_proposal(db,project_id,proposal_id,principal,key,body,request.state.request_id)
        return JSONResponse(status_code=status,content=result)
    finally: db.close()


@app.get("/api/v1/projects/{project_id}/activities")
def list_activities(project_id: str, principal: Principal=Depends(authenticate), cursor: str | None=None, limit: int=Query(default=50,ge=1,le=200)):
    db=connect()
    try:
        membership(db,project_id,principal); project=db.execute("SELECT active_snapshot_id FROM projects WHERE id=?",(project_id,)).fetchone()
        if not project: raise not_found("project",project_id)
        rows=db.execute("SELECT * FROM activities WHERE project_id=? AND snapshot_id=? AND id>? ORDER BY id LIMIT ?",(project_id,project["active_snapshot_id"],cursor or "",limit+1)).fetchall()
        return {"items":[activity(row) for row in rows[:limit]],"nextCursor":rows[limit-1]["id"] if len(rows)>limit else None}
    finally: db.close()


@app.get("/api/v1/projects/{project_id}/dashboard")
def dashboard(project_id: str, principal: Principal=Depends(authenticate)):
    db=connect()
    try:
        membership(db,project_id,principal)
        agg=db.execute("SELECT COUNT(*) count,COALESCE(AVG(actual_progress_percent),0) average,SUM(CASE WHEN actual_progress_percent=100 THEN 1 ELSE 0 END) complete FROM activities WHERE project_id=?",(project_id,)).fetchone()
        states={row["status"]:row["count"] for row in db.execute("SELECT status,COUNT(*) count FROM match_proposals WHERE project_id=? GROUP BY status",(project_id,))}
        return {"projectId":project_id,"activityCount":agg["count"],"averageProgressPercent":round(agg["average"],2),"completedActivityCount":agg["complete"],"proposalCounts":{"proposed":states.get("proposed",0),"verified":states.get("verified",0),"rejected":states.get("rejected",0)}}
    finally: db.close()


@app.get("/api/v1/projects/{project_id}/reports/{report_type}")
def report(project_id: str, report_type: str, principal: Principal=Depends(authenticate), format: str=Query(default="json",pattern="^(json|csv)$"), report_date: str | None=Query(default=None)):
    db=connect()
    try:
        membership(db,project_id,principal)
        if report_type not in REPORT_TYPES: raise ApiProblem(404,"REPORT_NOT_FOUND","Unknown report type",{"allowed":sorted(REPORT_TYPES)})
        rows=build_report(db,project_id,report_type,report_date=report_date)
        if format=="csv": return PlainTextResponse(as_csv(rows),media_type="text/csv",headers={"Content-Disposition":f'attachment; filename="{report_type}.csv"'})
        return {"reportType":report_type,"rows":rows}
    finally: db.close()



@app.get("/api/v1/projects/{project_id}/audit/verify")
def audit_verify(project_id: str, principal: Principal=Depends(authenticate)):
    db=connect()
    try:
        require_permission(db, project_id, principal, "audit.read"); return verify_chain(db,project_id)
    finally: db.close()


@app.get("/api/v1/projects/{project_id}/stream")
async def stream(project_id: str, principal: Principal=Depends(authenticate), last_event_id: str | None=Header(default=None,alias="Last-Event-ID")):
    db=connect()
    try: membership(db,project_id,principal)
    finally: db.close()
    async def messages():
        cursor=last_event_id or ""
        while True:
            connection=connect()
            try: rows=connection.execute("SELECT * FROM outbox_events WHERE project_id=? AND id>? ORDER BY id LIMIT 100",(project_id,cursor)).fetchall()
            finally: connection.close()
            for row in rows:
                cursor=row["id"]
                data={"id":row["id"],"type":row["type"],"occurredAt":row["occurred_at"],"contractVersion":"v1","data":json.loads(row["payload_json"])}
                yield f"id: {row['id']}\nevent: {row['type']}\ndata: {json.dumps(data,separators=(',',':'))}\n\n"
            if await asyncio.sleep(1,result=False): break
    return StreamingResponse(messages(),media_type="text/event-stream",headers={"Cache-Control":"no-cache"})


@app.post("/api/v1/projects/{project_id}/admin/clean-test-data")
def clean_test_data(project_id: str, principal: Principal = Depends(authenticate)):
    db = connect()
    initialise(db)
    try:
        membership(db, project_id, principal)
        test_patterns = [
            "EVT-TEST-%", "EVT-FIELD-%", "EVT-FLUTTER-%", "EVT-RENDER-%", "EVT-N-%", "EVT-DEMO-%"
        ]
        deleted_events = 0
        for pat in test_patterns:
            evts = db.execute("SELECT id FROM execution_events WHERE project_id=? AND id LIKE ?", (project_id, pat)).fetchall()
            for e in evts:
                eid = e["id"]
                db.execute("DELETE FROM match_proposals WHERE project_id=? AND execution_event_id=?", (project_id, eid))
                db.execute("DELETE FROM event_evidence WHERE execution_event_id=?", (eid,))
                db.execute("DELETE FROM execution_events WHERE project_id=? AND id=?", (project_id, eid))
                deleted_events += 1
        return {"status": "ok", "deletedEvents": deleted_events}
    finally:
        db.close()

