export type ProgressMetric = {
  label: string;
  value: string;
  context: string;
  tone?: "default" | "critical";
};

export type CurvePoint = {
  period: string;
  baseline: number;
  current: number;
  actual: number | null;
};

export type AttentionItem = {
  priority: "Critical" | "High" | "Medium";
  activityId: string;
  activity: string;
  discipline: string;
  issue: string;
  context: string;
  state: "Review" | "Blocked" | "Unmatched";
};
``
export const overviewFixture = {
  project: { name: "North River Expansion", id: "PRJ-DEMO-001", dataDate: "26 Sep 2026" },
  progress: [
    { label: "Planned Progress", value: "44.2%", context: "Baseline expectation through data date" },
    { label: "Verified Actual", value: "37.8%", context: "Human-verified execution only" },
    { label: "Schedule Variance", value: "−6.4 pts", context: "Actual versus plan", tone: "critical" },
    { label: "Data Freshness", value: "22 min", context: "Since latest verified field update" },
  ] satisfies ProgressMetric[],
  curve: [
    { period: "Apr", baseline: 2, current: 2, actual: 1 },
    { period: "May", baseline: 6, current: 5, actual: 4 },
    { period: "Jun", baseline: 13, current: 12, actual: 10 },
    { period: "Jul", baseline: 22, current: 21, actual: 18 },
    { period: "Aug", baseline: 34, current: 33, actual: 28 },
    { period: "Sep", baseline: 45, current: 44.2, actual: 37.8 },
    { period: "Oct", baseline: 58, current: 56, actual: null },
    { period: "Nov", baseline: 71, current: 69, actual: null },
    { period: "Dec", baseline: 82, current: 81, actual: null },
    { period: "Jan", baseline: 91, current: 90, actual: null },
    { period: "Feb", baseline: 97, current: 97, actual: null },
    { period: "Mar", baseline: 100, current: 100, actual: null },
  ] satisfies CurvePoint[],
  attention: [
    { priority: "Critical", activityId: "ACT-P110", activity: "P-110 Erection & Alignment", discipline: "Piping", issue: "Behind plan", context: "High-confidence evidence awaiting verification", state: "Review" },
    { priority: "Critical", activityId: "ACT-E315", activity: "MCC-02 Cable Termination", discipline: "Electrical", issue: "Blocked", context: "Permit and access dependency", state: "Blocked" },
    { priority: "High", activityId: "ACT-C240", activity: "Foundation Concrete Pour — Area B", discipline: "Civil", issue: "Progress discrepancy", context: "Reported quantity differs from linked actual", state: "Review" },
    { priority: "Medium", activityId: "ACT-I085", activity: "Loop Check — Compressor Train 1", discipline: "Instrumentation", issue: "Unmatched field update", context: "Planner review required", state: "Unmatched" },
  ] satisfies AttentionItem[],
  disciplines: [
    { name: "Civil", plan: 68, actual: 64 }, { name: "Structural", plan: 55, actual: 51 },
    { name: "Piping", plan: 47, actual: 38 }, { name: "Static Equipment", plan: 42, actual: 39 },
    { name: "Rotating Equipment", plan: 35, actual: 32 }, { name: "Electrical", plan: 31, actual: 24 },
    { name: "Instrumentation", plan: 23, actual: 17 }, { name: "HSE", plan: 100, actual: 100 },
  ],
  matching: { total: 148, high: 112, review: 23, unmatched: 13 },
  verification: { awaiting: 12, priority: 3, oldest: "2h 14m", ages: [{ label: "< 30 min", value: 4 }, { label: "30–60 min", value: 3 }, { label: "1–2 hr", value: 3 }, { label: "> 2 hr", value: 2 }] },
  criticalWatch: [
    { id: "ACT-P110", activity: "P-110 Erection & Alignment", discipline: "Piping", float: "0d", progress: 78, issue: "Behind plan", impact: "Critical-path exposure" },
    { id: "ACT-E315", activity: "MCC-02 Cable Termination", discipline: "Electrical", float: "1d", progress: 42, issue: "Blocked", impact: "Downstream energization risk" },
    { id: "ACT-I085", activity: "Loop Check — Compressor Train 1", discipline: "Instrumentation", float: "2d", progress: 0, issue: "Unmatched update", impact: "Verification required" },
    { id: "ACT-C240", activity: "Foundation Concrete Pour — Area B", discipline: "Civil", float: "3d", progress: 100, issue: "Quantity discrepancy", impact: "Close-out review" },
  ],
  recentEvents: [
    { time: "09:42", activityId: "ACT-P110", text: "P-110 erection progress verified at 78%", source: "Field Update", reporter: "R. Sharma · Piping Supervisor", value: "78% verified", evidence: "Field photo EL-P110-0926-04", audit: "Verified by Tirth Patel at 09:44" },
    { time: "09:18", activityId: "ACT-C240", text: "Foundation concrete pour Area B verified complete", source: "DPR Import", reporter: "DPR-2026-269", value: "100% complete", evidence: "Concrete pour record DPR row 184", audit: "Verified by Tirth Patel at 09:23" },
    { time: "08:51", activityId: "ACT-E315", text: "Electrical cable termination progress verified at 42%", source: "Site Diary", reporter: "M. Iqbal · Electrical Lead", value: "42% verified", evidence: "Site diary SD-0926-E-02", audit: "Verified by A. Mehta at 08:57" },
    { time: "08:34", activityId: "ACT-P125", text: "Hydrotest activity blocked — permit dependency", source: "Time Agent", reporter: "Voice update · Field Supervisor", value: "Blocked", evidence: "Transcript TA-0926-0834", audit: "Verified by Tirth Patel at 08:39" },
  ],
  integrity: { auditChain: "Valid", verifiedActuals: 124, unlinkedEvents: 13, lastIngestion: "09:47" },
  activityDetails: {
    "ACT-P110": { activity: "P-110 Erection & Alignment", wbs: "NRX / Process Area / Piping / Pumps", discipline: "Piping", plan: 47, actual: 38, verified: 78, float: "0d", issue: "Behind plan", impact: "Critical-path exposure", evidence: "Erection progress confirmed by field photo and supervisor update.", state: "Awaiting verification", source: "Field Update", timestamp: "26 Sep 2026 · 09:42", route: "/verification-center" },
    "ACT-E315": { activity: "MCC-02 Cable Termination", wbs: "NRX / Utilities / Electrical / MCC-02", discipline: "Electrical", plan: 31, actual: 24, verified: 42, float: "1d", issue: "Blocked", impact: "Downstream energization risk", evidence: "Access permit remains pending for termination workfront.", state: "Planner review", source: "Site Diary", timestamp: "26 Sep 2026 · 08:51", route: "/verification-center" },
    "ACT-C240": { activity: "Foundation Concrete Pour — Area B", wbs: "NRX / Area B / Civil / Foundations", discipline: "Civil", plan: 68, actual: 64, verified: 100, float: "3d", issue: "Quantity discrepancy", impact: "Close-out review", evidence: "DPR quantity exceeds the schedule-linked actual quantity.", state: "Review required", source: "DPR Import", timestamp: "26 Sep 2026 · 09:18", route: "/match-review" },
    "ACT-I085": { activity: "Loop Check — Compressor Train 1", wbs: "NRX / Compressor / Instrumentation / Loop Checks", discipline: "Instrumentation", plan: 23, actual: 17, verified: 0, float: "2d", issue: "Unmatched field update", impact: "Verification required", evidence: "Field statement has no confirmed schedule activity linkage.", state: "Unmatched", source: "Field Update", timestamp: "26 Sep 2026 · 08:26", route: "/match-review" },
    "ACT-P125": { activity: "P-110 Hydrotest", wbs: "NRX / Process Area / Piping / Testing", discipline: "Piping", plan: 35, actual: 28, verified: 0, float: "0d", issue: "Permit dependency", impact: "Hydrotest start delayed", evidence: "Time Agent transcript records permit as the active blocker.", state: "Verified blocked event", source: "Time Agent", timestamp: "26 Sep 2026 · 08:34", route: "/verification-center" },
  },
} as const;
