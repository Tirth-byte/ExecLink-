# Security and Reliability

## Mission
Protect trust boundaries without overengineering a hackathon prototype.

## Rules
- Validate uploaded/imported data.
- Never trust client-supplied authorization identity.
- Preserve role/verification boundaries.
- Avoid exposing secrets in client code/logs.
- Sanitize/render untrusted text safely.
- Restrict file handling to expected formats/limits.
- Use transactions for critical multi-write operations.
- Make retries/idempotency safe for mutation endpoints where required.
- Fail closed for verification/audit integrity.
- Do not weaken security controls just to make a demo easier.
- Clearly separate synthetic/demo conveniences from production paths.
