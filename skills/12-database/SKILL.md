# Database and Data Modeling

## Mission
Protect ExecLink's trustworthy data lineage and demo reliability.

## Rules
- Preserve established core entities and relationships unless fixing a verified modeling defect.
- Use explicit primary/foreign keys and appropriate constraints.
- Index fields used for common project/activity/event/proposal lookups when justified.
- Keep timestamps and identifiers consistent across services.
- Migrations/schema changes must be deliberate and testable.
- Do not store derived display-only values when they can be reliably computed.
- Audit/history data must not be casually overwritten.
- Seed data must be deterministic.
- Demo reset must return the application to a known state.
- SQLite is acceptable for the demo; do not migrate databases merely for prestige.
