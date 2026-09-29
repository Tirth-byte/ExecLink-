"""Shared helpers for ExecLink QA checks. Standard library only."""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import subprocess
import sys
import unittest
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
QA_ROOT = REPO_ROOT / "qa"

CANONICAL_DIRS = {
    "docs": REPO_ROOT / "docs",
    "packages": REPO_ROOT / "packages",
    "contracts": REPO_ROOT / "packages" / "contracts",
    "design_tokens": REPO_ROOT / "packages" / "design-tokens",
    "data": REPO_ROOT / "data",
    "services_api": REPO_ROOT / "services" / "api",
    "services_intel": REPO_ROOT / "services" / "intelligence",
    "apps_web": REPO_ROOT / "apps" / "web",
    "apps_field": REPO_ROOT / "apps" / "field",
}

SCAN_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".dart", ".sql", ".kt"}

IGNORED_DIR_NAMES = {
    ".git", "node_modules", ".codex", "hive", ".pytest_cache", "__pycache__",
    ".next", "dist", "build", ".dart_tool", ".venv", "venv", "roster-backups",
}

ACTUAL_WORD = r"actual[a-zA-Z0-9_]*"
NON_ACTUAL_WORDS = {"actually", "actualised", "actualized", "actuality"}
ACTUAL_TABLE_WORDS = {"actuals", "actual_progress", "progress_actuals", "actuals_table"}

EXCEPTION_LINE = re.compile(
    r"^(?P<path>[^:]+?)(?:\s*::\s*(?P<lines>[0-9][0-9,\- ]*?)\s*)?::\s*(?P<reason>.+)$"
)

WRITE_CALL_VERBS = ("update", "create", "insert", "save", "upsert", "bulk_update")

SQL_WRITE = re.compile(
    r"\b(update|insert\s+into|delete\s+from)\s+[\"'`]?[A-Za-z_][\w.\"'`]*", re.IGNORECASE
)
SQL_STATEMENT = re.compile(
    r"\b(UPDATE|INSERT\s+INTO|DELETE\s+FROM)\b", re.IGNORECASE
)
SQL_STRUCTURE = re.compile(
    r"(\bSET\s+[\w.\"'`]+?\s*=)|(\bVALUES\s*\()|(\bINTO\s+[\w.\"'`]+[ ]*\()",
    re.IGNORECASE,
)
SCHEMA_DECL = re.compile(r"\b([Cc]olumn|mapped_column|relationship|dataclass|Field|Table)\s*\(")
COMPARE_MASK = (("==", "  "), ("!=", "  "), ("<=", "  "), (">=", "  "), ("=>", "  "), ("<>", "  "))

STATEMENT_ASSIGN = [
    re.compile(rf"^\s*(?:self\.|this\.)?({ACTUAL_WORD})\s*="),
    re.compile(rf"^\s*(?:self\.|this\.)?[A-Za-z_][A-Za-z0-9_]*\.({ACTUAL_WORD})\s*="),
    re.compile(rf"^\s*[A-Za-z_][A-Za-z0-9_]*\[[\"']({ACTUAL_WORD})[\"']\]\s*="),
]
SETATTR = re.compile(rf"setattr\(\s*[^,]+,\s*[\"']({ACTUAL_WORD})")
WRITE_CALL = re.compile(rf"\.({'|'.join(WRITE_CALL_VERBS)})\s*\(", re.IGNORECASE)
EXECUTE_CALL = re.compile(r"\.execute\s*\(", re.IGNORECASE)
NON_ACTUAL_ALTERNATION = "|".join(sorted(NON_ACTUAL_WORDS))
ACTUAL_ANYWHERE = re.compile(
    rf"(?<![A-Za-z0-9_])(?!(?:{NON_ACTUAL_ALTERNATION})(?![A-Za-z0-9_])){ACTUAL_WORD}(?![A-Za-z0-9_])"
)


@dataclass(frozen=True)
class Violation:
    path: str
    line_no: int
    rule: str
    text: str

    def __str__(self) -> str:
        return f"{self.path}:{self.line_no} [{self.rule}] {self.text.strip()}"


def iter_source_files(*relative_roots: str) -> list[Path]:
    found: list[Path] = []
    for rel in relative_roots:
        base = REPO_ROOT / rel
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if path.suffix not in SCAN_SUFFIXES or not path.is_file():
                continue
            if any(part in IGNORED_DIR_NAMES for part in path.parts):
                continue
            found.append(path)
    return found


