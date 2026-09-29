export const DEMO_SEED_VERSION = "demo-v1";

/**
 * Import order is a dependency order, not alphabetical: a DPR line references an
 * activity and the evidence events behind it, so those rows must exist first.
 * A reset that imports in a different order either fails on a foreign key or,
 * worse, builds a DPR whose evidence is silently empty.
 */
export const FIXTURE_ORDER = [
  "project.json",
  "schedule-activities.json",
  "execution-events.json",
  "matching-config.json",
  "match-proposals.json",
  "dpr-percent-complete.json"
];
