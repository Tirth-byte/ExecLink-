/**
 * Generates data/spec/canonicalization-vectors.json from the normative reference
 * in packages/contracts/src/canonical.ts.
 *
 * These vectors are the cross-language contract: services/api (Python) and
 * apps/field (Dart) implement the prose in docs/ARCHITECTURE.md and check their
 * output against this file. If a vector disagrees with your implementation, your
 * implementation is wrong — not the vector.
 *
 * Regenerate with: npm run vectors
 * The output is committed and byte-stable: the generator contains no clock and no
 * random input, so a rerun must produce an identical file.
 */
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  CANONICAL_SPEC_VERSION,
  GENESIS_HASH,
  auditEntryHash,
  canonicalJson,
  idempotencyRequestHash,
  verifyAuditChain
} from "../packages/contracts/src/canonical.ts";

const root = resolve(import.meta.dirname, "..");
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/* ------------------------------------------------------------------ *
 * Canonical JSON cases
 *
 * Chosen to break naive implementations, not to exercise the happy path. A suite
 * of well-formed objects that every implementation already agrees on would pass
 * while three of the real ones still disagreed.
 * ------------------------------------------------------------------ */

const CANONICAL_CASES = [
  { name: "key order is normalized, not preserved", value: { b: 1, a: 2, C: 3 } },
  { name: "nested key order", value: { z: { y: 1, x: 2 }, a: [{ q: 1, p: 2 }] } },
  { name: "integral floats lose the decimal point", value: { progressPercent: 45.0 } },
  { name: "non-integral numbers keep their fraction", value: { score: 0.79 } },
  { name: "negative zero normalizes to zero", value: { delta: -0 } },
  { name: "exponent form is avoided in the common range", value: { big: 1e21, small: 1e-7 } },
  { name: "control characters use short escapes then \\u00XX", value: { s: "a\nb\tcd" } },
  { name: "quotes and backslashes are escaped", value: { s: 'say "hi" \\ bye' } },
  { name: "non-ASCII stays literal UTF-8", value: { name: "Blue Line — 東京 / café" } },
  { name: "empty containers", value: { list: [], obj: {} } },
  { name: "null is a value, not an absence", value: { a: null } },
  { name: "booleans and nulls inside arrays", value: { v: [true, false, null, 0] } }
];

const canonical = CANONICAL_CASES.map(({ name, value }) => {
  const text = canonicalJson(value);
  return { name, input: value, canonical: text, sha256: sha256(text) };
});

/* ------------------------------------------------------------------ *
 * Number formatting, pinned as raw JSON *text*.
 *
 * These cannot live in the cases above. Writing 45.0 through JSON.stringify emits
 * "45", and writing -0 emits "0", so a JSON-valued vector silently loses the very
 * distinctions the number rules exist to pin down. Feeding raw text in and
 * comparing canonical text out keeps them: a parser reads "45.0" as the double 45
 * in JavaScript and Dart but as the float 45.0 in Python, and only one of those can
 * be right.
 * ------------------------------------------------------------------ */

const NUMBER_CASES = [
  { name: "45.0 is the same value as 45", raw: "45.0", canonical: "45" },
  { name: "45 stays 45", raw: "45", canonical: "45" },
  { name: "45.00 also collapses", raw: "45.00", canonical: "45" },
  { name: "negative zero normalizes to 0", raw: "-0.0", canonical: "0" },
  { name: "negative zero integer form", raw: "-0", canonical: "0" },
  { name: "zero", raw: "0", canonical: "0" },
  { name: "a genuine fraction is preserved", raw: "0.7900", canonical: "0.79" },
  { name: "small exponent loses its padding", raw: "1e-07", canonical: "1e-7" },
  { name: "positive exponent is not signed", raw: "1e+21", canonical: "1e21" },
  { name: "a large integer is not in exponent form", raw: "10000000000000000000000", canonical: "1e22" },
  { name: "negative fractions keep their sign", raw: "-0.25", canonical: "-0.25" }
];

const numbers = NUMBER_CASES.map(({ name, raw, canonical }) => {
  // Round-trip through JSON.parse, exactly as a receiving implementation would.
  const parsed = JSON.parse(raw);
  const produced = canonicalJson(parsed);
  if (produced !== canonical) {
    throw new Error(
      `number rule "${name}": JSON.parse("${raw}") canonicalized to "${produced}", expected "${canonical}"`
    );
  }
  return { name, raw, canonical: produced, sha256: sha256(produced) };
});

/* ------------------------------------------------------------------ *
 * Audit chain: a real two-entry chain, then three tampering cases.
 * ------------------------------------------------------------------ */

const entry1 = {
  sequence: 1,
  projectId: "PRJ-METRO-001",
  occurredAt: "2026-09-26T06:15:00Z",
  actorId: "USR-PLN-001",
  actorRole: "planner",
  action: "match.verified",
  entityType: "activity",
  entityId: "ACT-1.2.1",
  requestId: "REQ-DEMO-0001",
  payload: {
    executionEventId: "EVT-DEMO-001",
    proposalId: "MPR-DEMO-001",
    activityId: "ACT-1.2.1",
    previousProgressPercent: 30,
    progressPercent: 45
  },
  previousHash: GENESIS_HASH
};

