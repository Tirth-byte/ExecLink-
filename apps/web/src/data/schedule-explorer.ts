import { ExecutionDiscipline } from "./live-execution";

export type ScheduleStatus =
  | "Completed"
  | "In Progress"
  | "Not Started"
  | "Delayed"
  | "Blocked";

export type DependencyRelation = "FS" | "SS" | "FF" | "SF";

export interface ScheduleDependency {
  id: string;
  name: string;
  type: DependencyRelation;
  lag?: string;
}

export interface ScheduleExecutionEvent {
  timestamp: string;
  title: string;
  source: string;
  verificationState: "Verified" | "Awaiting Verification" | "Review Required";
  actor?: string;
  note?: string;
}

export interface ScheduleAuditRecord {
  timestamp: string;
  action: string;
  from?: string | number;
  to?: string | number;
  actor: string;
  note?: string;
}

export interface ScheduleEvidenceAttachment {
  type: "photo" | "document" | "transcript";
  reference: string;
  imageUrl?: string;
  reporter: string;
  timestamp: string;
  summary: string;
  isSyntheticDemo: boolean;
}

export interface ScheduleActivity {
  id: string;
  name: string;
  wbsId: string;
  wbsPath: string;
  discipline: ExecutionDiscipline;
  baselineStart: string; // "YYYY-MM-DD"
  baselineFinish: string;
  currentStart: string;
  currentFinish: string;
  actualStart?: string | null;
  actualFinish?: string | null;
  baselineProgress: number; // e.g. planned progress at Data Date
  currentProgress: number; // verified actual progress (e.g. 64% for ACT-P110 before approval)
  proposedProgress?: number; // unverified pending proposal (e.g. 78% for ACT-P110)
  totalFloat: string; // e.g. "0d", "3d"
  status: ScheduleStatus;
  isCritical: boolean;
  isMilestone?: boolean;
  contractor: string;
  location: string;
  assetTag: string;
  dependencies: {
    predecessors: ScheduleDependency[];
    successors: ScheduleDependency[];
  };
  executionEvents: ScheduleExecutionEvent[];
  evidence?: ScheduleEvidenceAttachment;
  history: ScheduleAuditRecord[];
}

export interface WbsNode {
  id: string;
  code: string;
  name: string;
  level: number;
  parentId?: string | null;
  activityIds: string[];
}

export const PROJECT_DATA_DATE = "2026-09-26";
export const PROJECT_DATA_DATE_DISPLAY = "26 Sep 2026";

export const WBS_HIERARCHY: WbsNode[] = [
  {
    id: "WBS-NRX",
    code: "NRX",
    name: "North River Expansion Project",
    level: 1,
    parentId: null,
    activityIds: [],
  },
  {
    id: "WBS-PROC",
    code: "NRX.01",
    name: "Process Area",
    level: 2,
    parentId: "WBS-NRX",
    activityIds: [],
  },
  {
    id: "WBS-MECH",
    code: "NRX.01.01",
    name: "Mechanical Works",
    level: 3,
    parentId: "WBS-PROC",
    activityIds: [],
  },
  {
    id: "WBS-PIPE",
    code: "NRX.01.01.01",
    name: "Process Piping Systems",
    level: 4,
    parentId: "WBS-MECH",
    activityIds: ["ACT-P105", "ACT-P110", "ACT-P125", "ACT-P140"],
  },
  {
    id: "WBS-ROT",
    code: "NRX.01.01.02",
    name: "Rotating Equipment Packages",
    level: 4,
    parentId: "WBS-MECH",
    activityIds: ["ACT-R205", "ACT-R210"],
  },
  {
    id: "WBS-STAT",
    code: "NRX.01.01.03",
    name: "Static Columns & Vessels",
    level: 4,
    parentId: "WBS-MECH",
    activityIds: ["ACT-ST301", "ACT-ST305"],
  },
  {
    id: "WBS-CIVIL",
    code: "NRX.02",
    name: "Civil & Infrastructure",
    level: 2,
    parentId: "WBS-NRX",
    activityIds: ["ACT-C250", "ACT-C245", "ACT-C240", "ACT-C260"],
  },
  {
    id: "WBS-STRUCT",
    code: "NRX.03",
    name: "Structural Steel Works",
    level: 2,
    parentId: "WBS-NRX",
    activityIds: ["ACT-S102", "ACT-S105"],
  },
  {
    id: "WBS-EI",
    code: "NRX.04",
    name: "Electrical & Instrumentation",
    level: 2,
    parentId: "WBS-NRX",
    activityIds: ["ACT-E325", "ACT-E320", "ACT-E315", "ACT-E220", "ACT-I085", "ACT-I095", "ACT-I110"],
  },
  {
    id: "WBS-HSE",
    code: "NRX.05",
    name: "HSE & Handover Assurance",
    level: 2,
    parentId: "WBS-NRX",
    activityIds: ["ACT-HSE01", "MS-001"],
  },
];

