# ExecLink QA — acceptance plan and contract checks

Owner: QA (`qa-muhy3b1c`). Scope: inspection and tests. QA does not implement
subsystem behaviour; where a check fails, QA reports it and the owning agent fixes it.

**Authority.** This plan derives from `hive/board.md` (golden slice, ownership,
source of truth), the recovered invariants in
`hive/agents/qa-muhy3b1c/acceptance-contract.md`, and god's Phase 1 brief. Where
this file and an owning subsystem disagree, `docs/**` + `packages/contracts/**`
are integration authority and god arbitrates.

## How to run

```
python3 qa/run_checks.py
```

Zero dependencies — Python 3 standard library only, because the product installs
nothing yet. The checks are plain `unittest.TestCase` classes, so once the
product installs pytest they are collected by `pytest qa/` unchanged.

The runner prints one line per check plus a summary that separates:

- `PASS` — the check ran and held.
- `PENDING` — the check is registered but its subject does not exist yet. It is
  reported as skipped, never as a pass. A pending check **auto-activates** the
  moment its artifact lands; no QA edit is required.
- `FAIL` — a real defect. See `qa/defects.md`.

Exit code is non-zero on any `FAIL`. Pending checks never fail the build.

## Canonical layout (god-confirmed)

| Path | Owner | QA may read | QA may write |
| --- | --- | --- | --- |
| `services/api/**` | API | yes | no |
| `services/intelligence/**` | Intel | yes | no |
| `apps/web/**` | Web | yes | no |
| `apps/field/**` | Field | yes | no |
| `docs/**`, `packages/**`, `data/**` | Foundation | yes | no |
| `qa/**` | QA | yes | yes |

`backend/` is **not** canonical. A prior implementation used it; QA fails its
return (QA-B01) so the layout decision cannot silently regress.

## The three rules that outrank everything else

From `board.md` and god's brief. These are encoded as *structural* checks
because the two most dangerous ones fail silently — they corrupt data without
raising an error, so a passing test suite can still mean a corrupt database.

1. **Matching proposes; it never mutates schedule actuals.** Only authorized
   planner verification may create a verified match and an actual-progress
   update. Encoded in QA-S01 (intel) and QA-S02 (field).
2. **Field submits proposals only.** Field never writes actuals. QA-S02.
3. **Auditability is cryptographic and verified in the database**, not against
   an in-process copy. Runtime check QA-R02; schema groundwork QA-C08.

## Golden slice coverage

The slice from `board.md`, stage by stage. `static` = checked now by reading
source or contracts. `runtime` = needs a running service or database.

| # | Stage | Check | Status |
| --- | --- | --- | --- |
| 1 | baseline schedule | QA-C07 synthetic data is deterministic | PENDING `data/**` |
| 2 | event capture | QA-C03 ingest contract matches capture contract | PENDING `packages/contracts` |
| 3 | deterministic extraction | QA-R05 extraction is deterministic | PENDING `services/intelligence` |
| 4 | candidate ranking | QA-R06 five signals + QA-R07 deterministic tie-breaker | PENDING `services/intelligence` |
| 5 | explainable review | QA-C09 every candidate carries per-signal explanation | PENDING `packages/contracts` |
| 6 | planner approval | QA-R03 no approve-after-reject | PENDING `services/api` |
| 7 | actual update | QA-S01 + QA-S03 only the API verifier writes actuals | static, active |
| 8 | dashboard refresh | QA-R08 dashboard reflects only verified matches | PENDING `apps/web` |
| 9 | audit trace | QA-R02 chain verifies against the database | PENDING `services/api` |

## Check register

### Static / contract checks (run now, path-aware)