const entry2 = {
  sequence: 2,
  projectId: "PRJ-METRO-001",
  occurredAt: "2026-09-26T06:15:01Z",
  actorId: "USR-PLN-001",
  actorRole: "planner",
  action: "match.rejected",
  entityType: "match_proposal",
  entityId: "MPR-DEMO-002",
  requestId: "REQ-DEMO-0002",
  payload: { reason: "Ambiguous between two candidate activities", actualUpdated: false },
  previousHash: auditEntryHash(entry1)
};

const entries = [entry1, entry2].map((body) => ({ ...body, entryHash: auditEntryHash(body) }));

/* ------------------------------------------------------------------ *
 * Idempotency fingerprints
 * ------------------------------------------------------------------ */

const IDEMPOTENCY_CASES = [
  {
    name: "body key order and method casing do not change the hash",
    expectSame: true,
    a: { method: "post", path: "/projects/PRJ-METRO-001/proposals/MPR-DEMO-001/verify", body: { activityId: "ACT-1.2.1", progressPercent: 45 } },
    b: { method: "POST", path: "/projects/PRJ-METRO-001/proposals/MPR-DEMO-001/verify", body: { progressPercent: 45, activityId: "ACT-1.2.1" } }
  },
  {
    name: "a different resolved path is a different command",
    expectSame: false,
    a: { method: "POST", path: "/projects/PRJ-METRO-001/proposals/MPR-DEMO-001/verify", body: { progressPercent: 45 } },
    b: { method: "POST", path: "/projects/PRJ-METRO-001/proposals/MPR-DEMO-002/verify", body: { progressPercent: 45 } }
  },
  {
    name: "45 and 45.0 are the same command",
    expectSame: true,
    a: { method: "POST", path: "/p/1/verify", body: { progressPercent: 45 } },
    b: { method: "POST", path: "/p/1/verify", body: { progressPercent: 45.0 } }
  },
  {
    name: "a changed progress value is a different command",
    expectSame: false,
    a: { method: "POST", path: "/p/1/verify", body: { progressPercent: 45 } },
    b: { method: "POST", path: "/p/1/verify", body: { progressPercent: 60 } }
  }
].map(({ name, expectSame, a, b }) => ({
  name,
  expectSame,
  a,
  b,
  aHash: idempotencyRequestHash(a),
  bHash: idempotencyRequestHash(b)
}));

const output = {
  specVersion: CANONICAL_SPEC_VERSION,
  note:
    "Generated by scripts/generate-canonical-vectors.mjs from packages/contracts/src/canonical.ts " +
    "and independently cross-checked by an implementation of the prose spec in docs/ARCHITECTURE.md. " +
    "Do not hand-edit: run `npm run vectors`.",
  canonical,
  numbers,
  auditChain: {
    genesisHash: GENESIS_HASH,
    entries,
    valid: verifyAuditChain(entries),
    tamperCases: [
      {
        name: "an edited payload is detected",
        mutate: "entry 1 payload.progressPercent 45 -> 60, everything else untouched",
        detected: true,
        result: verifyAuditChain(
          entries.map((row, i) =>
            i === 0 ? { ...row, payload: { ...row.payload, progressPercent: 60 } } : row
          )
        )
      },
      {
        name: "a deleted entry is detected",
        mutate: "drop entry 1, leaving a chain that starts at sequence 2",
        detected: true,
        result: verifyAuditChain([entries[1]])
      },
      {
        name: "a re-linked forged entry is detected",
        mutate:
          "append entry 3 carrying a digest that does not match its own body, correctly linked to entry 2",
        detected: true,
        result: verifyAuditChain([
          ...entries,
          { ...entry2, sequence: 3, entityId: "ACT-1.2.2", entryHash: GENESIS_HASH }
        ])
      }
    ]
  },
  idempotency: IDEMPOTENCY_CASES
};

const target = resolve(root, "data/spec/canonicalization-vectors.json");
await writeFile(target, `${JSON.stringify(output, null, 2)}\n`, "utf8");

/* Self-check: the vectors must actually demonstrate what they claim, otherwise the
 * file would ship assertions nobody has ever seen fail. */
const problems = [];
if (!output.auditChain.valid.valid) {
  problems.push("the committed chain does not verify against its own reference");
}
for (const tamper of output.auditChain.tamperCases) {
  if (tamper.result.valid) {
    problems.push(`tamper case "${tamper.name}" verified CLEAN — the check does not detect it`);
  }
}
for (const vector of IDEMPOTENCY_CASES) {
  const same = vector.aHash === vector.bHash;
  if (same !== vector.expectSame) {
    problems.push(
      `idempotency case "${vector.name}" expected sameCommand=${vector.expectSame}, got ${same}`
    );
  }
}
if (problems.length > 0) {
  throw new Error(`vector self-check failed:\n  - ${problems.join("\n  - ")}`);
}

console.log(
  `Wrote data/spec/canonicalization-vectors.json — ${canonical.length} canonical cases, ` +
    `${numbers.length} number-format cases, ` +
    `${entries.length} chain entries, ${IDEMPOTENCY_CASES.length} idempotency cases, ` +
    `${output.auditChain.tamperCases.length} tamper cases all detected.`
);
