"""Self-test for the non-mutation guard (QA-B07).

An unproven guard protects nothing: QA-S01/S02 stay PENDING until the
subsystems land, so until then this is the only evidence the guard both fires on
real mutations and stays quiet on legitimate code. A guard that cries wolf gets
switched off, and a switched-off guard protects nothing.

Fixtures live in a temp directory. Nothing here touches the product repo.
"""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from qa_lib import find_actual_writes

MUST_FLAG = {
    "plain_assignment": "actual_finish = None\n",
    "attribute_assignment": "task.actual_progress = 45\n",
    "self_attribute": "self.actual_start = observed_at\n",
    "subscript_assignment": 'task["actual_start"] = observed_at\n',
    "setattr_call": 'setattr(task, "actual_finish", observed_at)\n',
    "orm_update": 'db.query(Activity).filter(Activity.id == a).update({"actual_progress": 0.4})\n',
    "orm_create": "Match.objects.create(actual_progress=10)\n",
    "sql_update": 'session.execute("UPDATE activities SET actual_progress = 40")\n',
    "sql_insert": 'session.execute("INSERT INTO actuals (actual_progress) VALUES (5)")\n',
    "upsert": 'repo.upsert(Activity(id="A1"), values={"actual_progress": 12})\n',
    "typed_attribute": "candidate.actualPercent = 45\n",
}

MUST_NOT_FLAG = {
    "equality_comparison": "if actual_progress == 0:\n    pass\n",
    "not_equal": "if task.actual_progress != 100:\n    pass\n",
    "function_parameter": "def score(actual_progress: float = 0.0):\n    return actual_progress\n",
    "keyword_passthrough": "MatchCandidate(actual_progress=prior.actual_progress)\n",
    "read_only": "value = compute(candidate.actual_progress)\n",
    "dict_get": 'row.get("actual_progress")\n',
    "orm_column_decl": 'Column("actual_progress", Float, nullable=False)\n',
    "sqlalchemy_mapped": 'actual_progress: Mapped[float] = mapped_column(Float)\n',
    "pydantic_field": "actual_progress: float = Field(ge=0, le=100)\n",
    "ts_interface": "  actual_progress: number;\n",
    "line_comment": "# actual_progress = 5\n",
    "block_comment": "/* actual_progress = 5 */\n",
    "prose_string": 'raise ValueError("actual progress is out of range")\n',
    "camel_read": "const p = activity.actualProgress;\n",
    "comparison_expression": "sorted_by = sorted(rows, key=lambda r: r.actual_progress)\n",
    "jsx_copy_says_update": (
        "<p>This will update the system-of-record actual for ACT-1.2.1 and creates an "
        "attributable audit entry.</p>\n"
    ),
    "jsx_copy_says_actuals": (
        "<div className=\"consequence\"><b>This action changes project actuals.</b>"
        "<span>written to the immutable audit chain</span></div>\n"
    ),
    "jsx_proposed_actual_label": (
        "<label htmlFor=\"progress\">PROPOSED ACTUAL</label>"
        "<button onClick={() => setProgress(Math.max(30, progress - 5))}>−</button>\n"
    ),
    "html_title_mentions_actual": "<title>Actual progress dashboard</title>\n",
    "docstring_prose": 'def helper():\n    """Update the actual progress view."""\n    pass\n',
    "dart_ui_string_from_field_app": (
        "          const Text(\n"
        "            'Field submits proposals only. Baseline actuals update upon planner "
        "verification.',\n"
        "          ),\n"
    ),
    "prose_update_actuals_from_field": (
        'const note = "Update actuals from the field where the crew captured evidence.";\n'
    ),
    "prose_insert_and_delete_words": (
        'const hint = "Insert a proposal, then delete it; actuals stay untouched.";\n'
    ),
}


class GuardSelfTest(unittest.TestCase):
    def _scan(self, filename: str, body: str, tmp: Path) -> list:
        target = tmp / "services" / "intelligence" / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(body)
        return find_actual_writes([target], root=tmp)

    def test_qa_b07_guard_flags_real_mutations(self) -> None:
        for case, body in MUST_FLAG.items():
            with self.subTest(case=case):
                with tempfile.TemporaryDirectory() as raw:
                    found = self._scan(f"{case}.py", body, Path(raw))
                self.assertTrue(
                    found,
                    f"non-mutation guard MISSED a real mutation ({case}): {body.strip()}. "
                    "This is an S1 blind spot.",
                )

    def test_qa_b07_guard_stays_quiet_on_legitimate_code(self) -> None:
        for case, body in MUST_NOT_FLAG.items():
            with self.subTest(case=case):
                with tempfile.TemporaryDirectory() as raw:
                    found = self._scan(f"{case}.py", body, Path(raw))
                self.assertEqual(
                    [],
                    found,
                    f"non-mutation guard FALSE POSITIVE ({case}): {body.strip()} -> "
                    f"{[str(v) for v in found]}. A noisy guard gets disabled.",
                )

    def test_qa_b07_guard_reports_use_relative_paths(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            tmp = Path(raw)
            found = self._scan("x.py", "actual_progress = 1\n", tmp)
            self.assertTrue(found)
            self.assertTrue(
                found[0].path.startswith("services/intelligence/"),
                f"violation path must be repo-relative, got {found[0].path}",
            )

    def test_qa_b07_guard_covers_multiple_languages(self) -> None:
        samples = {
            "a.ts": "task.actual_progress = 45;\n",
            "a.tsx": "task.actual_progress = 45;\n",
            "a.dart": "task.actualProgress = 45;\n",
            "a.js": 'row.actual_progress = 45;\n',
            "a.sql": "UPDATE activities SET actual_progress = 40;\n",
        }
        for name, body in samples.items():
            with self.subTest(lang=name):
                with tempfile.TemporaryDirectory() as raw:
                    found = self._scan(name, body, Path(raw))
                self.assertTrue(found, f"guard missed a mutation in {name}")


if __name__ == "__main__":
    unittest.main()
