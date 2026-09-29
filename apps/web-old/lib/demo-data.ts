export type Signal = {
  name: string;
  score: number;
  weight: number;
  contribution: number;
  detail: string;
  category?: "semantic" | "asset" | "wbs" | "discipline" | "temporal" | "location";
};

export type Activity = {
  id: string;
  wbs: string;
  name: string;
  discipline: string;
  window: string;
  progress: number;
  delta: number;
  level?: number;
  plannedStart?: string;
  plannedFinish?: string;
  isCritical?: boolean;
  status?: "on_track" | "delayed" | "completed" | "upcoming";
};

export type ExecutionEvent = {
  id: string;
  observedAt: string;
  receivedAt: string;
  reporter: string;
  role: string;
  source: "Field App" | "DPR" | "WhatsApp" | "Voice Note";
  evidence: string;
  tags: string[];
  assetId: string;
  discipline: string;
  workType: string;
  quantity?: string;
  chainage?: string;
  matchStatus: "auto_suggest" | "review" | "unmatched" | "verified";
  matchScore: number;
  proposedActivityId?: string;
  proposedActivityName?: string;
  proposalId?: string;
};

export type ProposalCandidate = {
  activityId: string;
  activityWbs: string;
  activityName: string;
  score: number;
  band: "auto_suggest" | "review" | "fallback";
  discipline: string;
  assetId: string;
  window: string;
  currentActual: number;
  signals: Signal[];
  reasoning: string;
  scheduleImpact: {
    targetProgress: number;
    projectProgressDelta: number;
    disciplineProgressDelta: number;
    unblocksSuccessor: string;
  };
};

export type IngestionFile = {
  id: string;
  filename: string;
  format: "XER" | "DPR" | "CSV" | "Audio/Diary";
  status: "active" | "completed" | "failed" | "processing";
  recordsCount: number;
  matchedCount: number;
  timestamp: string;
  details: string;
};

export type HistoricalActivity = {
  id: string;
  project: string;
  activityName: string;
  plannedDays: number;
  actualDays: number;
  varianceDays: number;
  variancePercent: number;
  rootCause: string;
  keyLesson: string;
};

export type BenchmarkDuration = {
  category: string;
  plannedMeanDays: number;
  historicalMeanDays: number;
  variancePercent: number;
  confidence: string;
  sampleSize: number;
};

export const activities: Activity[] = [
  { id: "ACT-1.2.1", wbs: "1.2.1", name: "Pier P12 reinforcement fixing", discipline: "Structural", window: "24–28 Sep", progress: 30, delta: -15, level: 6, plannedStart: "2026-09-24", plannedFinish: "2026-09-28", isCritical: true, status: "delayed" },
  { id: "ACT-1.2.2", wbs: "1.2.2", name: "Pier P12 formwork installation", discipline: "Structural", window: "26–30 Sep", progress: 10, delta: -6, level: 6, plannedStart: "2026-09-26", plannedFinish: "2026-09-30", isCritical: true, status: "delayed" },
  { id: "ACT-1.2.3", wbs: "1.2.3", name: "Pier P12 concrete pouring", discipline: "Structural", window: "29 Sep–02 Oct", progress: 0, delta: 0, level: 6, plannedStart: "2026-09-29", plannedFinish: "2026-10-02", isCritical: true, status: "upcoming" },
  { id: "ACT-1.2.4", wbs: "1.2.4", name: "Pier P12 curing & de-shuttering", discipline: "Structural", window: "03–06 Oct", progress: 0, delta: 0, level: 6, plannedStart: "2026-10-03", plannedFinish: "2026-10-06", isCritical: false, status: "upcoming" },
  { id: "ACT-2.1", wbs: "2.1", name: "Station electrical interface works", discipline: "Electrical", window: "01–12 Oct", progress: 0, delta: 0, level: 5, plannedStart: "2026-10-01", plannedFinish: "2026-10-12", isCritical: false, status: "upcoming" },
  { id: "ACT-3.1.4", wbs: "3.1.4", name: "Viaduct track plinth casting span 10–14", discipline: "Track", window: "18–26 Sep", progress: 55, delta: -4, level: 6, plannedStart: "2026-09-18", plannedFinish: "2026-09-26", isCritical: false, status: "delayed" }
];

