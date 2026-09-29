# ExecLink QA — defect log

Owner: QA (`qa-muhy3b1c`). Append newest at the bottom of each severity block.
Every entry carries: severity, subsystem, repro, expected, actual, cause, status.

**Severity ladder**

- **S1** — data corruption or silent invariant violation (a non-authorized
  writer mutating actuals; audit chain not verifying against the database).
- **S2** — broken contract or authorization hole (wrong status code, missing
  idempotency, approve-after-reject reachable).
- **S3** — determinism or explainability gap, incorrect output.
- **S4** — cosmetic, docs, ergonomics.

**Status values** — `open`, `acknowledged`, `fixed-unverified`, `verified`,
`wontfix`, `invalid`.

## S1 — data corruption / silent invariant violation

_None yet._

## S2 — contract or authorization

### QA-001 — foundation's five exports contradict god's five exports

- severity: S2
- subsystem: foundation (docs/PRODUCT.md, docs/DEMO_FLOW.md) → blocks API, Web
- found: 2026-09-26 by qa-muhy3b1c
- check: QA-C06 (`python3 qa/run_checks.py QA-C06`)
- repro:
  1. `python3 qa/run_checks.py QA-C06`
  2. compare `docs/PRODUCT.md:20` and `docs/DEMO_FLOW.md:15` with the list in QA's Phase 1 brief
- expected: exactly five exports named **Schedule Variance, Verification Audit,
  Match Quality, Delay Register, Discipline Progress** (god's Phase 1 brief, which
  QA received as the authoritative enumeration)
- actual: foundation declares "exactly five export types: progress status,
  variance, unmatched events, verification history, and daily progress report"
  (`docs/PRODUCT.md:20`; same five at `docs/DEMO_FLOW.md:15`, "progress status,
  variance, unmatched events, verification history, and DPR")
- cause: foundation appears not to have received the enumeration, and inferred the
  report set from the product brief's own words. Only "variance" and (if DPR means
  Discipline Progress Report) "DPR" line up; god's **Match Quality** and **Delay
  Register** are absent, while foundation's **progress status** and **unmatched
  events** have no counterpart in the approved list. Note the board's phase 4 says
  "bulk DPR", which is the likely source of the DPR reading — ambiguous either way.
- impact: `services/api` report endpoints and the `apps/web` report views will be
  built against the wrong names. This is cheap to fix now and expensive after
  API and Web implement against it.
- status: **verified** — resolved. God arbitrated; foundation corrected all three
  docs to the god-approved list. `docs/API_CONTRACT.md:17`,
  `docs/DEMO_FLOW.md:15` and `docs/PRODUCT.md:20` now read Schedule Variance,
  Verification Audit, Match Quality, Delay Register, Discipline Progress.
  QA-C06 passes. Closed at the contract layer, before API or Web built against
  the wrong names.

### QA-002 — web "Verify & update actual" fakes an audited verification

- severity: S2 (would be S1 if a real audit were expected to exist afterwards)
- subsystem: web (`apps/web/components/control-center.tsx`, `apps/web/lib/demo-api.ts`)
- found: 2026-09-26 by qa-muhy3b1c, during ELN-11
- check: QA-V04, QA-V05 (`python3 qa/run_checks.py QA-V04 QA-V05`)
- repro:
  1. `python3 qa/run_checks.py QA-V04`
  2. read `approve()` in `apps/web/components/control-center.tsx`
  3. note the only `fetch` in the whole web app is at `apps/web/lib/demo-api.ts:17`,
     inside `verifyMatchOnline`, which no component imports
- expected: the "Verify & update actual" control calls
  `POST /api/v1/projects/{projectId}/proposals/{proposalId}/verify` with a planner
  token and an `Idempotency-Key`, and the confirmation reflects the verification id
  and audit sequence the server returns.
- actual: `approve()` runs
  `setDemo(current => verifyDemoMatch(current, progress))` — a local React state
  update. Nothing is persisted. The UI then shows a success toast reading
  "Progress verified · ACT-1.2.1 updated to 45% · Audit #1842", where `#1842` is
  `initialDemoState.auditSequence + 1`, a value invented in the browser. The real
  client `verifyMatchOnline` exists and is correct, but is dead code: no component
  imports it, and `next.config.ts` defines no `/api` proxy, so nothing else reaches
  the API either.
