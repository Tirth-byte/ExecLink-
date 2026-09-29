/**
 * ExecLink Project Memory Synthetic Dataset & Models
 * Institutional knowledge system based on planner-verified historical execution.
 */

export type TimelineEvent = {
  date: string;
  title: string;
  type: "schedule" | "field" | "delay" | "verification";
  note?: string;
};

export type EvidenceItem = {
  id: string;
  filename: string;
  label: string;
  type: "dpr" | "pdf" | "image" | "verification";
  date: string;
  fileSize?: string;
  verifier?: string;
  description: string;
};

export type SimilarityBreakdown = {
  activityType: "Exact" | "Strong" | "Moderate";
  discipline: "Exact" | "Strong" | "Moderate";
  assetContext: "Exact" | "Strong" | "Moderate";
  wbsContext: "Exact" | "Strong" | "Moderate";
  locationContext: "Exact" | "Strong" | "Moderate";
  executionPattern: "Exact" | "Strong" | "Moderate";
};

export type HistoricalActivity = {
  id: string;
  name: string;
  project: string;
  discipline:
    | "Civil"
    | "Structural"
    | "Piping"
    | "Static Equipment"
    | "Rotating Equipment"
    | "Electrical"
    | "Instrumentation"
    | "HSE";
  wbs: string;
  wbsLevel: "L3" | "L4" | "L5" | "L6";
  workfront: string;
  contractor: string;
  plannedDuration: number;
  actualDuration: number;
  variance: number;
  delayCause: "Permit" | "Inspection" | "Access" | "Material" | "Weather" | "None";
  delayDurationDays: number;
  recordedNote: string;
  reusableLesson: string;
  similarityPct: number;
  similarityBreakdown: SimilarityBreakdown;
  similarityExplanation: string;
  executionTimeline: TimelineEvent[];
  sourceEvidence: EvidenceItem[];
  provenance: {
    source: string;
    status: string;
    auditIntegrity: string;
    lastIndexed: string;
    verifier: string;
  };
  tags: string[];
};

export type MemoryCoverage = {
  verifiedRecords: number;
  projectsCount: number;
  disciplinesCount: number;
  activitiesWithHistory: number;
  evidenceCoveragePct: number;
  lastIndexed: string;
};

export type RelatedPattern = {
  id: string;
  title: string;
  recordsCount: number;
  queryParam: string;
  delayCause?: string;
  discipline?: string;
};

export type NaturalLanguageAnswer = {
  summary: string;
  sampleSize: number;
  basis: string;
  keyTakeaways: string[];
};

export const memoryCoverageFixture: MemoryCoverage = {
  verifiedRecords: 1248,
  projectsCount: 7,
  disciplinesCount: 8,
  activitiesWithHistory: 186,
  evidenceCoveragePct: 91,
  lastIndexed: "26 Sep 2026 · 10:42",
};

export const relatedPatternsFixture: RelatedPattern[] = [
  {
    id: "pat-1",
    title: "Permit delays in hydrotesting",
    recordsCount: 8,
    queryParam: "Permit delays in hydrotesting",
    delayCause: "Permit",
    discipline: "Piping",
  },
  {
    id: "pat-2",
    title: "Piping testing overruns",
    recordsCount: 19,
    queryParam: "Piping testing overruns",
    discipline: "Piping",
  },
  {
    id: "pat-3",
    title: "Process Area testing activities",
    recordsCount: 31,
    queryParam: "Process Area testing activities",
  },
  {
    id: "pat-4",
    title: "P-110 related execution history",
    recordsCount: 7,
    queryParam: "Activities involving P-110",
  },
];

export type ReusableLessonSummary = {
  id: string;
  number: string;
  lesson: string;
  observedContext: string;
  activityIds: string[];
  delayCause?: "Permit" | "Inspection" | "Access" | "Material" | "Weather" | "None" | "Other";
};

export const reusableLessonsFixture: ReusableLessonSummary[] = [
  {
    id: "les-01",
    number: "01",
    lesson: "Confirm hydrotest permit readiness before planned test window.",
    observedContext: "Observed across 5 verified historical activities.",
    activityIds: ["HIST-P087", "HIST-P168", "HIST-P062", "HIST-P144", "HIST-P128"],
    delayCause: "Permit",
  },
  {
    id: "les-02",
    number: "02",
    lesson: "Complete inspection/sign-off coordination before mobilizing test equipment.",
    observedContext: "Observed across 3 verified activities.",
    activityIds: ["HIST-P042", "HIST-P055", "HIST-P104"],
    delayCause: "Inspection",
  },
  {
    id: "les-03",
    number: "03",
    lesson: "Check heavy-equipment/access corridor availability during daily coordination.",
    observedContext: "Observed across 2 verified activities.",
    activityIds: ["HIST-P221", "HIST-P310"],
    delayCause: "Access",
  },
];

export const naturalLanguageAnswers: Record<string, NaturalLanguageAnswer> = {
  "why do hydrotests run late": {
    summary:
      "Across 13 comparable verified hydrotest activities, 8 recorded an execution delay. Permit revalidation was the primary constraint (38% of records), followed by inspection sign-offs (25%) and corridor access (15%).",
    sampleSize: 13,
    basis: "13 comparable verified piping hydrotest records across 5 industrial process projects (2019–2026).",
    keyTakeaways: [
      "Permit revalidation following minor punch-list items caused an average hold time of 1.4 days.",
      "Pressure gauge recalibration certification is frequently missing at initial mobilization.",
      "Activities confirming permit validity 24h prior experienced zero mobilization hold time.",
    ],
  },
  "how long do similar hydrotests usually take": {
    summary:
      "Across 13 comparable verified activities, observed actual duration had a median of 4.6 days, compared with a median planned duration of 3.0 days. Typical observed variance is +1.6 days.",
    sampleSize: 13,
    basis: "13 comparable verified activities with 91% evidence audit coverage.",
    keyTakeaways: [
      "31% of comparable hydrotest packages finished within the 3.0 day baseline.",
      "Multi-spool systems with blind flange installations median: 5.0 days.",
      "Single-manifold package test packs median: 3.0 days.",
    ],
  },
};