export const wbsHierarchy = [
  { code: "PRJ-METRO", level: 1, name: "Blue Line Metro Extension", discipline: "Management", progress: 37.8, plan: 44.2, isCritical: false },
  { code: "1.0", level: 2, name: "Civil & Structural Viaduct Package", discipline: "Structural", progress: 42.0, plan: 57.0, isCritical: true },
  { code: "1.2", level: 3, name: "Viaduct Section 2 (Piers P10 to P18)", discipline: "Structural", progress: 38.5, plan: 52.0, isCritical: true },
  { code: "1.2.0", level: 4, name: "Pier Substructure Package", discipline: "Structural", progress: 35.0, plan: 48.0, isCritical: true },
  { code: "1.2.P12", level: 5, name: "Pier P12 Unit Structure", discipline: "Structural", progress: 20.0, plan: 38.0, isCritical: true },
  { code: "1.2.1", level: 6, name: "Pier P12 reinforcement fixing", discipline: "Structural", progress: 30.0, plan: 45.0, isCritical: true },
  { code: "1.2.2", level: 6, name: "Pier P12 formwork installation", discipline: "Structural", progress: 10.0, plan: 16.0, isCritical: true },
  { code: "1.2.3", level: 6, name: "Pier P12 concrete pouring", discipline: "Structural", progress: 0.0, plan: 0.0, isCritical: true },
  { code: "2.0", level: 2, name: "Systems & Stations Package", discipline: "Electrical", progress: 18.0, plan: 31.0, isCritical: false },
  { code: "2.1", level: 3, name: "Station STN-03 Substation", discipline: "Electrical", progress: 0.0, plan: 0.0, isCritical: false },
  { code: "3.0", level: 2, name: "Permanent Way & Trackwork", discipline: "Track", progress: 34.0, plan: 38.0, isCritical: false },
  { code: "3.1.4", level: 6, name: "Viaduct track plinth casting span 10–14", discipline: "Track", progress: 55.0, plan: 62.0, isCritical: false }
];

export const signals: Signal[] = [
  { name: "Semantic / Text", score: 80, weight: 10, contribution: 8, detail: "Strong lexical overlap on rebar, reinforcement, pier", category: "semantic" },
  { name: "Asset Identifier", score: 100, weight: 40, contribution: 40, detail: "Exact asset identifier match · PIER-P12", category: "asset" },
  { name: "WBS Hierarchy", score: 100, weight: 10, contribution: 10, detail: "WBS 1.2.1 aligns to Viaduct Section 2 pier works", category: "wbs" },
  { name: "Discipline", score: 100, weight: 20, contribution: 20, detail: "Exact discipline alignment · structural", category: "discipline" },
  { name: "Temporal Window", score: 80, weight: 5, contribution: 4, detail: "Observed 26 Sep inside active planned window 24–28 Sep", category: "temporal" },
  { name: "Location / Chainage", score: 100, weight: 15, contribution: 15, detail: "Chainage 12+410–425 inside activity span 12+400–430", category: "location" }
];

export const primaryProposal: ProposalCandidate = {
  activityId: "ACT-1.2.1",
  activityWbs: "1.2.1",
  activityName: "Pier P12 reinforcement fixing",
  score: 97,
  band: "auto_suggest",
  discipline: "Structural",
  assetId: "PIER-P12",
  window: "24–28 Sep 2026",
  currentActual: 30,
  signals: signals,
  reasoning: "6-signal hybrid engine identified exact asset PIER-P12 (40 pts) and exact structural discipline (20 pts), with chainage overlap within bounds (15 pts) and valid temporal window (4 pts). Lexical overlap on rebar fixing matches activity description (8 pts) and WBS mapping aligns to level 6 substructure package (10 pts). Total 97/100 meets the auto-suggest threshold (>=90%).",
  scheduleImpact: {
    targetProgress: 45,
    projectProgressDelta: 0.8,
    disciplineProgressDelta: 4.0,
    unblocksSuccessor: "ACT-1.2.2 (Pier P12 formwork installation)"
  }
};