| ID | Check | Fails when | Status |
| --- | --- | --- | --- |
| QA-B01 | `backend/` must not reappear | legacy layout path exists | RUNNABLE |
| QA-B02 | no actual-progress write under `apps/web` | web source writes actuals | RUNNABLE |
| QA-B05 | the plan still covers every recovered invariant | a recovered test name or check ID is missing from this file | RUNNABLE |
| QA-B06 | the plan names all five exports | an approved export is unmentioned | RUNNABLE |
| QA-B07 | the non-mutation guard is itself proven | guard misses a real mutation or flags legitimate code | RUNNABLE |
| QA-B08 | every exception carries a real justification | an entry has no reason, or the file has trailing junk | RUNNABLE |
| QA-B09 | line-scoped exceptions are still needed | an excepted line was deleted, widened, or moved | RUNNABLE |
| QA-S01 | `services/intelligence` never writes actuals | any high-confidence write to an actual-progress field | RUNNABLE |
| QA-S02 | `apps/field` never writes actuals | any high-confidence write to an actual-progress field | RUNNABLE |
| QA-S03 | actuals writes in `services/api` happen only in an authorization-gated verification path | an actuals write sits outside a file calling `require_role`/`membership`/`authorize` and is not excepted | RUNNABLE |
| QA-C01 | canonical layout exists | any foundation-owned canonical path missing | RUNNABLE |
| QA-C02 | required docs present and non-stub | any required `docs/*.md` missing or under 200 chars | RUNNABLE |
| QA-C03 | contract artifacts parse and are shaped like contracts | invalid JSON, or a contract with no schema marker | RUNNABLE |
| QA-C04 | matching weights are 40/20/15/10/10/5 and sum to 100 (or the same vector as fractions) | weights differ, or do not sum correctly | RUNNABLE |
| QA-C05 | thresholds 0.90 / 0.70 present and overridable | thresholds absent, or a declared set that is not exactly {0.90, 0.70} | RUNNABLE |
| QA-C06 | exactly five exports, exact names | export set is not exactly the five approved reports | RUNNABLE |
| QA-C07 | synthetic demo data is deterministic | generator uses wall-clock or unseeded random | RUNNABLE |
| QA-C08 | audit chain is storable and verifiable | no back-link field, or no verification affordance | RUNNABLE |
| QA-C09 | every signal is explainable | a signal has no explanation, or an explanation is optional | RUNNABLE |

The five exports are fixed by god: **Schedule Variance, Verification Audit,
Match Quality, Delay Register, Discipline Progress.** "Exactly five" is
asserted as a set equality, so a sixth report fails just as loudly as a missing
one.

### Runtime checks (executed against the real services)

| ID | Check | Recovered invariant | Status |
| --- | --- | --- | --- |
| QA-R01 | matching never mutates actuals, end to end | `test_security_invariant_matching_engine_never_mutates_actuals` | RUNNABLE |
| QA-R02 | audit chain verifies **against the database**, and detects a row mutated in place | `test_audit_chain_tamper_detection_in_database` | RUNNABLE |
| QA-R03 | no transition from rejected to approved, any role, any ordering | `test_state_transition_cannot_approve_rejected` | RUNNABLE |
| QA-R04 | authz matrix: supervisor 403, invalid user 401, planner allowed | `test_supervisor_cannot_verify_match_403_forbidden`, `test_invalid_user_id_returns_401`, `test_planner_role_authorized` | RUNNABLE |
| QA-R05 | extraction is deterministic for identical input | `test_explainable_matching_engine_specification` | RUNNABLE |
| QA-R06 | five signals: asset exact, discipline near-miss not equal, location **overlap**, text similarity, work-type synonyms | `test_matching_*` (5 tests) | RUNNABLE |
| QA-R07 | ranking tie-breaker is stable and total | `test_candidate_ranking_deterministic_tie_breaker` | RUNNABLE |
| QA-R08 | progress advances to 100% and never exceeds it | `test_progress_advance_to_100_percent`, `test_progress_semantics_and_regression_protection` | RUNNABLE |
| QA-R09 | duplicate approval and client retry are idempotent | `test_idempotent_duplicate_approval`, `test_client_idempotency_duplicate_protection` | RUNNABLE |
| QA-R10 | all five exports actually export | `test_all_five_reports_export_verification` | RUNNABLE |
| QA-R11 | golden slice end to end, with an audit trace per transition | `test_master_golden_end_to_end_demonstration`, `test_golden_workflow_end_to_end_reality_check` | RUNNABLE |

QA-R01–R04, R10, and R11 are asserted directly by QA against a temporary
SQLite database. QA-R05–R09 are asserted by the owning subsystem's own suite
and are **gated rather than reimplemented** by QA-V01, which runs those suites
and fails if a test disappears. Duplicating them would give two answers to one
question; gating them keeps the owning team responsible for the behaviour while
making a silent deletion impossible.

### Phase 4 integration checks (QA-V*, ELN-11)

These run the assembled product. They are the checks that would have caught the
web app passing its own fixtures while never touching the API.

