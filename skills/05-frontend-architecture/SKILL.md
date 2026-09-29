# Frontend Architecture

## Mission
Keep the Next.js frontend maintainable while delivering pages quickly.

## Rules
- Inspect existing patterns before introducing new architecture.
- Reuse shared primitives before creating page-specific duplicates.
- Separate data access/state transformation from presentational components where it improves clarity.
- Keep page composition readable.
- Avoid giant monolithic components and premature abstraction.
- Avoid wrapper components that add no semantic or reuse value.
- Keep API contracts typed.
- Preserve real API integration; do not silently swap to hardcoded data.
- Isolate explicit demo/offline fallbacks.
- Prefer server/client boundaries appropriate to actual interaction needs.
- Keep route behavior predictable.

## Component Test
Create a reusable component when at least one is true:
- it represents a stable product concept,
- it is repeated,
- it contains meaningful interaction/state logic,
- centralizing it enforces design consistency.

Do not abstract merely to reduce line count.
