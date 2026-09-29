# ExecLink

ExecLink links field evidence to infrastructure schedule activities without allowing automation to rewrite project reality. Phase 1 is a contract-first golden slice: capture an execution event, extract structured facts, rank explainable candidate matches, let an authorised planner verify one, then update actual progress with a complete audit trace.

## Repository map

- `docs/` — product, architecture, API, data, matching, design, and demo authorities.
- `packages/contracts/` — canonical TypeScript contracts and portable JSON Schemas. `src/canonical.ts` is the normative reference for canonical JSON and the audit/idempotency digests.
- `packages/design-tokens/` — shared visual tokens for web and field clients.
- `data/demo/` — deterministic fixtures for schedules, DPRs, and the golden flow.
- `data/spec/` — cross-language canonicalization digest vectors, checked on every test run.
- `apps/` and `services/` — implementations owned by the subsystem teams.

Use Node 20 or newer. `npm test` runs the typecheck and then contract validation; run it before integrating. `npm run vectors` regenerates `data/spec/canonicalization-vectors.json` after an intentional change to the canonical form — a diff there means every stored audit digest is invalidated, so it is a breaking change and not a routine regeneration.

## Local applications

- Approved web application: `apps/web`
- Approved Flutter field application: `apps/field`
- FastAPI system of record: `services/api`
- Matching intelligence: `services/intelligence`

Copy `.env.example` values into your local environment as needed. The web app
uses `NEXT_PUBLIC_API_BASE_URL`; Flutter uses `EXECLINK_API_BASE_URL`; only the
backend may receive `DATABASE_URL` and `EXECLINK_JWT_SECRET`. Start the local API
from this repository with `./scripts/dev.sh` and verify it with
`./scripts/check-dev.sh`.

Reset the local deterministic demo state in one step from the repository root:

```bash
python3 -m services.api.verification_seed --database services/api/execlink.db --seed-version demo-v1
```

Fixtures use stable IDs and timestamps; reset means re-importing the checked-in files, not generating random data. `npm test` fails if anything under `data/` grows a clock or random source.

## Non-negotiable invariant

Matching only creates proposals. It never changes schedule actuals. A verified actual update can only be created by an authenticated user with the `planner` role, through the verification command, under an idempotency key. Field supervisors submit evidence and proposals; they do not verify matches.

## Contract changes

`docs/`, `packages/` and `data/` are the integration authority. A subsystem owner who needs a different shape asks for it rather than inventing one, because two owners inventing the same shape separately is how the report columns and the audit digests drifted apart in the first place. `packages/contracts/schemas/*.schema.json` is what non-TypeScript clients implement against; changing a published schema is a breaking change for `apps/field` and `services/api`.
