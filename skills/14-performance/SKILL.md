# Performance

## Mission
Keep ExecLink fast under realistic dashboard/table workloads without premature optimization.

## Rules
- Measure or identify a plausible bottleneck before complex optimization.
- Avoid unnecessary client re-renders and duplicate requests.
- Paginate/virtualize genuinely large tables when needed.
- Memoize expensive derived data only when beneficial.
- Keep chart datasets bounded/aggregated appropriately.
- Avoid loading heavy libraries for trivial effects.
- Use code splitting/lazy loading where it materially improves initial experience.
- Debounce expensive search/filter operations where appropriate.
- Preserve correctness over micro-optimizations.

## Acceptance
Core navigation, filtering, review actions, and demo flow should feel immediate on the target development machine.
