# ExecLink API

FastAPI system of record for the deterministic golden slice. The local adapter
uses SQLite from Python's standard library; `migrations/postgresql/001_initial.sql`
is the production-compatible PostgreSQL schema.

## Run locally

From the repository root:

```bash
./scripts/dev.sh
```

This foreground process binds FastAPI to `0.0.0.0:8000`, seeds the demo data,
uses a local-development-only JWT secret unless `EXECLINK_JWT_SECRET` is set,
and stops cleanly on Ctrl+C. It is intentionally not a persistent background
service. Check it before launching Flutter with `./scripts/check-dev.sh`.

Launch the field app with `./scripts/run-field.sh`. The script uses loopback for
an iOS Simulator and the Mac's current LAN address for a physical iPhone. A
physical iPhone and Mac must be on the same network. Production builds must
supply an HTTPS API endpoint at build time, for example:

```bash
flutter build ios --dart-define=EXECLINK_API_BASE_URL=https://<api-domain>/api/v1 --dart-define=EXECLINK_ENVIRONMENT=production
```

No production domain is assumed or embedded in source.

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

Set `DATABASE_URL=sqlite:///path/to/demo.db` to isolate a database. The legacy
`EXECLINK_DATABASE=/path/to/demo.db` remains available for existing local tests.
PostgreSQL/Neon URLs are intentionally rejected until the planned persistence
migration is implemented. Reports support
`?format=json` and `?format=csv`; the only report types are
`schedule-variance`, `verification-audit`, `match-quality`, `delay-register`,
and `discipline-progress`.
