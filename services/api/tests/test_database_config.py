import os
import unittest
from pathlib import Path
from unittest.mock import patch

from services.api.db import ROOT, database_path


class DatabaseConfigTests(unittest.TestCase):
    def test_relative_sqlite_database_url_resolves_from_repository_root(self):
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "sqlite:///services/api/test.db"},
            clear=False,
        ):
            self.assertEqual(ROOT / "services/api/test.db", database_path())

    def test_legacy_database_path_remains_supported(self):
        with patch.dict(
            os.environ,
            {"EXECLINK_DATABASE": "/tmp/execlink-test.db"},
            clear=False,
        ):
            os.environ.pop("DATABASE_URL", None)
            self.assertEqual(Path("/tmp/execlink-test.db"), database_path())

    def test_postgresql_is_not_enabled_during_consolidation(self):
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "postgresql://example.invalid/execlink"},
            clear=False,
        ):
            with self.assertRaisesRegex(RuntimeError, "planned PostgreSQL migration"):
                database_path()


if __name__ == "__main__":
    unittest.main()
