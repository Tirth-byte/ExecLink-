import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../lib/demo-api.ts", import.meta.url), "utf8");
const control = readFileSync(new URL("../components/control-center.tsx", import.meta.url), "utf8");

test("verification calls the real endpoint with a derived idempotency key", () => {
  assert.match(source, /proposals\/\$\{proposalId\}\/verify/);
  assert.match(source, /const idempotencyKey = `verify-\$\{proposalId\}-\$\{activityId\}-\$\{progress\}`/);
  assert.match(source, /"Idempotency-Key": idempotencyKey/);
});

test("progress rules are enforced before the request leaves the browser", () => {
  assert.match(source, /if \(nextPercent < previousPercent\) throw new Error/);
  assert.match(source, /if \(nextPercent > 100\) throw new Error/);
  assert.match(control, /assertProgressNotRegressing\(currentProgress, progress\)/);
});

test("a rejected verification surfaces the server's error instead of succeeding locally", () => {
  assert.match(source, /if \(!res\.ok\)/);
  assert.match(source, /throw new Error\(errorBody\?\.error\?\.message/);
  assert.match(control, /Activity remains unverified/);
});

test("no audit number is minted, predicted or seeded in the browser", () => {
  assert.doesNotMatch(source, /verifyDemoMatch/);
  assert.doesNotMatch(source, /initialDemoState/);
  for (const [name, text] of [["demo-api.ts", source], ["control-center.tsx", control]]) {
    const lines = text
      .split("\n")
      .map((raw, index) => [index + 1, raw.trim()])
      .filter(([, line]) => line && !line.startsWith("//") && !line.startsWith("*") && !line.startsWith("/*"));
    for (const [number, line] of lines) {
      if (!/audit_?[Ss]eq|auditSequence|AuditSequence/i.test(line)) continue;
      assert.doesNotMatch(line, /audit_?[Ss]eq[A-Za-z0-9_.()[\]]*\s*\+\s*1\b/i, `${name}:${number} invents the next audit number`);
      assert.doesNotMatch(line, /\|\|/, `${name}:${number} falls back to a local value`);
      assert.doesNotMatch(line, /useState[<(][^)>]*\b\d{2,}\b/, `${name}:${number} seeds the sequence from a literal`);
    }
  }
});

test("the audit sequence starts unknown and is filled only by the server response", () => {
  assert.match(control, /const \[auditSequence, setAuditSequence\] = useState<number \| null>\(null\)/);
  assert.match(control, /const serverSequence = res\.auditSequence \?\? null/);
  assert.match(control, /Audit #\$\{serverSequence\}/);
  assert.doesNotMatch(control, /Committed to audit #/);
});

test("the audit view reads the persisted chain and invents no entries", () => {
  assert.match(control, /fetchAuditChainStatus\("PRJ-METRO-001"\)/);
  assert.match(source, /\/audit\/verify/);
  for (const fabricated of ["cf0a9318b762", "bc1921a4f009", "9ad704e1c512", "3e21890fa2b1"]) {
    assert.doesNotMatch(control, new RegExp(fabricated), `fabricated audit hash ${fabricated}`);
  }
  assert.doesNotMatch(control, /sequence - \(verified \?/);
});

test("analytical screens declare loading, live and unavailable states", () => {
  assert.match(control, /function useLiveEndpoint/);
  assert.match(control, /status: "loading"/);
  assert.match(control, /status: "unavailable"/);
  assert.match(control, /SYNTHETIC DEMO DATA/);
  assert.match(control, /useLiveEndpoint\("analytics"\)/);
  assert.match(control, /useLiveEndpoint\("project-memory"\)/);
});

test("all eleven destinations remain visible", () => {
  const nav = readFileSync(new URL("../lib/demo-data.ts", import.meta.url), "utf8");
  for (const label of [
    "Overview",
    "Live Execution",
    "Match Review",
    "Schedule Explorer",
    "Data Ingestion",
    "Verification",
    "Analytics",
    "Project Memory",
    "Audit Trail",
    "Reports",
    "Settings"
  ]) {
    assert.match(nav, new RegExp(label));
  }
  const navBlock = nav.slice(nav.indexOf("navItems"));
  const declared = [...navBlock.matchAll(/\[\s*"([a-z-]+)"\s*,\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(declared.length, 11, `expected 11 declared destinations, got ${declared.join(", ")}`);
  assert.equal(new Set(declared).size, 11, `expected 11 unique destination ids, got ${declared.join(", ")}`);
  for (const id of declared) {
    assert.match(control, new RegExp(`view === "${id}"`), `Missing view render block for: ${id}`);
  }
});
