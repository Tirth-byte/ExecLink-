from __future__ import annotations

import json
import os
import sqlite3
from collections.abc import Iterator, Mapping, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from threading import Lock
from typing import Any, Callable
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = Path(__file__).resolve().parent / "migrations"
DEFAULT_DATABASE = Path(__file__).resolve().parent / "execlink.db"
SQLITE_PREFIX = "sqlite:///"
POSTGRES_SCHEMES = {"postgres", "postgresql"}


@dataclass(frozen=True)
class DatabaseSettings:
    engine: str
    url: str | None = None
    path: Path | None = None


def database_settings(path: str | Path | None = None) -> DatabaseSettings:
    if path is not None:
        return DatabaseSettings("sqlite", path=Path(path).expanduser().absolute())
    configured = os.environ.get("DATABASE_URL", "").strip()
    if configured:
        scheme = urlparse(configured).scheme
        if scheme in POSTGRES_SCHEMES:
            return DatabaseSettings("postgresql", url=configured)
        if configured.startswith(SQLITE_PREFIX):
            resolved = Path(configured[len(SQLITE_PREFIX) :]).expanduser()
            if not resolved.is_absolute():
                resolved = ROOT / resolved
            return DatabaseSettings("sqlite", path=resolved.absolute())
        raise RuntimeError("DATABASE_URL must use postgresql://, postgres://, or sqlite:///.")
    legacy = os.environ.get("EXECLINK_DATABASE", "").strip()
    resolved = Path(legacy).expanduser() if legacy else DEFAULT_DATABASE
    if not resolved.is_absolute():
        resolved = ROOT / resolved
    return DatabaseSettings("sqlite", path=resolved.absolute())


def database_path(path: str | Path | None = None) -> Path:
    settings = database_settings(path)
    if settings.engine != "sqlite" or settings.path is None:
        raise RuntimeError("The configured database is not SQLite.")
    return settings.path


def _normalise(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True, separators=(",", ":"))
    return value


class DatabaseRow(Mapping[str, Any]):
    def __init__(self, columns: Sequence[str], values: Sequence[Any]):
        self._columns = tuple(columns)
        self._values = tuple(_normalise(value) for value in values)
        self._mapping = dict(zip(self._columns, self._values, strict=False))

    def __getitem__(self, key: str | int) -> Any:
        return self._values[key] if isinstance(key, int) else self._mapping[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self._columns)

    def __len__(self) -> int:
        return len(self._columns)


class DatabaseCursor:
    def __init__(self, cursor: Any):
        self._cursor = cursor

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount

    def _row(self, row: Any) -> DatabaseRow | None:
        if row is None:
            return None
        if isinstance(row, Mapping):
            return DatabaseRow(tuple(row), tuple(row.values()))
        columns = tuple(item[0] for item in (self._cursor.description or ()))
        return DatabaseRow(columns, tuple(row))

    def fetchone(self) -> DatabaseRow | None:
        return self._row(self._cursor.fetchone())

    def fetchall(self) -> list[DatabaseRow]:
        return [converted for row in self._cursor.fetchall() if (converted := self._row(row))]

    def __iter__(self) -> Iterator[DatabaseRow]:
        for row in self._cursor:
            converted = self._row(row)
            if converted is not None:
                yield converted


def _postgres_sql(statement: str) -> str:
    result: list[str] = []
    single = double = False
    index = 0
    while index < len(statement):
        character = statement[index]
        if character == "'" and not double:
            result.append(character)
            if single and index + 1 < len(statement) and statement[index + 1] == "'":
                result.append("'")
                index += 2
                continue
            single = not single
        elif character == '"' and not single:
            result.append(character)
            double = not double
        elif character == "?" and not single and not double:
            result.append("%s")
        else:
            result.append(character)
        index += 1
    return "".join(result)


class DatabaseConnection:
    def __init__(self, raw: Any, engine: str, release: Callable[[Any], None] | None = None):
        self.raw, self.engine, self._release, self._closed = raw, engine, release, False

    @property
    def row_factory(self) -> None:
        return None

    @row_factory.setter
    def row_factory(self, _value: Any) -> None:
        pass

    def execute(self, statement: str, parameters: Sequence[Any] = ()) -> DatabaseCursor:
        sql = _postgres_sql(statement) if self.engine == "postgresql" else statement
        return DatabaseCursor(self.raw.execute(sql, tuple(parameters)))

    def executemany(self, statement: str, parameters: Sequence[Sequence[Any]]) -> DatabaseCursor:
        sql = _postgres_sql(statement) if self.engine == "postgresql" else statement
        cursor = self.raw.cursor()
        cursor.executemany(sql, parameters)
        return DatabaseCursor(cursor)

    def executescript(self, script: str) -> None:
        if self.engine == "sqlite":
            self.raw.executescript(script)
        else:
            self.raw.execute(script, prepare=False)

    def execute_for_update(self, statement: str, parameters: Sequence[Any] = ()) -> DatabaseCursor:
        suffix = " FOR UPDATE" if self.engine == "postgresql" else ""
        return self.execute(statement.rstrip().rstrip(";") + suffix, parameters)

    def lock_project(self, project_id: str) -> None:
        if self.engine == "postgresql":
            self.execute("SELECT id FROM projects WHERE id = ? FOR UPDATE", (project_id,)).fetchone()

    def commit(self) -> None:
        self.raw.commit()

    def rollback(self) -> None:
        self.raw.rollback()

    def close(self) -> None:
        if not self._closed:
            self._closed = True
            self._release(self.raw) if self._release else self.raw.close()

    def __enter__(self) -> DatabaseConnection:
        return self

    def __exit__(self, exc_type: Any, _exc: Any, _traceback: Any) -> None:
        if exc_type is not None:
            self.rollback()
        self.close()


