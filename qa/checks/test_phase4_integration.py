"""QA-V* Phase 4 checks: continuous regression and integrated product validation.

Split deliberately from the QA-B*/QA-S* static guards. Those ask "is the code
shaped correctly"; these ask "does the assembled product actually behave" by
running it. God asked for five things in ELN-11 and each gets a check:

  QA-V01  golden path stays green, and the suite cannot be silently shrunk
  QA-V02  Demo Reset is deterministic and restores the exact starting state
  QA-V03  Demo Reset works as one documented command
  QA-V04  Web performs a real verification mutation against the API
  QA-V05  the web idempotency key is stable across retries
  QA-V06  every web screen is reachable and renders a view
  QA-V07  web has genuine loading, empty, and error states
  QA-V08  Field parses and submits proposals, and never writes actuals
  QA-V09  the five report identities agree across API, web, and contracts
  QA-V10  analytical and project-memory endpoints stay read-only on actuals

Check ids must be `test_qa_<letter><2 digits>_`: the runner derives the id from
the method name, so `test_qa_v04b_` would be silently dropped from the suite.
"""
from __future__ import annotations

import re
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

from qa_lib import (
    REPO_ROOT,
    database_digest,
    resolve_report_names,
    run_command,
    skip_if_missing,
    source_files_or_skip,
)

# Floors, not exact counts. A growing suite is fine; a suite that lost tests is
# how a regression gets hidden, so losing any test is itself a failure.
API_TEST_FLOOR = 9
INTEL_TEST_FLOOR = 28

FIVE_EXPORTS = (
    "Schedule Variance",
    "Verification Audit",
    "Match Quality",
    "Delay Register",
    "Discipline Progress",
)

WEB_DEMO_DATA = "apps/web/lib/demo-data.ts"
WEB_CONTROL_CENTER = "apps/web/components/control-center.tsx"
WEB_DEMO_API = "apps/web/lib/demo-api.ts"


def unittest_run(directory: str) -> tuple[int, int, str]:
    """Run one subsystem's stdlib suite. Returns (total, failures, output)."""
    result = run_command(
        [sys.executable, "-m", "unittest", "discover", "-s", f"{directory}/tests", "-t", "."],
        timeout=300,
    )
    output = (result.stdout or "") + (result.stderr or "")
    total = failures = 0
    match = re.search(r"Ran (\d+) tests?", output)
    if match:
        total = int(match.group(1))
    match = re.search(r"FAILED \(failures=(\d+)", output)
    if match:
        failures = int(match.group(1))
    elif re.search(r"^FAILED\b", output, re.MULTILINE):
        failures = 1
    return total, failures, output


def seed_database(target: Path) -> None:
    sys.path.insert(0, str(REPO_ROOT))
    try:
        from services.api.db import connect, initialise
        from services.api.verification_seed import reset_demo

        db = connect(target)
        try:
            initialise(db)
            reset_demo(db)
        finally:
            db.close()
    finally:
        sys.path.pop(0)


def seed_database_via_cli(target: Path) -> subprocess.CompletedProcess:
    return run_command(
        [sys.executable, "-m", "services.api.verification_seed", "--database", str(target)],
        timeout=300,
    )