def string_spans(line: str) -> list[tuple[int, int]]:
    """Spans of single-line quoted literals. Triple-quoted blocks are excluded."""
    spans: list[tuple[int, int]] = []
    i = 0
    quote = None
    start = 0
    while i < len(line):
        ch = line[i]
        if quote is None:
            if ch in "'\"`":
                if line[i : i + 3] in ("'''", '"""'):
                    i += 3
                    continue
                quote = ch
                start = i + 1
        else:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                spans.append((start, i))
                quote = None
        i += 1
    return spans


def sql_write_spans(line: str, is_sql_file: bool) -> list[str]:
    """SQL statements must sit inside a quoted literal, or in a .sql file, and must
    carry real SQL structure.

    Two refinements, both forced by false positives found in the live codebase:
    a bare English "update" is not SQL, and a quoted UI string is not SQL. So a
    candidate must also contain `SET col=`, `VALUES(`, or `INTO table(` — shapes
    that prose does not produce. Without this the guard flags ordinary React JSX
    and Dart UI copy, and a guard that cries wolf gets switched off by its owner.
    """
    if is_sql_file:
        return [line] if SQL_STATEMENT.search(line) else []
    hits: list[str] = []
    for start, end in string_spans(line):
        segment = line[start:end]
        if SQL_WRITE.search(segment) and SQL_STRUCTURE.search(segment) and (
            ACTUAL_ANYWHERE.search(segment)
            or any(word in segment.lower() for word in ACTUAL_TABLE_WORDS)
        ):
            hits.append(segment)
    return hits


def strip_comments(line: str) -> str:
    out = []
    quote = None
    i = 0
    while i < len(line):
        ch = line[i]
        nxt = line[i + 1] if i + 1 < len(line) else ""
        if quote:
            out.append(ch)
            if ch == "\\" and nxt:
                out.append(nxt)
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "'\"`":
            quote = ch
            out.append(ch)
        elif ch == "/" and nxt == "/":
            break
        elif ch == "#":
            break
        elif ch == "/" and nxt == "*":
            i += 2
            while i < len(line) - 1 and not (line[i] == "*" and line[i + 1] == "/"):
                i += 1
            i += 1
        else:
            out.append(ch)
        i += 1
    return "".join(out)


def mask_comparisons(line: str) -> str:
    masked = line
    for token, blank in COMPARE_MASK:
        masked = masked.replace(token, blank)
    return masked


def load_exceptions() -> dict[str, dict]:
    """Parse `qa/non_mutation_exceptions.txt`.

    Line format:  <path>[:: <line-spec>] :: <reason>
    where line-spec is comma-separated numbers or N-M ranges. Omitting it exempts
    the whole file; supplying it exempts only those lines, so a reviewed exception
    stays as narrow as the evidence that justified it.
    """
    path = QA_ROOT / "non_mutation_exceptions.txt"
    allowed: dict[str, dict] = {}
    if not path.exists():
        return allowed
    for raw in path.read_text().splitlines():
        entry = raw.strip()
        if not entry or entry.startswith("#"):
            continue
        match = EXCEPTION_LINE.match(entry)
        if not match:
            continue
        rel = match.group("path").strip()
        spec = (match.group("lines") or "").strip()
        lines: set[int] = set()
        if spec:
            for chunk in spec.split(","):
                chunk = chunk.strip()
                if not chunk:
                    continue
                if "-" in chunk:
                    lo, _, hi = chunk.partition("-")
                    if lo.strip().isdigit() and hi.strip().isdigit():
                        lines.update(range(int(lo), int(hi) + 1))
                elif chunk.isdigit():
                    lines.add(int(chunk))
        allowed[rel] = {"reason": match.group("reason").strip() or "no reason given", "lines": lines or None}
    return allowed


def find_actual_writes(files: list[Path], root: Path | None = None, use_exceptions: bool = True) -> list[Violation]:
    base = root or REPO_ROOT
    exceptions = load_exceptions() if use_exceptions else {}
    violations: list[Violation] = []
    for path in files:
        rel = path.relative_to(base).as_posix()
        entry = exceptions.get(rel)
        if entry and entry["lines"] is None:
            continue
        exempt_lines: set[int] = entry["lines"] if entry and entry["lines"] else set()
        try:
            lines = path.read_text(errors="replace").splitlines()
        except OSError:
            continue
        is_sql_file = path.suffix == ".sql"
        for index, raw in enumerate(lines, start=1):
            if index in exempt_lines:
                continue
            code = strip_comments(raw)
            if not code.strip():
                continue
            if SCHEMA_DECL.search(code):
                continue
            if not ACTUAL_ANYWHERE.search(code):
                continue
            masked = mask_comparisons(code)
            rule = None
            for pattern in STATEMENT_ASSIGN:
                if pattern.search(masked):
                    rule = "statement-assignment to actual-progress field"
                    break
            if rule is None and SETATTR.search(masked):
                rule = "setattr on actual-progress field"
            if rule is None and (
                WRITE_CALL.search(code)
                or (EXECUTE_CALL.search(code) and SQL_STATEMENT.search(code))
            ):
                rule = "persistence call carrying actual-progress field"
            if rule is None and sql_write_spans(code, is_sql_file):
                rule = "SQL write against actual-progress table"
            if rule:
                violations.append(Violation(rel, index, rule, code))
    return violations


