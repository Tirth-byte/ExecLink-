from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE = Path(__file__).with_name("execlink.db")


def database_path() -> Path:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if database_url:
        sqlite_prefix = "sqlite:///"
        if not database_url.startswith(sqlite_prefix):
            raise RuntimeError(
                "Only sqlite:/// DATABASE_URL values are supported before the "
                "planned PostgreSQL migration"
            )
        configured_path = Path(database_url.removeprefix(sqlite_prefix))
        return configured_path if configured_path.is_absolute() else ROOT / configured_path

    return Path(os.environ.get("EXECLINK_DATABASE", DEFAULT_DATABASE))


def connect(path: Path | str | None = None) -> sqlite3.Connection:
    connection = sqlite3.connect(str(path or database_path()), timeout=10, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def initialise(connection: sqlite3.Connection) -> None:
    version = connection.execute("PRAGMA user_version").fetchone()[0]
    migrations_dir = Path(__file__).with_name("migrations") / "sqlite"

    if version < 1:
        connection.executescript((migrations_dir / "001_initial.sql").read_text())
        connection.execute("PRAGMA user_version = 1")

    if version < 2:
        connection.executescript((migrations_dir / "002_auth.sql").read_text())
        connection.execute("PRAGMA user_version = 2")

    if version < 3:
        connection.executescript((migrations_dir / "003_roles.sql").read_text())
        connection.execute("PRAGMA user_version = 3")


@contextmanager
def transaction(connection: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    connection.execute("BEGIN IMMEDIATE")
    try:
        yield connection
    except Exception:
        connection.rollback()
        raise
    else:
        connection.commit()
