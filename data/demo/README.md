# Demo dataset

`demo-v1` is deterministic and intentionally begins before any verification: actuals are baseline values, all events are `submitted`, and every proposal is still `proposed`. That starting state is what makes the non-mutation rule observable — the demo opens with reality untouched, so any actual that moves later moved because a planner verified it.

Import order is a dependency order, see `generator.mjs`:

1. `project.json` — project, active snapshot pointer, demo users
2. `schedule-activities.json` — L5/L6 activities with baseline actuals
3. `execution-events.json` — three events: high-confidence, ambiguous, unmatched
4. `matching-config.json` — weights, thresholds, tie-breaker, synonym dictionary
5. `match-proposals.json` — the matcher's output for those three events
6. `dpr-percent-complete.json` — the daily report, built from verified actuals only

`dpr-percent-complete.json` is deliberately empty of evidence: nothing is verified yet, so every line has `evidenceEventIds: []` and `lastVerifiedAt: null`. A DPR that showed the pending proposals as progress would be the non-mutation bug, visible in the fixtures.

`generator.mjs` declares the seed version and the import order used by demo reset tooling. It contains no clock and no random input, and `npm test` fails the build if any file under `data/` grows one.

`data/spec/canonicalization-vectors.json` holds the cross-language digest vectors (see `docs/ARCHITECTURE.md`). It lives under `data/spec/` rather than here because it is a specification, not demo state; it is regenerated with `npm run vectors` and re-verified on every `npm test`.
