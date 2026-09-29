import { INITIAL_VERIFICATION_QUEUE } from "./verification-center";

export interface ProjectSettingsData {
  projectName: string;
  projectId: string;
  dataDate: string;
  scheduleRevision: string;
  timezone: string;
  projectStatus: string;
  clientOwner: string;
  generalContractor: string;
  baselineSchedule: string;
  totalActivitiesPlanned: number;
  totalActivitiesTracking: number;
  wbsHierarchyLevel: string;
  disciplineScope: string[];
  leadControlsPlanner: string;
  controlsOffice: string;
  currency: string;
  digestFrequency: string;
  lastScheduleImport: string;
}

export interface MatchingSignal {
  id: string;
  name: string;
  weight: number;
  description: string;
  algorithm: string;
  example: string;
}

export interface MatchingThresholds {
  autoSuggestThreshold: number; // e.g. 90
  humanReviewThreshold: number; // e.g. 70
  presetName: "Conservative" | "Balanced" | "High-Precision";
}

export interface DataSourceItem {
  id: string;
  name: string;
  category: "Field Feed" | "Spreadsheet" | "Diary / OCR" | "Schedule Baseline" | "Spatial / IoT";
  format: string;
  status: "Connected" | "Available" | "Imported" | "Requires Setup";
  lastSync: string;
  recordsCount: string;
  isDemoSample: boolean;
  description: string;
  targetRoute?: string;
  actionLabel: string;
  actionType: "link" | "dialog" | "none";
}

export interface UserRoleItem {
  id: string;
  name: string;
  title: string;
  role: "Planner / Project Controls" | "Project Manager" | "Field Supervisor / Engineer" | "Planning Manager / Approver" | "Admin / Demo Operator";
  department: string;
  accessScope: string;
  status: "Active (Current Session)" | "Active" | "Standby";
  avatar: string;
  email: string;
  isCurrentSession?: boolean;
  canMutateSchedule: boolean;
  canApproveVerification: boolean;
  canResetDemo: boolean;
}

export interface DemoStateInfo {
  datasetId: string;
  projectName: string;
  baselineRevision: string;
  isModified: boolean;
  mutatedActualsCount: number;
  auditRecordsCount: number;
  backlogRecordsCount: number;
  pendingVerificationCount: number;
  lastResetTimestamp: string | null;
}

export const INITIAL_PROJECT_SETTINGS: ProjectSettingsData = {
  projectName: "North River Expansion",
  projectId: "PRJ-DEMO-001",
  dataDate: "26 Sep 2026",
  scheduleRevision: "Rev 04",
  timezone: "America/New_York (UTC-04:00 EDT)",
  projectStatus: "Active Controls (Live Monitoring)",
  clientOwner: "North River Terminal Corp.",
  generalContractor: "ExecLink Industrial Constructors JV",
  baselineSchedule: "P6 Baseline BL1 (Locked 15-May-2026)",
  totalActivitiesPlanned: 1420,
  totalActivitiesTracking: 684,
  wbsHierarchyLevel: "Level 4 WBS Decomposition",
  disciplineScope: [
    "Civil & Foundations",
    "Structural Steel",
    "Piping & Mechanical",
    "Electrical Power",
    "Instrumentation & Control",
    "HSE & Site Operations",
  ],
  leadControlsPlanner: "Tirth Patel (PE, PMP)",
  controlsOffice: "Site Project Controls Office — Trailer 04",
  currency: "USD ($)",
  digestFrequency: "Daily 07:00 EDT",
  lastScheduleImport: "26 Sep 2026, 06:00 EDT via P6 XML Exchange",
};