- cause: web was built breadth-first against fixtures in `apps/web/lib/demo-data.ts`.
  Every screen renders fixture data, so the app is internally consistent and looks
  complete while being entirely disconnected from `services/api`. The board's
  delivery order ("integrate the golden slice before breadth") was not followed.
- impact: god's ELN-11 target "real verification mutation" is not met, and the
  demo asserts an audit outcome that does not exist. This is the most damaging kind
  of demo defect for this product: the whole thesis is that an actual changes only
  through a recorded verification, and the flagship screen shows the opposite.
- status: **verified** — resolved by the web owner during this same pass.
  `approve()` is now `async` and calls
  `verifyMatchOnline("PRJ-METRO-001", "MPR-DEMO-001", "ACT-1.2.1", progress, 1)`
  against the real endpoint, and the toast reports the server's audit sequence.
  QA-V04 and QA-V05 pass.
- follow-up found while verifying the fix: the first version of the fix caught the
  API error and then *still* set verified, advanced progress, bumped the audit
  sequence, and showed "Progress verified (demo)". That relocated the defect into
  the error path rather than removing it, and it passed QA-V04 and QA-V07, so QA
  added **QA-V11** to assert a failure never claims success. The web owner then
  removed the fallback; the catch block now only sets
  `Verification failed: <reason>. Activity remains unverified.`
- residual, not logged as a defect: the success path reads
  `res.auditSequence || auditSequence + 1`, so a successful response missing
  `auditSequence` would still display an invented number. The API does return the
  field; worth tightening when the web owner next touches this line.

### QA-006 — the browser synthesises audit numbers in four places

- severity: S2 — god ruled this the same class as QA-002
- subsystem: web (`apps/web/components/control-center.tsx`, `apps/web/lib/demo-api.ts`)
- found: 2026-09-26 by qa-muhy3b1c, after god promoted the residual QA had declined to log
- check: QA-V12 (`python3 qa/run_checks.py QA-V12`)
- owner: `web-muhxiixi`
- expected: an audit number is a fact about the persisted hash chain, so it is
  displayed only when the server supplied it, and nothing is displayed otherwise.
- actual, four synthesis sites plus a dead helper:
  1. `control-center.tsx:79` — `useState(1841)` seeds the audit sequence from a
     literal. The real chain starts at **1**: `audit.py` assigns
     `previous + 1` and `1` for the first entry, and a freshly seeded demo
     database contains **zero** audit entries. So the Audit screen opens on a
     number the server contradicts, before anything is verified.
  2. `control-center.tsx:100` — `setAuditSequence(res.auditSequence || auditSequence + 1)`
  3. `control-center.tsx:101` — the same fallback rendered in the success toast,
     so the user is shown a synthesised `Audit #N`.
  4. `control-center.tsx:1655` — `Committed to audit #{initialDemoState.auditSequence + 1}`,
     which predicts an audit number *before any verification exists*. This is the
     worst of the four: it asserts a future audit entry that the trail does not
     contain and may never contain.
  5. `demo-api.ts:40` — `state.auditSequence + 1` inside `verifyDemoMatch`, the
     leftover local-only mutation helper from QA-002 that nothing imports now.
- cause: each site independently guards against a missing value, and the natural
  guard in a browser is to invent one. `res.auditSequence` is real whenever the
  API answers, so sites 2 and 3 only misfire on a malformed success; sites 1, 4,
  and 5 misfire on the normal path.
- impact: god's ruling, which QA agrees with: the product claim is that an actual
  changes only through a recorded verification, so no displayed audit number may be
  synthesised anywhere. A predicted "committed to audit #1842" is precisely the
  claim the audit trail exists to make trustworthy.
- requested fix: render nothing when the server did not supply a number. Site 1
  becomes `null` until the API answers, site 4 is deleted rather than predicted,
  and `verifyDemoMatch` is deleted outright now that the real path is wired — a
  helper that mints audit numbers and has no caller is a trap for the next
  reader.
- status: **open**. QA-V12 will pass when no audit number is computed, defaulted,
  or predicted in the browser.

## S3 — determinism / explainability

### QA-003 — web idempotency key is derived from the clock

- severity: S3 while dead code, S2 the moment QA-002 is fixed
- subsystem: web (`apps/web/lib/demo-api.ts:16`)
- found: 2026-09-26 by qa-muhy3b1c
- check: QA-V05 (`python3 qa/run_checks.py QA-V05`)
- expected: a retry of the same approval reuses the same key, so the server
  replays the stored response instead of applying the change twice.
