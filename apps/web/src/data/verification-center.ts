import { ExecutionDiscipline } from "./live-execution";
import { MatchCandidate } from "./match-review";

export type VerificationPriority = "Critical" | "High" | "Normal";
export type VerificationCategory =
  | "All"
  | "Critical"
  | "Low Confidence"
  | "Ambiguous"
  | "Unmatched"
  | "New Activity";

export type VerificationStatus =
  | "Review Required"
  | "High Confidence"
  | "Assigned"
  | "Verified"
  | "Rejected"
  | "Flagged New Activity";

export type VerificationItem = {
  id: string;
  proposalId: string;
  eventId: string;
  priority: VerificationPriority;
  category: VerificationCategory;
  status: VerificationStatus;
  eventTitle: string;
  rawUpdate: string;
  discipline: ExecutionDiscipline;
  assetTag: string;
  location: string;
  reportedProgress: number;
  reportedQuantity: string;
  timestamp: string;
  age: string;
  ageMinutes: number;
  source: string;
  sourceFile: string;
  sourceRow: number;
  reviewer: string;
  candidate: MatchCandidate;
  alternatives: MatchCandidate[];
  signals: {
    semantic: number;
    assetTag: number;
    wbsContext: number;
    discipline: number;
    temporal: number;
    location: number;
  };
  reasoning: string;
  rawSourceData?: Record<string, string>;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  plannerNote?: string;
};