export const alternativeProposal: ProposalCandidate = {
  activityId: "ACT-1.2.2",
  activityWbs: "1.2.2",
  activityName: "Pier P12 formwork installation",
  score: 62,
  band: "fallback",
  discipline: "Structural",
  assetId: "PIER-P12",
  window: "26–30 Sep 2026",
  currentActual: 10,
  signals: [
    { name: "Semantic / Text", score: 20, weight: 10, contribution: 2, detail: "Weak lexical match (rebar vs shuttering)", category: "semantic" },
    { name: "Asset Identifier", score: 100, weight: 40, contribution: 40, detail: "Exact asset identifier match · PIER-P12", category: "asset" },
    { name: "WBS Hierarchy", score: 100, weight: 10, contribution: 10, detail: "WBS 1.2.2 under same pier substructure", category: "wbs" },
    { name: "Discipline", score: 100, weight: 20, contribution: 20, detail: "Exact discipline · structural", category: "discipline" },
    { name: "Temporal Window", score: 80, weight: 5, contribution: 4, detail: "Inside active window 26–30 Sep", category: "temporal" },
    { name: "Location / Chainage", score: 100, weight: 15, contribution: 15, detail: "Location within bounds 12+400–430", category: "location" }
  ],
  reasoning: "Matches asset PIER-P12 and location, but evidence explicitly references 3 tonnes of rebar fixing rather than formwork installation. Work type similarity is zero.",
  scheduleImpact: {
    targetProgress: 25,
    projectProgressDelta: 0.4,
    disciplineProgressDelta: 2.0,
    unblocksSuccessor: "ACT-1.2.3 (Pier P12 concrete pouring)"
  }
};