export const MATCHING_SIGNALS: MatchingSignal[] = [
  {
    id: "semantic",
    name: "Semantic Similarity",
    weight: 40,
    description: "Transformer sentence embeddings measuring linguistic context between raw field notes and schedule activity descriptions.",
    algorithm: "Cosine similarity over high-dimensional dense embeddings",
    example: '"welded pipe spools on rack B" ↔ "Install Piperack B Process Piping"',
  },
  {
    id: "asset_tag",
    name: "Asset / Tag ID",
    weight: 20,
    description: "Deterministic regex and fuzzy matching against the master project asset and tag register.",
    algorithm: "Deterministic tag parser & Levenshtein distance check",
    example: '"P-110A pump suction" ↔ "ACT-P110 (P-110 Erection & Alignment)"',
  },
  {
    id: "wbs_context",
    name: "WBS Context",
    weight: 15,
    description: "Work breakdown structure tree alignment ensuring matched activity resides in the correct sub-facility or process train.",
    algorithm: "Hierarchical parent-child path distance scoring",
    example: "Area 10 / Process Units / Crude Distillation Unit 1",
  },
  {
    id: "discipline",
    name: "Discipline Alignment",
    weight: 10,
    description: "Trade and craft classification checking (Civil, Piping, Electrical, Structural) preventing cross-trade conflation.",
    algorithm: "Strict taxonomy classification & cross-discipline penalty matrix",
    example: 'Discipline "Piping" prevents matching electrical cable pulling tasks',
  },
  {
    id: "temporal",
    name: "Temporal Proximity",
    weight: 10,
    description: "Schedule window assessment comparing field observation date against planned early/late start and finish windows.",
    algorithm: "Window gaussian proximity within ±14 operational working days",
    example: 'Event on 26 Sep 2026 within planned window (20 Sep – 04 Oct)',
  },
  {
    id: "location",
    name: "Location / Zone",
    weight: 5,
    description: "Physical battery limit, elevation level, and grid coordinate boundary verification.",
    algorithm: "Zone containment & geospatial proximity scoring",
    example: '"Area B — East Yard" ↔ "Site Battery Limit Area B"',
  },
];

export const INITIAL_MATCHING_THRESHOLDS: MatchingThresholds = {
  autoSuggestThreshold: 90,
  humanReviewThreshold: 70,
  presetName: "Conservative",
};

export const SUPPORTED_DATA_SOURCES: DataSourceItem[] = [
  {
    id: "src-field-app",
    name: "Field App (Mobile PWA)",
    category: "Field Feed",
    format: "Real-time HTTPS Site Sync",
    status: "Connected",
    lastSync: "14 min ago (26 Sep 2026, 17:42 EDT)",
    recordsCount: "148 Daily Events",
    isDemoSample: false,
    description: "Superintendent & foreman mobile application for immediate daily field observations, photo documentation, and crew hours.",
    targetRoute: "/live-execution",
    actionLabel: "View Live Execution",
    actionType: "link",
  },
  {
    id: "src-dpr-sheet",
    name: "DPR Spreadsheet (Daily Progress)",
    category: "Spreadsheet",
    format: "Excel (.xlsx) / CSV",
    status: "Imported",
    lastSync: "26 Sep 2026, 06:30 EDT",
    recordsCount: "24 Activity Quantities",
    isDemoSample: true,
    description: "Standard daily contractor progress spreadsheet parsed with automated column extraction and schema validation.",
    targetRoute: "/data-ingestion",
    actionLabel: "Open Data Ingestion",
    actionType: "link",
  },
  {
    id: "src-site-diary",
    name: "Site Diary & QA Notes",
    category: "Diary / OCR",
    format: "Structured PDF / OCR Parser",
    status: "Imported",
    lastSync: "25 Sep 2026, 18:00 EDT",
    recordsCount: "18 Field Inspection Logs",
    isDemoSample: true,
    description: "Daily clerk and inspector field journals with weather observations, safety stand-downs, and work shift remarks.",
    targetRoute: "/project-memory",
    actionLabel: "Search Project Memory",
    actionType: "link",
  },
  {
    id: "src-primavera-p6",
    name: "Primavera P6 Schedule",
    category: "Schedule Baseline",
    format: "Oracle P6 XML / XER Exchange",
    status: "Connected",
    lastSync: "Rev 04 Baseline (26 Sep 2026)",
    recordsCount: "1,420 Activities (684 Tracking)",
    isDemoSample: false,
    description: "Official contractual schedule baseline of record. Verified actual progress mutations are compiled for schedule batch export.",
    targetRoute: "/schedule-explorer",
    actionLabel: "Explore Schedule",
    actionType: "link",
  },
  {
    id: "src-ms-project",
    name: "MS Project Export",
    category: "Schedule Baseline",
    format: "Microsoft Project (.mpp / .xml)",
    status: "Available",
    lastSync: "Standby (Awaiting Package File)",
    recordsCount: "0 Imported",
    isDemoSample: false,
    description: "Secondary schedule ingestion channel for subcontractor and vendor package integration without direct P6 database access.",
    targetRoute: "/data-ingestion",
    actionLabel: "Import Schedule File",
    actionType: "link",
  },
  {
    id: "src-spatial-iot",
    name: "IoT & Drone Telemetry",
    category: "Spatial / IoT",
    format: "Autodesk ACC / Point Cloud API",
    status: "Requires Setup",
    lastSync: "Never (Unconfigured)",
    recordsCount: "Not Connected",
    isDemoSample: false,
    description: "Automated crane hook telemetry, RFID material tracking, and drone volumetric earthwork surveys awaiting API webhook configuration.",
    actionLabel: "Configure Integration",
    actionType: "dialog",
  },
];