export const historicalActivitiesFixture: HistoricalActivity[] = [
  // 1. P-087 Hydrotest (Primary Golden Path Selected Item)
  {
    id: "HIST-P087",
    name: "P-087 Hydrotest & NDT Examination",
    project: "South Process Expansion",
    discipline: "Piping",
    wbs: "Process Area → Piping → Testing",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Delta Piping Ltd",
    plannedDuration: 3,
    actualDuration: 5,
    variance: 2,
    delayCause: "Permit",
    delayDurationDays: 1.4,
    recordedNote:
      "Hydrotest start delayed while confined-space work permit was revalidated following client inspection audit.",
    reusableLesson:
      "Permit readiness should be confirmed and pre-signed 24 hours prior to hydrotest package mobilization.",
    similarityPct: 94,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Strong",
      wbsContext: "Strong",
      locationContext: "Moderate",
      executionPattern: "Strong",
    },
    similarityExplanation:
      "This record is highly comparable because both activities are piping hydrotests within process-area work packages and share similar schedule context.",
    executionTimeline: [
      { date: "12 Mar 2025", title: "Planned Start", type: "schedule", note: "Baseline schedule target" },
      { date: "12 Mar 2025", title: "Actual Start & Pre-fill", type: "field", note: "Water filling commenced" },
      { date: "13 Mar 2025", title: "Hydrotest preparation complete", type: "field", note: "Blind flanges torqued" },
      { date: "14 Mar 2025", title: "Blocked — Work Permit Revalidation", type: "delay", note: "Inspector requested re-sign" },
      { date: "15 Mar 2025", title: "Permit released & Pressurization", type: "field", note: "4-hour hold reached" },
      { date: "17 Mar 2025", title: "Hydrotest completed & Drained", type: "field", note: "Golden welds accepted" },
      { date: "17 Mar 2025", title: "Planner verified completion", type: "verification", note: "Verified by USR-PLN-014" },
    ],
    sourceEvidence: [
      {
        id: "ev-1",
        filename: "DPR_17_Mar_2025.xlsx",
        label: "Daily Progress Report",
        type: "dpr",
        date: "17 Mar 2025",
        fileSize: "1.4 MB",
        description: "Shift supervisor DPR detailing hydrostatic water drainage and spool sign-off.",
      },
      {
        id: "ev-2",
        filename: "Permit_Log_PA3.pdf",
        label: "Permit Register",
        type: "pdf",
        date: "15 Mar 2025",
        fileSize: "420 KB",
        description: "Hot work and confined space permit clearance log from Area B safety office.",
      },
      {
        id: "ev-3",
        filename: "IMG_P087_Completion.jpg",
        label: "Field Evidence",
        type: "image",
        date: "17 Mar 2025",
        fileSize: "2.8 MB",
        description: "Calibrated chart recorder and pressure gauge manifold photo during final hold.",
      },
      {
        id: "ev-4",
        filename: "Planner_Reconciliation_Log.pdf",
        label: "Planner Verification",
        type: "verification",
        date: "17 Mar 2025 · 18:42",
        fileSize: "180 KB",
        verifier: "USR-PLN-014",
        description: "Official planner actual-progress sign-off into Primavera P6 verified baseline.",
      },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "17 Mar 2025",
      verifier: "USR-PLN-014 (Senior Lead Planner)",
    },
    tags: ["Hydrotest", "Piping", "P-110", "Permit", "Process Area"],
  },

  // 2. P-042 Hydrotest
  {
    id: "HIST-P042",
    name: "P-042 Process Line Pressure Test",
    project: "North Utility Upgrade",
    discipline: "Piping",
    wbs: "Utility Plant → Piping → Testing",
    wbsLevel: "L6",
    workfront: "Area A",
    contractor: "Delta Piping Ltd",
    plannedDuration: 3,
    actualDuration: 4,
    variance: 1,
    delayCause: "Inspection",
    delayDurationDays: 0.8,
    recordedNote: "Third-party NDT inspector delayed on adjacent flare header before arriving on site.",
    reusableLesson: "Schedule third-party inspector 48 hours prior to test pressurization window.",
    similarityPct: 91,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Strong",
      wbsContext: "Strong",
      locationContext: "Moderate",
      executionPattern: "Strong",
    },
    similarityExplanation: "Matches package size, pressure tier (ANSI 600#) and test fluid specifications.",
    executionTimeline: [
      { date: "04 May 2024", title: "Planned Start", type: "schedule" },
      { date: "04 May 2024", title: "Actual Start & Nitrogen Purge", type: "field" },
      { date: "05 May 2024", title: "Delayed — NDT Inspector Waiting", type: "delay" },
      { date: "06 May 2024", title: "Inspection Passed", type: "field" },
      { date: "08 May 2024", title: "Verified Complete", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-21", filename: "DPR_08_May_2024.xlsx", label: "Daily Progress Report", type: "dpr", date: "08 May 2024", description: "Daily site log verifying hydro completion." },
      { id: "ev-22", filename: "NDT_Certificate_P042.pdf", label: "Inspection Report", type: "pdf", date: "06 May 2024", description: "Approved radiographic and visual examination certificate." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "08 May 2024",
      verifier: "USR-PLN-009",
    },
    tags: ["Hydrotest", "Piping", "Inspection", "Utility Plant"],
  },

  // 3. P-221 Pressure Test
  {
    id: "HIST-P221",
    name: "P-221 HP Steam System Pressure Test",
    project: "West Process Revamp",
    discipline: "Piping",
    wbs: "Process Area → High Pressure Piping → Testing",
    wbsLevel: "L5",
    workfront: "Area B",
    contractor: "Summit Civil",
    plannedDuration: 3,
    actualDuration: 4.6,
    variance: 1.6,
    delayCause: "Access",
    delayDurationDays: 1.1,
    recordedNote: "Scaffolding modification required to access upper bleed valve on elevation +14m.",
    reusableLesson: "Verify high-point vent valve scaffold access during initial test pack walkthrough.",
    similarityPct: 88,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Strong",
      wbsContext: "Moderate",
      locationContext: "Strong",
      executionPattern: "Strong",
    },
    similarityExplanation: "High overlap in piping diameter (16-inch) and elevation access requirements.",
    executionTimeline: [
      { date: "10 Oct 2024", title: "Line Isolation Complete", type: "field" },
      { date: "11 Oct 2024", title: "Scaffold Modification Delay", type: "delay" },
      { date: "14 Oct 2024", title: "Test Complete", type: "field" },
      { date: "15 Oct 2024", title: "Reconciliation Approved", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-31", filename: "Scaffold_Tag_Audit.pdf", label: "Safety Register", type: "pdf", date: "11 Oct 2024", description: "Scaffold handover inspection certificate." },
      { id: "ev-32", filename: "Hydrotest_Pack_P221.pdf", label: "Test Dossier", type: "pdf", date: "14 Oct 2024", description: "Complete pressure chart recorder log." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "15 Oct 2024",
      verifier: "USR-PLN-012",
    },
    tags: ["Hydrotest", "Piping", "Access", "Steam"],
  },

  // 4. P-115 Hydrotest Area A (On-Time)
  {
    id: "HIST-P115",
    name: "P-115 Condensate Return Hydrotest",
    project: "Terminal Expansion",
    discipline: "Piping",
    wbs: "Terminal → Piping → Hydrotesting",
    wbsLevel: "L6",
    workfront: "Area A",
    contractor: "Delta Piping Ltd",
    plannedDuration: 3,
    actualDuration: 3,
    variance: 0,
    delayCause: "None",
    delayDurationDays: 0,
    recordedNote: "Pack tested on schedule with all blind plates prefabricated and pre-certified.",
    reusableLesson: "Prefabricating test spades and blinds in workshop eliminates field fit-up latency.",
    similarityPct: 86,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Moderate",
      wbsContext: "Strong",
      locationContext: "Moderate",
      executionPattern: "Exact",
    },
    similarityExplanation: "Executed by the same subcontractor (Delta Piping Ltd) with matched spool volume.",
    executionTimeline: [
      { date: "02 Jun 2025", title: "Spool Torquing", type: "field" },
      { date: "04 Jun 2025", title: "4-Hour Hydrotest Hold", type: "field" },
      { date: "05 Jun 2025", title: "Verified On Time", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-41", filename: "DPR_05_Jun_2025.xlsx", label: "Daily Progress Report", type: "dpr", date: "05 Jun 2025", description: "Zero variance verification entry." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "05 Jun 2025",
      verifier: "USR-PLN-014",
    },
    tags: ["Hydrotest", "Piping", "On-Time", "Terminal"],
  },

  // 5. P-093 Nitrogen Leak Test
  {
    id: "HIST-P093",
    name: "P-093 Nitrogen-Helium Leak Test",
    project: "South Process Expansion",
    discipline: "Piping",
    wbs: "Process Area → Gas Systems → Leak Testing",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Delta Piping Ltd",
    plannedDuration: 2,
    actualDuration: 4,
    variance: 2,
    delayCause: "Permit",
    delayDurationDays: 1.5,
    recordedNote: "Inert gas discharge permit held up by simultaneous work in sector.",
    reusableLesson: "Check SIMOPS matrix for adjacent electrical or hot work prior to gas testing.",
    similarityPct: 85,
    similarityBreakdown: {
      activityType: "Moderate",
      discipline: "Exact",
      assetContext: "Strong",
      wbsContext: "Strong",
      locationContext: "Strong",
      executionPattern: "Strong",
    },
    similarityExplanation: "Same process area and contractor as P-110, identical safety boundary zone.",
    executionTimeline: [
      { date: "18 Aug 2025", title: "Pressurization Start", type: "field" },
      { date: "19 Aug 2025", title: "SIMOPS Exclusion Delay", type: "delay" },
      { date: "21 Aug 2025", title: "Test Complete", type: "field" },
      { date: "22 Aug 2025", title: "Verified", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-51", filename: "SIMOPS_Log_PA.pdf", label: "Operations Log", type: "pdf", date: "19 Aug 2025", description: "Safety exclusion zone conflict documentation." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "22 Aug 2025",
      verifier: "USR-PLN-011",
    },
    tags: ["Hydrotest", "Piping", "Permit", "SIMOPS"],
  },

  // 6. P-168 High Pressure Water Test
  {
    id: "HIST-P168",
    name: "P-168 Feed Separator Hydrotest",
    project: "Process Train Upgrade",
    discipline: "Piping",
    wbs: "Process Train → Separators → Hydrotest",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Apex Constructors",
    plannedDuration: 4,
    actualDuration: 6,
    variance: 2,
    delayCause: "Permit",
    delayDurationDays: 1.3,
    recordedNote: "Environmental discharge permit for treated hydrotest water required supplementary approval.",
    reusableLesson: "Submit water disposal and chemical inhibitor neutralization plan at least 7 days ahead.",
    similarityPct: 84,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Strong",
      wbsContext: "Moderate",
      locationContext: "Strong",
      executionPattern: "Strong",
    },
    similarityExplanation: "Shares fluid chemistry (corrosion inhibitor dosed demineralized water) and volume.",
    executionTimeline: [
      { date: "14 Jan 2026", title: "Filling Started", type: "field" },
      { date: "16 Jan 2026", title: "Water Disposal Permit Hold", type: "delay" },
      { date: "19 Jan 2026", title: "Discharge & Drain Accepted", type: "field" },
      { date: "20 Jan 2026", title: "Verified", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-61", filename: "Water_Discharge_Permit.pdf", label: "Environmental Permit", type: "pdf", date: "16 Jan 2026", description: "Environmental agency disposal sign-off." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "20 Jan 2026",
      verifier: "USR-PLN-014",
    },
    tags: ["Hydrotest", "Piping", "Permit", "Process Area"],
  },

  // 7. P-055 Hydrotest & Flushing
  {
    id: "HIST-P055",
    name: "P-055 Lube Oil Supply Hydrotest & Flushing",
    project: "North Utility Upgrade",
    discipline: "Piping",
    wbs: "Compressor Building → Lube Piping → Testing",
    wbsLevel: "L5",
    workfront: "Area A",
    contractor: "Delta Piping Ltd",
    plannedDuration: 3,
    actualDuration: 4,
    variance: 1,
    delayCause: "Inspection",
    delayDurationDays: 0.9,
    recordedNote: "Flushing mesh particulate count exceeded ISO tolerance on first flush attempt.",
    reusableLesson: "Inspect pickling and passivated spools visually before bolt-up to reduce flushing cycles.",
    similarityPct: 82,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Moderate",
      wbsContext: "Moderate",
      locationContext: "Moderate",
      executionPattern: "Strong",
    },
    similarityExplanation: "Comparable clean-spec piping hydrotest with Delta Piping Ltd execution crew.",
    executionTimeline: [
      { date: "11 Nov 2024", title: "Test Started", type: "field" },
      { date: "13 Nov 2024", title: "Mesh Particulate Check Re-inspect", type: "delay" },
      { date: "15 Nov 2024", title: "Verified Complete", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-71", filename: "Lube_Oil_Lab_Report.pdf", label: "Lab Certificate", type: "pdf", date: "14 Nov 2024", description: "Fluid cleanliness certification." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "15 Nov 2024",
      verifier: "USR-PLN-009",
    },
    tags: ["Hydrotest", "Piping", "Inspection"],
  },

  // 8. P-310 Process Line Hydrotest
  {
    id: "HIST-P310",
    name: "P-310 Hydrocarbon Header Hydrotest",
    project: "West Refinery Revamp",
    discipline: "Piping",
    wbs: "Process Area → Main Header → Testing",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Summit Civil",
    plannedDuration: 3,
    actualDuration: 5,
    variance: 2,
    delayCause: "Access",
    delayDurationDays: 1.2,
    recordedNote: "Mobile crane occupied haul road preventing test pump skid positioning.",
    reusableLesson: "Coordinate heavy equipment logistics corridor in daily 07:00 coordination meeting.",
    similarityPct: 80,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Strong",
      wbsContext: "Strong",
      locationContext: "Moderate",
      executionPattern: "Moderate",
    },
    similarityExplanation: "High geometric similarity in piping layout and header test boundaries.",
    executionTimeline: [
      { date: "08 Jul 2025", title: "Pump Skid Mobilized", type: "field" },
      { date: "09 Jul 2025", title: "Haul Road Blockage", type: "delay" },
      { date: "12 Jul 2025", title: "Pressure Verified", type: "field" },
      { date: "13 Jul 2025", title: "Planner Approved", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-81", filename: "DPR_13_Jul_2025.xlsx", label: "Daily Progress Report", type: "dpr", date: "13 Jul 2025", description: "Haul road conflict recorded in field log." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "13 Jul 2025",
      verifier: "USR-PLN-012",
    },
    tags: ["Hydrotest", "Piping", "Access", "Process Area"],
  },

  // 9. P-194 Utility Water Hydrotest (On-Time)
  {
    id: "HIST-P194",
    name: "P-194 Cooling Water Return Hydrotest",
    project: "South Process Expansion",
    discipline: "Piping",
    wbs: "Cooling Towers → Underground Piping → Testing",
    wbsLevel: "L6",
    workfront: "Area C",
    contractor: "Delta Piping Ltd",
    plannedDuration: 3,
    actualDuration: 3,
    variance: 0,
    delayCause: "None",
    delayDurationDays: 0,
    recordedNote: "Pre-job safety checklist completed; permit issued without revision.",
    reusableLesson: "Standardized blind test kit reduces installation time by ~4 hours.",
    similarityPct: 79,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Moderate",
      wbsContext: "Moderate",
      locationContext: "Moderate",
      executionPattern: "Strong",
    },
    similarityExplanation: "Same piping specification and contractor; on-time execution reference.",
    executionTimeline: [
      { date: "21 Sep 2025", title: "Test Blind Setup", type: "field" },
      { date: "23 Sep 2025", title: "Pressure Chart Accepted", type: "field" },
      { date: "24 Sep 2025", title: "Reconciliation Closed", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-91", filename: "Pressure_Chart_P194.jpg", label: "Field Evidence", type: "image", date: "23 Sep 2025", description: "Barton chart recorder trace with inspector stamp." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "24 Sep 2025",
      verifier: "USR-PLN-014",
    },
    tags: ["Hydrotest", "Piping", "On-Time"],
  },

  // 10. P-278 Tie-in Spool Hydrotest
  {
    id: "HIST-P278",
    name: "P-278 Unit Tie-in Spool Hydrotest",
    project: "Terminal Expansion",
    discipline: "Piping",
    wbs: "Battery Limit → Spool Tie-in → Hydrotest",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Summit Civil",
    plannedDuration: 2,
    actualDuration: 3,
    variance: 1,
    delayCause: "Material",
    delayDurationDays: 0.9,
    recordedNote: "Replacement spiral wound gasket specification discrepancy at battery limit flange.",
    reusableLesson: "Verify gasket metallurgy rating in warehouse before breaking pipe containment.",
    similarityPct: 77,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Moderate",
      wbsContext: "Strong",
      locationContext: "Moderate",
      executionPattern: "Moderate",
    },
    similarityExplanation: "Battery limit test pack with identical flange class (Class 300 RF).",
    executionTimeline: [
      { date: "14 Feb 2025", title: "Spool Placement", type: "field" },
      { date: "15 Feb 2025", title: "Gasket MTR Verification Delay", type: "delay" },
      { date: "17 Feb 2025", title: "Hydrotest Accepted", type: "field" },
      { date: "18 Feb 2025", title: "Verified", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-101", filename: "MTR_Gasket_Spiral.pdf", label: "Material Test Report", type: "pdf", date: "15 Feb 2025", description: "Corrected 316SS spiral gasket certification." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "18 Feb 2025",
      verifier: "USR-PLN-010",
    },
    tags: ["Hydrotest", "Piping", "Material", "Tie-in"],
  },

  // 11. P-104 Sectional Hydrotest
  {
    id: "HIST-P104",
    name: "P-104 Compressor Interstage Hydrotest",
    project: "Process Train Upgrade",
    discipline: "Piping",
    wbs: "Compressor Train → Interstage Piping → Hydrotest",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Apex Constructors",
    plannedDuration: 4,
    actualDuration: 5,
    variance: 1,
    delayCause: "Inspection",
    delayDurationDays: 1.0,
    recordedNote: "Client QA inspector requested supplementary ultrasonic shear wave test on shop weld.",
    reusableLesson: "Audit shop spool documentation package prior to hydrotest pack compilation.",
    similarityPct: 75,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Strong",
      wbsContext: "Moderate",
      locationContext: "Moderate",
      executionPattern: "Moderate",
    },
    similarityExplanation: "Heavy wall piping (Sch 120) with comparable inspection requirements.",
    executionTimeline: [
      { date: "28 Mar 2025", title: "Hydro Pressure Held", type: "field" },
      { date: "30 Mar 2025", title: "NDT Weld Retest", type: "delay" },
      { date: "02 Apr 2025", title: "Verified Complete", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-111", filename: "UT_Inspection_Report.pdf", label: "NDT Report", type: "pdf", date: "31 Mar 2025", description: "Ultrasonic weld inspection clearance." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "02 Apr 2025",
      verifier: "USR-PLN-014",
    },
    tags: ["Hydrotest", "Piping", "Inspection"],
  },

  // 12. P-062 Final System Hydrotest (Longest Duration 7d)
  {
    id: "HIST-P062",
    name: "P-062 Demin Water Header Final Hydrotest",
    project: "Utility Modernization",
    discipline: "Piping",
    wbs: "Utility System → Water Treatment → Hydrotest",
    wbsLevel: "L5",
    workfront: "Area A",
    contractor: "Delta Piping Ltd",
    plannedDuration: 5,
    actualDuration: 7,
    variance: 2,
    delayCause: "Permit",
    delayDurationDays: 1.8,
    recordedNote: "Confined space permit required ventilation modification due to nitrogen purge purge backflow.",
    reusableLesson: "Isolate nitrogen header with positive blind, not merely valve lock, before personnel enter test trench.",
    similarityPct: 74,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Moderate",
      wbsContext: "Moderate",
      locationContext: "Moderate",
      executionPattern: "Strong",
    },
    similarityExplanation: "Demonstrates upper tail duration behavior (7 days) for complex multi-point test packs.",
    executionTimeline: [
      { date: "15 Oct 2024", title: "Flange Preparation", type: "field" },
      { date: "17 Oct 2024", title: "Ventilation Hold on Trench", type: "delay" },
      { date: "21 Oct 2024", title: "Final Pressure Chart Approved", type: "field" },
      { date: "22 Oct 2024", title: "Planner Verification", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-121", filename: "Trench_Safety_Log.pdf", label: "HSE Audit", type: "pdf", date: "18 Oct 2024", description: "Atmospheric test log verifying zero oxygen deficit." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "22 Oct 2024",
      verifier: "USR-PLN-009",
    },
    tags: ["Hydrotest", "Piping", "Permit", "Upper-Tail"],
  },

  // 13. P-144 Fuel Gas Manifold Hydrotest
  {
    id: "HIST-P144",
    name: "P-144 Fuel Gas Manifold Hydrotest",
    project: "South Process Expansion",
    discipline: "Piping",
    wbs: "Process Area → Fuel Gas → Hydrotest",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Delta Piping Ltd",
    plannedDuration: 3,
    actualDuration: 5,
    variance: 2,
    delayCause: "Permit",
    delayDurationDays: 1.5,
    recordedNote: "Hot work permit re-validation required after morning shift change safety walkdown.",
    reusableLesson: "Schedule shift handovers with simultaneous permit re-endorsements to avoid downtime.",
    similarityPct: 81,
    similarityBreakdown: {
      activityType: "Strong",
      discipline: "Exact",
      assetContext: "Strong",
      wbsContext: "Strong",
      locationContext: "Exact",
      executionPattern: "Strong",
    },
    similarityExplanation: "Identical fuel gas manifold assembly in adjacent Area B process train.",
    executionTimeline: [
      { date: "10 May 2025", title: "Flange Bolting & Blinding", type: "field" },
      { date: "12 May 2025", title: "Permit Revalidation Hold", type: "delay" },
      { date: "14 May 2025", title: "Test Pressure Achieved", type: "field" },
      { date: "15 May 2025", title: "Planner Verification", type: "verification" },
    ],
    sourceEvidence: [
      { id: "ev-144", filename: "Permit_Reval_PA2.pdf", label: "Permit Endorsement", type: "pdf", date: "12 May 2025", description: "Area B safety supervisor revalidation stamp." },
    ],
    provenance: {
      source: "Verified execution history",
      status: "Planner verified",
      auditIntegrity: "Verified",
      lastIndexed: "15 May 2025",
      verifier: "USR-PLN-014",
    },
    tags: ["Hydrotest", "Piping", "Permit", "Process Area", "P-110"],
  },

  // -------------------------------------------------------------
  // OTHER DISCIPLINES (Total >30 historical activities across all 8 disciplines)
  // -------------------------------------------------------------

  // 13. Civil: Foundation Pour Area B
  {
    id: "HIST-C101",
    name: "C-101 Foundation Concrete Pour Area B",
    project: "South Process Expansion",
    discipline: "Civil",
    wbs: "Substructure → Foundation → Concrete",
    wbsLevel: "L5",
    workfront: "Area B",
    contractor: "Summit Civil",
    plannedDuration: 5,
    actualDuration: 6,
    variance: 1,
    delayCause: "Weather",
    delayDurationDays: 1.0,
    recordedNote: "Heavy rainstorm exceeded maximum allowable pour moisture on rebar cage.",
    reusableLesson: "Keep tarpaulin cover structures on standby for deep raft foundations during monsoon transition.",
    similarityPct: 82,
    similarityBreakdown: { activityType: "Exact", discipline: "Exact", assetContext: "Strong", wbsContext: "Strong", locationContext: "Strong", executionPattern: "Strong" },
    similarityExplanation: "Direct foundation pour match in Area B with batch plant logistics.",
    executionTimeline: [
      { date: "04 Aug 2024", title: "Rebar Inspection Passed", type: "field" },
      { date: "05 Aug 2024", title: "Weather Standstill", type: "delay" },
      { date: "10 Aug 2024", title: "Pour & Cure Complete", type: "field" },
    ],
    sourceEvidence: [{ id: "ev-c1", filename: "Batch_Plant_Dockets.pdf", label: "Batch Tickets", type: "dpr", date: "07 Aug 2024", description: "Concrete delivery and cube crush test reports." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "12 Aug 2024", verifier: "USR-PLN-014" },
    tags: ["Foundation", "Civil", "Concrete", "Area B"],
  },

  // 14. Civil: Excavation Sector 2
  {
    id: "HIST-C102",
    name: "C-102 Trenching & Soil Compaction Sector 2",
    project: "Terminal Expansion",
    discipline: "Civil",
    wbs: "Site Prep → Earthworks → Excavation",
    wbsLevel: "L5",
    workfront: "Area A",
    contractor: "Summit Civil",
    plannedDuration: 7,
    actualDuration: 7,
    variance: 0,
    delayCause: "None",
    delayDurationDays: 0,
    recordedNote: "Executed smoothly with verified underground utility GPR scan completed prior.",
    reusableLesson: "Ground penetrating radar scan prevents buried line strikes and excavation stops.",
    similarityPct: 75,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Moderate", wbsContext: "Strong", locationContext: "Moderate", executionPattern: "Exact" },
    similarityExplanation: "Civil bulk earthwork reference with zero schedule variance.",
    executionTimeline: [{ date: "10 Jan 2025", title: "Excavation Started", type: "field" }, { date: "17 Jan 2025", title: "Proof Roll Passed", type: "field" }],
    sourceEvidence: [{ id: "ev-c2", filename: "GPR_Scan_Sector2.pdf", label: "GPR Clearance", type: "pdf", date: "09 Jan 2025", description: "Subsurface utility engineering clearance." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "18 Jan 2025", verifier: "USR-PLN-010" },
    tags: ["Excavation", "Civil", "On-Time"],
  },

  // 15. Structural: Pipe Rack Module Lift
  {
    id: "HIST-S201",
    name: "S-201 Pipe Rack Module 2 Heavy Lift",
    project: "South Process Expansion",
    discipline: "Structural",
    wbs: "Superstructure → Pipe Racks → Heavy Lift",
    wbsLevel: "L5",
    workfront: "Area A",
    contractor: "Summit Civil",
    plannedDuration: 12,
    actualDuration: 17,
    variance: 5,
    delayCause: "Access",
    delayDurationDays: 3.5,
    recordedNote: "Wind velocity exceeded 20 knots safety threshold for 500-ton crane tandem lift.",
    reusableLesson: "Include 3-day meteorological wind window allowance for modular lifts above 30m.",
    similarityPct: 89,
    similarityBreakdown: { activityType: "Exact", discipline: "Exact", assetContext: "Strong", wbsContext: "Strong", locationContext: "Strong", executionPattern: "Moderate" },
    similarityExplanation: "Identical tandem crane rig setup and modular steel weight envelope (140 metric tons).",
    executionTimeline: [
      { date: "15 Sep 2024", title: "Crane Rigged", type: "field" },
      { date: "18 Sep 2024", title: "Wind Hold Condition", type: "delay" },
      { date: "28 Sep 2024", title: "Module Bolted", type: "field" },
    ],
    sourceEvidence: [{ id: "ev-s1", filename: "Rigging_Study_M02.pdf", label: "Lift Plan", type: "pdf", date: "14 Sep 2024", description: "Engineered critical lift study." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "30 Sep 2024", verifier: "USR-PLN-014" },
    tags: ["Structural", "Heavy Lift", "Module", "Access"],
  },

  // 16. Structural: Steel Framing Area B
  {
    id: "HIST-S202",
    name: "S-202 Compressor Shelter Steel Erection",
    project: "Process Train Upgrade",
    discipline: "Structural",
    wbs: "Buildings → Structural Steel → Framing",
    wbsLevel: "L5",
    workfront: "Area B",
    contractor: "Summit Civil",
    plannedDuration: 8,
    actualDuration: 11,
    variance: 3,
    delayCause: "Material",
    delayDurationDays: 2.1,
    recordedNote: "Missing anchor bolts batch from galvanizing supplier delayed column base setting.",
    reusableLesson: "Anchor bolt cage delivery must be verified at site laydown prior to civil grout turnover.",
    similarityPct: 83,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Strong", wbsContext: "Moderate", locationContext: "Strong", executionPattern: "Moderate" },
    similarityExplanation: "Compressor shelter framing matching Area B geometry and anchor layout.",
    executionTimeline: [{ date: "02 Mar 2025", title: "Base Setting Delay", type: "delay" }, { date: "13 Mar 2025", title: "Frame Plumbed", type: "field" }],
    sourceEvidence: [{ id: "ev-s2", filename: "NCR_Anchor_Bolts.pdf", label: "Non-Conformance Report", type: "pdf", date: "03 Mar 2025", description: "Bolting discrepancy rectification." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "14 Mar 2025", verifier: "USR-PLN-014" },
    tags: ["Structural", "Material", "Framing"],
  },

  // 17. Static Equipment: Vessel V-101 Setting
  {
    id: "HIST-EQ101",
    name: "EQ-101 Separator Vessel V-101 Rigging & Setting",
    project: "South Process Expansion",
    discipline: "Static Equipment",
    wbs: "Equipment → Separators → Rigging",
    wbsLevel: "L5",
    workfront: "Area A",
    contractor: "Apex Constructors",
    plannedDuration: 4,
    actualDuration: 5,
    variance: 1,
    delayCause: "Inspection",
    delayDurationDays: 0.9,
    recordedNote: "Foundation anchor bolt elevation survey discrepancy required shimming sign-off.",
    reusableLesson: "Verify foundation survey tolerance with total station 48 hours prior to vessel transport.",
    similarityPct: 87,
    similarityBreakdown: { activityType: "Exact", discipline: "Exact", assetContext: "Strong", wbsContext: "Strong", locationContext: "Strong", executionPattern: "Strong" },
    similarityExplanation: "Direct static vessel installation match for Area A process package.",
    executionTimeline: [{ date: "20 May 2024", title: "Transport to Pad", type: "field" }, { date: "22 May 2024", title: "Survey Shimming Hold", type: "delay" }, { date: "25 May 2024", title: "Grouting Accepted", type: "verification" }],
    sourceEvidence: [{ id: "ev-eq1", filename: "Survey_Shim_Calculation.pdf", label: "Engineering Calc", type: "pdf", date: "22 May 2024", description: "Structural engineer approved shim pack calculation." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "26 May 2024", verifier: "USR-PLN-014" },
    tags: ["Static Equipment", "Vessel", "Inspection"],
  },

  // 18. Static Equipment: Exchanger E-102 Bundle Pull
  {
    id: "HIST-EQ102",
    name: "EQ-102 Heat Exchanger Tube Bundle Installation",
    project: "West Refinery Revamp",
    discipline: "Static Equipment",
    wbs: "Equipment → Heat Exchangers → Bundle Setting",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Apex Constructors",
    plannedDuration: 3,
    actualDuration: 3,
    variance: 0,
    delayCause: "None",
    delayDurationDays: 0,
    recordedNote: "Bundle extractor mobilized with specialist crew; zero flange damage.",
    reusableLesson: "Using dedicated bundle puller prevents shell internal cladding scratches.",
    similarityPct: 81,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Moderate", wbsContext: "Strong", locationContext: "Moderate", executionPattern: "Exact" },
    similarityExplanation: "Standard shell and tube exchanger placement reference.",
    executionTimeline: [{ date: "14 Aug 2025", title: "Bundle Inserted", type: "field" }, { date: "17 Aug 2025", title: "Channel Head Torqued", type: "field" }],
    sourceEvidence: [{ id: "ev-eq2", filename: "Torque_Card_E102.pdf", label: "Torque Register", type: "pdf", date: "16 Aug 2025", description: "Hydraulic torque wrench calibration log." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "18 Aug 2025", verifier: "USR-PLN-012" },
    tags: ["Static Equipment", "Exchanger", "On-Time"],
  },

  // 19. Rotating Equipment: Pump P-201A Alignment
  {
    id: "HIST-R201",
    name: "R-201 Feed Pump P-201A Final Laser Alignment",
    project: "South Process Expansion",
    discipline: "Rotating Equipment",
    wbs: "Rotating → Pumps → Alignment",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Apex Constructors",
    plannedDuration: 5,
    actualDuration: 7,
    variance: 2,
    delayCause: "Material",
    delayDurationDays: 1.4,
    recordedNote: "Soft foot condition caused by baseplate distortion during grouting.",
    reusableLesson: "Perform preliminary soft foot check before pouring non-shrink epoxy grout.",
    similarityPct: 88,
    similarityBreakdown: { activityType: "Exact", discipline: "Exact", assetContext: "Strong", wbsContext: "Strong", locationContext: "Strong", executionPattern: "Strong" },
    similarityExplanation: "Direct alignment match for high-temperature multistage centrifugal pump.",
    executionTimeline: [{ date: "10 Oct 2024", title: "Laser Target Mounted", type: "field" }, { date: "12 Oct 2024", title: "Soft Foot Correction", type: "delay" }, { date: "17 Oct 2024", title: "Coupling Signed", type: "verification" }],
    sourceEvidence: [{ id: "ev-r1", filename: "Laser_Alignment_Report.pdf", label: "Alignment Sheet", type: "pdf", date: "15 Oct 2024", description: "Dial indicator and laser shaft report." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "18 Oct 2024", verifier: "USR-PLN-014" },
    tags: ["Rotating Equipment", "Pump", "Material", "Alignment"],
  },

  // 20. Rotating Equipment: Compressor Coupling
  {
    id: "HIST-R202",
    name: "R-202 Compressor Train Shaft Coupling & Solo Run",
    project: "Process Train Upgrade",
    discipline: "Rotating Equipment",
    wbs: "Compressor → Driver → Solo Run",
    wbsLevel: "L5",
    workfront: "Area B",
    contractor: "Apex Constructors",
    plannedDuration: 6,
    actualDuration: 8,
    variance: 2,
    delayCause: "Inspection",
    delayDurationDays: 1.2,
    recordedNote: "OEM technical advisor arrival delayed by flight cancellation.",
    reusableLesson: "Require OEM commissioning engineers to mobilize 72h prior to mechanical solo run.",
    similarityPct: 82,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Strong", wbsContext: "Moderate", locationContext: "Strong", executionPattern: "Moderate" },
    similarityExplanation: "Major rotating equipment package with OEM sign-off dependency.",
    executionTimeline: [{ date: "05 Nov 2025", title: "Lube Oil Run", type: "field" }, { date: "08 Nov 2025", title: "OEM Travel Delay", type: "delay" }, { date: "13 Nov 2025", title: "4-Hour Solo Run Completed", type: "verification" }],
    sourceEvidence: [{ id: "ev-r2", filename: "OEM_Solo_Run_Dossier.pdf", label: "Vendor Report", type: "pdf", date: "12 Nov 2025", description: "Elliott compressor field service report." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "14 Nov 2025", verifier: "USR-PLN-014" },
    tags: ["Rotating Equipment", "Compressor", "Inspection"],
  },

  // 21. Electrical: Cable Pulling Substation 2
  {
    id: "HIST-E301",
    name: "E-301 11kV Feeder Cable Pulling Substation 2",
    project: "South Process Expansion",
    discipline: "Electrical",
    wbs: "Power Distribution → MV Cabling → Cable Pull",
    wbsLevel: "L5",
    workfront: "Area C",
    contractor: "Apex Constructors",
    plannedDuration: 6,
    actualDuration: 7,
    variance: 1,
    delayCause: "Access",
    delayDurationDays: 0.8,
    recordedNote: "Cable trench partially flooded following overnight groundwater seepage.",
    reusableLesson: "Install submersible dewatering pumps at trench sump pits before cable drum payout.",
    similarityPct: 86,
    similarityBreakdown: { activityType: "Exact", discipline: "Exact", assetContext: "Strong", wbsContext: "Strong", locationContext: "Strong", executionPattern: "Strong" },
    similarityExplanation: "Direct medium voltage cable pull match across Area C cable trench corridor.",
    executionTimeline: [{ date: "18 Jun 2024", title: "Trench Sump Dewatered", type: "delay" }, { date: "22 Jun 2024", title: "Cable Pulled", type: "field" }, { date: "25 Jun 2024", title: "Megger Test Passed", type: "verification" }],
    sourceEvidence: [{ id: "ev-e1", filename: "Cable_Tension_Log.pdf", label: "Pulling Tension", type: "pdf", date: "21 Jun 2024", description: "Winch dynamometer cable tension log." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "26 Jun 2024", verifier: "USR-PLN-014" },
    tags: ["Electrical", "Cable Pull", "Access"],
  },

  // 22. Electrical: MCC Termination
  {
    id: "HIST-E302",
    name: "E-302 MCC-01 Feeder Glanding & Termination",
    project: "Utility Modernization",
    discipline: "Electrical",
    wbs: "Substation → Switchgear → Termination",
    wbsLevel: "L6",
    workfront: "Area C",
    contractor: "Apex Constructors",
    plannedDuration: 4,
    actualDuration: 6,
    variance: 2,
    delayCause: "Permit",
    delayDurationDays: 1.5,
    recordedNote: "Energized panel lock-out tag-out (LOTO) isolation required revised switching sequence.",
    reusableLesson: "Coordinate LOTO electrical permit with operations senior electrical authorized person.",
    similarityPct: 84,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Moderate", wbsContext: "Strong", locationContext: "Moderate", executionPattern: "Strong" },
    similarityExplanation: "High voltage termination with LOTO dependency matching ACT-E315.",
    executionTimeline: [{ date: "03 Sep 2024", title: "LOTO Safety Hold", type: "delay" }, { date: "07 Sep 2024", title: "Hi-Pot Test Complete", type: "verification" }],
    sourceEvidence: [{ id: "ev-e2", filename: "LOTO_Certificate_MCC.pdf", label: "Isolation Permit", type: "pdf", date: "04 Sep 2024", description: "Electrical isolation and earthing log." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "08 Sep 2024", verifier: "USR-PLN-009" },
    tags: ["Electrical", "Termination", "Permit", "LOTO"],
  },

  // 23. Instrumentation: Loop Check Train 1
  {
    id: "HIST-I091",
    name: "I-091 DCS Loop Check — Gas Compression Train 1",
    project: "South Process Expansion",
    discipline: "Instrumentation",
    wbs: "Automation → DCS → Loop Checking",
    wbsLevel: "L6",
    workfront: "Area B",
    contractor: "Apex Constructors",
    plannedDuration: 8,
    actualDuration: 10,
    variance: 2,
    delayCause: "Material",
    delayDurationDays: 1.3,
    recordedNote: "Defective HART communication module on pressure transmitter rack caused communication timeouts.",
    reusableLesson: "Bench-test smart field transmitters in instrument shop prior to field loop shooting.",
    similarityPct: 90,
    similarityBreakdown: { activityType: "Exact", discipline: "Exact", assetContext: "Strong", wbsContext: "Strong", locationContext: "Strong", executionPattern: "Strong" },
    similarityExplanation: "Identical Yokogawa Centum VP DCS architecture and Emerson transmitters.",
    executionTimeline: [{ date: "15 Apr 2025", title: "Rack Loop Powered", type: "field" }, { date: "18 Apr 2025", title: "HART Module Swap Delay", type: "delay" }, { date: "25 Apr 2025", title: "Loop Folders Signed", type: "verification" }],
    sourceEvidence: [{ id: "ev-i1", filename: "Loop_Folder_PA_Train1.pdf", label: "Loop Sheet", type: "pdf", date: "24 Apr 2025", description: "4-20mA calibration and DCS graphic check sign-off." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "26 Apr 2025", verifier: "USR-PLN-014" },
    tags: ["Instrumentation", "Loop Check", "Material", "DCS"],
  },

  // 24. Instrumentation: ESD Valve Stroking
  {
    id: "HIST-I092",
    name: "I-092 Emergency Shutdown Valve Full Stroke Test",
    project: "Process Train Upgrade",
    discipline: "Instrumentation",
    wbs: "Safety Systems → SIS → Valve Stroking",
    wbsLevel: "L6",
    workfront: "Area A",
    contractor: "Apex Constructors",
    plannedDuration: 3,
    actualDuration: 3,
    variance: 0,
    delayCause: "None",
    delayDurationDays: 0,
    recordedNote: "Fast-acting solenoid response verified within 1.2s specification on first attempt.",
    reusableLesson: "Pneumatic tubing leak checks prior to stroking prevents air pressure drop false trips.",
    similarityPct: 83,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Moderate", wbsContext: "Strong", locationContext: "Moderate", executionPattern: "Exact" },
    similarityExplanation: "Safety instrumented system test reference executed without hold points.",
    executionTimeline: [{ date: "09 Jan 2026", title: "Air Supply Charged", type: "field" }, { date: "11 Jan 2026", title: "Trip Logic Accepted", type: "verification" }],
    sourceEvidence: [{ id: "ev-i2", filename: "SIL_Stroking_Log.pdf", label: "SIL Certificate", type: "pdf", date: "11 Jan 2026", description: "Safety integrity level verification certificate." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "12 Jan 2026", verifier: "USR-PLN-014" },
    tags: ["Instrumentation", "ESD", "On-Time"],
  },

  // 25. HSE: Pre-commissioning Safety Clearance
  {
    id: "HIST-H01",
    name: "HSE-001 Pre-commissioning Safety Audit & Clearance Area B",
    project: "South Process Expansion",
    discipline: "HSE",
    wbs: "HSE → Commissioning Readiness → Safety Audit",
    wbsLevel: "L5",
    workfront: "Area B",
    contractor: "Summit Civil",
    plannedDuration: 3,
    actualDuration: 3,
    variance: 0,
    delayCause: "None",
    delayDurationDays: 0,
    recordedNote: "Eyewash stations, deluge systems and muster signage 100% verified.",
    reusableLesson: "Joint safety walkthrough with client operations streamlines handover approval.",
    similarityPct: 92,
    similarityBreakdown: { activityType: "Exact", discipline: "Exact", assetContext: "Strong", wbsContext: "Strong", locationContext: "Exact", executionPattern: "Exact" },
    similarityExplanation: "Area B safety clearance gate required before hydrocarbon introduction.",
    executionTimeline: [{ date: "12 Dec 2024", title: "Punch Walk Started", type: "field" }, { date: "15 Dec 2024", title: "Safety Sign-Off Issued", type: "verification" }],
    sourceEvidence: [{ id: "ev-h1", filename: "PSSR_Checklist_AreaB.pdf", label: "PSSR Clearance", type: "pdf", date: "15 Dec 2024", description: "Pre-startup safety review final certification." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "16 Dec 2024", verifier: "USR-PLN-014" },
    tags: ["HSE", "Safety Clearance", "On-Time", "Area B"],
  },

  // 26. HSE: Confined Space Audit
  {
    id: "HIST-H02",
    name: "HSE-002 Nitrogen Vessel Purge Atmospheric Audit",
    project: "West Refinery Revamp",
    discipline: "HSE",
    wbs: "HSE → Plant Safety → Atmospheric Monitoring",
    wbsLevel: "L6",
    workfront: "Area A",
    contractor: "Delta Piping Ltd",
    plannedDuration: 2,
    actualDuration: 3,
    variance: 1,
    delayCause: "Inspection",
    delayDurationDays: 0.8,
    recordedNote: "Gas detector sensor recalibration required after drift detected during baseline check.",
    reusableLesson: "Verify optical photoionization detector calibration cylinder expiry before field use.",
    similarityPct: 78,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Moderate", wbsContext: "Moderate", locationContext: "Moderate", executionPattern: "Moderate" },
    similarityExplanation: "Atmospheric test package directly preceding vessel piping hydrotest.",
    executionTimeline: [{ date: "02 Mar 2025", title: "Gas Sniffing Started", type: "field" }, { date: "04 Mar 2025", title: "Clearance Granted", type: "verification" }],
    sourceEvidence: [{ id: "ev-h2", filename: "Gas_Detector_Calib.pdf", label: "Calibration Certificate", type: "pdf", date: "03 Mar 2025", description: "Dräger multi-gas detector calibration log." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "05 Mar 2025", verifier: "USR-PLN-012" },
    tags: ["HSE", "Inspection"],
  },

  // 27. Piping: Steam Blow Line Flushing
  {
    id: "HIST-P177",
    name: "P-177 HP Steam Blow & Target Plate Inspection",
    project: "Terminal Expansion",
    discipline: "Piping",
    wbs: "Process Area → Steam Blow → Target Plate",
    wbsLevel: "L5",
    workfront: "Area A",
    contractor: "Delta Piping Ltd",
    plannedDuration: 5,
    actualDuration: 7,
    variance: 2,
    delayCause: "Inspection",
    delayDurationDays: 1.6,
    recordedNote: "Microscopic pitting on mirror-finish copper target plate required three blow repetitions.",
    reusableLesson: "Run preliminary air blow at 6 bar to clear heavy mill scale before mirror target installation.",
    similarityPct: 83,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Strong", wbsContext: "Moderate", locationContext: "Moderate", executionPattern: "Strong" },
    similarityExplanation: "High energy line clearing activity sharing Delta Piping Ltd site personnel.",
    executionTimeline: [{ date: "18 Jun 2025", title: "First Steam Blow", type: "field" }, { date: "21 Jun 2025", title: "Pitted Plate Repetition", type: "delay" }, { date: "25 Jun 2025", title: "Mirror Plate Approved", type: "verification" }],
    sourceEvidence: [{ id: "ev-p177", filename: "Target_Plate_Photo_Log.pdf", label: "Target Plate Inspection", type: "pdf", date: "24 Jun 2025", description: "Copper target plate macro photographs." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "26 Jun 2025", verifier: "USR-PLN-010" },
    tags: ["Piping", "Inspection", "Steam Blow"],
  },

  // 28. Structural: Flare Derrick Section Assembly
  {
    id: "HIST-S305",
    name: "S-305 60m Flare Derrick Section 3 Bolt-Up",
    project: "Process Train Upgrade",
    discipline: "Structural",
    wbs: "Flare Area → Derrick → Erection",
    wbsLevel: "L5",
    workfront: "Area C",
    contractor: "Summit Civil",
    plannedDuration: 7,
    actualDuration: 9,
    variance: 2,
    delayCause: "Access",
    delayDurationDays: 1.7,
    recordedNote: "Specialist rope access rigging crew unavailable due to certification audit delay.",
    reusableLesson: "Audit IRATA rope access technician logbooks 14 days before high-altitude derrick erection.",
    similarityPct: 76,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Moderate", wbsContext: "Moderate", locationContext: "Moderate", executionPattern: "Moderate" },
    similarityExplanation: "High-consequence structural assembly with elevated access controls.",
    executionTimeline: [{ date: "12 Oct 2025", title: "Derrick Hoisted", type: "field" }, { date: "15 Oct 2025", title: "Rope Access Delay", type: "delay" }, { date: "21 Oct 2025", title: "Bolting Accepted", type: "verification" }],
    sourceEvidence: [{ id: "ev-s305", filename: "IRATA_Crew_Register.pdf", label: "Rigging Competency", type: "pdf", date: "16 Oct 2025", description: "Rope access technician competency audit." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "22 Oct 2025", verifier: "USR-PLN-014" },
    tags: ["Structural", "Access", "Derrick"],
  },

  // 29. Civil: Heavy Compressor Table Top Pour
  {
    id: "HIST-C208",
    name: "C-208 Table Top Concrete Pour — Centrifugal Compressor",
    project: "West Refinery Revamp",
    discipline: "Civil",
    wbs: "Compressor House → Machine Foundation → Concrete",
    wbsLevel: "L5",
    workfront: "Area B",
    contractor: "Summit Civil",
    plannedDuration: 6,
    actualDuration: 8,
    variance: 2,
    delayCause: "Inspection",
    delayDurationDays: 1.5,
    recordedNote: "Post-tensioning duct alignment tolerance rejected during third-party structural audit.",
    reusableLesson: "Use laser tracker survey for post-tensioned tendon anchor plates before closing formwork.",
    similarityPct: 81,
    similarityBreakdown: { activityType: "Exact", discipline: "Exact", assetContext: "Strong", wbsContext: "Strong", locationContext: "Strong", executionPattern: "Strong" },
    similarityExplanation: "Dynamic foundation concrete pour directly supporting heavy rotating equipment.",
    executionTimeline: [{ date: "10 Jan 2025", title: "Rebar & Duct Setup", type: "field" }, { date: "13 Jan 2025", title: "Tendon Duct Re-alignment", type: "delay" }, { date: "18 Jan 2025", title: "Pour Complete", type: "verification" }],
    sourceEvidence: [{ id: "ev-c208", filename: "Post_Tension_Audit.pdf", label: "Structural Audit", type: "pdf", date: "14 Jan 2025", description: "Post-tensioning cable duct inspection clearance." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "19 Jan 2025", verifier: "USR-PLN-012" },
    tags: ["Civil", "Concrete", "Inspection", "Compressor"],
  },

  // 30. Electrical: Substation Busbar Energization
  {
    id: "HIST-E404",
    name: "E-404 33kV Main Busbar Energization & Phasing",
    project: "North Utility Upgrade",
    discipline: "Electrical",
    wbs: "Substation → MV Switchgear → Energization",
    wbsLevel: "L5",
    workfront: "Area C",
    contractor: "Apex Constructors",
    plannedDuration: 3,
    actualDuration: 4,
    variance: 1,
    delayCause: "Permit",
    delayDurationDays: 0.9,
    recordedNote: "Grid transmission utility dispatch authorization delayed by regional grid congestion.",
    reusableLesson: "Confirm 48-hour utility dispatch freeze window with regional transmission operator.",
    similarityPct: 79,
    similarityBreakdown: { activityType: "Strong", discipline: "Exact", assetContext: "Moderate", wbsContext: "Strong", locationContext: "Moderate", executionPattern: "Moderate" },
    similarityExplanation: "Substation commissioning gate with utility authorization dependency.",
    executionTimeline: [{ date: "22 Nov 2024", title: "Phasing Check", type: "field" }, { date: "24 Nov 2024", title: "Utility Dispatch Hold", type: "delay" }, { date: "26 Nov 2024", title: "Energized Successfully", type: "verification" }],
    sourceEvidence: [{ id: "ev-e404", filename: "Grid_Dispatch_Approval.pdf", label: "Utility Authorization", type: "pdf", date: "25 Nov 2024", description: "Regional grid operator energization authorization letter." }],
    provenance: { source: "Verified execution history", status: "Planner verified", auditIntegrity: "Verified", lastIndexed: "27 Nov 2024", verifier: "USR-PLN-009" },
    tags: ["Electrical", "Energization", "Permit"],
  },
];