export const liveEvents: ExecutionEvent[] = [
  {
    id: "EVT-DEMO-001",
    observedAt: "26 Sep · 10:00 IST",
    receivedAt: "10:01 IST",
    reporter: "Asha Rao",
    role: "Site Supervisor",
    source: "Field App",
    evidence: "Fixed 3 tonnes of rebar at Pier P12, chainage 12+410 to 12+425.",
    tags: ["#pier-p12", "#rebar", "#structural", "#inspection-passed"],
    assetId: "PIER-P12",
    discipline: "Structural",
    workType: "rebar-fixing",
    quantity: "3 t",
    chainage: "12+410–425",
    matchStatus: "auto_suggest",
    matchScore: 97,
    proposedActivityId: "ACT-1.2.1",
    proposedActivityName: "Pier P12 reinforcement fixing",
    proposalId: "MPR-DEMO-001"
  },
  {
    id: "EVT-DEMO-002",
    observedAt: "26 Sep · 10:30 IST",
    receivedAt: "10:32 IST",
    reporter: "Asha Rao",
    role: "Site Supervisor",
    source: "Field App",
    evidence: "Crew working at P12; preparation continuing for next stage.",
    tags: ["#pier-p12", "#preparation", "#crew"],
    assetId: "PIER-P12",
    discipline: "Structural",
    workType: "preparation",
    chainage: "12+405–420",
    matchStatus: "review",
    matchScore: 79,
    proposedActivityId: "ACT-1.2.1",
    proposedActivityName: "Pier P12 reinforcement fixing",
    proposalId: "MPR-DEMO-002"
  },
  {
    id: "EVT-DEMO-003",
    observedAt: "26 Sep · 11:00 IST",
    receivedAt: "11:01 IST",
    reporter: "Asha Rao",
    role: "Site Supervisor",
    source: "DPR",
    evidence: "Drain cleaning near depot entrance and perimeter ditch maintenance.",
    tags: ["#depot", "#drainage", "#maintenance"],
    assetId: "DEPOT-01",
    discipline: "Civil",
    workType: "drain-cleaning",
    matchStatus: "unmatched",
    matchScore: 42,
    proposalId: "MPR-DEMO-003"
  },
  {
    id: "EVT-DEMO-004",
    observedAt: "26 Sep · 09:15 IST",
    receivedAt: "09:20 IST",
    reporter: "Vikram Patel",
    role: "Electrical Lead",
    source: "Field App",
    evidence: "Installed 140m cable tray along Station STN-03 transformer trench.",
    tags: ["#stn-03", "#cable-tray", "#electrical"],
    assetId: "STN-03",
    discipline: "Electrical",
    workType: "cable-tray",
    quantity: "140 m",
    chainage: "15+850–990",
    matchStatus: "auto_suggest",
    matchScore: 94,
    proposedActivityId: "ACT-2.1",
    proposedActivityName: "Station electrical interface works",
    proposalId: "MPR-DEMO-004"
  },
  {
    id: "EVT-DEMO-005",
    observedAt: "26 Sep · 08:45 IST",
    receivedAt: "08:50 IST",
    reporter: "R. Narayan",
    role: "Section Engineer",
    source: "WhatsApp",
    evidence: "De-shuttered Pier P11 pier cap; curing compound applied, concrete inspection clear.",
    tags: ["#pier-p11", "#shuttering", "#curing"],
    assetId: "PIER-P11",
    discipline: "Structural",
    workType: "de-shuttering",
    chainage: "12+350–375",
    matchStatus: "auto_suggest",
    matchScore: 91,
    proposalId: "MPR-DEMO-005"
  },
  {
    id: "EVT-DEMO-006",
    observedAt: "25 Sep · 16:30 IST",
    receivedAt: "16:35 IST",
    reporter: "K. Sundaram",
    role: "Surveyor",
    source: "Voice Note",
    evidence: "Plinth concrete poured span 11-12, total 22m length finished.",
    tags: ["#trackwork", "#plinth", "#concreting"],
    assetId: "SPAN-11",
    discipline: "Track",
    workType: "plinth-casting",
    quantity: "22 m",
    matchStatus: "verified",
    matchScore: 95,
    proposedActivityId: "ACT-3.1.4",
    proposedActivityName: "Viaduct track plinth casting span 10–14",
    proposalId: "MPR-DEMO-008"
  }
];

export const sCurveData = [
  { month: "May 26", plan: 4.0, actual: 4.0, early: 6.0, late: 2.0 },
  { month: "Jun 26", plan: 11.0, actual: 10.5, early: 15.0, late: 7.0 },
  { month: "Jul 26", plan: 21.0, actual: 19.0, early: 27.0, late: 14.0 },
  { month: "Aug 26", plan: 32.0, actual: 28.5, early: 40.0, late: 22.0 },
  { month: "Sep 26 (DD)", plan: 44.2, actual: 37.8, early: 54.0, late: 31.0, isDataDate: true },
  { month: "Oct 26", plan: 58.0, actual: null, forecast: 51.0, early: 68.0, late: 42.0 },
  { month: "Nov 26", plan: 72.0, actual: null, forecast: 64.0, early: 82.0, late: 55.0 },
  { month: "Dec 26", plan: 85.0, actual: null, forecast: 77.0, early: 94.0, late: 68.0 },
  { month: "Jan 27", plan: 95.0, actual: null, forecast: 88.0, early: 100.0, late: 80.0 },
  { month: "Feb 27", plan: 100.0, actual: null, forecast: 96.0, early: 100.0, late: 90.0 },
  { month: "Mar 27", plan: 100.0, actual: null, forecast: 100.0, early: 100.0, late: 100.0 }
];

