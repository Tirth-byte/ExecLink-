from __future__ import annotations

import sqlite3
from dataclasses import dataclass

from fastapi import Header

from .errors import ApiProblem


@dataclass(frozen=True)
class Principal:
    user_id: str


def authenticate(authorization: str | None = Header(default=None)) -> Principal:
    if not authorization or not authorization.startswith("Bearer ") or not authorization[7:]:
        raise ApiProblem(401, "INVALID_USER", "A valid bearer identity is required")
    return Principal(authorization[7:])


def membership(db: sqlite3.Connection, project_id: str, principal: Principal) -> str:
    row = db.execute("SELECT role FROM memberships WHERE project_id=? AND user_id=?", (project_id, principal.user_id)).fetchone()
    if row:
        return row["role"]
    known = db.execute("SELECT 1 FROM users WHERE id=?", (principal.user_id,)).fetchone()
    if not known:
        raise ApiProblem(401, "INVALID_USER", "Bearer identity is unknown")
    raise ApiProblem(403, "FORBIDDEN", "User is not a member of this project")


def require_role(db: sqlite3.Connection, project_id: str, principal: Principal, *roles: str) -> str:
    role = membership(db, project_id, principal)
    if role not in roles:
        raise ApiProblem(403, "FORBIDDEN", "Role is not permitted", {"requiredRoles": list(roles), "actualRole": role})
    return role
