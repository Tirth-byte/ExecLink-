# AI Matching Engineering

## Mission
Make execution-event extraction and schedule matching explainable, deterministic where possible, and safe.

## Canonical Event Concepts
event type, description, discipline, asset/tag, location, timestamp, contractor, quantity/unit, delay reason, source, evidence.

## Matching Signals
Semantic similarity, asset/tag, WBS/context, discipline, temporal compatibility, location.

## Rules
- LLMs may assist structured extraction; do not let unconstrained prose directly mutate schedule state.
- Candidate retrieval and scoring must remain inspectable.
- Return signal breakdowns and human-readable explanations.
- Confidence is a routing signal, not a claim of truth.
- Preserve threshold behavior defined by the product/configuration.
- High confidence means auto-suggest, not silent schedule mutation.
- Ambiguous and unmatched cases are first-class outputs.
- Historical/project-memory inference must expose sample size/source and remain side-effect free.
- Tests should cover strong, ambiguous, wrong, unmatched, blocked, and new-activity scenarios.
