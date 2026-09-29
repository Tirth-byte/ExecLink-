import re

with open("main.py", "r") as f:
    content = f.read()

content = content.replace(
    "from .auth import Principal, authenticate, membership, require_role",
    "from .auth import Principal, authenticate, membership, require_permission, verify_password, create_jwt"
)

content = content.replace(
    "from fastapi import Depends, FastAPI, Header, Query, Request",
    "from fastapi import Depends, FastAPI, Header, Query, Request\nfrom pydantic import BaseModel"
)

auth_routes = """
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
                projects.append({
                    "project_id": m["project_id"],
                    "project_name": proj["name"],
                    "role": m["role"],
                    "reporting_scope": m["reporting_scope"]
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
"""

content = content.replace('@app.get("/api/v1/health")', auth_routes)

content = content.replace(
    'require_role(db, project_id, principal, "supervisor", "planner")',
    'require_permission(db, project_id, principal, "execution.create")'
)

content = content.replace(
    'require_role(db,project_id,principal,"planner")',
    'require_permission(db, project_id, principal, "match.review")'
)

content = content.replace(
    'require_role(db,project_id,principal,"planner","admin")',
    'require_permission(db, project_id, principal, "audit.read")'
)

with open("main.py", "w") as f:
    f.write(content)