| ID | Check | Fails when | Status |
| --- | --- | --- | --- |
| QA-V01 | golden path stays green and cannot be silently shrunk | either product suite fails, runs zero tests, drops below its recorded floor, or `npm run validate`/`typecheck` fails | RUNNABLE |
| QA-V02 | Demo Reset is deterministic and restores the exact starting state | two resets differ, or a mutated database is not restored byte-for-byte | RUNNABLE |
| QA-V03 | Demo Reset works as one documented command | `python3 -m services.api.verification_seed` fails or disagrees with the in-process reset | RUNNABLE |
| QA-V04 | web verification mutates the API, not local state | the approve handler updates React state only, or no API verify call is reachable from a component | RUNNABLE |
| QA-V05 | the web idempotency key is stable across retries | the key is derived from the clock or randomness, so a retry double-applies | RUNNABLE |
| QA-V06 | every web screen is reachable and renders a view | a nav item has no rendered view, or a view has no nav item | RUNNABLE |
| QA-V07 | web has genuine loading, empty, and error states | no state component, no loading branch, no empty message, or no error path at all | RUNNABLE |
| QA-V08 | Field parses and submits proposals without touching actuals | too few extraction patterns, no structured confidence/location, nothing posted to `/events`, or an actuals/verify endpoint referenced | RUNNABLE |
| QA-V09 | the five report identities agree across API, web, and contracts | any layer's report set differs from the approved five | RUNNABLE |
| QA-V10 | analytical and project-memory endpoints stay read-only on actuals | such an endpoint uses a write verb | PENDING — no such endpoint yet; auto-activates when one lands |
| QA-V11 | a failed verification never claims success | the failure path marks the activity verified, advances progress, invents an audit sequence, or shows a success message | RUNNABLE |
| QA-V12 | the browser never synthesises an audit number | an audit number is computed with `+ 1`, taken from a `\|\|` fallback, seeded from a literal, or predicted before verification | RUNNABLE |
| QA-V13 | QA-V10's detection and enforcement actually work | the route parser misses an analytics/memory route, or misses a write verb on one | RUNNABLE |