_pool: Any | None = None
_pool_url: str | None = None
_pool_lock = Lock()


def _postgres_connection(url: str) -> DatabaseConnection:
    global _pool, _pool_url
    try:
        from psycopg.rows import tuple_row
        from psycopg_pool import ConnectionPool
    except ImportError as exc:
        raise RuntimeError("Install services/api/requirements.txt for PostgreSQL support.") from exc
    with _pool_lock:
        if _pool is None or _pool_url != url:
            if _pool is not None:
                _pool.close()
            _pool = ConnectionPool(
                conninfo=url,
                min_size=0,
                max_size=5,
                timeout=10,
                reconnect_timeout=10,
                kwargs={"autocommit": True, "row_factory": tuple_row},
                check=ConnectionPool.check_connection,
                open=True,
            )
            _pool_url = url
    raw = _pool.getconn()
    return DatabaseConnection(raw, "postgresql", _pool.putconn)


def close_pool() -> None:
    global _pool, _pool_url
    with _pool_lock:
        if _pool is not None:
            _pool.close()
            _pool = None
            _pool_url = None


def connect(path: str | Path | None = None) -> DatabaseConnection:
    settings = database_settings(path)
    if settings.engine == "postgresql":
        assert settings.url is not None
        return _postgres_connection(settings.url)
    assert settings.path is not None
    settings.path.parent.mkdir(parents=True, exist_ok=True)
    raw = sqlite3.connect(settings.path, timeout=30, isolation_level=None)
    raw.execute("PRAGMA foreign_keys = ON")
    raw.execute("PRAGMA journal_mode = WAL")
    return DatabaseConnection(raw, "sqlite")


def initialise(db: DatabaseConnection) -> None:
    if db.engine == "postgresql":
        migrations = db.execute("SELECT to_regclass('public.schema_migrations')").fetchone()
        projects = db.execute("SELECT to_regclass('public.projects')").fetchone()
        if migrations is None or migrations[0] is None or projects is None or projects[0] is None:
            raise RuntimeError("PostgreSQL migrations are pending. Run: python3 -m services.api.database_admin migrate")
        expected = {path.name for path in (MIGRATIONS / "postgresql").glob("*.sql")}
        applied = {row[0] for row in db.execute("SELECT name FROM schema_migrations").fetchall()}
        if not expected.issubset(applied):
            raise RuntimeError("PostgreSQL migrations are pending. Run: python3 -m services.api.database_admin migrate")
        return
    current = db.execute("PRAGMA user_version").fetchone()[0]
    for migration in sorted((MIGRATIONS / "sqlite").glob("*.sql")):
        version = int(migration.stem.split("_", 1)[0])
        if version > current:
            db.executescript(migration.read_text())
            db.execute(f"PRAGMA user_version = {version}")
            current = version


def migrate(db: DatabaseConnection) -> list[str]:
    if db.engine == "sqlite":
        initialise(db)
        return []
    db.execute("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())")
    applied = {row[0] for row in db.execute("SELECT name FROM schema_migrations").fetchall()}
    completed: list[str] = []
    for migration in sorted((MIGRATIONS / "postgresql").glob("*.sql")):
        if migration.name not in applied:
            with transaction(db):
                db.executescript(migration.read_text())
                db.execute("INSERT INTO schema_migrations (name) VALUES (?)", (migration.name,))
            completed.append(migration.name)
    return completed


@contextmanager
def transaction(db: DatabaseConnection) -> Iterator[None]:
    db.execute("BEGIN IMMEDIATE" if db.engine == "sqlite" else "BEGIN")
    try:
        yield
    except Exception:
        db.rollback()
        raise
    else:
        db.commit()


def is_integrity_error(error: BaseException) -> bool:
    if isinstance(error, sqlite3.IntegrityError):
        return True
    try:
        from psycopg import IntegrityError
    except ImportError:
        return False
    return isinstance(error, IntegrityError)
