# Testing and QA

## Mission
Catch regressions in the real integrated product, not only isolated functions.

## Testing Order
1. Targeted test for changed behavior.
2. Owning subsystem tests.
3. Integration/golden-path checks at milestones.
4. Manual visual/interaction verification for UI work.

## Protect
- matching never directly mutates verified actuals
- rejection/unmatched preserves actual progress
- verification updates actuals correctly
- audit append occurs correctly
- API ↔ intelligence compatibility
- field ↔ API compatibility
- web ↔ API compatibility
- persisted state behaves intentionally
- offline/demo fallbacks remain isolated

## UI QA
Check loading, empty, error, long text, large numbers, narrow desktop, keyboard focus, stale/offline states, and failed API calls.

Never declare success solely because the compiler passes.