def _brace_block(text: str, open_index: int) -> str:
    """Return the {...} block starting at the brace at `open_index`.

    Brace counting rather than a regex, because a fallback branch is exactly the
    kind of code that grows a nested object literal or a comment, and a regex
    that stops early reads a block as innocent.
    """
    depth = 0
    for index in range(open_index, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return text[open_index : index + 1]
    return text[open_index:]


AUDIT_SEQUENCE_NAME = re.compile(r"audit_?[Ss]eq|auditSequence|AuditSequence", re.IGNORECASE)
# Grouped on purpose: an ungrouped alternation binds `+ 1` to the final branch only,
# so a bare "auditSequence" reference would match and the rule would fire on every
# mention. Wrapped in a non-capturing group so the arithmetic applies to the name.
AUDIT_SEQUENCE_ARITHMETIC = re.compile(
    r"(?:" + AUDIT_SEQUENCE_NAME.pattern + r")[A-Za-z0-9_.()\[\]]*\s*\+\s*1\b",
    re.IGNORECASE,
)
ANALYTICAL_PATH = re.compile(r"analytic|memory|insight|pattern", re.IGNORECASE)
ROUTE_DECORATOR = re.compile(r'@app\.(get|post|put|delete|patch)\(\s*[\'"]([^\'"]+)[\'"]')


def analytical_routes(main_text: str) -> list[tuple[str, str]]:
    """(verb, path) for every analytical or project-memory route in a FastAPI app."""
    return [
        (verb, path)
        for verb, path in ROUTE_DECORATOR.findall(main_text)
        if ANALYTICAL_PATH.search(path)
    ]


def non_readonly_routes(routes: list[tuple[str, str]]) -> list[tuple[str, str]]:
    return [(verb, path) for verb, path in routes if verb.lower() != "get"]


class GoldenPathRegressionGate(unittest.TestCase):
    def test_qa_v01_golden_path_suites_are_green_and_not_shrinking(self) -> None:
        for directory, floor in (("services/api", API_TEST_FLOOR), ("services/intelligence", INTEL_TEST_FLOOR)):
            with self.subTest(suite=directory):
                total, failures, output = unittest_run(directory)
                if total == 0:
                    self.fail(
                        f"QA-V01: {directory} suite did not run, so it cannot be called green.\n{output[-1500:]}"
                    )
                if failures:
                    self.fail(
                        f"QA-V01: {directory} golden path has {failures} failing test(s).\n{output[-3000:]}"
                    )
                if total < floor:
                    self.fail(
                        f"QA-V01: {directory} ran {total} test(s) but the recorded floor is {floor}. "
                        "A suite that lost tests can hide a regression; restore the deleted tests or "
                        "record an intentional reduction in qa/README.md."
                    )

    def test_qa_v01_contract_and_typecheck_gates_pass(self) -> None:
        for script in ("validate", "typecheck"):
            with self.subTest(gate=script):
                result = run_command(["npm", "run", script], timeout=300)
                if result.returncode != 0:
                    self.fail(
                        f"QA-V01: `npm run {script}` failed (exit {result.returncode}).\n"
                        f"{(result.stdout or '')[-2000:]}\n{(result.stderr or '')[-2000:]}"
                    )


class DemoResetChecks(unittest.TestCase):
    def test_qa_v02_reset_is_deterministic_and_restores_exact_state(self) -> None:
        skip_if_missing(self, "services/api/verification_seed.py")
        with tempfile.TemporaryDirectory() as tmp:
            first, second = Path(tmp) / "a.db", Path(tmp) / "b.db"
            seed_database(first)
            seed_database(second)
            baseline = database_digest(first)
            if baseline != database_digest(second):
                self.fail("QA-V02: two consecutive resets produced different state; the demo is not deterministic.")

            conn = sqlite3.connect(str(first))
            try:
                conn.execute("UPDATE activities SET actual_progress_percent = 97")
                conn.execute("DELETE FROM audit_entries")
                conn.execute("INSERT INTO users VALUES('USR-INTRUDER','Intruder')")
                conn.commit()
            finally:
                conn.close()
            if database_digest(first) == baseline:
                self.fail("QA-V02: the mutation step did not change the database, so this check proves nothing.")

            seed_database(first)
            if database_digest(first) != baseline:
                self.fail(
                    "QA-V02: reset did not restore the exact starting state; the demo is not a clean "
                    "pre-verification baseline after use."
                )

    def test_qa_v03_reset_runs_as_one_command_and_reproduces_the_baseline(self) -> None:
        skip_if_missing(self, "services/api/verification_seed.py")
        with tempfile.TemporaryDirectory() as tmp:
            reference, via_cli = Path(tmp) / "ref.db", Path(tmp) / "cli.db"
            seed_database(reference)
            expected = database_digest(reference)

            result = seed_database_via_cli(via_cli)
            if result.returncode != 0:
                self.fail(
                    "QA-V03: the documented one-step reset command failed "
                    f"(exit {result.returncode}).\n{(result.stdout or '')}\n{(result.stderr or '')}"
                )
            if not via_cli.exists():
                self.fail("QA-V03: the reset command exited 0 but wrote no database.")
            if database_digest(via_cli) != expected:
                self.fail(
                    "QA-V03: the one-step command produced a different state than the in-process reset, "
                    "so the documented demo entry point and the library disagree."
                )



CANONICAL_DESTINATIONS = {
    "overview": "Overview",
    "live": "Live Execution",
    "review": "Match Review",
    "schedule": "Schedule Explorer",
    "ingestion": "Data Ingestion",
    "verification": "Verification Center",
    "analytics": "Analytics",
    "memory": "Project Memory",
    "audit": "Audit Trail",
    "reports": "Reports",
    "settings": "Settings",
}


class WebIntegrationChecks(unittest.TestCase):
    def web_text(self, rel: str) -> str:
        return (REPO_ROOT / rel).read_text()

    def test_qa_v04_web_verification_calls_the_api_instead_of_local_state(self) -> None:
        skip_if_missing(self, WEB_DEMO_DATA, WEB_CONTROL_CENTER, WEB_DEMO_API)
        control = self.web_text(WEB_CONTROL_CENTER)
        client = self.web_text(WEB_DEMO_API)

        mutation = re.search(r"function\s+approve\s*\([^)]*\)\s*\{(.*?)\n", control)
        if not mutation:
            self.fail(
                "QA-V04: no `approve` mutation handler found in "
                f"{WEB_CONTROL_CENTER}; cannot confirm the UI performs a real verification."
            )
        body = mutation.group(1)
        if re.search(r"verifyDemoMatch|setDemo|useState", body):
            self.fail(
                "QA-V04: the web approve handler updates local React state only "
                f"({body.strip()[:200]}). Nothing is persisted, so the confirmation dialog and the "
                "success toast claim an audited verification that never happened. The UI must call "
                "the API verify endpoint so a verification id and audit sequence are real."
            )
        if not re.search(r"verifyMatchOnline|fetch\(", control):
            self.fail(
                "QA-V04: no real API verification call in the web mutation path. "
                f"{WEB_DEMO_API} defines a client for POST /proposals/{{id}}/verify but the component "
                "never imports it, so the product is not integrated end to end."
            )
        if not re.search(r"Idempotency-Key", client):
            self.fail("QA-V04: the web verification client sends no Idempotency-Key; retries would duplicate.")

    def test_qa_v05_web_idempotency_key_is_stable_across_retries(self) -> None:
        skip_if_missing(self, WEB_DEMO_API)
        client = self.web_text(WEB_DEMO_API)
        match = re.search(r"idempotencyKey\s*=\s*([^;]+);", client)
        if not match:
            self.skipTest("PENDING: no idempotency key built in the web client yet")
        expression = match.group(1)
        if re.search(r"Date\.now\(\)|Math\.random\(\)|new Date\(\)", expression):
            self.fail(
                f"QA-V05: the web idempotency key is `{expression.strip()}`. A key derived from the "
                "clock changes on every retry, so a retried or double-tapped approval is treated as a "
                "new request and the server applies the change twice. Derive the key from the proposal "
                "and payload so retries reuse it."
            )


    def test_qa_v14_all_eleven_canonical_destinations_are_present_and_reachable(self) -> None:
        """God made 11 canonical. QA-V06 proves whatever exists is reachable; this
        proves nothing was quietly dropped along the way.

        Named rather than counted: a missing destination fails, a future twelfth
        addition does not. That keeps QA-V06's "a count is not an invariant"
        position intact while still failing if a screen is deleted.
        """
        skip_if_missing(self, WEB_DEMO_DATA, WEB_CONTROL_CENTER)
        data = self.web_text(WEB_DEMO_DATA)
        control = self.web_text(WEB_CONTROL_CENTER)
        nav_ids = {i for i, _ in re.findall(r'\[\s*"([a-z-]+)"\s*,\s*"([^"]+)"', data[data.find("navItems") :])}
        rendered = {i for i, _ in re.findall(r'view === "([a-z-]+)" &&\s*\(?\s*<([A-Z]\w+)', control)}

        missing_nav = sorted(set(CANONICAL_DESTINATIONS) - nav_ids)
        if missing_nav:
            self.fail(
                f"QA-V14: canonical destination(s) {missing_nav} are missing from navItems. "
                "God confirmed 11 as canonical; a dropped destination is a scope regression, not a rename. "
                f"Labels on record: {{k: v for k, v in CANONICAL_DESTINATIONS.items() if k in missing_nav}}"
            )
        dead = sorted((set(CANONICAL_DESTINATIONS) & nav_ids) - rendered)
        if dead:
            self.fail(f"QA-V14: canonical destination(s) {dead} are in the nav but render no view.")

    def test_qa_v15_the_one_step_demo_reset_is_documented(self) -> None:
        """God listed a single-step Demo Reset command as an API deliverable.

        QA-V03 proves the command works. A command nobody can find is not
        delivered: a reviewer handed the repo cannot restore the demo without
        reading source, which is the one thing a demo has to make easy.
        """
        sources = sorted((REPO_ROOT / "docs").glob("*.md")) + [REPO_ROOT / "README.md"]
        sources = [p for p in sources if p.exists()]
        if not sources:
            self.skipTest("PENDING: no docs/ or README.md to document the reset command in yet")
        haystack = "\n".join(p.read_text(errors="replace") for p in sources)
        if re.search(r"verification_seed|seed\.py\s+--reset|--reset", haystack):
            return
        self.fail(
            "QA-V15: the one-step Demo Reset command is not documented in docs/*.md or README.md. "
            "QA-V03 proves `python3 -m services.api.verification_seed --database <path>` restores the exact "
            "starting state, but a command that exists only in source cannot be discovered or run by a "
            "reviewer. Document the exact invocation, including the default database location."
        )

    def test_qa_v06_every_web_screen_is_reachable_and_renders(self) -> None:
        skip_if_missing(self, WEB_DEMO_DATA, WEB_CONTROL_CENTER)
        data = self.web_text(WEB_DEMO_DATA)
        control = self.web_text(WEB_CONTROL_CENTER)

        declared = re.findall(r'\[\s*"([a-z-]+)"\s*,\s*"([^"]+)"', data[data.find("navItems") :])
        nav_ids = [i for i, _ in declared]
        # Both render forms occur in this codebase: `view === "x" && <Comp ... />`
        # on one line, and `view === "x" && (\n  <Comp ... />\n)` when a branch
        # grew past one line. Matching only the first form silently reports core
        # screens as dead whenever the web owner reformats.
        rendered = re.findall(r'view === "([a-z-]+)" &&\s*\(?\s*<([A-Z]\w+)', control)

        if not nav_ids:
            self.fail("QA-V06: no navItems found in apps/web/lib/demo-data.ts")
        if len(set(nav_ids)) != len(nav_ids):
            self.fail(f"QA-V06: duplicate nav ids in navItems: {nav_ids}")
        if "navItems.map" not in control and not re.search(r"navItems\.slice\([^)]*\)\.map", control):
            self.fail("QA-V06: navItems is declared but never rendered, so navigation is not wired.")

        orphans = sorted(set(i for i, _ in rendered) - set(nav_ids))
        dead = sorted(set(nav_ids) - set(i for i, _ in rendered))
        if orphans:
            self.fail(f"QA-V06: view(s) {orphans} render but no nav item selects them; unreachable screens.")
        if dead:
            self.fail(f"QA-V06: nav item(s) {dead} have no rendered view; buttons that do nothing.")
        self.assertTrue(rendered, "QA-V06: no view branches found in the control center")

    def test_qa_v07_web_has_loading_empty_and_error_states(self) -> None:
        skip_if_missing(self, WEB_CONTROL_CENTER)
        control = self.web_text(WEB_CONTROL_CENTER)

        if not re.search(r"(StateMessage|EmptyState|ErrorState|LoadingState)", control):
            self.fail("QA-V07: the web app defines no shared state component for loading, empty, or error.")
        loading = len(re.findall(r"\{loading\b|isLoading|skeleton", control, re.IGNORECASE))
        if loading == 0:
            self.fail("QA-V07: no loading branch anywhere in the web UI.")
        empty = re.search(r"No [a-z ]+ found|nothing (?:yet|to show)|is empty|Empty\b", control, re.IGNORECASE)
        if not empty:
            self.fail("QA-V07: no empty-state message anywhere in the web UI.")
        if not re.search(r"throw new Error|\.catch\(|errorMessage|setError|onError", control):
            self.fail(
                "QA-V07: the web UI has no error path. A failed request must surface a message; "
                "silently swallowing errors is how a dead backend still looks healthy."
            )


    def test_qa_v11_web_failure_never_fabricates_a_verified_audit(self) -> None:
        skip_if_missing(self, WEB_CONTROL_CENTER)
        control = self.web_text(WEB_CONTROL_CENTER)

        handler = re.search(r"function\s+approve\s*\([^)]*\)\s*\{", control)
        if not handler:
            self.skipTest("PENDING: no approve mutation handler to inspect yet")
        body = _brace_block(control, handler.end() - 1)

        catches = re.findall(r"catch\s*(?:\([^)]*\))?\s*\{", body)
        if not catches:
            self.skipTest("PENDING: approve() has no failure path to inspect yet")
        failure = _brace_block(body, body.index(catches[-1]) + len(catches[-1]) - 1)

        state_markers = [
            (r"set[A-Za-z]*[Vv]erified\s*\(\s*true", "marks the activity verified"),
            (r"set[A-Za-z]*[Pp]rogress\s*\(\s*(?!null)", "advances progress locally"),
            (r"set[A-Za-z]*[Aa]udit[A-Za-z]*\s*\(\s*(?:\w+\s*=>\s*\w+\s*\+\s*1|\w+\s*\+\s*1)", "invents a new audit sequence"),
        ]
        offences = [
            f"{description} (`{match.group(0)}`)"
            for pattern, description in state_markers
            for match in [re.search(pattern, failure)]
            if match
        ]

        # A message only counts as a false success if it *claims* the outcome.
        # "The activity was not verified" contains the word, so require a success
        # claim with no failure or negation wording; otherwise this check fails a
        # correct implementation and gets switched off, which protects nothing.
        failure_words = re.compile(
            r"fail|nothing|none\b|never|not\b|unable|could ?n|couldn'?t|error|unchanged|remains?|still|pending|rejected|declined",
            re.IGNORECASE,
        )
        for literal in re.findall(r"[\"'`]([^\"'`]{3,})[\"'`]", failure):
            if re.search(r"verif|updated|audit", literal, re.IGNORECASE) and not failure_words.search(literal):
                offences.append(f"shows a success message to the user (`{literal}`)")

        if offences:
            self.fail(
                "QA-V11: the approve() failure path still reports success: "
                + "; ".join(offences)
                + ". A verification the server rejected or never received must surface an error and leave "
                "the activity unverified. Falling back to a local success makes a failed or unreachable API "
                "look like a recorded audit, which is the exact failure this product exists to prevent."
            )

    def test_qa_v12_no_audit_number_is_synthesised_in_the_browser(self) -> None:
        skip_if_missing(self, WEB_CONTROL_CENTER, WEB_DEMO_API)
        offences: list[str] = []
        for rel in (WEB_CONTROL_CENTER, WEB_DEMO_API):
            for number, raw in enumerate((REPO_ROOT / rel).read_text().splitlines(), start=1):
                line = raw.strip()
                if not line or line.startswith(("//", "*", "/*")):
                    continue
                if not AUDIT_SEQUENCE_NAME.search(line):
                    continue
                arithmetic = AUDIT_SEQUENCE_ARITHMETIC.search(line)
                if arithmetic:
                    offences.append(f"{rel}:{number} invents the next audit number locally ({arithmetic.group(0).strip()})")
                fallback = re.search(r"\|\|", line)
                if fallback and re.search(r"audit", line, re.IGNORECASE):
                    offences.append(f"{rel}:{number} falls back to a local value instead of the server's ({line[:90]})")
                seeded = re.search(r"useState[<(][^)>]*\b(\d{2,})\b", line)
                if seeded and re.search(r"audit", line, re.IGNORECASE):
                    offences.append(
                        f"{rel}:{number} seeds the audit sequence from the literal {seeded.group(1)} "
                        "rather than the server's audit chain"
                    )

        if offences:
            self.fail(
                "QA-V12: the browser invents audit numbers: "
                + "; ".join(offences)
                + ". An audit number is a fact about the persisted hash chain, so it may only be displayed "
                "when the server supplied it. Arithmetic on it, a `||` fallback, a predicted "
                "'committed to audit #N' before verification, or a hardcoded seed all display a number the "
                "audit trail does not contain. Render nothing instead."
            )



class FieldIntegrationChecks(unittest.TestCase):
    def test_qa_v08_field_parses_and_submits_proposals_without_touching_actuals(self) -> None:
        source_files_or_skip(self, "apps/field")
        extractor = (REPO_ROOT / "apps/field/lib/services/time_agent_extractor.dart").read_text()
        client = (REPO_ROOT / "apps/field/lib/services/api_client.dart").read_text()

        if len(re.findall(r"RegExp\(", extractor)) < 4:
            self.fail(
                "QA-V08: the Time Agent extractor has fewer than four structured patterns, which is "
                "too few to parse asset, line, location, and time out of free text."
            )
        for signal in ("confidenceScore", "LocationInterval"):
            if signal not in extractor:
                self.fail(f"QA-V08: the Time Agent extractor never produces {signal}; parsing is not structured.")

        if not re.search(r"post\s*\(", client, re.IGNORECASE):
            self.fail("QA-V08: the Field API client cannot submit anything; proposal submission is missing.")
        if not re.search(r"/events", client):
            self.fail(
                "QA-V08: the Field client does not post to the events endpoint, so Time Agent output "
                "never reaches the matching pipeline."
            )
        if re.search(r"[\"'$]/proposals/[^\"']*verify|actuals?/|\bactual_progress\b", client):
            self.fail(
                "QA-V08: the Field client references an actuals or verify endpoint. Only an authorized "
                "planner may change actuals; Field may submit evidence and proposals only."
            )


class CrossLayerConsistencyChecks(unittest.TestCase):
    def test_qa_v09_the_five_report_identities_agree_across_layers(self) -> None:
        skip_if_missing(self, WEB_DEMO_DATA, "services/api/reports.py")
        api_names = resolve_report_names()
        if len(api_names) != 5:
            self.fail(f"QA-V09: the API report registry has {len(api_names)} reports, expected 5: {sorted(api_names)}")

        data = (REPO_ROOT / WEB_DEMO_DATA).read_text()
        web_reports = re.search(r"export const reports\s*=\s*\[(.*?)\]", data, re.DOTALL)
        if not web_reports:
            self.fail("QA-V09: apps/web/lib/demo-data.ts declares no reports list.")
        web_names = tuple(re.findall(r'"([^"]+)"', web_reports.group(1)))
        if web_names != FIVE_EXPORTS:
            self.fail(
                f"QA-V09: the web report list is {list(web_names)}, expected {list(FIVE_EXPORTS)}. "
                "A mismatch here is how a demo shows a report the API cannot produce."
            )

        report_body = re.search(r"REPORT_TYPES\s*=\s*\{(.*?)\}", (REPO_ROOT / "services/api/reports.py").read_text(), re.DOTALL)
        served = set(re.findall(r'"([^"]+)"', report_body.group(1))) if report_body else set()
        if served != api_names:
            self.fail(f"QA-V09: REPORT_TYPES literal and build_report dispatch disagree: {sorted(served)} vs {sorted(api_names)}")

    def test_qa_v10_analytical_and_project_memory_endpoints_exist_and_stay_read_only(self) -> None:
        skip_if_missing(self, "services/api/main.py")
        main = (REPO_ROOT / "services/api/main.py").read_text()
        analytical = analytical_routes(main)
        if not analytical:
            self.skipTest(
                "PENDING: no analytical or project-memory endpoint in services/api/main.py yet; "
                "check auto-activates when Phase 4 adds them and asserts they cannot write actuals "
                "(QA-V13 proves that activation path works)"
            )
        offenders = non_readonly_routes(analytical)
        if offenders:
            self.fail(
                "QA-V10: analytical endpoint(s) "
                + ", ".join(f"{verb.upper()} {path}" for verb, path in offenders)
                + " use a write verb. Analytical and project-memory surfaces are read-only projections; "
                "a write verb on a read path is a route to mutating actuals without a verification."
            )

    def test_qa_v13_analytical_route_detection_activates_and_enforces(self) -> None:
        """QA-V10 is PENDING only because the endpoints do not exist yet.

        God was explicit that Phase 4 must not close with a pending check, so the
        detection and enforcement logic is proven here against synthetic route
        text. If this passes, QA-V10 will genuinely run the day the endpoints land
        rather than staying silently pending.
        """
        detected = analytical_routes(
            '@app.get("/api/v1/projects/{project_id}/analytics")\n'
            '@app.get("/api/v1/projects/{project_id}/memory")\n'
            '@app.get("/api/v1/projects/{project_id}/events")\n'
        )
        self.assertEqual(
            sorted(path for _, path in detected),
            ["/api/v1/projects/{project_id}/analytics", "/api/v1/projects/{project_id}/memory"],
            "QA-V13: analytics and project-memory routes were not both detected, so QA-V10 would stay pending forever",
        )
        self.assertEqual(non_readonly_routes(detected), [], "QA-V13: GET routes wrongly reported as writable")

        writable = analytical_routes(
            '@app.get("/api/v1/projects/{project_id}/analytics")\n'
            '@app.post("/api/v1/projects/{project_id}/memory")\n'
        )
        self.assertEqual(
            non_readonly_routes(writable),
            [("post", "/api/v1/projects/{project_id}/memory")],
            "QA-V13: a POST analytical route was not caught, so QA-V10 would pass on a mutating endpoint",
        )


if __name__ == "__main__":
    unittest.main()