- actual: ``const idempotencyKey = `verify-${proposalId}-${Date.now()}` ``
- cause: the key was built to be unique per click rather than unique per intent.
- impact: harmless today only because the function is never called. It is the last
  thing standing between the web app and a correct integration, so it is logged
  with QA-002 rather than left to be discovered during the fix.
- fix: derive the key from proposal id plus the request body.
- status: **verified** — resolved in the same pass. The key is now
  `` `verify-${proposalId}-${activityId}-${progress}` `` (`apps/web/lib/demo-api.ts:16`),
  stable across retries of the same intent. QA-V05 passes.

### QA-004 — web has no error state

- severity: S3
- subsystem: web (`apps/web/components/control-center.tsx`)
- found: 2026-09-26 by qa-muhy3b1c
- check: QA-V07 (`python3 qa/run_checks.py QA-V07`)
- expected: a failed request surfaces a message to the user.
- actual: the control center defines a shared `StateMessage` component and uses it
  for success and empty states, has two `loading` branches, and one empty-state
  string ("No activities found"), but contains no `catch`, `setError`, or
  `throw new Error` path at all. The only `error` tokens are the CSS class
  `ingestion-error` and a `errors` field in fixture data.
- impact: this is precisely why QA-002 survived review. With no error path, a dead
  or unreachable backend is indistinguishable from a working one — the UI looks
  healthy because it never asks anything. God asked explicitly for
  "empty/loading/error states"; loading and empty are partial, error is absent.
- status: **verified** — resolved in the same pass. The control center now has a
  real failure path: `setError`, a `catch` in the mutation handler, and error
  rendering. QA-V07 passes. Note that QA-V07 passing was necessary but not
  sufficient here — the first fix had a `catch` that set an error and then
  fabricated success anyway, which is why QA-V11 now exists.

## S4 — cosmetic / docs

### QA-005 — web ships 11 screens where the brief said 8

- severity: S4, resolved as a scope question rather than a defect
- subsystem: web (`apps/web/lib/demo-data.ts`, `apps/web/components/control-center.tsx`)
- found: 2026-09-26 by qa-muhy3b1c
- check: QA-V06 passed throughout (every nav item maps to a rendered view), so
  this was never a wiring bug.
- status: **resolved** — god confirmed 11 is canonical and that no screen is to be
  removed. QA-V06 stays a reachability assertion, not a count, which is what QA
  argued for and god endorsed: a count is not an invariant.
- provenance, recorded so the number is not re-litigated: the 8 in ELN-9 were the
  *primary* Phase 4 destinations (01 Overview, 02 Live Execution, 03 Match Review,
  04 Schedule Explorer, 05 Data Ingestion, 06 Verification Center, 07 Analytics,
  08 Project Memory). The Phase 1 list in `demo-data.ts` already carried Overview,
  Live Execution, Match Review, Schedule Explorer, Data Ingestion, Verification,
  Audit Trail, Reports, Settings — which web labels
  `SECONDARY DESTINATIONS: AUDIT TRAIL, REPORTS, SETTINGS`
  (`apps/web/components/control-center.tsx:2042`). 9 Phase 1 + Analytics +
  Project Memory = 11. Verified against the repo: `docs/PRODUCT.md:20` does
  require the audit trail and exactly five export types, and
  `docs/API_CONTRACT.md:17` serves them from
  `GET /projects/{id}/reports/{type}`. Audit Trail and Reports are product
  requirements, not extras, and Settings is a legitimate ninth. **No defect is to
  be raised against the web owner for any of the three.**

## Reviewed exceptions (not defects)

`services/api/verification_seed.py:33` — deterministic demo reset writing the
pre-verification baseline. Ruling: legitimate, not an invariant violation. Full
evidence is recorded inline in `qa/non_mutation_exceptions.txt`, which is the
system of record for these decisions. QA-S03 still fails if that line stops being
the only exempt one (QA-B09).

## Template

```
### QA-001 — <one-line title>

- severity: S1 | S2 | S3 | S4
- subsystem: services/api | services/intelligence | apps/web | apps/field | foundation | cross-cutting
- found: <iso timestamp> by qa-muhy3b1c
- check: QA-R02 (python3 qa/run_checks.py QA-R02)
- repro:
  1. <step>
  2. <step>
  expected: <what the contract requires>
  actual: <what happened, with the observed value>
  cause: <root cause, or "unknown — needs owner">
  status: open
```
