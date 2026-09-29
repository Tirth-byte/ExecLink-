# Architecture

## Boundaries

`apps/field` captures evidence; `apps/web` is the planner control centre; `services/api` owns identity, authorization, persistence, state transitions, actuals, reports, and the database-backed audit chain; `services/intelligence` owns extraction and candidate ranking. `packages/contracts` is the integration authority.

The API is the sole writer to system-of-record tables. Intelligence is a pure proposal service: its input is an event plus a read-only schedule snapshot, and its output is a versioned `MatchProposal`. It has no actual-progress write capability.

```text
Field ──submit/retry──> API ──event + snapshot──> Intelligence
                          <──proposal─────────────┘
Web ──review/verify──> API ──transaction──> verification + actual + audit
Web <──queries/events── API ──outbox/SSE──> dashboard refresh
```

## Reliability rules

- Every command carries `Idempotency-Key`; the server persists key, actor, route, request hash, response, and status atomically.
- Verification locks proposal and activity, validates state/role, writes verification and actual, appends audit, and emits outbox event in one transaction.
- Consumers are at-least-once and deduplicate by event ID. Timestamps are UTC RFC 3339; IDs are opaque stable strings.
- Ranking is deterministic for a fixed `engineVersion`, `configVersion`, input event, and schedule snapshot. Tie-break: score descending, then activity WBS ascending, then activity ID ascending.
- If semantic/LLM infrastructure is unavailable, deterministic lexical/synonym scoring runs with the same response contract and declares `mode: deterministic_fallback`.
- Audit entries form a SHA-256 chain; verification recomputes from persisted rows.

## Canonicalization and hashing

Three subsystems must produce byte-identical digests for the same logical value: `services/api` (Python) writes the chain, `apps/field` (Dart) computes idempotency fingerprints, and QA verifies both. They agree through one spec, not three implementations that happen to match.

`packages/contracts/src/canonical.ts` is the normative reference. The committed vectors in `data/spec/canonicalization-vectors.json` are generated from it (`npm run vectors`) and re-verified on every `npm test`.

**Canonical JSON.** Object keys sorted ascending by code point (identical to UTF-8 byte order, which is what Python's `sorted()`, Dart's `compareTo` and JavaScript's default sort all agree on for ASCII keys). No insignificant whitespace. Arrays keep their order. Three normalizations are mandatory because each has been observed to diverge between languages:

- an integral number never carries a decimal point, so `45` and `45.0` are one value — otherwise a legitimate field retry hashes differently in Python and Dart and returns a spurious `409 IDEMPOTENCY_CONFLICT`;
- negative zero normalizes to `0`;
- an exponent has no `+` and no leading zero, so `1e-7` never becomes Python's `1e-07`.

Strings use `\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, then `\u00XX` for the remaining C0 controls; all other characters, including non-ASCII, are emitted literally as UTF-8. Digests are taken over UTF-8 bytes, so escaping non-ASCII to `\uXXXX` would make the digest depend on the writer's choice of escape form.

**Audit chain.** `entry_hash = SHA-256(utf8(canonical_json(entry_body)))`, where `entry_body` is exactly `sequence`, `projectId`, `occurredAt`, `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `requestId`, `payload`, `previousHash`.

Naming is deliberate and differs by layer, which is worth stating once because guessing wrong here invalidates every stored digest: the **canonical JSON and the JSON Schema use camelCase** (`previousHash`, `entryHash`), matching the wire contract, while the **SQL columns are snake_case** (`previous_hash`, `entry_hash`). The digest is taken over the JSON member names; the column names are never hashed. Lowercase hex, 64 characters. `previous_hash` is the prior `entry_hash`, or 64 zeros at `sequence` 1. It is **inside** the hashed body: hashing without the link would let an entry's predecessor be rewritten undetected, which is the whole point of a chain.

Verification reads persisted rows and applies two independent checks — `sequence` contiguous from 1, `previousHash` equal to the prior `entryHash`, and each stored `entry_hash` equal to the digest recomputed from that row's body. The link check alone is defeated by rewriting a whole suffix of the chain; the digest check alone is defeated by a forged standalone entry.

**Idempotency.** `request_hash = SHA-256(utf8(canonical_json({ method, path, body })))`, with `method` uppercased and `path` fully resolved (`/projects/PRJ-1/proposals/MPR-1/verify`, not the template), so the same key replayed against a different resource is a different command. An absent body is `{}`, never `null`.

Changing canonical output invalidates every stored digest. That is a breaking change: bump `canonical-json-v1` and migrate or invalidate existing chains. A chain that no longer recomputes is, to a verifier, indistinguishable from a tampered one.

## Security

Authentication failure or unknown user is `401`; an authenticated role lacking permission is `403`. Project membership is checked on every resource. Attachments use signed upload/download URLs, are malware-scanned, and expose metadata rather than storage credentials.