export const INITIAL_VERIFICATION_QUEUE: VerificationItem[] = [
  {
    id: "VER-003",
    proposalId: "PRJ-DEMO-001:PROP-0926-002",
    eventId: "EVT-0145",
    priority: "Critical",
    category: "Critical",
    status: "Review Required",
    eventTitle: "Foundation concrete pour completed",
    rawUpdate:
      "“Area B foundation pour finished. Total volume 180 m³ poured versus schedule estimate of 165 m³.”",
    discipline: "Civil",
    assetTag: "FND-C240",
    location: "Area B · Sector 3",
    reportedProgress: 100,
    reportedQuantity: "180 m³",
    timestamp: "26 Sep 2026 · 09:18",
    age: "2h 14m",
    ageMinutes: 134,
    source: "Daily Progress Report",
    sourceFile: "DPR_26_Sep_2026.xlsx",
    sourceRow: 4,
    reviewer: "T. Patel",
    candidate: {
      id: "ACT-C240",
      name: "Foundation Concrete Pour — Area B",
      discipline: "Civil",
      wbs: "North River Expansion → Area B → Civil Works → Foundations",
      confidence: 88.0,
      confidenceTier: "Review",
      baselineStart: "2026-09-20",
      baselineFinish: "2026-09-26",
      currentProgress: 45,
      proposedProgress: 100,
      deltaProgress: 55,
      totalFloat: "0d",
      scheduleStatus: "In Progress",
      isProgressCompatible: true,
      signals: {
        semantic: 92,
        assetTag: 100,
        wbsContext: 86,
        discipline: 100,
        temporal: 95,
        location: 78,
      },
      reasoning:
        "Strong agreement on activity description, discipline and asset context. Location evidence is weaker, therefore planner verification is required.",
    },
    alternatives: [
      {
        id: "ACT-C235",
        name: "Foundation Preparation — Area B",
        discipline: "Civil",
        wbs: "North River Expansion → Area B → Civil Works → Substructure",
        confidence: 63.0,
        confidenceTier: "Review",
        baselineStart: "2026-09-15",
        baselineFinish: "2026-09-20",
        currentProgress: 100,
        proposedProgress: 100,
        deltaProgress: 0,
        totalFloat: "0d",
        scheduleStatus: "Completed",
        isProgressCompatible: false,
        incompatibilityReason:
          "Reported foundation pour volume cannot be credited to predecessor foundation preparation activity.",
        signals: {
          semantic: 68,
          assetTag: 85,
          wbsContext: 80,
          discipline: 100,
          temporal: 45,
          location: 75,
        },
        reasoning:
          "Predecessor earthworks and trench prep scope completed earlier in the sequence.",
      },
      {
        id: "ACT-C245",
        name: "Foundation Inspection — Area B",
        discipline: "Civil",
        wbs: "North River Expansion → Area B → Civil Works → QA/QC",
        confidence: 48.0,
        confidenceTier: "Weak",
        baselineStart: "2026-09-26",
        baselineFinish: "2026-09-28",
        currentProgress: 0,
        proposedProgress: 0,
        deltaProgress: 0,
        totalFloat: "2d",
        scheduleStatus: "Not Started",
        isProgressCompatible: false,
        incompatibilityReason:
          "Pouring concrete is distinct from post-pour quality and inspection signoff.",
        signals: {
          semantic: 52,
          assetTag: 80,
          wbsContext: 75,
          discipline: 100,
          temporal: 50,
          location: 70,
        },
        reasoning:
          "Post-pour inspection milestone scheduled immediately following concrete cure.",
      },
    ],
    signals: {
      semantic: 92,
      assetTag: 100,
      wbsContext: 86,
      discipline: 100,
      temporal: 95,
      location: 78,
    },
    reasoning:
      "Strong agreement on activity description, discipline and asset context. Location evidence is weaker, therefore planner verification is required.",
    rawSourceData: {
      "Activity Description": "Foundation concrete pour completed",
      Discipline: "Civil",
      "Asset Tag": "FND-C240",
      Location: "Area B / Sector 3",
      Quantity: "180",
      Unit: "m³",
      Progress: "100",
      "Report Date": "26 Sep 2026",
      Source: "DPR_26_Sep_2026.xlsx",
      "Work Window": "2026-09-20 → 2026-09-26",
    },
  },
  {
    id: "VER-001",
    proposalId: "PRJ-DEMO-001:PROP-0926-004",
    eventId: "DPR-0926-004",
    priority: "High",
    category: "Ambiguous",
    status: "Review Required",
    eventTitle: "Structural Steel Erection — Rack 2",
    rawUpdate:
      "“Structural steel erection and alignment completed for Rack Sector 2. Observed progress 75% vs baseline 62%.”",
    discipline: "Structural",
    assetTag: "STR-02",
    location: "Structural · Utility Area",
    reportedProgress: 75,
    reportedQuantity: "35 m",
    timestamp: "26 Sep 2026 · 09:15",
    age: "2h 42m",
    ageMinutes: 162,
    source: "Daily Progress Report",
    sourceFile: "DPR_26_Sep_2026.xlsx",
    sourceRow: 4,
    reviewer: "Unassigned",
    candidate: {
      id: "ACT-S102",
      name: "Pipe Rack Steel Erection Sector 2",
      discipline: "Structural",
      wbs: "Structural Steel Works → Pipe Racks → Sector 2",
      confidence: 85.0,
      confidenceTier: "Review",
      baselineStart: "2026-09-18",
      baselineFinish: "2026-09-27",
      currentProgress: 62,
      proposedProgress: 75,
      deltaProgress: 13,
      totalFloat: "1d",
      scheduleStatus: "Delayed",
      isProgressCompatible: true,
      signals: {
        semantic: 82,
        assetTag: 100,
        wbsContext: 80,
        discipline: 100,
        temporal: 100,
        location: 45,
      },
      reasoning:
        "The execution event and ACT-S102 share structural discipline and compatible WBS context. Location evidence is weak (Utility Area vs Sector 2), so planner verification is required.",
    },
    alternatives: [
      {
        id: "ACT-S105",
        name: "Pipe Rack Steel Finishing & Touch-up",
        discipline: "Structural",
        wbs: "Structural Steel Works → Pipe Racks → Sector 2 Finishing",
        confidence: 64.2,
        confidenceTier: "Weak",
        baselineStart: "2026-09-28",
        baselineFinish: "2026-10-04",
        currentProgress: 0,
        proposedProgress: 0,
        deltaProgress: 0,
        totalFloat: "4d",
        scheduleStatus: "Not Started",
        isProgressCompatible: false,
        incompatibilityReason:
          "Reported 75% structural erection cannot be credited to successor finishing activities.",
        signals: {
          semantic: 58,
          assetTag: 100,
          wbsContext: 75,
          discipline: 100,
          temporal: 45,
          location: 0,
        },
        reasoning:
          "Successor finishing scope scheduled for after main rack structural erection.",
      },
    ],
    signals: {
      semantic: 82,
      assetTag: 100,
      wbsContext: 80,
      discipline: 100,
      temporal: 100,
      location: 45,
    },
    reasoning:
      "The execution event and ACT-S102 share structural discipline and compatible WBS context. Location evidence is moderate (Utility Area vs Sector 2), so planner verification is required.",
    rawSourceData: {
      "Activity Description": "Structural Steel Erection — Rack 2",
      Discipline: "Structural",
      "Asset Tag": "STR-02",
      Location: "Utility Area",
      Quantity: "35",
      Unit: "m",
      Progress: "75",
      "Report Date": "26 Sep 2026",
      Source: "DPR_26_Sep_2026.xlsx",
      "Work Window": "2026-09-18 → 2026-09-27",
    },
  },
  {
    id: "VER-002",
    proposalId: "PRJ-DEMO-001:PROP-0926-006",
    eventId: "DPR-0926-006",
    priority: "Normal",
    category: "Ambiguous",
    status: "Review Required",
    eventTitle: "Cable Tray Installation — North Rack",
    rawUpdate:
      "“Substation 2 north overhead rack cable tray installation complete and fastened. 100% placed.”",
    discipline: "Electrical",
    assetTag: "SS-02",
    location: "Process Area / B",
    reportedProgress: 100,
    reportedQuantity: "50 m",
    timestamp: "26 Sep 2026 · 10:48",
    age: "3h 18m",
    ageMinutes: 198,
    source: "Daily Progress Report",
    sourceFile: "DPR_26_Sep_2026.xlsx",
    sourceRow: 6,
    reviewer: "T. Patel",
    candidate: {
      id: "ACT-E325",
      name: "Substation 2 Cable Tray Installation",
      discipline: "Electrical",
      wbs: "Electrical & Instrumentation → Substation 2 → Trays",
      confidence: 77.1,
      confidenceTier: "Review",
      baselineStart: "2026-09-10",
      baselineFinish: "2026-09-16",
      currentProgress: 100,
      proposedProgress: 100,
      deltaProgress: 0,
      totalFloat: "5d",
      scheduleStatus: "Completed",
      isProgressCompatible: true,
      signals: {
        semantic: 78,
        assetTag: 100,
        wbsContext: 85,
        discipline: 100,
        temporal: 72,
        location: 28,
      },
      reasoning:
        "Activity terminology and asset SS-02 match electrical tray scope. Baseline finish date was 16 Sep; confirmation is required that this field update reflects delayed punch-list completion.",
    },
    alternatives: [
      {
        id: "ACT-E320",
        name: "Substation 2 Feeder Cable Pulling",
        discipline: "Electrical",
        wbs: "Electrical & Instrumentation → Substation 2 → Cables",
        confidence: 68.5,
        confidenceTier: "Weak",
        baselineStart: "2026-09-20",
        baselineFinish: "2026-09-27",
        currentProgress: 40,
        proposedProgress: 40,
        deltaProgress: 0,
        totalFloat: "1d",
        scheduleStatus: "In Progress",
        isProgressCompatible: false,
        incompatibilityReason:
          "Cable tray hardware installation is distinct from cable wire pulling scope.",
        signals: {
          semantic: 65,
          assetTag: 90,
          wbsContext: 80,
          discipline: 100,
          temporal: 75,
          location: 30,
        },
        reasoning:
          "Parallel cable pulling task inside Substation 2 with shared physical raceway.",
      },
    ],
    signals: {
      semantic: 78,
      assetTag: 100,
      wbsContext: 85,
      discipline: 100,
      temporal: 72,
      location: 28,
    },
    reasoning:
      "Activity terminology and asset SS-02 match electrical tray scope. Baseline finish date was 16 Sep; confirmation is required that this field update reflects delayed punch-list completion.",
    rawSourceData: {
      "Activity Description": "Cable Tray Installation — North Rack",
      Discipline: "Electrical",
      "Asset Tag": "SS-02",
      Location: "Process Area / B",
      Quantity: "50",
      Unit: "m",
      Progress: "100",
      "Report Date": "26 Sep 2026",
      Source: "DPR_26_Sep_2026.xlsx",
      "Work Window": "2026-09-10 → 2026-09-16",
    },
  },
  {
    id: "VER-004",
    proposalId: "PRJ-DEMO-001:PROP-0926-003",
    eventId: "EVT-0144",
    priority: "Normal",
    category: "Low Confidence",
    status: "Review Required",
    eventTitle: "MCC-02 cable termination progress updated",
    rawUpdate:
      "“Power feeder cables pulled into MCC-02 cubicles 1-4. Termination held pending access clearance.”",
    discipline: "Electrical",
    assetTag: "MCC-02",
    location: "Utilities / Substation 2",
    reportedProgress: 42,
    reportedQuantity: "4 cubicles",
    timestamp: "26 Sep 2026 · 08:51",
    age: "3h 42m",
    ageMinutes: 222,
    source: "Site Diary",
    sourceFile: "SD-0926-E-02.pdf",
    sourceRow: 14,
    reviewer: "M. Vance",
    candidate: {
      id: "ACT-E315",
      name: "MCC-02 Cable Termination",
      discipline: "Electrical",
      wbs: "North River Expansion → Utilities → Electrical → MCC-02",
      confidence: 54.0,
      confidenceTier: "Weak",
      baselineStart: "2026-09-22",
      baselineFinish: "2026-09-29",
      currentProgress: 20,
      proposedProgress: 42,
      deltaProgress: 22,
      totalFloat: "1d",
      scheduleStatus: "In Progress",
      isProgressCompatible: true,
      signals: {
        semantic: 48,
        assetTag: 94,
        wbsContext: 65,
        discipline: 100,
        temporal: 82,
        location: 0,
      },
      reasoning:
        "Asset and discipline align with MCC-02 cubicles, but semantic similarity is low and location within Substation 2 is unconfirmed. Planner verification is required.",
    },
    alternatives: [
      {
        id: "ACT-E320",
        name: "Substation 2 Feeder Cable Pulling",
        discipline: "Electrical",
        wbs: "North River Expansion → Utilities → Electrical → Cable Trays",
        confidence: 81.0,
        confidenceTier: "Review",
        baselineStart: "2026-09-20",
        baselineFinish: "2026-09-27",
        currentProgress: 40,
        proposedProgress: 75,
        deltaProgress: 35,
        totalFloat: "1d",
        scheduleStatus: "In Progress",
        isProgressCompatible: true,
        signals: {
          semantic: 84,
          assetTag: 82,
          wbsContext: 86,
          discipline: 100,
          temporal: 85,
          location: 82,
        },
        reasoning:
          "Feeder cable pulling is explicitly described as completed into the cubicles.",
      },
    ],
    signals: {
      semantic: 48,
      assetTag: 94,
      wbsContext: 65,
      discipline: 100,
      temporal: 82,
      location: 0,
    },
    reasoning:
      "Asset and discipline align with MCC-02 cubicles, but semantic similarity is low and location within Substation 2 is unconfirmed. Planner verification is required.",
    rawSourceData: {
      "Activity Description": "MCC-02 cable termination progress updated",
      Discipline: "Electrical",
      "Asset Tag": "MCC-02",
      Location: "Utilities / Substation 2",
      Quantity: "4",
      Unit: "cubicles",
      Progress: "42",
      "Report Date": "26 Sep 2026",
      Source: "SD-0926-E-02.pdf",
      "Work Window": "2026-09-22 → 2026-09-29",
    },
  },
  {
    id: "VER-005",
    proposalId: "PRJ-DEMO-001:PROP-0926-005",
    eventId: "EVT-0142",
    priority: "Normal",
    category: "Unmatched",
    status: "Review Required",
    eventTitle: "Instrument junction box field statement",
    rawUpdate:
      "“Subcontractor mounted unreferenced JB-840 near cooling tower auxiliary line. No tag in current L5 schedule.”",
    discipline: "Instrumentation",
    assetTag: "JB-840",
    location: "Cooling Tower / Aux",
    reportedProgress: 100,
    reportedQuantity: "1 JB",
    timestamp: "26 Sep 2026 · 08:26",
    age: "1h",
    ageMinutes: 60,
    source: "Field Update",
    sourceFile: "IMG-JB840-0926-01.jpg",
    sourceRow: 19,
    reviewer: "Unassigned",
    candidate: {
      id: "ACT-I110",
      name: "Cooling Tower Aux Instrument Wiring",
      discipline: "Instrumentation",
      wbs: "North River Expansion → Cooling Tower → Instrumentation",
      confidence: 41.0,
      confidenceTier: "Weak",
      baselineStart: "2026-09-24",
      baselineFinish: "2026-10-02",
      currentProgress: 0,
      proposedProgress: 0,
      deltaProgress: 0,
      totalFloat: "3d",
      scheduleStatus: "Not Started",
      isProgressCompatible: false,
      incompatibilityReason:
        "Unreferenced junction box JB-840 cannot be assigned to generic instrument wiring without site variation approval.",
      signals: {
        semantic: 38,
        assetTag: 0,
        wbsContext: 42,
        discipline: 80,
        temporal: 70,
        location: 18,
      },
      reasoning:
        "ExecLink could not identify a schedule candidate above the matching threshold. The tag JB-840 does not match any registered asset identifier in the current L5 baseline.",
    },
    alternatives: [
      {
        id: "ACT-I090",
        name: "Cooling Tower Field Junction Box Mounting",
        discipline: "Instrumentation",
        wbs: "North River Expansion → Cooling Tower → Cabinets",
        confidence: 34.0,
        confidenceTier: "Weak",
        baselineStart: "2026-09-25",
        baselineFinish: "2026-10-01",
        currentProgress: 0,
        proposedProgress: 0,
        deltaProgress: 0,
        totalFloat: "2d",
        scheduleStatus: "Not Started",
        isProgressCompatible: false,
        incompatibilityReason: "Missing engineering tag reference in contract baseline.",
        signals: {
          semantic: 35,
          assetTag: 0,
          wbsContext: 40,
          discipline: 80,
          temporal: 40,
          location: 10,
        },
        reasoning: "Unlinked equipment scope requiring variation order.",
      },
    ],
    signals: {
      semantic: 38,
      assetTag: 0,
      wbsContext: 42,
      discipline: 80,
      temporal: 70,
      location: 18,
    },
    reasoning:
      "ExecLink could not identify a schedule candidate above the matching threshold. The tag JB-840 does not match any registered asset identifier in the current L5 baseline.",
    rawSourceData: {
      "Activity Description": "Instrument junction box field statement",
      Discipline: "Instrumentation",
      "Asset Tag": "JB-840",
      Location: "Cooling Tower / Aux",
      Quantity: "1",
      Unit: "JB",
      Progress: "100",
      "Report Date": "26 Sep 2026",
      Source: "Field Update",
      "Work Window": "2026-09-24 → 2026-10-02",
    },
  },
];