def format_violations(violations: list[Violation], limit: int = 25) -> str:
    lines = [str(v) for v in violations[:limit]]
    if len(violations) > limit:
        lines.append(f"... and {len(violations) - limit} more")
    return "\n".join(lines)


def source_files_or_skip(test: unittest.TestCase, *rel: str) -> list[Path]:
    files = iter_source_files(*rel)
    if not files:
        test.skipTest(
            f"PENDING: no source under {' or '.join(rel)} yet "
            f"(files={', '.join(rel)}); check auto-activates when the subsystem lands"
        )
    return files


def require_dirs(test: unittest.TestCase, *keys: str) -> None:
    missing = [f"{key} ({CANONICAL_DIRS[key]})" for key in keys if not CANONICAL_DIRS[key].is_dir()]
    if missing:
        test.skipTest(
            "PENDING: canonical path(s) not created yet: "
            + ", ".join(missing)
            + " — check auto-activates when foundation lands them"
        )


def read_text_files(*rel: str) -> str:
    chunks: list[str] = []
    for path in iter_source_files(*rel):
        try:
            chunks.append(path.read_text(errors="replace"))
        except OSError:
            continue
    for rel_md in rel:
        base = REPO_ROOT / rel_md
        if base.is_dir():
            for md in sorted(base.rglob("*.md")):
                if any(part in IGNORED_DIR_NAMES for part in md.parts):
                    continue
                try:
                    chunks.append(md.read_text(errors="replace"))
                except OSError:
                    continue
    return "\n".join(chunks)


def iter_json_files(*rel: str) -> list[Path]:
    out: list[Path] = []
    for root in rel:
        base = REPO_ROOT / root
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*.json")):
            if any(part in IGNORED_DIR_NAMES for part in path.parts):
                continue
            out.append(path)
    return out


def plan_text() -> str:
    return (QA_ROOT / "README.md").read_text()


def skip_if_missing(test: unittest.TestCase, *relative: str) -> None:
    """Skip a check while any named path is absent.

    Path-aware skips keep a check from reporting a false failure for work that
    has not landed yet, while still failing loudly the moment the path appears
    and the invariant is still broken.
    """
    missing = [rel for rel in relative if not (REPO_ROOT / rel).exists()]
    if missing:
        test.skipTest(
            f"PENDING: awaiting {', '.join(missing)}; "
            "check auto-activates once the file lands"
        )


def run_command(argv: list[str], timeout: int = 300) -> subprocess.CompletedProcess:
    """Run a gate command from the repo root, capturing output for the failure message."""
    return subprocess.run(
        argv,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def database_digest(db_path: Path, tables: tuple[str, ...] | None = None) -> str:
    """Stable digest of every row in every table of a SQLite file.

    Rows are sorted in Python rather than by SQL so the digest does not depend on
    column order, collation, or insertion order. Two databases that hold the same
    logical state must produce the same digest, which is what makes "Demo Reset
    restores the exact starting state" a testable claim rather than a promise.
    """
    conn = sqlite3.connect(str(db_path))
    try:
        if tables is None:
            rows = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            ).fetchall()
            tables = tuple(r[0] for r in rows)
        digest = hashlib.sha256()
        for table in tables:
            digest.update(f"::{table}".encode())
            for row in conn.execute(f'SELECT * FROM "{table}"').fetchall():
                digest.update(repr(sorted((str(v) for v in row))).encode())
        return digest.hexdigest()
    finally:
        conn.close()


def resolve_report_names() -> set[str]:
    """The five report identities, from the API's registry (the runtime source of truth)."""
    sys.path.insert(0, str(REPO_ROOT))
    try:
        from services.api.reports import REPORT_TYPES

        return set(REPORT_TYPES)
    finally:
        sys.path.pop(0)
