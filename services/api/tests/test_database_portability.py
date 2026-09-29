from __future__ import annotations

import unittest
from pathlib import Path

from services.api.db import DatabaseRow, _postgres_sql


class DatabasePortabilityTests(unittest.TestCase):
    def test_placeholder_translation_ignores_quoted_question_marks(self):
        self.assertEqual(
            "SELECT * FROM records WHERE id=%s AND note='?' AND label=\"?\"",
            _postgres_sql("SELECT * FROM records WHERE id=? AND note='?' AND label=\"?\""),
        )

    def test_rows_support_mapping_and_positional_access(self):
        row = DatabaseRow(("id", "value"), ("A", 4))
        self.assertEqual("A", row["id"])
        self.assertEqual("A", row[0])
        self.assertEqual({"id": "A", "value": 4}, dict(row))

    def test_postgresql_schema_matches_auth_and_audit_contract(self):
        migration = (
            Path(__file__).resolve().parents[1]
            / "migrations"
            / "postgresql"
            / "001_initial.sql"
        ).read_text()
        for required in (
            "full_name text NOT NULL",
            "password_hash text",
            "reporting_scope text",
            "canonical_payload jsonb",
            "PRIMARY KEY(project_id,sequence)",
            "CREATE INDEX IF NOT EXISTS idx_outbox_unpublished",
        ):
            self.assertIn(required, migration)


if __name__ == "__main__":
    unittest.main()