export const delayCauses = [
  { cause: "Rebar & Structural Steel Delivery Lead Time", percent: 38, hoursLost: 42, impact: "Critical Path", discipline: "Structural" },
  { cause: "Monsoon Rainfall & Water Ingress in Pits", percent: 24, hoursLost: 26, impact: "Substructure Float", discipline: "Civil" },
  { cause: "Underground Utility Clashes (Telecom & Water)", percent: 18, hoursLost: 20, impact: "Local Delay", discipline: "Civil" },
  { cause: "Formwork Crane Rig Downtime", percent: 12, hoursLost: 13, impact: "Sequence Delay", discipline: "Structural" },
  { cause: "Engineering Drawing Clarification RFIs", percent: 8, hoursLost: 9, impact: "Minor Delay", discipline: "Engineering" }
];

export const disciplineBurndown = [
  { discipline: "Civil & Earthworks", actual: 68, plan: 72, varianceDays: -4, status: "delayed", spi: 0.94 },
  { discipline: "Structural (Piers & Girders)", actual: 42, plan: 57, varianceDays: -18, status: "critical", spi: 0.74 },
  { discipline: "Track & Permanent Way", actual: 34, plan: 38, varianceDays: -6, status: "delayed", spi: 0.89 },
  { discipline: "Electrical & Traction", actual: 18, plan: 31, varianceDays: -12, status: "delayed", spi: 0.58 },
  { discipline: "Signaling & Telecom", actual: 12, plan: 14, varianceDays: -2, status: "on_track", spi: 0.86 }
];

export const durationVarianceStats = [
  { label: "Ahead of Schedule (>10% faster)", count: 8, percentage: 7 },
  { label: "On Track (±5% baseline)", count: 64, percentage: 54 },
  { label: "Moderate Delay (5–20% slower)", count: 32, percentage: 27 },
  { label: "Severe Critical Delay (>20% slower)", count: 14, percentage: 12 }
];

export const confidenceDistribution = [
  { tier: "Auto-Suggest (90–100%)", count: 216, percentage: 68, color: "var(--ex-color-success)" },
  { tier: "Review Band (70–89%)", count: 76, percentage: 24, color: "var(--ex-color-warning)" },
  { tier: "Fallback / Unmatched (<70%)", count: 26, percentage: 8, color: "var(--ex-color-text-muted)" }
];

export const historicalActivities: HistoricalActivity[] = [
  {
    id: "HIST-01",
    project: "Metro Line 1 (Corridor A)",
    activityName: "Pier P42 reinforcement fixing",
    plannedDays: 6,
    actualDays: 9,
    varianceDays: 3,
    variancePercent: 50,
    rootCause: "Rebar congestion at pier cap junction required cutting and re-bending on site.",
    keyLesson: "Pre-tied rebar cages with 3D BIM clash checks reduced cage placement duration by 35% on subsequent piers."
  },
  {
    id: "HIST-02",
    project: "Metro Line 1 (Corridor B)",
    activityName: "Pier P88 reinforcement fixing",
    plannedDays: 5,
    actualDays: 5,
    varianceDays: 0,
    variancePercent: 0,
    rootCause: "Completed on schedule with zero re-work.",
    keyLesson: "Offsite rebar fabrication yard with crane-assisted lowering ensured 100% schedule adherence."
  },
  {
    id: "HIST-03",
    project: "Metro Line 2 (Airport Link)",
    activityName: "Pier P14 reinforcement & shuttering",
    plannedDays: 7,
    actualDays: 11,
    varianceDays: 4,
    variancePercent: 57,
    rootCause: "Sudden monsoon cloudburst flooded foundation pit; dewatering pump failed.",
    keyLesson: "Deploy secondary standby diesel pumps during monsoon months (July–Sept) for all pier substructures."
  },
  {
    id: "HIST-04",
    project: "Metro Line 2 (Airport Link)",
    activityName: "Station STN-01 conduit & cable tray works",
    plannedDays: 10,
    actualDays: 14,
    varianceDays: 4,
    variancePercent: 40,
    rootCause: "Civil wall penetrations differed by 150mm from MEP drawing revision R2.",
    keyLesson: "Mandate structural sleeve verification prior to wall concrete pour to prevent core-drilling delays."
  }
];

