#!/usr/bin/env python3
"""ExecLink QA check runner. Standard library only, no install step.

Usage:
    python3 qa/run_checks.py            run everything
    python3 qa/run_checks.py -v         verbose, per-test output
    python3 qa/run_checks.py QA-S01     run tests whose id matches a filter
    python3 qa/run_checks.py --list     list check ids and their status

Exit code is 0 when nothing FAILED. PENDING (skipped) checks never fail the
run: they report work that cannot be judged yet, which is not the same as work
that passed.
"""
from __future__ import annotations

import argparse
import re
import sys
import unittest
from pathlib import Path

QA_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(QA_ROOT / "checks"))

CHECK_ID = re.compile(r"\b(QA-[A-Z]\d{2})\b")
METHOD_ID = re.compile(r"test_qa_([a-z])(\d{2})_", re.IGNORECASE)


def check_id_for(test: unittest.TestCase) -> str:
    match = CHECK_ID.search(test.id())
    if match:
        return match.group(1)
    method_match = METHOD_ID.search(getattr(test, "_testMethodName", ""))
    if method_match:
        return f"QA-{method_match.group(1).upper()}{method_match.group(2)}"
    return getattr(test, "_testMethodName", "")


class ListingResult(unittest.TextTestResult):
    pass


def build_suite(filters: list[str]) -> unittest.TestSuite:
    loader = unittest.TestLoader()
    suite = loader.discover(str(QA_ROOT / "checks"), pattern="test_*.py", top_level_dir=str(QA_ROOT / "checks"))
    if not filters:
        return suite
    selected = unittest.TestSuite()

    def keep(test: unittest.TestCase) -> bool:
        ident = f"{check_id_for(test)} {test.id()}"
        return any(f.lower() in ident.lower() for f in filters)

    def walk(item) -> None:
        if isinstance(item, unittest.TestSuite):
            for child in item:
                walk(child)
        elif isinstance(item, unittest.TestCase) and keep(item):
            selected.addTest(item)

    walk(suite)
    return selected


def main() -> int:
    parser = argparse.ArgumentParser(description="Run ExecLink QA contract checks.")
    parser.add_argument("filters", nargs="*", help="only run check ids / names containing these substrings")
    parser.add_argument("-v", "--verbose", action="store_true")
    parser.add_argument("--list", action="store_true", help="list discovered checks and exit")
    args = parser.parse_args()

    suite = build_suite(args.filters)

    if args.list:
        def walk(item) -> None:
            if isinstance(item, unittest.TestSuite):
                for child in item:
                    walk(child)
            else:
                print(f"{check_id_for(item):8} {item.id().split('.')[-1]}")

        walk(suite)
        return 0

    print("ExecLink QA checks")
    print("=" * 72)
    runner = unittest.TextTestRunner(verbosity=2 if args.verbose else 1, stream=sys.stdout)
    result = runner.run(suite)

    print()
    print("=" * 72)
    total = result.testsRun
    failed = len(result.failures) + len(result.errors)
    pending = len(result.skipped)
    passed = total - failed - pending
    print(f"checks: {total}   passed: {passed}   failed: {failed}   pending: {pending}")
    if pending:
        print()
        print("PENDING (not failures — the subject does not exist yet):")
        for case, reason in result.skipped:
            print(f"  - {check_id_for(case)}: {reason}")
    if failed:
        print()
        print("FAILED (real defects — log them in qa/defects.md and notify the owner):")
        for case, trace in result.failures + result.errors:
            first = [ln for ln in trace.splitlines() if ln.strip()][:1]
            print(f"  - {check_id_for(case)}: {first[0] if first else ''}")
        print()
        print("Report format: qa/defects.md")
    if total == 0:
        print("no checks matched the filter")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