export type VerificationAuditEntry = {
  id: string;
  timestamp: string;
  action: "proposal.verified" | "proposal.rejected" | "proposal.flagged_new";
  proposalId: string;
  eventId?: string;
  activityId?: string;
  actor: string;
  confidence?: number;
  previousProgress?: number;
  newProgress?: number;
  reason?: string;
  auditSequence: number;
};

export function itemMatchesCategory(
  item: VerificationItem,
  category: VerificationCategory,
): boolean {
  if (category === "All") return true;
  if (category === "Critical") return item.category === "Critical" || item.priority === "Critical";
  if (category === "Low Confidence") return item.category === "Low Confidence";
  if (category === "Ambiguous") return item.category === "Ambiguous";
  if (category === "Unmatched") return item.category === "Unmatched" || item.id === "VER-005";
  if (category === "New Activity")
    return (
      item.category === "New Activity" ||
      item.status === "Flagged New Activity" ||
      item.id === "VER-005"
    );
  return true;
}

const STORAGE_KEY = "execlink:verifications";
const AUDIT_KEY = "execlink:audit_trail";
const ACTUALS_KEY = "execlink:schedule_actuals";
const BACKLOG_KEY = "execlink:change_backlog";

export function loadVerificationQueue(): VerificationItem[] {
  if (typeof window === "undefined") return INITIAL_VERIFICATION_QUEUE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_VERIFICATION_QUEUE;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : INITIAL_VERIFICATION_QUEUE;
  } catch {
    return INITIAL_VERIFICATION_QUEUE;
  }
}

