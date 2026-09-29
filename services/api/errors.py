from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ApiProblem(Exception):
    status: int
    code: str
    message: str
    details: dict[str, Any] = field(default_factory=dict)


def not_found(kind: str, identifier: str) -> ApiProblem:
    return ApiProblem(404, "NOT_FOUND", f"{kind} not found", {"id": identifier})
