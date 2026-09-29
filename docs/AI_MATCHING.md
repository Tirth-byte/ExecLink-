# Explainable matching contract

Matching ranks activities in the event's project and pinned active snapshot. It is side-effect free. The default configurable weights are asset 40%, discipline 20%, location overlap 15%, text similarity 10%, work-type synonym 10%, and temporal proximity 5%. `autoSuggest >= .90`, `review >= .70`, otherwise unmatched. Auto-suggest still requires planner verification.

Each normalized signal is in `[0,1]`; final score is the weighted sum rounded to four decimals. Asset and discipline use exact normalized identifiers (so `interface` is not equal to a discipline). Location uses geometric/chainage overlap ratio. Text uses a versioned deterministic tokenizer and similarity function. Work type uses a versioned synonym dictionary. Temporal proximity decays against planned dates.

Every candidate carries per-signal input facts, score, weight, contribution, short explanation, missing-data flags, and engine/config versions. Missing signals score zero; weights are not silently redistributed. Candidates sort by score descending, WBS ascending, ID ascending.

The primary mode may use embeddings for retrieval/text similarity, but final scoring and explanations remain reproducible. On model failure or timeout, filter by project/snapshot and run deterministic lexical retrieval/scoring, returning `mode: deterministic_fallback` and a non-sensitive warning. Empty candidates produce an unmatched proposal rather than inventing a new schedule activity.

Evaluation freezes a labelled fixture set and reports top-1/top-3 accuracy, unmatched precision/recall, threshold buckets, latency, fallback rate, and deterministic replay equality. Config changes require a new `configVersion`; proposals retain their original version.

Weights, thresholds and the tie-breaker are data, not code: `data/demo/matching-config.json` is the Phase 1 configuration and `MATCHING_DEFAULTS` in `packages/contracts` is the same vector for typed clients. A change to any of them requires a new `configVersion`; proposals already produced keep the version that produced them, so an old ranking stays explicable against the rules that actually made it.
