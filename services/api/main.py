from __future__ import annotations

import asyncio
import json
import sqlite3
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import Depends, FastAPI, Header, Query, Request
from pydantic import BaseModel
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse

from .audit import append_entry, verify_chain
from .auth import Principal, authenticate, membership, require_permission, verify_password, create_jwt, normalize_role, ROLE_PERMISSIONS
from .db import connect, initialise, transaction
from .errors import ApiProblem, not_found
from .idempotency import replay, store
from .reports import REPORT_TYPES, as_csv, build_report
from .serializers import activity, event, proposal
from .util import canonical, new_id, now
from .verification import reject_proposal, verify_proposal


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    db = connect(); initialise(db); db.close()
    yield


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
        user = db.execute("SELECT * FROM users WHERE email=? AND active=1", (request.email,)).fetchone()
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
        user = db.execute("SELECT * FROM users WHERE id=? AND active=1", (principal.user_id,)).fetchone()
        if not user:
            raise ApiProblem(401, "UNAUTHORIZED", "User not found")
        members = db.execute("SELECT project_id, role, reporting_scope, discipline, area FROM memberships WHERE user_id=? AND active=1", (principal.user_id,)).fetchall()
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

def health() -> dict[str, str]:
    return {"status": "ok"}


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
            document = {"id": event_id, "projectId": project_id, "reporterId": principal.user_id, "observedAt": body.get("observedAt", timestamp), "receivedAt": timestamp, "evidence": body.get("evidence", {"text": "", "attachmentIds": []}), "extractedFacts": body.get("extractedFacts", {"keywords": []}), "status": "submitted"}
            try:
                db.execute("INSERT INTO execution_events(id,project_id,reporter_id,observed_at,received_at,evidence_json,extracted_facts_json,status) VALUES(?,?,?,?,?,?,?,'submitted')", (event_id, project_id, principal.user_id, document["observedAt"], timestamp, canonical(document["evidence"]), canonical(document["extractedFacts"])))
            except sqlite3.IntegrityError as exc:
                raise ApiProblem(409, "RESOURCE_CONFLICT", "Event identifier already exists") from exc
            append_entry(db, project_id=project_id, actor_id=principal.user_id, action="event.submitted", entity_type="ExecutionEvent", entity_id=event_id, occurred_at=timestamp, request_id=request.state.request_id, payload={"observedAt": document["observedAt"]})
            db.execute("INSERT INTO outbox_events VALUES(?,?,?,?,?,?,?,NULL)", (new_id("OBX"), project_id, "event", event_id, "event.submitted", canonical(document), timestamp))
            store(db, project_id, principal.user_id, route, key, body, 201, document)
            return document
    finally: db.close()


@app.get("/api/v1/projects/{project_id}/events/{event_id}")
def get_event(project_id: str, event_id: str, principal: Principal = Depends(authenticate)):
    db=connect()
    try:
        membership(db, project_id, principal); row=db.execute("SELECT * FROM execution_events WHERE id=? AND project_id=?",(event_id,project_id)).fetchone()
        if not row: raise not_found("event",event_id)
        result=event(row); p=db.execute("SELECT id,status FROM match_proposals WHERE execution_event_id=?",(event_id,)).fetchone(); result["proposal"] = dict(p) if p else None; return result
    finally: db.close()


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

            document={"id":proposal_id,"projectId":project_id,"executionEventId":event_id,"snapshotId":snapshot_id,"engineVersion":engine_version,"configVersion":config_version,"mode":mode,"status":"proposed","candidates":candidates,"createdAt":timestamp}
            db.execute("INSERT INTO match_proposals(id,project_id,execution_event_id,snapshot_id,engine_version,config_version,mode,status,candidates_json,created_at) VALUES(?,?,?,?,?,?,?,'proposed',?,?)",(proposal_id,project_id,event_id,document["snapshotId"],document["engineVersion"],document["configVersion"],document["mode"],canonical(document["candidates"]),timestamp)); db.execute("UPDATE execution_events SET status='proposed',version=version+1 WHERE id=?",(event_id,)); store(db,project_id,principal.user_id,route,key,body,202,document); return JSONResponse(status_code=202,content=document)
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
