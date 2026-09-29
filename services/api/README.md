# ExecLink API

FastAPI system of record for the deterministic golden slice. The local adapter
uses SQLite from Python's standard library; `migrations/postgresql/001_initial.sql`
is the production-compatible PostgreSQL schema.

## Run locally

From the repository root:

```bash
python3 -m services.api.verification_seed --seed-version demo-v1
uvicorn services.api.main:app --reload --port 8000
```

Demo bearer identities are `USR-SUP-001`, `USR-PLN-001`, and `USR-VWR-001`.
Commands also require an `Idempotency-Key` header. Example:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/projects/PRJ-METRO-001/proposals/MPR-DEMO-001/verify \
  -H 'Authorization: Bearer USR-PLN-001' -H 'Idempotency-Key: demo-verify-1' \
  -H 'Content-Type: application/json' \
  -d '{"activityId":"ACT-1.2.1","progressPercent":45,"actualQuantity":{"value":3,"unit":"t"},"expectedActivityVersion":1}'
```

Reset is deterministic for domain rows:

```bash
python3 -m services.api.verification_seed --seed-version demo-v1
python3 -m unittest discover -s services/api/tests -v
python3 qa/run_checks.py
```

Set `EXECLINK_DATABASE=/path/to/demo.db` to isolate a database. Reports support
`?format=json` and `?format=csv`; the only report types are
`schedule-variance`, `verification-audit`, `match-quality`, `delay-register`,
and `discipline-progress`.
