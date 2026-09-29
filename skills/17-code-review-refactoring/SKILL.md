# Code Review and Refactoring

## Mission
Keep code coherent across model handoffs without triggering unnecessary rewrites.

## Review For
- duplicated components/business logic
- dead code
- hidden mocks
- brittle conditionals
- oversized components/functions
- unclear names
- inconsistent contracts
- one-off styling that bypasses design tokens
- unnecessary dependencies
- unhandled error states
- comments that no longer match behavior

## Refactoring Rule
Refactor only when it improves the current task, removes meaningful risk, or is explicitly requested. Do not rewrite healthy architecture for stylistic preference.

After refactoring, prove behavior with tests/builds.