QA-V04 and QA-V07 both passed while the web app still faked a successful audit
from its `catch` block, so QA-V11 exists because of that: a failure path that
reports success defeats the whole point of an auditable verification. Its
message test ignores strings carrying failure wording ("not verified", "nothing
was verified", "audit unchanged") so a correct implementation passes.

QA-V12 and QA-V13 exist for the same reason. God ruled that no displayed audit
number may be synthesised anywhere, and QA-V12 enforces it against every
synthesis shape found in the real code: `res.auditSequence || auditSequence + 1`
in state and in the toast, `Committed to audit #{initialDemoState.auditSequence + 1}`
predicted *before* any verification, `useState(1841)` as the starting sequence,
and `state.auditSequence + 1` inside the leftover demo mutation helper. It is
self-tested in both directions: seven correct implementations (server value
passed through, `??` to null, conditional render, comments) stay clean, and five
synthesising ones are caught. QA-V13 exists because QA-V10 must not stay quietly
pending when the API lands the endpoints — god was explicit that Phase 4 must not
close with a pending check — so the route parser is proven against synthetic
route text to show it will activate and will catch a write verb.

QA-V01's floors are a floor, not a target: a suite that gains tests is fine, and
a suite that loses one fails, because a shrinking suite is how a regression gets
hidden rather than reported.


## Recovered invariant coverage (all 23)

The 23 test names recovered from `.pytest_cache/v/cache/nodeids` (a prior
implementation, 23 not 24 — corrected) each map to at least one check. QA-B05
fails if a row is ever dropped from this table, so coverage cannot quietly shrink.

| Recovered test name | Checks |
| --- | --- |
| `test_security_invariant_matching_engine_never_mutates_actuals` | QA-S01, QA-R01 |
| `test_golden_workflow_proves_non_mutation_sequence` | QA-R01, QA-R11 |
| `test_match_rejection_leaves_actual_progress_unchanged` | QA-S01, QA-R01, QA-R03 |
| `test_tamper_evident_audit_trail_cryptographic_integrity` | QA-R02 |
| `test_audit_chain_tamper_detection_in_database` | QA-R02, QA-C08 |
| `test_idempotent_duplicate_approval` | QA-R09 |
| `test_client_idempotency_duplicate_protection` | QA-R09 |
| `test_state_transition_cannot_approve_rejected` | QA-R03 |
| `test_supervisor_cannot_verify_match_403_forbidden` | QA-R04 |
| `test_planner_role_authorized` | QA-R04 |
| `test_invalid_user_id_returns_401` | QA-R04 |
| `test_matching_asset_exact_and_different` | QA-R06 |
| `test_matching_discipline_exact_and_interface` | QA-R06 |
| `test_matching_location_overlap` | QA-R06 |
| `test_matching_text_similarity` | QA-R06 |
| `test_matching_work_type_synonyms` | QA-R06 |
| `test_candidate_ranking_deterministic_tie_breaker` | QA-R07 |
| `test_progress_semantics_and_regression_protection` | QA-R08 |
| `test_progress_advance_to_100_percent` | QA-R08 |
| `test_all_five_reports_export_verification` | QA-C06, QA-R10 |
| `test_golden_workflow_end_to_end_reality_check` | QA-R11 |
| `test_master_golden_end_to_end_demonstration` | QA-R11 |
| `test_explainable_matching_engine_specification` | QA-R05, QA-C09 |

The prior suite was five files — `test_backend.py`, `test_csv_reports_export.py`,
`test_domain_contracts.py`, `test_golden_workflow.py`,
`test_sih_golden_master.py`. `test_csv_reports_export.py` is the only evidence
of an export *format*: CSV. QA-R10 checks that each of the five reports actually
produces a non-empty export; the format itself is still unconfirmed, so QA
accepts CSV or an explicitly documented equivalent and reports the ambiguity
rather than failing on it.

## Non-mutation guard: how QA-S01/S02 decide

A static guard is the only thing that can protect invariant #1 before the
runtime tests exist, so it errs toward **high confidence only**. It reports a
violation when it finds one of these in a source file under a guarded path:

- an assignment whose target is an actual-progress field
  (`actual_progress = 0`, `task.actual_finish = ...`, `task["actual_start"] = ...`)
- `setattr(obj, "actual_...", ...)`
- an `.update(`, `.create(`, `.insert(`, `.save(`, `.upsert(` call on a line that
  names an actual-progress field
- SQL `UPDATE` / `INSERT` / `DELETE` against a table whose name is an
  actual-progress table

It deliberately does **not** flag schema or type declarations (`Column(...)`,
`mapped_column(...)`, dataclass and Pydantic field definitions), nor comparisons
(`actual_progress == 0`), because those describe the shape of the data rather
than a mutation of it. A guard that cries wolf on legitimate code gets disabled,
and a disabled guard protects nothing.

Guarded paths: `services/intelligence/**`, `apps/field/**`, `apps/web/**`.
Allowed writer: `services/api/**`, and only on the authorized verification path
(QA-S03).

**QA-B07 proves the guard.** An unproven guard protects nothing. So the guard is
itself tested against fixtures in a temp directory: it must flag 11 real mutation
forms (plain and attribute assignment, subscript, `setattr`, ORM
`update`/`create`/`upsert`, SQL `UPDATE`/`INSERT`, camelCase, across
`.py`/`.ts`/`.tsx`/`.js`/`.dart`/`.sql`) and must stay quiet on the legitimate
corpus: comparisons, function defaults, keyword pass-through of a read value,
`Column`/`mapped_column`/`Field` declarations, TS interface fields, comments,
prose, `.get()`, `sorted(key=...)`, and the exact JSX and Dart UI copy that
earlier versions of the guard flagged by mistake.

Known gap, covered by runtime QA-R01 instead: `db.add(Model(actual_progress=…))`
on a line with no write verb is not flagged statically.

### Exceptions

If a guarded file legitimately needs an actual-progress write, add a line to
`qa/non_mutation_exceptions.txt`:

```
relative/path.ext :: reason
relative/path.ext :: 12, 40-43 :: reason
```

Omit the line spec to exempt the whole file; supply one to exempt only those
lines, so a reviewed exception stays as narrow as the evidence that justified it.
**QA-B08** fails on an entry with no reason, and **QA-B09** fails when an
excepted line has been deleted, moved, or widened — so an exception cannot rot
into a permanent hole. There is currently one exception:
`services/api/verification_seed.py:33`, the deterministic demo reset.


## Defect reporting

Format and live log: `qa/defects.md`. Every entry carries severity, subsystem,
repro, expected, actual, cause, status. Severity ladder:

- **S1** — data corruption or a silent invariant violation (actuals mutated by
  a non-authorized writer, audit chain not verifying against the database).
- **S2** — broken contract or authorization hole (wrong status code, missing
  idempotency, approve-after-reject reachable).
- **S3** — determinism or explainability gap, wrong output.
- **S4** — cosmetic, docs, ergonomics.

## What QA is deliberately not doing yet

- Not writing product or subsystem tests inside `services/**` or `apps/**` —
  that is implementation work in someone else's owned path. QA files live in
  `qa/**` only. Where a subsystem's own suite already proves an invariant, QA
  gates that suite (QA-V01) rather than restating the assertion in its own words.
- Not claiming coverage for any pending check. A pending check is a promise, not
  a pass.
- Not treating the recovered test names as gospel where god's brief and the
  board disagree. The board wins; QA notes the conflict. The recovered count is
  23, and QA-B05 fails if this file ever drops one of them.
- Not running a browser. Web checks assert the wiring in source — that the nav
  maps to rendered views, that the mutation path calls the API, that loading,
  empty, and error branches exist. What a screen *looks* when rendered is the
  web owner's judgement, not a static invariant.