export const SCHEDULE_ACTIVITIES: ScheduleActivity[] = [
  // --- PIPING ---
  {
    id: "ACT-P105",
    name: "P-110 Pump Soleplate Preparation & Leveling",
    wbsId: "WBS-PIPE",
    wbsPath: "Process Area → Mechanical Works → Piping → P-110 Installation",
    discipline: "Piping",
    baselineStart: "2026-09-12",
    baselineFinish: "2026-09-17",
    currentStart: "2026-09-12",
    currentFinish: "2026-09-17",
    actualStart: "2026-09-12",
    actualFinish: "2026-09-17",
    baselineProgress: 100,
    currentProgress: 100,
    totalFloat: "0d",
    status: "Completed",
    isCritical: true,
    contractor: "Apex Mechanical EPC",
    location: "Process Area / Row 4",
    assetTag: "P-110",
    dependencies: {
      predecessors: [{ id: "ACT-C240", name: "Foundation Concrete Pour — Area B", type: "FS" }],
      successors: [{ id: "ACT-P110", name: "P-110 Erection & Alignment", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "17 Sep 2026 · 16:30",
        title: "Soleplate leveling verified with optical level (within 0.05 mm/m)",
        source: "Inspection Report",
        verificationState: "Verified",
        actor: "QC Department",
      },
    ],
    history: [
      { timestamp: "12 Sep 2026", action: "Actual Start Recorded", from: 0, to: 10, actor: "Site Lead" },
      { timestamp: "17 Sep 2026", action: "Verified 100% Complete", from: 10, to: 100, actor: "Tirth Patel (Planner)" },
    ],
  },
  {
    id: "ACT-P110",
    name: "P-110 Erection & Alignment",
    wbsId: "WBS-PIPE",
    wbsPath: "Process Area → Mechanical Works → Piping → P-110 Installation",
    discipline: "Piping",
    baselineStart: "2026-09-18",
    baselineFinish: "2026-09-28",
    currentStart: "2026-09-18",
    currentFinish: "2026-09-28",
    actualStart: "2026-09-18",
    actualFinish: null,
    baselineProgress: 80,
    // CRITICAL INVARIANT: 64% is verified actual in baseline. 78% is proposal in Match Review.
    currentProgress: 64,
    proposedProgress: 78,
    totalFloat: "0d",
    status: "In Progress",
    isCritical: true,
    contractor: "Apex Mechanical EPC",
    location: "Process Area / Row 4",
    assetTag: "P-110",
    dependencies: {
      predecessors: [{ id: "ACT-P105", name: "P-110 Pump Soleplate Preparation & Leveling", type: "FS" }],
      successors: [{ id: "ACT-P125", name: "P-110 Hydrotest", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "26 Sep 2026 · 09:42",
        title: "P-110 structural erection & pump alignment progress reported to 78%",
        source: "Field Update",
        verificationState: "Review Required",
        actor: "R. Sharma · Piping Supervisor",
        note: "High-confidence proposal pending planner reconciliation in Match Review.",
      },
      {
        timestamp: "24 Sep 2026 · 14:10",
        title: "Shaft dial indicator alignment rig seated; verified at 64%",
        source: "Site Diary",
        verificationState: "Verified",
        actor: "Tirth Patel (Planner)",
      },
      {
        timestamp: "18 Sep 2026 · 08:00",
        title: "Pump casing craned onto soleplates; baseline start logged",
        source: "Crane Manifest",
        verificationState: "Verified",
        actor: "Field Controls",
      },
    ],
    evidence: {
      type: "photo",
      reference: "IMG-EL-P110-0926-04.jpg",
      imageUrl: "/evidence/p110-alignment-evidence.jpg",
      reporter: "R. Sharma · Piping Supervisor",
      timestamp: "26 Sep 2026 · 09:41",
      summary: "Pump base seated on soleplates with dial indicator alignment rig mounted.",
      isSyntheticDemo: true,
    },
    history: [
      { timestamp: "18 Sep 2026", action: "Actual Start Recorded", from: 0, to: 20, actor: "Field Update" },
      { timestamp: "22 Sep 2026", action: "Verified Progress Updated", from: 20, to: 45, actor: "Tirth Patel (Planner)" },
      { timestamp: "24 Sep 2026", action: "Verified Progress Updated", from: 45, to: 64, actor: "Tirth Patel (Planner)" },
    ],
  },
  {
    id: "ACT-P125",
    name: "P-110 Hydrotest",
    wbsId: "WBS-PIPE",
    wbsPath: "Process Area → Mechanical Works → Piping → Testing",
    discipline: "Piping",
    baselineStart: "2026-09-29",
    baselineFinish: "2026-10-03",
    currentStart: "2026-10-01",
    currentFinish: "2026-10-05",
    actualStart: null,
    actualFinish: null,
    baselineProgress: 0,
    currentProgress: 0,
    totalFloat: "0d",
    status: "Blocked",
    isCritical: true,
    contractor: "Apex Mechanical EPC",
    location: "Process Area / Row 4",
    assetTag: "P-110",
    dependencies: {
      predecessors: [{ id: "ACT-P110", name: "P-110 Erection & Alignment", type: "FS" }],
      successors: [{ id: "MS-001", name: "Mechanical Completion — Train 1", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "26 Sep 2026 · 08:34",
        title: "Hydrotest activity blocked — hot work permit dependency unresolved",
        source: "Time Agent",
        verificationState: "Verified",
        actor: "Voice Update · Field Supervisor",
        note: "Permit conflict with adjacent welding workfront flagged to HSE.",
      },
    ],
    history: [
      { timestamp: "26 Sep 2026", action: "Flagged Blocked Dependency", actor: "Safety / Permit Office" },
    ],
  },
  {
    id: "ACT-P140",
    name: "Area 4 Secondary Piping Spool Fitup",
    wbsId: "WBS-PIPE",
    wbsPath: "Process Area → Mechanical Works → Piping → Spools",
    discipline: "Piping",
    baselineStart: "2026-09-20",
    baselineFinish: "2026-10-02",
    currentStart: "2026-09-20",
    currentFinish: "2026-10-02",
    actualStart: "2026-09-21",
    actualFinish: null,
    baselineProgress: 50,
    currentProgress: 45,
    totalFloat: "4d",
    status: "In Progress",
    isCritical: false,
    contractor: "Apex Mechanical EPC",
    location: "Area 4 / Rack B",
    assetTag: "SPL-04",
    dependencies: {
      predecessors: [{ id: "ACT-S102", name: "Pipe Rack Steel Erection Sector 2", type: "SS", lag: "+3d" }],
      successors: [{ id: "ACT-P125", name: "P-110 Hydrotest", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "25 Sep 2026 · 17:00",
        title: "14 spools positioned and tacked on rack crossbeams",
        source: "Site Diary",
        verificationState: "Verified",
        actor: "Weld Inspector",
      },
    ],
    history: [
      { timestamp: "21 Sep 2026", action: "Actual Start Recorded", from: 0, to: 15, actor: "Site Diary" },
      { timestamp: "25 Sep 2026", action: "Verified Progress to 45%", from: 15, to: 45, actor: "Tirth Patel" },
    ],
  },

  // --- ROTATING EQUIPMENT ---
  {
    id: "ACT-R205",
    name: "Compressor C-01 Alignment",
    wbsId: "WBS-ROT",
    wbsPath: "Process Area → Mechanical Works → Rotating Equipment → C-01",
    discipline: "Rotating Equipment",
    baselineStart: "2026-09-22",
    baselineFinish: "2026-10-01",
    currentStart: "2026-09-22",
    currentFinish: "2026-10-01",
    actualStart: "2026-09-22",
    actualFinish: null,
    baselineProgress: 55,
    currentProgress: 55,
    totalFloat: "0d",
    status: "In Progress",
    isCritical: true,
    contractor: "TurboMech Services",
    location: "Compressor Shelter / Bay 1",
    assetTag: "CMP-01",
    dependencies: {
      predecessors: [{ id: "ACT-C240", name: "Foundation Concrete Pour — Area B", type: "FS" }],
      successors: [{ id: "ACT-I085", name: "Loop Check — Compressor Train 1", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "26 Sep 2026 · 07:45",
        title: "Laser alignment cold check passed within OEM manufacturer tolerance",
        source: "Inspection Report",
        verificationState: "Verified",
        actor: "OEM Tech Rep",
      },
    ],
    history: [
      { timestamp: "22 Sep 2026", action: "Actual Start Recorded", actor: "Field Update" },
      { timestamp: "25 Sep 2026", action: "Verified Progress to 55%", actor: "Tirth Patel" },
    ],
  },

  // --- STATIC EQUIPMENT ---
  {
    id: "ACT-ST301",
    name: "Column C-12 Column Alignment & Plumb",
    wbsId: "WBS-STAT",
    wbsPath: "Process Area → Mechanical Works → Static Equipment → Columns",
    discipline: "Static Equipment",
    baselineStart: "2026-09-17",
    baselineFinish: "2026-09-27",
    currentStart: "2026-09-17",
    currentFinish: "2026-09-29",
    actualStart: "2026-09-17",
    actualFinish: null,
    baselineProgress: 90,
    currentProgress: 70,
    totalFloat: "1d",
    status: "Delayed",
    isCritical: false,
    contractor: "VesselTech Heavy Rigging",
    location: "Process Area / Column Bay",
    assetTag: "COL-12",
    dependencies: {
      predecessors: [{ id: "ACT-C240", name: "Foundation Concrete Pour — Area B", type: "FS" }],
      successors: [{ id: "ACT-ST305", name: "Reboiler E-102 Tray Installation", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "25 Sep 2026 · 11:20",
        title: "High wind hold halted crane plumb adjustment for 4 hours",
        source: "Weather Log",
        verificationState: "Verified",
        actor: "Rigging Supervisor",
      },
    ],
    history: [
      { timestamp: "17 Sep 2026", action: "Heavy Lift Lifted to Foundation", actor: "Crane Rigging" },
      { timestamp: "25 Sep 2026", action: "Progress logged at 70%", actor: "Field Controls" },
    ],
  },
  {
    id: "ACT-ST305",
    name: "Reboiler E-102 Internal Tray Installation",
    wbsId: "WBS-STAT",
    wbsPath: "Process Area → Mechanical Works → Static Equipment → Exchangers",
    discipline: "Static Equipment",
    baselineStart: "2026-09-30",
    baselineFinish: "2026-10-09",
    currentStart: "2026-10-01",
    currentFinish: "2026-10-10",
    actualStart: null,
    actualFinish: null,
    baselineProgress: 0,
    currentProgress: 0,
    totalFloat: "2d",
    status: "Not Started",
    isCritical: false,
    contractor: "VesselTech Heavy Rigging",
    location: "Process Area / Column Bay",
    assetTag: "REB-102",
    dependencies: {
      predecessors: [{ id: "ACT-ST301", name: "Column C-12 Column Alignment & Plumb", type: "FS" }],
      successors: [{ id: "MS-001", name: "Mechanical Completion — Train 1", type: "FS" }],
    },
    executionEvents: [],
    history: [],
  },

  // --- CIVIL & INFRASTRUCTURE ---
  {
    id: "ACT-C250",
    name: "Area B Subgrade Compaction & Testing",
    wbsId: "WBS-CIVIL",
    wbsPath: "Civil & Infrastructure → Earthworks → Area B",
    discipline: "Civil",
    baselineStart: "2026-09-08",
    baselineFinish: "2026-09-12",
    currentStart: "2026-09-08",
    currentFinish: "2026-09-12",
    actualStart: "2026-09-08",
    actualFinish: "2026-09-12",
    baselineProgress: 100,
    currentProgress: 100,
    totalFloat: "8d",
    status: "Completed",
    isCritical: false,
    contractor: "Delta Infra Earthworks",
    location: "Area B / Sector 3",
    assetTag: "FND-02",
    dependencies: {
      predecessors: [],
      successors: [{ id: "ACT-C245", name: "Area B Rebar Inspection", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "12 Sep 2026 · 14:00",
        title: "Nuclear gauge compaction test passed 98% Proctor density",
        source: "Geotechnical Report",
        verificationState: "Verified",
        actor: "Geotech Engineer",
      },
    ],
    history: [
      { timestamp: "08 Sep 2026", action: "Compaction Begun", actor: "Civil Lead" },
      { timestamp: "12 Sep 2026", action: "Compaction 100% Certified", actor: "Tirth Patel" },
    ],
  },
  {
    id: "ACT-C245",
    name: "Area B Foundation Rebar Cage Inspection",
    wbsId: "WBS-CIVIL",
    wbsPath: "Civil & Infrastructure → Foundations → Area B",
    discipline: "Civil",
    baselineStart: "2026-09-13",
    baselineFinish: "2026-09-16",
    currentStart: "2026-09-13",
    currentFinish: "2026-09-16",
    actualStart: "2026-09-13",
    actualFinish: "2026-09-16",
    baselineProgress: 100,
    currentProgress: 100,
    totalFloat: "6d",
    status: "Completed",
    isCritical: false,
    contractor: "Delta Infra Earthworks",
    location: "Area B / Sector 3",
    assetTag: "FND-02",
    dependencies: {
      predecessors: [{ id: "ACT-C250", name: "Area B Subgrade Compaction & Testing", type: "FS" }],
      successors: [{ id: "ACT-C240", name: "Foundation Concrete Pour — Area B", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "16 Sep 2026 · 17:30",
        title: "Rebar clearance and tie-wire density signed off for pour",
        source: "Inspection Report",
        verificationState: "Verified",
        actor: "Structural QC",
      },
    ],
    history: [
      { timestamp: "13 Sep 2026", action: "Tying Commenced", actor: "Rebar Crew" },
      { timestamp: "16 Sep 2026", action: "QA/QC Sign-off 100%", actor: "Tirth Patel" },
    ],
  },
  {
    id: "ACT-C240",
    name: "Foundation Concrete Pour — Area B",
    wbsId: "WBS-CIVIL",
    wbsPath: "Civil & Infrastructure → Foundations → Area B",
    discipline: "Civil",
    baselineStart: "2026-09-17",
    baselineFinish: "2026-09-20",
    currentStart: "2026-09-17",
    currentFinish: "2026-09-20",
    actualStart: "2026-09-17",
    actualFinish: "2026-09-20",
    baselineProgress: 100,
    currentProgress: 100,
    totalFloat: "3d",
    status: "Completed",
    isCritical: false,
    contractor: "Delta Infra Batch Plant",
    location: "Area B / Sector 3",
    assetTag: "FND-02",
    dependencies: {
      predecessors: [{ id: "ACT-C245", name: "Area B Foundation Rebar Cage Inspection", type: "FS" }],
      successors: [
        { id: "ACT-P105", name: "P-110 Pump Soleplate Preparation & Leveling", type: "FS" },
        { id: "ACT-R205", name: "Compressor C-01 Alignment", type: "FS" },
        { id: "ACT-S102", name: "Pipe Rack Steel Erection Sector 2", type: "FS" },
      ],
    },
    executionEvents: [
      {
        timestamp: "26 Sep 2026 · 09:18",
        title: "DPR batch ticket #BT-4491 confirmed 180 m³ poured",
        source: "DPR Import",
        verificationState: "Verified",
        actor: "Batch Plant Supervisor",
      },
    ],
    history: [
      { timestamp: "17 Sep 2026", action: "Pour Initiated", actor: "Batch Plant" },
      { timestamp: "20 Sep 2026", action: "Curing Begun; 100% Placed", actor: "Tirth Patel" },
    ],
  },

  // --- STRUCTURAL STEEL ---
  {
    id: "ACT-S102",
    name: "Pipe Rack Steel Erection Sector 2",
    wbsId: "WBS-STRUCT",
    wbsPath: "Structural Steel Works → Pipe Racks → Sector 2",
    discipline: "Structural",
    baselineStart: "2026-09-18",
    baselineFinish: "2026-09-27",
    currentStart: "2026-09-18",
    currentFinish: "2026-09-30",
    actualStart: "2026-09-18",
    actualFinish: null,
    baselineProgress: 85,
    currentProgress: 62,
    totalFloat: "1d",
    status: "Delayed",
    isCritical: false,
    contractor: "SteelErectors International",
    location: "Rack Sector 2 / Grid D",
    assetTag: "STR-02",
    dependencies: {
      predecessors: [{ id: "ACT-C240", name: "Foundation Concrete Pour — Area B", type: "FS" }],
      successors: [{ id: "MS-001", name: "Mechanical Completion — Train 1", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "24 Sep 2026 · 16:15",
        title: "Splice plate bolt torque calibration audit completed for tiers 1-3",
        source: "QA Audit",
        verificationState: "Verified",
        actor: "Structural Inspector",
      },
    ],
    history: [
      { timestamp: "18 Sep 2026", action: "First Column Erected", actor: "Rigging Foreman" },
      { timestamp: "24 Sep 2026", action: "Verified Progress Updated to 62%", actor: "Tirth Patel" },
    ],
  },

  // --- ELECTRICAL & INSTRUMENTATION ---
  {
    id: "ACT-E325",
    name: "Substation 2 Cable Tray Installation",
    wbsId: "WBS-EI",
    wbsPath: "Electrical & Instrumentation → Substation 2 → Trays",
    discipline: "Electrical",
    baselineStart: "2026-09-10",
    baselineFinish: "2026-09-16",
    currentStart: "2026-09-10",
    currentFinish: "2026-09-16",
    actualStart: "2026-09-10",
    actualFinish: "2026-09-16",
    baselineProgress: 100,
    currentProgress: 100,
    totalFloat: "5d",
    status: "Completed",
    isCritical: false,
    contractor: "Ampere Electric EPC",
    location: "Substation 2 / Room 101",
    assetTag: "SS-02",
    dependencies: {
      predecessors: [],
      successors: [{ id: "ACT-E315", name: "MCC-02 Cable Termination", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "16 Sep 2026 · 15:00",
        title: "Overhead 600mm ladder tray continuity and earthing verified",
        source: "Electrical Inspection",
        verificationState: "Verified",
        actor: "EE Inspector",
      },
    ],
    history: [
      { timestamp: "10 Sep 2026", action: "Tray Supports Commenced", actor: "Electrical Lead" },
      { timestamp: "16 Sep 2026", action: "Installation 100% Signed Off", actor: "A. Mehta" },
    ],
  },
  {
    id: "ACT-E315",
    name: "MCC-02 Cable Termination",
    wbsId: "WBS-EI",
    wbsPath: "Electrical & Instrumentation → Power Distribution → MCC-02",
    discipline: "Electrical",
    baselineStart: "2026-09-23",
    baselineFinish: "2026-09-29",
    currentStart: "2026-09-23",
    currentFinish: "2026-09-30",
    actualStart: "2026-09-23",
    actualFinish: null,
    baselineProgress: 60,
    currentProgress: 42,
    totalFloat: "1d",
    status: "Blocked",
    isCritical: false,
    contractor: "Ampere Electric EPC",
    location: "Substation 2 / MCC Room",
    assetTag: "MCC-02",
    dependencies: {
      predecessors: [{ id: "ACT-E325", name: "Substation 2 Cable Tray Installation", type: "FS" }],
      successors: [{ id: "ACT-E220", name: "Switchgear 11kV Hipot Testing", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "26 Sep 2026 · 08:51",
        title: "Workfront access blocked by lockout in adjacent transformer bay",
        source: "Site Diary",
        verificationState: "Verified",
        actor: "M. Iqbal · Electrical Lead",
        note: "Permit and access dependency pending clearance.",
      },
    ],
    history: [
      { timestamp: "23 Sep 2026", action: "Glanding and Stripping Begun", actor: "Terminations Team" },
      { timestamp: "25 Sep 2026", action: "Progress verified at 42%", actor: "A. Mehta" },
      { timestamp: "26 Sep 2026", action: "Blocked Status Logged", actor: "Safety Office" },
    ],
  },
  {
    id: "ACT-E220",
    name: "Switchgear 11kV Hipot Testing & Commissioning",
    wbsId: "WBS-EI",
    wbsPath: "Electrical & Instrumentation → High Voltage → Switchgear",
    discipline: "Electrical",
    baselineStart: "2026-10-01",
    baselineFinish: "2026-10-07",
    currentStart: "2026-10-02",
    currentFinish: "2026-10-08",
    actualStart: null,
    actualFinish: null,
    baselineProgress: 0,
    currentProgress: 0,
    totalFloat: "1d",
    status: "Not Started",
    isCritical: false,
    contractor: "Ampere Electric EPC",
    location: "11kV Switchgear Building",
    assetTag: "SWG-01",
    dependencies: {
      predecessors: [{ id: "ACT-E315", name: "MCC-02 Cable Termination", type: "FS" }],
      successors: [{ id: "MS-001", name: "Mechanical Completion — Train 1", type: "FS" }],
    },
    executionEvents: [],
    history: [],
  },

  // --- INSTRUMENTATION ---
  {
    id: "ACT-I085",
    name: "Loop Check — Compressor Train 1",
    wbsId: "WBS-EI",
    wbsPath: "Electrical & Instrumentation → Automation → Loop Checks",
    discipline: "Instrumentation",
    baselineStart: "2026-09-21",
    baselineFinish: "2026-09-28",
    currentStart: "2026-09-21",
    currentFinish: "2026-09-28",
    actualStart: "2026-09-21",
    actualFinish: null,
    baselineProgress: 80,
    currentProgress: 75,
    totalFloat: "2d",
    status: "In Progress",
    isCritical: false,
    contractor: "PetroControls Ltd",
    location: "Compressor / Train 1",
    assetTag: "CMP-01",
    dependencies: {
      predecessors: [
        { id: "ACT-R205", name: "Compressor C-01 Alignment", type: "SS", lag: "+2d" },
      ],
      successors: [{ id: "ACT-I110", name: "Fire & Gas Detector Loop Check", type: "FS" }],
    },
    executionEvents: [
      {
        timestamp: "26 Sep 2026 · 09:47",
        title: "QC sign-off complete on Loop Check Compressor Train 1",
        source: "Field Update",
        verificationState: "Verified",
        actor: "D. Vance · QC Lead",
      },
    ],
    evidence: {
      type: "document",
      reference: "QC-INSP-0926-088.pdf",
      reporter: "D. Vance · QC Lead",
      timestamp: "26 Sep 2026 · 09:47",
      summary: "Digital calibration sheet signed off with zero punch items.",
      isSyntheticDemo: true,
    },
    history: [
      { timestamp: "21 Sep 2026", action: "Loop Testing Started", actor: "I&C Team" },
      { timestamp: "26 Sep 2026", action: "Progress verified at 75%", actor: "Tirth Patel" },
    ],
  },
  {
    id: "ACT-I110",
    name: "Fire & Gas Detector Loop Check",
    wbsId: "WBS-EI",
    wbsPath: "Electrical & Instrumentation → Safety Systems → F&G",
    discipline: "Instrumentation",
    baselineStart: "2026-09-29",
    baselineFinish: "2026-10-05",
    currentStart: "2026-09-29",
    currentFinish: "2026-10-05",
    actualStart: null,
    actualFinish: null,
    baselineProgress: 0,
    currentProgress: 0,
    totalFloat: "3d",
    status: "Not Started",
    isCritical: false,
    contractor: "PetroControls Ltd",
    location: "Process Area / Train 1",
    assetTag: "FG-01",
    dependencies: {
      predecessors: [{ id: "ACT-I085", name: "Loop Check — Compressor Train 1", type: "FS" }],
      successors: [{ id: "MS-001", name: "Mechanical Completion — Train 1", type: "FS" }],
    },
    executionEvents: [],
    history: [],
  },

  // --- HSE & MILESTONES ---
  {
    id: "ACT-HSE01",
    name: "Area B Scaffold Handover Inspection",
    wbsId: "WBS-HSE",
    wbsPath: "HSE & Handover Assurance → Scaffolding → Area B",
    discipline: "HSE",
    baselineStart: "2026-09-17",
    baselineFinish: "2026-09-19",
    currentStart: "2026-09-17",
    currentFinish: "2026-09-19",
    actualStart: "2026-09-17",
    actualFinish: "2026-09-19",
    baselineProgress: 100,
    currentProgress: 100,
    totalFloat: "9d",
    status: "Completed",
    isCritical: false,
    contractor: "SafeAccess Scaffolding",
    location: "Area B / Sector 3",
    assetTag: "SCF-02",
    dependencies: {
      predecessors: [],
      successors: [{ id: "ACT-P110", name: "P-110 Erection & Alignment", type: "SS" }],
    },
    executionEvents: [
      {
        timestamp: "19 Sep 2026 · 11:00",
        title: "Green tag handover inspection approved for 22m access scaffold",
        source: "Safety Register",
        verificationState: "Verified",
        actor: "HSE Auditor",
      },
    ],
    history: [
      { timestamp: "17 Sep 2026", action: "Erection Completed", actor: "Scaffold Lead" },
      { timestamp: "19 Sep 2026", action: "Green Scafftag Issued; 100%", actor: "HSE Auditor" },
    ],
  },
  {
    id: "MS-001",
    name: "Mechanical Completion — Train 1",
    wbsId: "WBS-HSE",
    wbsPath: "HSE & Handover Assurance → Milestones → Train 1",
    discipline: "HSE",
    baselineStart: "2026-10-15",
    baselineFinish: "2026-10-15",
    currentStart: "2026-10-15",
    currentFinish: "2026-10-15",
    actualStart: null,
    actualFinish: null,
    baselineProgress: 0,
    currentProgress: 0,
    totalFloat: "0d",
    status: "Not Started",
    isCritical: true,
    isMilestone: true,
    contractor: "Owner / Turnkey Consortium",
    location: "Train 1 Overall",
    assetTag: "MS-TR1",
    dependencies: {
      predecessors: [
        { id: "ACT-P125", name: "P-110 Hydrotest", type: "FS" },
        { id: "ACT-R210", name: "Lube Oil Skid Piping Connections", type: "FS" },
        { id: "ACT-ST305", name: "Reboiler E-102 Tray Installation", type: "FS" },
        { id: "ACT-E220", name: "Switchgear 11kV Hipot Testing", type: "FS" },
        { id: "ACT-I110", name: "Fire & Gas Detector Loop Check", type: "FS" },
      ],
      successors: [],
    },
    executionEvents: [],
    history: [
      { timestamp: "01 Sep 2026", action: "Baseline Milestone Created", actor: "PMO Planning" },
    ],
  },
];

export const SCHEDULE_METRICS = {
  totalActivities: 18,
  plannedProgress: 44.2,
  verifiedActualProgress: 38.6,
  variancePts: -5.6,
  criticalCount: 3,
  dataDate: "26 Sep 2026",
  dataDateIso: "2026-09-26",
};

