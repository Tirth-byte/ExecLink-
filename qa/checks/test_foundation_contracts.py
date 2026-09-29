"""QA-C* path-aware contract and schema checks. Each skips (PENDING) until its
artifact exists, then asserts for real. No invented requirements: the five
exports, the weight vector and the thresholds come from god's Phase 1 brief."""
from __future__ import annotations

import json
import re
import unittest

from qa_lib import (
    REPO_ROOT,
    iter_json_files,
    iter_source_files,
    read_text_files,
    require_dirs,
)

REQUIRED_DOCS = (
    "PRODUCT.md",
    "ARCHITECTURE.md",
    "DATA_MODEL.md",
    "API_CONTRACT.md",
    "AI_MATCHING.md",
    "DESIGN_SYSTEM.md",
    "DEMO_FLOW.md",
)

FIVE_EXPORTS = (
    "Schedule Variance",
    "Verification Audit",
    "Match Quality",
    "Delay Register",
    "Discipline Progress",
)

EXPECTED_WEIGHTS = (40, 20, 15, 10, 10, 5)
FIVE_SIGNALS = ("asset", "discipline", "location", "text", "work_type")

SUBJECT_WORDS = r"(?:chain|audit|integrity|hash|entry)"
VERIFY_WORDS = r"(?:verif\w*|validat\w*|prov\w*)"
VERIFY_THEN_SUBJECT = re.compile(VERIFY_WORDS + r"[^.\n]{0,60}" + SUBJECT_WORDS, re.IGNORECASE)
SUBJECT_THEN_VERIFY = re.compile(SUBJECT_WORDS + r"[^.\n]{0,60}" + VERIFY_WORDS, re.IGNORECASE)

NONDETERMINISM_MARKERS = (
    re.compile(r"\bDate\.now\s*\("),
    re.compile(r"\bMath\.random\s*\("),
    re.compile(r"\brandom\.random\s*\("),
    re.compile(r"\brandom\.uuid"),
    re.compile(r"\buuid4\s*\("),
    re.compile(r"\bdatetime\.now\s*\("),
    re.compile(r"\bdatetime\.utcnow\s*\("),
    re.compile(r"\btime\.time\s*\("),
    re.compile(r"\bnew\s+Date\s*\(\s*\)"),
    re.compile(r"\bDate\s*\(\s*\)"),
)


class FoundationStructure(unittest.TestCase):
    def test_qa_c01_canonical_layout_exists(self) -> None:
        require_dirs(self, "docs", "packages", "contracts", "design_tokens", "data")

    def test_qa_c02_required_docs_present(self) -> None:
        require_dirs(self, "docs")
        docs = REPO_ROOT / "docs"
        present = {p.name.lower() for p in docs.rglob("*.md")}
        missing = [name for name in REQUIRED_DOCS if name.lower() not in present]
        self.assertEqual(
            [],
            missing,
            "QA-C02: required foundation docs are missing or empty: " + ", ".join(missing),
        )
        empty = [
            p.relative_to(REPO_ROOT).as_posix()
            for p in docs.rglob("*.md")
            if p.name.lower() in {n.lower() for n in REQUIRED_DOCS} and len(p.read_text().strip()) < 200
        ]
        self.assertEqual(
            [],
            empty,
            "QA-C02: these docs exist but are stubs (<200 chars), which cannot guide a "
            "subsystem owner: " + ", ".join(empty),
        )


