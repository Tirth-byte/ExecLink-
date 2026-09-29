# API contract

Base path: `/api/v1`. JSON uses camelCase, UTC RFC 3339 timestamps, and opaque string IDs. Errors are `{ "error": { "code", "message", "requestId", "details" } }`. Commands require `Authorization: Bearer …` and `Idempotency-Key`; repeated identical commands return the original status/body. Same key with a different body returns `409 IDEMPOTENCY_CONFLICT`.

## Endpoints

| Method/path | Role | Result |
|---|---|---|
| POST `/projects/{projectId}/events` | supervisor, planner | `201 ExecutionEvent`; queues extraction |
| GET `/projects/{projectId}/events/{eventId}` | member | event including proposal/review status |
| POST `/projects/{projectId}/events/{eventId}/proposals` | service/planner | `202 MatchProposal`; never writes actuals |
| GET `/projects/{projectId}/proposals/{proposalId}` | member | immutable candidates and explanations |
| POST `/projects/{projectId}/proposals/{proposalId}/verify` | planner | `200 VerificationResult`; transactional actual update |
| POST `/projects/{projectId}/proposals/{proposalId}/reject` | planner | `200`; terminal rejection, no actual update |
| GET `/projects/{projectId}/activities` | member | paged active-snapshot activities/actuals |
| GET `/projects/{projectId}/dashboard` | member | progress and exception aggregates |
| GET `/projects/{projectId}/reports/{type}` | member | CSV or JSON for Schedule Variance, Verification Audit, Match Quality, Delay Register, or Discipline Progress |
| GET `/projects/{projectId}/audit/verify` | planner/admin | persisted-chain verification result |
| GET `/projects/{projectId}/dpr?reportDate=` | member | DPR lines for one day |
| POST `/projects/{projectId}/dpr/{dprId}/submit` | supervisor/planner | freezes the report for approval |
| POST `/projects/{projectId}/dpr/{dprId}/approve` | planner | freezes the artifact; **never** writes an actual |

## Shapes and where they are defined

Types live in `packages/contracts`; the JSON Schemas under `packages/contracts/schemas/` are what non-TypeScript clients implement against. Nothing in this table is defined only here.

- `POST /events` takes `ExecutionEventSubmit`. The reporter is **not** accepted from the client — it is derived from the bearer token, so a field device cannot file evidence as someone else. `clientEventId` is generated on the device before the first attempt and is what makes an offline retry return the original event instead of creating a second one.
- Verify takes `VerifyMatchCommand` and returns `VerificationResult`. Reject takes `{ reason }`.
- Reports are specified column by column, including exact CSV header order, in `packages/contracts/src/reports.ts` — the grain of each report and its edge cases are stated there, because "the report exists" is not a verifiable claim while a header row is.
- DPR takes and returns `DprPercentComplete`. A DPR is built from verified actuals only; a pending proposal never appears in one.
- `RealtimeMessage` is the SSE frame shape; delivery is at-least-once, so consumers deduplicate by `id`.
- Errors are `ApiError`. `401` means the caller could not be identified, `403` means it was identified and is not permitted; the two stay distinct because collapsing them hides authorization bugs.

Verification body is `{ activityId, progressPercent, actualQuantity?, note?, expectedActivityVersion }`. The server ignores any client-supplied actor and derives it from authentication. It returns `401 INVALID_USER`, `403 FORBIDDEN`, `404`, `409 INVALID_TRANSITION|VERSION_CONFLICT|IDEMPOTENCY_CONFLICT`, or `422` for invalid progress.

The verification transaction checks proposal is `proposed`, candidate activity belongs to the pinned snapshot, progress does not regress, and actor is a planner. It then writes verification, activity actual, proposal/event states, audit entries, and outbox event atomically. Reject never writes an actual. Approve-after-reject always returns `409 INVALID_TRANSITION`.

List endpoints use `?cursor=&limit=` (default 50, max 200). Realtime clients consume SSE `/projects/{projectId}/stream`; messages include stable `id`, `type`, `occurredAt`, and contract-versioned `data`.