export const DEMO_USERS_AND_ROLES: UserRoleItem[] = [
  {
    id: "usr-01",
    name: "Tirth Patel",
    title: "Lead Project Controls Planner",
    role: "Planner / Project Controls",
    department: "Project Controls & Scheduling",
    accessScope: "Full Controls Access: Verification Center Decisioning, Schedule Actuals Sign-Off, Intelligence Calibration, Audit Ledger Verification",
    status: "Active (Current Session)",
    avatar: "TP",
    email: "t.patel@execlink-demo.corp",
    isCurrentSession: true,
    canMutateSchedule: true,
    canApproveVerification: true,
    canResetDemo: true,
  },
  {
    id: "usr-02",
    name: "Marcus Vance",
    title: "Project Controls Director",
    role: "Project Manager",
    department: "Project Management Office",
    accessScope: "Executive Visibility: Executive Overview, Milestone Approvals, Scope Backlog Governance, Cross-Discipline Analytics",
    status: "Active",
    avatar: "MV",
    email: "m.vance@execlink-demo.corp",
    canMutateSchedule: false,
    canApproveVerification: false,
    canResetDemo: false,
  },
  {
    id: "usr-03",
    name: "Sarah Ramos",
    title: "Civil Site Operations Lead",
    role: "Field Supervisor / Engineer",
    department: "Site Construction — Area B",
    accessScope: "Field Ingestion: Daily Progress Event Entry, Site Observation Upload, DPR Ingestion, Photo Evidence Submission",
    status: "Active",
    avatar: "SR",
    email: "s.ramos@execlink-demo.corp",
    canMutateSchedule: false,
    canApproveVerification: false,
    canResetDemo: false,
  },
  {
    id: "usr-04",
    name: "Kenneth Henderson",
    title: "Chief Planning & Scheduling Authority",
    role: "Planning Manager / Approver",
    department: "Corporate Project Controls",
    accessScope: "Baseline Governance: Schedule Revision Authorizer, Baseline Lock/Unlock, Senior Claims & Variance Approval",
    status: "Active",
    avatar: "KH",
    email: "k.henderson@execlink-demo.corp",
    canMutateSchedule: true,
    canApproveVerification: true,
    canResetDemo: false,
  },
  {
    id: "usr-05",
    name: "ExecLink Admin",
    title: "System & Demo Environment Operator",
    role: "Admin / Demo Operator",
    department: "Controls Systems Architecture",
    accessScope: "System Administration: Database Snapshot Management, Audit Ledger Cryptographic Verification, Demo State Reset",
    status: "Standby",
    avatar: "AD",
    email: "admin@execlink-demo.corp",
    canMutateSchedule: false,
    canApproveVerification: false,
    canResetDemo: true,
  },
];

// Local Storage Keys
export const STORAGE_KEYS = {
  PROJECT_SETTINGS: "execlink:project_settings",
  MATCHING_THRESHOLDS: "execlink:matching_thresholds",
  VERIFICATIONS: "execlink:verifications",
  ACTUALS: "execlink:schedule_actuals",
  AUDIT: "execlink:audit_trail",
  BACKLOG: "execlink:change_backlog",
  RESET_TIMESTAMP: "execlink:demo_reset_timestamp",
};

// ============================================================================
// STATE HELPERS
// ============================================================================

export function loadProjectSettings(): ProjectSettingsData {
  if (typeof window === "undefined") return INITIAL_PROJECT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECT_SETTINGS);
    if (!raw) return INITIAL_PROJECT_SETTINGS;
    return { ...INITIAL_PROJECT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return INITIAL_PROJECT_SETTINGS;
  }
}

export function saveProjectSettings(data: Partial<ProjectSettingsData>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadProjectSettings();
    const updated = { ...current, ...data };
    localStorage.setItem(STORAGE_KEYS.PROJECT_SETTINGS, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save project settings", err);
  }
}

export function loadMatchingThresholds(): MatchingThresholds {
  if (typeof window === "undefined") return INITIAL_MATCHING_THRESHOLDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MATCHING_THRESHOLDS);
    if (!raw) return INITIAL_MATCHING_THRESHOLDS;
    return { ...INITIAL_MATCHING_THRESHOLDS, ...JSON.parse(raw) };
  } catch {
    return INITIAL_MATCHING_THRESHOLDS;
  }
}