class ContractArtifacts(unittest.TestCase):
    def test_qa_c03_contract_json_parses(self) -> None:
        require_dirs(self, "packages")
        files = iter_json_files("packages", "data")
        self.assertTrue(files, "QA-C03: packages/ and data/ contain no .json files at all")
        broken: list[str] = []
        contract_files: list[Path] = []
        for path in files:
            rel = path.relative_to(REPO_ROOT).as_posix()
            try:
                payload = json.loads(path.read_text())
            except (OSError, ValueError) as exc:
                broken.append(f"{rel} ({exc})")
                continue
            if path.name == "package.json":
                continue
            if "schema" in path.name.lower() or "contract" in rel.lower():
                contract_files.append(path)
            if not isinstance(payload, dict):
                continue
        self.assertEqual([], broken, "QA-C03: invalid JSON in packages/ or data/: " + "; ".join(broken))
        self.assertTrue(
            contract_files,
            "QA-C03: no contract artifacts found. Expected JSON Schemas or contract files "
            "under packages/contracts/ (e.g. packages/contracts/schemas/*.schema.json).",
        )
        shapeless: list[str] = []
        for path in contract_files:
            payload = json.loads(path.read_text())
            if not isinstance(payload, dict):
                continue
            markers = {"$schema", "type", "properties", "$defs", "definitions", "enum", "title"}
            if not markers & set(payload):
                shapeless.append(path.relative_to(REPO_ROOT).as_posix())
        self.assertEqual(
            [],
            shapeless,
            "QA-C03: these contract files have no schema marker ($schema/type/properties/"
            "$defs/definitions/enum/title), so subsystem owners cannot code against them: "
            + ", ".join(shapeless),
        )

    def test_qa_c04_matching_weights_match_brief(self) -> None:
        require_dirs(self, "packages", "docs", "data")
        corpus = read_text_files("packages", "docs", "data")
        if not corpus:
            self.skipTest("PENDING: no packages/, docs/ or data/ content to read yet")
        vectors: list[tuple[float, ...]] = []
        for match in re.finditer(
            r"\"?weights?\"?\s*[:=]\s*(\{[^}]{0,400}\}|\[[^\]]{0,400}\])", corpus, re.IGNORECASE
        ):
            numbers = tuple(float(n) for n in re.findall(r"(?<![\d.])(\d+(?:\.\d+)?)(?![\d.])", match.group(1)))
            if len(numbers) >= 2:
                vectors.append(numbers)
        if not vectors:
            self.skipTest(
                "PENDING: no matching-weights declaration found in packages/, docs/ or data/; "
                "check activates once foundation declares the weight vector"
            )
        expected_pct = sorted(float(v) for v in EXPECTED_WEIGHTS)
        bad: list[tuple[float, ...]] = []
        for vector in vectors:
            total = sum(vector)
            if abs(total - 1.0) <= 1e-6:
                normalised = sorted(round(v * 100, 4) for v in vector)
            elif abs(total - 100.0) <= 1e-6:
                normalised = sorted(round(v, 4) for v in vector)
            else:
                bad.append(vector)
                continue
            if normalised != expected_pct:
                bad.append(vector)
        self.assertEqual(
            [],
            bad,
            "QA-C04: matching weights must be 40/20/15/10/10/5 (sum 100, or the same "
            "vector as fractions summing to 1.0) per god's brief, and be configurable. "
            f"Offending vectors: {bad}",
        )

    def test_qa_c05_thresholds_present_and_configurable(self) -> None:
        require_dirs(self, "packages", "docs", "data")
        corpus = read_text_files("packages", "docs", "data")
        if not corpus:
            self.skipTest("PENDING: no packages/, docs/ or data/ content to read yet")
        if not re.search(r"threshold", corpus, re.IGNORECASE):
            self.skipTest("PENDING: no threshold declaration found yet")
        declared: list[float] = []
        for match in re.finditer(
            r"\"?thresholds?\"?\s*[:=]\s*\{([^}]{0,300})\}", corpus, re.IGNORECASE
        ):
            declared.extend(float(n) for n in re.findall(r"(?<![\d.])(\d\.\d+)(?![\d.])", match.group(1)))
        if declared:
            self.assertEqual(
                [0.7, 0.9],
                sorted(declared),
                "QA-C05: thresholds must be 0.90 (auto-suggest) and 0.70 (review) per god's "
                f"brief. Declared: {sorted(declared)}",
            )
        else:
            self.assertRegex(corpus, r"0\.9|0\.90", "QA-C05: the 0.90 match threshold is absent")
            self.assertRegex(corpus, r"0\.7|0\.70", "QA-C05: the 0.70 review threshold is absent")

    def test_qa_c06_exactly_five_exports(self) -> None:
        require_dirs(self, "packages", "docs")
        corpus = read_text_files("packages", "docs", "services")
        if not corpus:
            self.skipTest("PENDING: no contracts, docs or services to read yet")
        lowered = corpus.lower()
        missing = [name for name in FIVE_EXPORTS if name.lower() not in lowered]
        self.assertEqual(
            [],
            missing,
            "QA-C06: these five god-approved exports are not named in contracts, docs or "
            "services: " + ", ".join(missing),
        )
        slug_pattern = re.compile(
            r"(schedule[_-]?variance|verification[_-]?audit|match[_-]?quality|delay[_-]?register|discipline[_-]?progress)"
        )
        for directory in ("packages", "services", "docs"):
            for path in sorted((REPO_ROOT / directory).rglob("*")):
                if path.suffix not in {".json", ".ts", ".tsx", ".py", ".md", ".yaml", ".yml"}:
                    continue
                if "node_modules" in path.parts or ".codex" in path.parts:
                    continue
                try:
                    text = path.read_text(errors="replace")
                except OSError:
                    continue
                if slug_pattern.search(text) and "report" in text.lower():
                    slugs = {m.group(1).replace("-", "_") for m in slug_pattern.finditer(text)}
                    if len(slugs) >= 3:
                        self.assertEqual(
                            len(FIVE_EXPORTS),
                            len(slugs),
                            f"QA-C06: {path.relative_to(REPO_ROOT).as_posix()} declares "
                            f"{len(slugs)} report identifiers {sorted(slugs)}; exactly five "
                            "are approved. A sixth report fails as loudly as a missing one.",
                        )

    def test_qa_c07_demo_data_is_deterministic(self) -> None:
        require_dirs(self, "data")
        files = iter_source_files("data")
        if not files:
            self.skipTest("PENDING: data/ has no generator source yet")
        offenders = [
            f"{p.relative_to(REPO_ROOT).as_posix()}: {m.pattern}"
            for p in files
            for line in p.read_text(errors="replace").splitlines()
            for m in NONDETERMINISM_MARKERS
            if m.search(line)
        ]
        self.assertEqual(
            [],
            offenders,
            "QA-C07: synthetic demo data must be deterministic (board: 'deterministic "
            "synthetic data', and a demo reset must reproduce the same run). Found "
            "wall-clock/random sources: " + "; ".join(offenders),
        )

    def test_qa_c08_audit_chain_is_storable_and_verifiable(self) -> None:
        require_dirs(self, "contracts")
        corpus = read_text_files("packages", "docs")
        if not corpus:
            self.skipTest("PENDING: no packages/ or docs/ content to read yet")
        lowered = corpus.lower()
        has_link = "prev_hash" in lowered or "previous_hash" in lowered or "parent_hash" in lowered
        has_verify = (
            VERIFY_THEN_SUBJECT.search(corpus) is not None
            or SUBJECT_THEN_VERIFY.search(corpus) is not None
        )
        if not has_link and not has_verify:
            self.skipTest(
                "PENDING: no audit-chain link field or verify entry point declared yet; "
                "check activates once the audit contract lands"
            )
        self.assertTrue(
            has_link,
            "QA-C08: the audit chain has no back-link field (prev_hash/previous_hash/"
            "parent_hash). A chain without links is a log, not a tamper-evident trail.",
        )
        self.assertTrue(
            has_verify,
            "QA-C08: no chain/audit verification entry point is declared. The chain must be "
            "verifiable against the database, not against an in-process copy.",
        )

    def test_qa_c09_every_signal_is_explainable(self) -> None:
        require_dirs(self, "contracts")
        corpus = read_text_files("packages", "docs")
        if not corpus:
            self.skipTest("PENDING: no packages/ or docs/ content to read yet")
        lowered = corpus.lower()
        if "explanation" not in lowered and "explainab" not in lowered:
            self.skipTest("PENDING: no explainability field declared yet")
        missing = [s for s in FIVE_SIGNALS if s not in lowered.replace("-", "_")]
        self.assertEqual(
            [],
            missing,
            "QA-C09: explainability is first-class (recovered invariant). These signals "
            "have no per-signal explanation in contracts/docs: " + ", ".join(missing),
        )
        optional = re.findall(r"(explanation[s]?\??\s*[:=]\s*(?:true|True|None|null))", corpus)
        self.assertEqual(
            [],
            optional,
            "QA-C09: an explanation field is declared optional/null. Every candidate must "
            "carry its explanation.",
        )


if __name__ == "__main__":
    unittest.main()