export function saveVerificationQueue(queue: VerificationItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to save verification queue", e);
  }
}

export function recordAuditEntry(entry: Omit<VerificationAuditEntry, "id" | "timestamp" | "auditSequence">): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const existing: VerificationAuditEntry[] = raw ? JSON.parse(raw) : [];
    const seq = existing.length + 1;
    const newEntry: VerificationAuditEntry = {
      id: `AUD-${Date.now()}-${seq}`,
      timestamp: new Date().toISOString(),
      auditSequence: seq,
      ...entry,
    };
    existing.push(newEntry);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error("Failed to record audit entry", e);
  }
}

export function updateScheduleActual(
  activityId: string,
  progress: number,
  status: string = "In Progress",
  options?: { actualFinish?: string; actualStart?: string; updatedBy?: string }
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(ACTUALS_KEY);
    const actuals: Record<
      string,
      {
        progress: number;
        status: string;
        updatedAt: string;
        updatedBy: string;
        actualStart?: string;
        actualFinish?: string;
      }
    > = raw ? JSON.parse(raw) : {};

    const existing = actuals[activityId];
    actuals[activityId] = {
      progress,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: options?.updatedBy || "T. Patel (Lead Planner)",
      actualStart:
        options?.actualStart ||
        existing?.actualStart ||
        (progress > 0 ? "2026-09-20" : undefined),
      actualFinish:
        progress === 100
          ? options?.actualFinish || "2026-09-26"
          : undefined,
    };
    localStorage.setItem(ACTUALS_KEY, JSON.stringify(actuals));
  } catch (e) {
    console.error("Failed to update schedule actuals", e);
  }
}

export function recordChangeBacklog(item: VerificationItem, reason: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(BACKLOG_KEY);
    const backlog = raw ? JSON.parse(raw) : [];
    backlog.push({
      id: `CHG-${Date.now()}`,
      eventId: item.eventId,
      proposalId: item.proposalId,
      eventTitle: item.eventTitle,
      discipline: item.discipline,
      assetTag: item.assetTag,
      location: item.location,
      reportedQuantity: item.reportedQuantity,
      reportedProgress: item.reportedProgress,
      flaggedAt: new Date().toISOString(),
      flaggedBy: "T. Patel (Lead Planner)",
      reason,
      status: "Pending Scope Review",
    });
    localStorage.setItem(BACKLOG_KEY, JSON.stringify(backlog));
  } catch (e) {
    console.error("Failed to record change backlog", e);
  }
}

export function getAuditLedger(): VerificationAuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
