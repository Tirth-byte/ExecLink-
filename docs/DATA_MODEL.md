# Data model

All mutable records have `created_at`, `updated_at`, and an optimistic `version`. Foreign keys include project scope to prevent cross-project references.

| Entity | Key fields | Invariants |
|---|---|---|
| Project | id, name, timezone | timezone is IANA; stored timestamps remain UTC |
| User / Membership | user_id, project_id, role | role is supervisor, planner, viewer, admin |
| ScheduleSnapshot | id, project_id, imported_at, source_hash | immutable; only one active snapshot pointer |
| Activity | id, snapshot_id, wbs, level, name, discipline, work_type, asset_id, location, planned dates/quantity | L5/L6; unique `(snapshot_id,wbs)` |
| ActivityActual | activity_id, progress_percent, actual_quantity, as_of, source_verification_id, version | only verification/correction application writes; progress cannot regress in normal verification |
| ExecutionEvent | id, project_id, reporter_id, observed_at, evidence, extracted_facts, status | client ID enables offline retry; status submitted/proposed/verified/rejected |
| MatchProposal | id, event_id, snapshot_id, engine/config version, candidates, status | candidates immutable; proposed/verified/rejected state machine |
| Verification | id, proposal_id, activity_id, planner_id, decision, progress, reason | unique proposal decision; rejected is terminal |
| IdempotencyRecord | project_id, actor_id, route, key, request_hash, response | same key + different hash is 409 |
| AuditEntry | project_id, sequence, previous_hash, entry_hash, canonical_payload | append-only, unique sequence, verified from database |
| OutboxEvent | id, aggregate, type, payload, published_at | written in source transaction, retry-safe |
| DprPercentComplete | id, project_id, snapshot_id, report_date, status, lines[] | derived from verified actuals only; approval freezes a report and never writes an actual |

## DPR — Daily Progress Report

One report per project per day, holding one line per activity in the active snapshot. Each line carries `planned_percent_at_report_date`, `actual_percent_to_date`, `variance_percent` (actual minus planned, negative is behind) and `delay_days`. A DPR is a **derived reporting artifact**: it is assembled from verified `ActivityActual` rows and is never an input to progress. A proposal awaiting review contributes nothing to it, which is the non-mutation rule expressed in reporting terms.

`variance_percent` and `delay_days` are stored rather than recomputed at export time, so a reissued schedule cannot silently rewrite a historical report. `delay_days` counts calendar days in the project timezone.

Status is `draft` → `submitted` → `approved`, and approval freezes the artifact. It does not create, raise or lower progress: only verification and planner correction may write an actual. Wiring DPR approval into the actual-write path is the specific mistake this note exists to prevent.

**A DPR is not the Discipline Progress report.** They share an acronym and nothing else. Discipline Progress is a discipline-level rollup and is one of the five approved exports; a DPR is per-activity bulk daily data. Conflating them is what produced contract defect QA-001.

## Audit entries

An audit row stores `sequence` and the digest fields described in `ARCHITECTURE.md`. `sequence` is contiguous from 1 per project: a gap is a deletion, which is why verification treats a gap as a failure rather than a tolerable irregularity. The hashed body is exactly the eleven members listed there — not the stored row, and not the row minus its digest.

Location is a normalized interval or polygon reference plus human label. Interval overlap is `max(start) <= min(end)`; equality is not required. Evidence keeps immutable attachment IDs and content hashes. Derived extraction never replaces the raw observation.

Actuals and proposal candidates are deliberately separate aggregates. No foreign-key cascade from proposals may touch actuals.