export const benchmarkDurations: BenchmarkDuration[] = [
  { category: "Bored Piling (1.2m dia)", plannedMeanDays: 14.0, historicalMeanDays: 17.8, variancePercent: 27, confidence: "High (48 piers)", sampleSize: 48 },
  { category: "Pier Stem Rebar Fixing", plannedMeanDays: 8.0, historicalMeanDays: 10.4, variancePercent: 30, confidence: "High (52 piers)", sampleSize: 52 },
  { category: "Pier Cap Shuttering & Pour", plannedMeanDays: 12.0, historicalMeanDays: 14.1, variancePercent: 18, confidence: "High (44 piers)", sampleSize: 44 },
  { category: "U-Girder Segment Erection", plannedMeanDays: 3.0, historicalMeanDays: 3.2, variancePercent: 7, confidence: "Very High (110 spans)", sampleSize: 110 },
  { category: "Track Plinth Concrete Casting", plannedMeanDays: 4.0, historicalMeanDays: 4.5, variancePercent: 12, confidence: "Medium (24 spans)", sampleSize: 24 }
];

export const productivityPatterns = [
  { metric: "Rebar Fixing Productivity", planned: "1.20 tonnes / crew-day", actualHistorical: "0.85 tonnes / crew-day", variance: "-29%", note: "Tighter spacing at lap splices slows fixing speed" },
  { metric: "Formwork Erection Speed", planned: "18.0 m² / crew-day", actualHistorical: "14.2 m² / crew-day", variance: "-21%", note: "Curved pier geometry requires specialized alignment wedges" },
  { metric: "Concrete Pouring Output", planned: "32.0 m³ / hour", actualHistorical: "28.0 m³ / hour", variance: "-12%", note: "Transit mixer delays in urban traffic account for shortfall" }
];

export const ingestionHistoryList: IngestionFile[] = [
  { id: "ING-001", filename: "BL-MASTER-R12.xer", format: "XER", status: "active", recordsCount: 320, matchedCount: 320, timestamp: "25 Sep 18:42", details: "Active Master Schedule baseline (Data date 25 Sep 2026)" },
  { id: "ING-002", filename: "DPR-METRO-2026-09-25.xlsx", format: "DPR", status: "completed", recordsCount: 42, matchedCount: 40, timestamp: "25 Sep 21:00", details: "Parsed 42 daily progress items; 2 flagged for review" },
  { id: "ING-003", filename: "WHATSAPP-VOICE-LOG-26SEP.json", format: "Audio/Diary", status: "completed", recordsCount: 6, matchedCount: 5, timestamp: "26 Sep 06:12", details: "Time Agent speech-to-text extraction from field supervisors" },
  { id: "ING-004", filename: "BL-WEEKLY-DRAFT.csv", format: "CSV", status: "failed", recordsCount: 14, matchedCount: 0, timestamp: "24 Sep 14:15", details: "Validation failed: 2 activities missing stable IDs. Baseline unchanged." }
];

// All nine required labels for existing test compatibility plus expanded product navigation:
// ["Overview", "Live Execution", "Match Review", "Schedule Explorer", "Data Ingestion", "Verification", "Audit Trail", "Reports", "Settings"]
export const navItems = [
  ["overview", "Overview", "grid"],
  ["live", "Live Execution", "pulse"],
  ["review", "Match Review", "link"],
  ["schedule", "Schedule Explorer", "calendar"],
  ["ingestion", "Data Ingestion", "upload"],
  ["verification", "Verification Center", "check"],
  ["analytics", "Analytics", "chart"],
  ["memory", "Project Memory", "sparkles"],
  ["audit", "Audit Trail", "shield"],
  ["reports", "Reports", "doc"],
  ["settings", "Settings", "gear"]
] as const;

export const reports = [
  "Schedule Variance",
  "Verification Audit",
  "Match Quality",
  "Delay Register",
  "Discipline Progress"
];