export function saveMatchingThresholds(thresholds: MatchingThresholds): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.MATCHING_THRESHOLDS, JSON.stringify(thresholds));
  } catch (err) {
    console.error("Failed to save matching thresholds", err);
  }
}

export function getDemoState(): DemoStateInfo {
  if (typeof window === "undefined") {
    return {
      datasetId: "PRJ-DEMO-001",
      projectName: "North River Expansion",
      baselineRevision: "Rev 04",
      isModified: false,
      mutatedActualsCount: 0,
      auditRecordsCount: 0,
      backlogRecordsCount: 0,
      pendingVerificationCount: 12,
      lastResetTimestamp: null,
    };
  }

  try {
    const actualsRaw = localStorage.getItem(STORAGE_KEYS.ACTUALS);
    const auditRaw = localStorage.getItem(STORAGE_KEYS.AUDIT);
    const backlogRaw = localStorage.getItem(STORAGE_KEYS.BACKLOG);
    const verifRaw = localStorage.getItem(STORAGE_KEYS.VERIFICATIONS);
    const resetTime = localStorage.getItem(STORAGE_KEYS.RESET_TIMESTAMP);

    const actuals = actualsRaw ? JSON.parse(actualsRaw) : {};
    const audits = auditRaw ? JSON.parse(auditRaw) : [];
    const backlog = backlogRaw ? JSON.parse(backlogRaw) : [];
    const verifs = verifRaw ? JSON.parse(verifRaw) : null;

    const mutatedActualsCount = Object.keys(actuals).length;
    const auditRecordsCount = Array.isArray(audits) ? audits.length : 0;
    const backlogRecordsCount = Array.isArray(backlog) ? backlog.length : 0;

    let pendingCount = 12;
    let queueModified = false;
    if (Array.isArray(verifs)) {
      pendingCount = verifs.filter(
        (i: { status?: string }) =>
          i.status === "Review Required" || i.status === "High Confidence" || i.status === "Assigned"
      ).length;
      // If any item in verifs has status Verified or Rejected, it is modified
      queueModified = verifs.some((i: { status?: string }) => i.status === "Verified" || i.status === "Rejected");
    }

    const isModified = mutatedActualsCount > 0 || auditRecordsCount > 0 || backlogRecordsCount > 0 || queueModified;

    return {
      datasetId: "PRJ-DEMO-001",
      projectName: "North River Expansion",
      baselineRevision: "Rev 04",
      isModified,
      mutatedActualsCount,
      auditRecordsCount,
      backlogRecordsCount,
      pendingVerificationCount: pendingCount,
      lastResetTimestamp: resetTime,
    };
  } catch {
    return {
      datasetId: "PRJ-DEMO-001",
      projectName: "North River Expansion",
      baselineRevision: "Rev 04",
      isModified: false,
      mutatedActualsCount: 0,
      auditRecordsCount: 0,
      backlogRecordsCount: 0,
      pendingVerificationCount: 12,
      lastResetTimestamp: null,
    };
  }
}

export function resetDemoEnvironment(): { success: boolean; timestamp: string } {
  if (typeof window === "undefined") return { success: false, timestamp: "" };

  const now = new Date().toISOString();

  try {
    // 1. Reset verification queue to INITIAL_VERIFICATION_QUEUE
    localStorage.setItem(STORAGE_KEYS.VERIFICATIONS, JSON.stringify(INITIAL_VERIFICATION_QUEUE));

    // 2. Clear mutated schedule actuals
    localStorage.removeItem(STORAGE_KEYS.ACTUALS);

    // 3. Clear audit ledger mutations
    localStorage.removeItem(STORAGE_KEYS.AUDIT);

    // 4. Clear change backlog items
    localStorage.removeItem(STORAGE_KEYS.BACKLOG);

    // 5. Reset matching thresholds to standard default
    localStorage.setItem(STORAGE_KEYS.MATCHING_THRESHOLDS, JSON.stringify(INITIAL_MATCHING_THRESHOLDS));

    // 6. Record timestamp
    localStorage.setItem(STORAGE_KEYS.RESET_TIMESTAMP, now);

    // 7. Dispatch storage and custom events for cross-tab and component reactive updates
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(
      new CustomEvent("execlink:demo_reset", {
        detail: { timestamp: now },
      })
    );

    return { success: true, timestamp: now };
  } catch (err) {
    console.error("Failed to reset demo environment", err);
    return { success: false, timestamp: now };
  }
}
