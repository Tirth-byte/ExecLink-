/**
 * Contract validation for ExecLink.
 *
 * This is the gate that decides whether the shared contracts are internally
 * consistent. It is deliberately adversarial about its own subject: a check that
 * cannot fail is worse than no check, because it buys false confidence. So every
 * assertion below is one that has actually failed at least once during authoring,
 * and the cross-language canonicalization check compares this repository's
 * TypeScript reference against a set of committed digest vectors.
 *
 * Run: npm test
 */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  auditEntryHash,
  canonicalJson,
  idempotencyRequestHash,
  verifyAuditChain
} from "../packages/contracts/src/canonical.ts";
import { REPORTS, reportHeader } from "../packages/contracts/src/reports.ts";

const root = resolve(import.meta.dirname, "..");
const failures = [];
let assertions = 0;

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const readText = (path) => readFile(resolve(root, path), "utf8");

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

function checkEqual(actual, expected, message) {
  check(
    actual === expected,
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`
  );
}

const near = (a, b, epsilon = 1e-9) => Math.abs(a - b) < epsilon;

/* ================================================================== *
 * 1. Schemas
 * ================================================================== */

const ajv = new Ajv2020({ strict: true, allErrors: true });
// Without this, "format": "date-time" is silently ignored, which would let a
// malformed timestamp through a validator that appears to be checking it.
addFormats(ajv);
const schemaDir = resolve(root, "packages/contracts/schemas");
const schemaFiles = (await readdir(schemaDir)).filter((f) => f.endsWith(".schema.json")).sort();

check(schemaFiles.length > 0, "no schemas found under packages/contracts/schemas");

const validators = new Map();
for (const file of schemaFiles) {
  const schema = await readJson(`packages/contracts/schemas/${file}`);
  checkEqual(schema.$schema, "https://json-schema.org/draft/2020-12/schema", `${file}: wrong JSON Schema draft`);
  check(typeof schema.$id === "string" && schema.$id.length > 0, `${file}: missing $id`);
  check(typeof schema.title === "string" && schema.title.length > 0, `${file}: missing title`);
  checkEqual(typeof schema.type, "string", `${file}: missing a top-level type`);

  // Compiling against the metaschema is the real test: a malformed schema fails
  // here rather than silently accepting every instance later.
  try {
    // Pass 1 only registers. Compilation happens below, once every schema is
    // known, because a $ref to a schema that has not been added yet fails to
    // resolve — and filename order would otherwise decide which schemas work.
    ajv.addSchema(schema, file);
  } catch (error) {
    check(false, `${file}: cannot be registered: ${error.message}`);
  }
}

// Pass 2: compile. A schema that references another must resolve, so this is
// where a broken cross-file $ref actually surfaces.
for (const file of schemaFiles) {
  try {
    const validator = ajv.getSchema(file);
    check(validator !== undefined, `${file}: did not compile to a validator`);
    validators.set(file, validator);
  } catch (error) {
    check(false, `${file}: does not compile: ${error.message}`);
  }
}

const validate = (file, instance, label) => {
  const validator = validators.get(file);
  if (!validator) {
    check(false, `${label}: no validator for ${file}`);
    return;
  }
  if (!validator(instance)) {
    const detail = (validator.errors ?? [])
      .map((e) => `${e.instancePath || "/"} ${e.message}`)
      .join("; ");
    check(false, `${label} does not satisfy ${file}: ${detail}`);
  } else {
    assertions += 1;
  }
};

/* ================================================================== *
 * 2. Demo fixtures are valid instances of the published schemas
 * ================================================================== */

const schedules = await readJson("data/demo/schedule-activities.json");
const events = await readJson("data/demo/execution-events.json");
const proposals = await readJson("data/demo/match-proposals.json");
const dprs = await readJson("data/demo/dpr-percent-complete.json");
const config = await readJson("data/demo/matching-config.json");
const project = await readJson("data/demo/project.json");

schedules.forEach((row, i) => validate("schedule-activity.schema.json", row, `schedule-activities[${i}]`));
events.forEach((row, i) => validate("execution-event.schema.json", row, `execution-events[${i}]`));
proposals.forEach((row, i) => validate("match-proposal.schema.json", row, `match-proposals[${i}]`));
dprs.forEach((row, i) => validate("dpr-percent-complete.schema.json", row, `dpr-percent-complete[${i}]`));

/* ================================================================== *
 * 3. Matching configuration
 * ================================================================== */

const WEIGHTS = { asset: 0.4, discipline: 0.2, location: 0.15, text: 0.1, workType: 0.1, temporal: 0.05 };
const weightTotal = Object.values(config.weights).reduce((sum, value) => sum + value, 0);
check(near(weightTotal, 1), `matching weights must sum to 1, got ${weightTotal}`);

for (const [signal, expected] of Object.entries(WEIGHTS)) {
  checkEqual(config.weights[signal], expected, `default weight for ${signal} drifted from the agreed vector`);
}
checkEqual(Object.keys(config.weights).length, 6, "the weight vector must declare exactly six signals");

check(
  config.thresholds.autoSuggest > config.thresholds.review,
  "autoSuggest threshold must be above review threshold"
);
checkEqual(config.thresholds.autoSuggest, 0.9, "autoSuggest default drifted from 0.90");
checkEqual(config.thresholds.review, 0.7, "review default drifted from 0.70");
check(
  Array.isArray(config.tieBreaker) && config.tieBreaker.length > 0,
  "a deterministic tie-breaker must be declared; ranking is not reproducible without one"
);

/* ================================================================== *
 * 4. Referential integrity across fixtures
 * ================================================================== */

const activityIds = new Set(schedules.map((a) => a.id));
const eventIds = new Set(events.map((e) => e.id));
checkEqual(activityIds.size, schedules.length, "duplicate activity ids in schedule-activities.json");
checkEqual(eventIds.size, events.length, "duplicate event ids in execution-events.json");

const snapshotId = project.project.activeSnapshotId;
for (const activity of schedules) {
  checkEqual(activity.snapshotId, snapshotId, `activity ${activity.id} is not in the active snapshot`);
  checkEqual(activity.projectId, project.project.id, `activity ${activity.id} has the wrong project`);
}
for (const event of events) {
  checkEqual(event.projectId, project.project.id, `event ${event.id} has the wrong project`);
  check(
    project.users.some((u) => u.id === event.reporterId),
    `event ${event.id} references unknown reporter ${event.reporterId}`
  );
}
for (const proposal of proposals) {
  check(eventIds.has(proposal.executionEventId), `proposal ${proposal.id} references unknown event`);
  checkEqual(proposal.snapshotId, snapshotId, `proposal ${proposal.id} is pinned to a stale snapshot`);
  checkEqual(proposal.configVersion, config.configVersion, `proposal ${proposal.id} used a different config version`);
  checkEqual(proposal.engineVersion, config.engineVersion, `proposal ${proposal.id} used a different engine version`);
}

/* ================================================================== *
 * 5. Scoring is internally consistent and explainable
 * ================================================================== */

const bandOf = (score) =>
  score >= config.thresholds.autoSuggest ? "auto_suggest" : score >= config.thresholds.review ? "review" : "unmatched";

for (const proposal of proposals) {
  let previous = null;
  for (const candidate of proposal.candidates) {
    const where = `${proposal.id}/${candidate.activityId}`;
    check(activityIds.has(candidate.activityId), `${where}: candidate references unknown activity`);

    // Explainability is a recovered invariant: an unexplained candidate is not
    // reviewable, so a candidate with no signals is a contract violation.
    check(candidate.explanation.length > 0, `${where}: candidate carries no signal explanation`);

    const signals = new Set(candidate.explanation.map((s) => s.signal));
    checkEqual(signals.size, candidate.explanation.length, `${where}: a signal is explained twice`);
    for (const signal of Object.keys(WEIGHTS)) {
      check(signals.has(signal), `${where}: signal ${signal} has no explanation`);
    }

    const sum = candidate.explanation.reduce((acc, s) => acc + s.contribution, 0);
    check(
      near(sum, candidate.score, 5e-5),
      `${where}: contributions sum to ${sum.toFixed(6)} but score is ${candidate.score}`
    );

    for (const signal of candidate.explanation) {
      checkEqual(signal.weight, config.weights[signal.signal], `${where}: ${signal.signal} weight disagrees with config`);
      check(
        near(signal.contribution, signal.score * signal.weight, 1e-9),
        `${where}: ${signal.signal} contribution is not score x weight`
      );
      check(
        signal.score >= 0 && signal.score <= 1,
        `${where}: ${signal.signal} score ${signal.score} is outside [0,1]`
      );
      check(
        typeof signal.explanation === "string" && signal.explanation.length > 0,
        `${where}: ${signal.signal} has an empty explanation`
      );
      if (signal.missing) {
        checkEqual(signal.score, 0, `${where}: ${signal.signal} is flagged missing but scores ${signal.score}`);
      }
    }

    checkEqual(candidate.band, bandOf(candidate.score), `${where}: band disagrees with the configured thresholds`);

    // Ranking must be a total order, or two runs of the same input can differ.
    if (previous) {
      check(candidate.score <= previous.score, `${where}: candidates are not sorted by descending score`);
    }
    previous = candidate;
  }
}

const coveredEvents = new Set(proposals.map((p) => p.executionEventId));
for (const event of events) {
  check(coveredEvents.has(event.id), `event ${event.id} has no proposal; every event must be classified, including unmatched`);
}
for (const proposal of proposals) {
  if (proposal.candidates.length === 0) {
    const event = events.find((e) => e.id === proposal.executionEventId);
    check(
      event !== undefined,
      `proposal ${proposal.id} is empty but its event is missing`
    );
  }
}

/* ================================================================== *
 * 6. The non-mutation rule, asserted against the fixtures themselves
 *
 * These fixtures are the demo's starting state. If any of them already carried a
 * verification or a moved actual, the demo would open by having mutated reality,
 * and every non-mutation test downstream would be measuring a fixture that was
 * already wrong.
 * ================================================================== */

for (const event of events) {
  checkEqual(event.status, "submitted", `event ${event.id} must start as submitted, not ${event.status}`);
}
for (const proposal of proposals) {
  checkEqual(proposal.status, "proposed", `proposal ${proposal.id} must start as proposed`);
}

/* ================================================================== *
 * 7. DPR consistency
 * ================================================================== */

const ACTIVITY_BASELINE = { "ACT-1.2.1": 30, "ACT-1.2.2": 10, "ACT-2.1": 0 };

for (const dpr of dprs) {
  checkEqual(dpr.snapshotId, snapshotId, `dpr ${dpr.id} is pinned to a stale snapshot`);
  for (const line of dpr.lines) {
    const where = `${dpr.id}/${line.activityId}`;
    check(activityIds.has(line.activityId), `${where}: dpr line references unknown activity`);
    check(
      near(line.variancePercent, line.actualPercentToDate - line.plannedPercentAtReportDate, 1e-9),
      `${where}: variancePercent ${line.variancePercent} is not actual - planned`
    );
    check(
      line.plannedPercentAtReportDate >= 0 && line.plannedPercentAtReportDate <= 100,
      `${where}: planned percent outside [0,100]`
    );
    check(
      line.actualPercentToDate >= 0 && line.actualPercentToDate <= 100,
      `${where}: actual percent outside [0,100]`
    );
    check(line.delayDays >= 0, `${where}: delayDays is negative`);
    checkEqual(
      line.status === "delayed",
      line.delayDays > 0 && line.actualPercentToDate < 100,
      `${where}: delayed status disagrees with delayDays and actual percent`
    );
    if (line.evidenceEventIds.length === 0) {
      checkEqual(line.lastVerifiedAt, null, `${where}: has no evidence but claims a verification time`);
    }

    // A DPR is built from verified actuals only, and nothing is verified yet.
    const baseline = ACTIVITY_BASELINE[line.activityId];
    check(
      baseline === undefined || line.actualPercentToDate === baseline,
      `${where}: actual percent ${line.actualPercentToDate} is not the unverified baseline ${baseline}`
    );
  }
}

/* ================================================================== *
 * 8. Canonicalization vectors
 *
 * Recomputed from the reference and compared to the committed digests, so the
 * vectors cannot drift away from the implementation that services/api,
 * apps/field and QA are expected to reproduce.
 * ================================================================== */

const vectors = await readJson("data/spec/canonicalization-vectors.json");
for (const vector of vectors.canonical) {
  const text = canonicalJson(vector.input);
  checkEqual(text, vector.canonical, `canonical vector "${vector.name}" produced different JSON`);
  checkEqual(
    createHash("sha256").update(text, "utf8").digest("hex"),
    vector.sha256,
    `canonical vector "${vector.name}" produced a different digest`
  );
}

// The number rules are the ones implementations actually get wrong, and a
// JSON-valued vector cannot express them: writing 45.0 through JSON.stringify emits
// "45". These vectors carry the raw text so the distinction survives.
for (const vector of vectors.numbers) {
  const parsed = JSON.parse(vector.raw);
  const text = canonicalJson(parsed);
  checkEqual(text, vector.canonical, `number rule "${vector.name}" (input ${vector.raw}) produced different JSON`);
  checkEqual(
    createHash("sha256").update(text, "utf8").digest("hex"),
    vector.sha256,
    `number rule "${vector.name}" produced a different digest`
  );
}

for (const entry of vectors.auditChain.entries) {
  checkEqual(auditEntryHash(entry), entry.entryHash, `audit vector at sequence ${entry.sequence} does not hash to its stored digest`);
}
const chainResult = verifyAuditChain(vectors.auditChain.entries);
check(chainResult.valid, `the committed audit chain does not verify: ${chainResult.reason}`);
for (const tamper of vectors.auditChain.tamperCases) {
  check(
    tamper.result.valid === false,
    `tamper case "${tamper.name}" verifies CLEAN; the check does not detect that tampering`
  );
}
for (const vector of vectors.idempotency) {
  const a = idempotencyRequestHash(vector.a);
  const b = idempotencyRequestHash(vector.b);
  checkEqual(a, vector.aHash, `idempotency vector "${vector.name}" a-side hash drifted`);
  checkEqual(b, vector.bHash, `idempotency vector "${vector.name}" b-side hash drifted`);
  checkEqual(
    a === b,
    vector.expectSame,
    `idempotency vector "${vector.name}" should ${vector.expectSame ? "" : "not "}hash the same`
  );
}

/* ================================================================== *
 * 9. Reports: exactly five, with unique and complete columns
 * ================================================================== */

checkEqual(REPORTS.length, 5, `there must be exactly five approved report types, found ${REPORTS.length}`);
const reportIds = REPORTS.map((r) => r.id);
checkEqual(new Set(reportIds).size, 5, "duplicate report type ids");
for (const id of reportIds) {
  const columns = reportHeader(id);
  checkEqual(new Set(columns).size, columns.length, `report ${id} has duplicate column names`);
  check(columns.length > 0, `report ${id} declares no columns`);
  const spec = REPORTS.find((r) => r.id === id);
  check(
    typeof spec.grain === "string" && spec.grain.length > 0,
    `report ${id} does not state its grain, so two owners can build different row counts`
  );
  check(
    Array.isArray(spec.notes) && spec.notes.length > 0,
    `report ${id} states no notes; the edge cases are where exports go wrong`
  );
}
const EXPECTED_REPORTS = [
  "schedule-variance",
  "verification-audit",
  "match-quality",
  "delay-register",
  "discipline-progress"
];
for (const id of EXPECTED_REPORTS) {
  check(reportIds.includes(id), `approved report type ${id} is missing`);
}
for (const id of reportIds) {
  check(EXPECTED_REPORTS.includes(id), `report ${id} is not one of the five approved types`);
}

/* ================================================================== *
 * 10. Determinism of the committed demo data
 *
 * A demo reset must reproduce the same state. A generator that reads the clock or
 * a random source cannot, and the failure shows up as a diff nobody can explain.
 * ================================================================== */

const CLOCK_OR_RANDOM = [
  /\bDate\.now\s*\(/,
  /\bMath\.random\s*\(/,
  /\brandom\.random\s*\(/,
  /\brandom\.uuid/,
  /\buuid4\s*\(/,
  /\bdatetime\.now\s*\(/,
  /\bdatetime\.utcnow\s*\(/,
  /\btime\.time\s*\(/,
  /\bnew\s+Date\s*\(\s*\)/
];

async function* walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.name === "node_modules" || item.name.startsWith(".")) continue;
    const full = resolve(dir, item.name);
    if (item.isDirectory()) yield* walk(full);
    else yield full;
  }
}

for await (const file of walk(resolve(root, "data"))) {
  if (!/\.(mjs|js|ts|py)$/.test(file)) continue;
  const text = await readText(file);
  for (const marker of CLOCK_OR_RANDOM) {
    check(
      !marker.test(text),
      `${file.replace(`${root}/`, "")} reads the clock or a random source; demo data must be deterministic`
    );
  }
}

/* ================================================================== *
 * 11. Documentation points at the artifacts that back it
 *
 * A contract doc that names a file which does not exist is worse than no doc,
 * because the next owner trusts it and builds against the missing thing.
 * ================================================================== */

const docs = await readText("docs/ARCHITECTURE.md");
for (const needle of ["previous_hash", "entry_hash", "canonical"]) {
  check(docs.toLowerCase().includes(needle), `docs/ARCHITECTURE.md never mentions ${needle}`);
}
const apiDoc = await readText("docs/API_CONTRACT.md");
for (const id of reportIds) {
  const label = REPORTS.find((r) => r.id === id).label;
  check(apiDoc.includes(label), `docs/API_CONTRACT.md does not name the ${label} export`);
}
const dataDoc = await readText("docs/DATA_MODEL.md");
check(dataDoc.includes("DPR") || dataDoc.includes("DprPercentComplete"), "docs/DATA_MODEL.md does not describe DPR");

/* ================================================================== *
 * Report
 * ================================================================== */

if (failures.length > 0) {
  console.error(`\nContract validation FAILED — ${failures.length} of ${assertions} assertions:\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `Contract validation passed: ${assertions} assertions over ${schemaFiles.length} schemas, ` +
    `${schedules.length} activities, ${events.length} events, ${proposals.length} proposals, ` +
    `${dprs.length} DPRs, ${REPORTS.length} report specs, and ` +
    `${vectors.canonical.length + vectors.numbers.length + vectors.auditChain.entries.length + vectors.idempotency.length} canonicalization vectors.`
);
