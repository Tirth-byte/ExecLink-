from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from fastapi import Header

from .errors import ApiProblem


import os

from .db import DatabaseConnection, connect

SECRET_KEY = os.environ.get("EXECLINK_JWT_SECRET", "hackathon-demo-secret-do-not-use-in-prod")

def hash_password(password: str, *, salt: str | None = None) -> str:
    import secrets
    salt = salt or secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return f"pbkdf2:sha256:100000${salt}${hashed}"

def verify_password(password: str, hashed_password: str) -> bool:
    import secrets
    try:
        algo, salt, hashed = hashed_password.split("$")
        if algo != "pbkdf2:sha256:100000": return False
        expected = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
        return secrets.compare_digest(hashed, expected)
    except Exception:
        return False

@dataclass(frozen=True)
class Principal:
    user_id: str
    email: str = ""


def create_jwt(payload: dict) -> str:
    payload = dict(payload)
    if "exp" not in payload:
        payload["exp"] = int(time.time()) + 3600 * 24
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = base64.urlsafe_b64encode(hmac.new(SECRET_KEY.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return f"{header}.{body}.{sig}"


def decode_jwt(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token")
    header, body, sig = parts
    expected_sig = base64.urlsafe_b64encode(hmac.new(SECRET_KEY.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()).decode().rstrip("=")
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("Invalid signature")
    payload = json.loads(base64.urlsafe_b64decode(body + "==").decode())
    if "exp" in payload and payload["exp"] < time.time():
        raise ValueError("Token expired")
    return payload


def authenticate(authorization: str | None = Header(default=None)) -> Principal:
    if not authorization or not authorization.startswith("Bearer ") or not authorization[7:]:
        raise ApiProblem(401, "INVALID_USER", "A valid bearer identity is required")
    token = authorization[7:]

    try:
        payload = decode_jwt(token)
        if "sub" not in payload:
            raise ApiProblem(401, "INVALID_USER", "Bearer token missing subject")

        # Verify active user still exists
        db = connect()
        try:
            known = db.execute("SELECT active FROM users WHERE id=?", (payload["sub"],)).fetchone()
            if not known or not known["active"]:
                raise ApiProblem(401, "INVALID_USER", "User is unknown or inactive")
        finally:
            db.close()

        return Principal(payload["sub"], payload.get("email", ""))
    except ApiProblem:
        raise
    except Exception:
        raise ApiProblem(401, "INVALID_USER", "Bearer token is invalid or expired")


def membership(db: DatabaseConnection, project_id: str, principal: Principal) -> dict:
    row = db.execute("SELECT role, active, reporting_scope, discipline, area FROM memberships WHERE project_id=? AND user_id=?", (project_id, principal.user_id)).fetchone()
    if row and row["active"]:
        return dict(row)
    known = db.execute("SELECT active FROM users WHERE id=?", (principal.user_id,)).fetchone()
    if not known or not known["active"]:
        raise ApiProblem(401, "INVALID_USER", "User is unknown or inactive")
    raise ApiProblem(403, "FORBIDDEN", "User is not a member of this project")


ROLE_PERMISSIONS = {
    "ADMIN": [
        "users.manage", "roles.manage", "project.manage", "settings.manage",
        "match.read", "match.review", "match.verify",
        "schedule.read", "schedule.update_verified",
        "execution.read", "execution.create", "execution.update_own",
        "evidence.create", "ingestion.create", "analytics.read", "memory.read", "audit.read"
    ],
    "PROJECT_MANAGER": [
        "schedule.read", "execution.read", "match.read", "analytics.read", "memory.read", "audit.read"
    ],
    "LEAD_PLANNER": [
        "schedule.read", "execution.read", "match.read", "match.review", "match.verify",
        "schedule.update_verified", "ingestion.create", "analytics.read", "memory.read"
    ],
    "PLANNING_ENGINEER": [
        "schedule.read", "execution.read", "match.read", "match.review",
        "ingestion.create", "analytics.read", "memory.read"
    ],
    "FIELD_SUPERVISOR": [
        "schedule.read", "execution.read", "execution.create", "execution.update_own", "evidence.create"
    ],
    "VIEWER": [
        "schedule.read", "analytics.read", "memory.read"
    ]
}


def normalize_role(role: str) -> str:
    mapping = {
        "admin": "ADMIN",
        "planner": "LEAD_PLANNER",
        "planning_engineer": "PLANNING_ENGINEER",
        "supervisor": "FIELD_SUPERVISOR",
        "project_manager": "PROJECT_MANAGER",
        "viewer": "VIEWER"
    }
    return mapping.get(role.lower(), role.upper())


def require_permission(db: DatabaseConnection, project_id: str, principal: Principal, permission: str) -> dict:
    mem = membership(db, project_id, principal)
    normalized = normalize_role(mem["role"])
    permissions = ROLE_PERMISSIONS.get(normalized, [])

    if permission not in permissions:
        raise ApiProblem(403, "FORBIDDEN", "Missing required permission", {"requiredPermission": permission, "actualRole": normalized})
    return mem
