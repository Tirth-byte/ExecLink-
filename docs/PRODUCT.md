# Product contract

ExecLink gives infrastructure project teams a trustworthy bridge between field evidence and the detailed schedule. A supervisor can capture what happened in seconds; the system structures the evidence and proposes likely L5/L6 activities; a planner reviews the evidence and explanation before any actual changes.

## Phase 1 users and outcomes

- **Supervisor:** records text, voice transcript, quantity, location, asset, photos, and observation time; submits an event; can see its review status. Cannot verify or update actuals.
- **Planner:** reviews ranked candidates and signal-level explanations; verifies or rejects a proposal; may confirm the proposed progress value. Cannot approve a rejected proposal.
- **Project manager/viewer:** sees progress, exceptions, and reports; cannot mutate planning records.
- **Admin:** manages membership/configuration but receives no implicit planner authority.

## Golden slice

Baseline schedule → field event → deterministic extraction → ranked proposal → explainable planner review → idempotent verification → actual update → dashboard/report refresh → audit-chain verification.

Success means this path is reproducible from checked-in fixtures, proposal generation never changes actuals, all writes are attributable, retries are safe, and every ranking can be reconstructed from versioned inputs and configuration.

## Phase 1 scope

Included: one project, L5/L6 activities, event capture, deterministic fallback extraction and ranking, review, verified progress, audit trail, dashboard summaries, a per-day DPR derived from verified actuals, and exactly five export types: Schedule Variance, Verification Audit, Match Quality, Delay Register, and Discipline Progress.

Excluded: autonomous approval, generative schedule changes, resource/cost optimisation, cross-project learning, and offline conflict merging beyond idempotent replay.

## Progress rules

Progress is 0–100 inclusive. A normal verification cannot regress an activity or exceed 100. Corrections require a separate planner-only correction command with reason and audit record; they never masquerade as matching. Quantities retain unit and source evidence.
