# Backend and API Engineering

## Mission
Maintain reliable FastAPI services and explicit contracts.

## Rules
- Preserve existing routes/contracts unless a verified requirement demands change.
- Validate input at boundaries.
- Keep error responses useful and consistent.
- Use idempotency where repeated mutation requests are plausible.
- Transactions must protect coupled state changes.
- Verification and audit append must remain atomic where required.
- Matching/proposal endpoints must not bypass the verification trust boundary.
- Keep deterministic demo/reset behavior.
- Avoid unnecessary microservices.
- Keep business logic out of route handlers when it harms testability.
- Maintain backwards compatibility with web/field/intelligence during incremental work.

## Completion
Add/update targeted tests for behavior changed.
