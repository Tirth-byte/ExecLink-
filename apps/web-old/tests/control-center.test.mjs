import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const demoDataSrc = readFileSync(new URL("../lib/demo-data.ts", import.meta.url), "utf8");
const controlCenterSrc = readFileSync(new URL("../components/control-center.tsx", import.meta.url), "utf8");

test("all 8 required navigation destinations are registered and rendered", () => {
  const requiredDestinations = [
    ["overview", "Overview"],
    ["live", "Live Execution"],
    ["review", "Match Review"],
    ["schedule", "Schedule Explorer"],
    ["ingestion", "Data Ingestion"],
    ["verification", "Verification Center"],
    ["analytics", "Analytics"],
    ["memory", "Project Memory"]
  ];

  for (const [id, label] of requiredDestinations) {
    assert.match(demoDataSrc, new RegExp(id), `Missing destination id in demo-data: ${id}`);
    assert.match(demoDataSrc, new RegExp(label), `Missing destination label in demo-data: ${label}`);
    assert.match(controlCenterSrc, new RegExp(`view === "${id}"`), `Missing view render block for: ${id}`);
  }
});

test("flagship match review provides all 6 visual signals", () => {
  const expectedSignals = [
    "Semantic / Text",
    "Asset Identifier",
    "WBS Hierarchy",
    "Discipline",
    "Temporal Window",
    "Location / Chainage"
  ];

  for (const sig of expectedSignals) {
    assert.match(demoDataSrc, new RegExp(sig), `Missing visual signal: ${sig}`);
  }

  // Verify weights and contribution
  assert.match(demoDataSrc, /category: "semantic"/);
  assert.match(demoDataSrc, /category: "asset"/);
  assert.match(demoDataSrc, /category: "wbs"/);
  assert.match(demoDataSrc, /category: "discipline"/);
  assert.match(demoDataSrc, /category: "temporal"/);
  assert.match(demoDataSrc, /category: "location"/);

  // Candidate ranking and actions in Match Review
  assert.match(controlCenterSrc, /candidate-switcher/);
  assert.match(controlCenterSrc, /Approve & verify actual/);
  assert.match(controlCenterSrc, /Reject proposal/);
  assert.match(controlCenterSrc, /Mark new activity/);
});

test("schedule explorer contains WBS hierarchy L1 to L6 and Gantt view", () => {
  for (let lvl = 1; lvl <= 6; lvl++) {
    assert.match(demoDataSrc, new RegExp(`level: ${lvl}`), `Missing WBS level L${lvl}`);
  }
  assert.match(controlCenterSrc, /Gantt Timeline/);
  assert.match(controlCenterSrc, /BL-MASTER-R12/);
});

test("data ingestion implements 5-stage lifecycle and protects baseline", () => {
  const lifecycleStages = ["Uploaded", "Parsing", "Extracting", "Matching", "Complete"];
  for (const stage of lifecycleStages) {
    assert.match(controlCenterSrc, new RegExp(stage), `Missing ingestion lifecycle stage: ${stage}`);
  }
  assert.match(demoDataSrc, /BL-WEEKLY-DRAFT\.csv/);
  assert.match(demoDataSrc, /Baseline unchanged/);
});

test("analytics provides S-curve, delay causes Pareto, and discipline SPI", () => {
  assert.match(controlCenterSrc, /FullSCurve/);
  assert.match(controlCenterSrc, /MiniSCurve/);
  assert.match(demoDataSrc, /Rebar & Structural Steel Delivery Lead Time/);
  assert.match(demoDataSrc, /Monsoon Rainfall/);
  assert.match(demoDataSrc, /confidenceDistribution/);
});

test("project memory supplies institutional benchmarks and synthetic demo data tag", () => {
  assert.match(controlCenterSrc, /SYNTHETIC DEMO DATA · INSTITUTIONAL MEMORY/);
  assert.match(demoDataSrc, /Metro Line 1/);
  assert.match(demoDataSrc, /Pier P42/);
  assert.match(demoDataSrc, /Pre-tied rebar cages/);
  assert.match(demoDataSrc, /benchmarkDurations/);
  assert.match(demoDataSrc, /productivityPatterns/);
});
