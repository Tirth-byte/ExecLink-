# Deterministic demo

Reset by clearing application data and importing `data/demo` in filename order: project/users, schedule, events, matching config, proposals. Seed endpoints should accept `seedVersion: demo-v1`; repeated reset produces byte-equivalent domain state apart from operational timestamps.

## Flow 1 — high-confidence verification

Open `EVT-DEMO-001`, captured by supervisor Asha at Pier P12. Show candidate `ACT-1.2.1` and its asset, discipline, location, text, synonym, and temporal contributions. Verify as planner Priya with 45% progress. Refresh dashboard and show one new actual plus a valid audit chain. Replay the request with the same idempotency key and show no duplicate change. Open the `2026-09-26` DPR: `ACT-1.2.1` moves from 30 to 45 and gains the event as evidence, while the untouched `ACT-1.2.2` line does not move.

## Flow 2 — review and reject

Open ambiguous `EVT-DEMO-002`; explain why two candidates are under `.90`. Reject it. Demonstrate unchanged actuals and that a later verification attempt yields `409 INVALID_TRANSITION`.

## Flow 3 — fallback/unmatched

Disable semantic retrieval and submit `EVT-DEMO-003`. Show deterministic fallback mode, stable ordering, below-`.70` unmatched classification, and no actual mutation. Export the five reports: Schedule Variance, Verification Audit, Match Quality, Delay Register, and Discipline Progress.

Before presenting, run `npm test` (typecheck plus contract validation). It also recomputes the canonicalization vectors, so a run that passes has proved the audit chain and idempotency hashes on this machine are the committed ones. Demo accounts are fixture identities, not production credentials. Keep network/model access optional so the entire walkthrough succeeds offline.
