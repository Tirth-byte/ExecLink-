import { ExecutionDiscipline, EventSource } from "./live-execution";

export type MatchCandidate = {
  id: string;
  name: string;
  discipline: ExecutionDiscipline;
  wbs: string;
  confidence: number;
  confidenceTier: "High" | "Review" | "Weak";
  baselineStart: string;
  baselineFinish: string;
  currentProgress: number;
  proposedProgress: number;
  deltaProgress: number;
  totalFloat: string;
  scheduleStatus: string;
  isProgressCompatible: boolean;
  incompatibilityReason?: string;
  signals: {
    semantic: number;
    assetTag: number;
    wbsContext: number;
    discipline: number;
    temporal: number;
    location: number;
  };
  reasoning: string;
};

export type MatchReviewItem = {
  id: string;
  eventId: string;
  priority: "High" | "Medium" | "Low";
  category: "All" | "High Priority" | "Low Confidence" | "Ambiguous" | "Unmatched";
  status: "Needs Review" | "Verified" | "Rejected" | "Flagged New Activity";
  time: string;
  date: string;
  timestamp: string;
  discipline: ExecutionDiscipline;
  eventTitle: string;
  rawFieldUpdate: string;
  structuredExtraction: {
    eventType: string;
    discipline: ExecutionDiscipline;
    assetTag: string;
    location: string;
    reportedProgress: string;
    source: EventSource;
    reportedBy: string;
    role: string;
    received: string;
  };
  evidence: {
    type: "photo" | "video" | "document" | "transcript" | "sheet";
    count: string;
    reference: string;
    reporter: string;
    timestamp: string;
    summary: string;
    imageUrl?: string;
    videoUrl?: string;
    duration?: string;
    aiObservation?: string;
    isSyntheticDemo?: boolean;
  };
  recommendedCandidate: MatchCandidate;
  alternativeCandidates: MatchCandidate[];
  routing: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  plannerNote?: string;
};

export const matchReviewQueue: MatchReviewItem[] = [
  {
    id: "REV-001",
    eventId: "EVT-0147",
    priority: "High",
    category: "High Priority",
    status: "Needs Review",
    time: "09:42",
    date: "26 Sep 2026",
    timestamp: "26 Sep 2026 · 09:42",
    discipline: "Piping",
    eventTitle: "P-110 erection progress updated to 78%",
    rawFieldUpdate: "“P-110 structural erection and pump alignment completed to approximately 78% in Process Area / Row B.”",
    structuredExtraction: {
      eventType: "Progress Update",
      discipline: "Piping",
      assetTag: "P-110",
      location: "Process Area / Row B",
      reportedProgress: "78%",
      source: "Field Update",
      reportedBy: "R. Sharma",
      role: "Piping Supervisor",
      received: "26 Sep 2026 · 09:42",
    },
    evidence: {
      type: "photo",
      count: "1 attachment",
      reference: "IMG-EL-P110-0926-04.jpg",
      reporter: "R. Sharma · Piping Supervisor",
      timestamp: "26 Sep 2026 · 09:41",
      summary: "Pump base seated on soleplates with dial indicator alignment rig mounted.",
      imageUrl: "/evidence/p110-alignment-evidence.jpg",
      aiObservation: "Pump base and alignment dial indicators are clearly visible on coupling shaft. Evidence is consistent with pump erection / alignment scope, but final verification remains a planner decision.",
      isSyntheticDemo: true,
    },
    recommendedCandidate: {
      id: "ACT-P110",
      name: "P-110 Erection & Alignment",
      discipline: "Piping",
      wbs: "Process Area → Mechanical Works → Piping → P-110 Installation",
      confidence: 97,
      confidenceTier: "High",
      baselineStart: "18 Sep 2026",
      baselineFinish: "28 Sep 2026",
      currentProgress: 64,
      proposedProgress: 78,
      deltaProgress: 14,
      totalFloat: "0d",
      scheduleStatus: "In Progress",
      isProgressCompatible: true,
      signals: {
        semantic: 96,
        assetTag: 100,
        wbsContext: 92,
        discipline: 100,
        temporal: 88,
        location: 84,
      },
      reasoning: "Asset P-110 is explicitly referenced in the field update. The erection and alignment terminology, piping discipline, Process Area location and execution timing strongly align with ACT-P110.",
    },
    alternativeCandidates: [
      {
        id: "ACT-P125",
        name: "P-110 Hydrotest",
        discipline: "Piping",
        wbs: "Process Area → Mechanical Works → Piping → Testing",
        confidence: 71,
        confidenceTier: "Review",
        baselineStart: "29 Sep 2026",
        baselineFinish: "04 Oct 2026",
        currentProgress: 0,
        proposedProgress: 0,
        deltaProgress: 0,
        totalFloat: "2d",
        scheduleStatus: "Not Started",
        isProgressCompatible: false,
        incompatibilityReason: "The reported 78% progress refers to erection work and cannot be safely applied to the selected Hydrotest activity.",
        signals: {
          semantic: 68,
          assetTag: 100,
          wbsContext: 85,
          discipline: 100,
          temporal: 52,
          location: 84,
        },
        reasoning: "Asset P-110 and the piping context match this activity, but the reported work describes erection and alignment rather than hydrotesting. ACT-P125 is therefore a plausible asset match but a weaker execution-stage match.",
      },
      {
        id: "ACT-P140",
        name: "Area 4 Secondary Piping Spool Fitup",
        discipline: "Piping",
        wbs: "Process Area → Piping → Spools",
        confidence: 43,
        confidenceTier: "Weak",
        baselineStart: "22 Sep 2026",
        baselineFinish: "01 Oct 2026",
        currentProgress: 35,
        proposedProgress: 35,
        deltaProgress: 0,
        totalFloat: "5d",
        scheduleStatus: "In Progress",
        isProgressCompatible: false,
        incompatibilityReason: "The reported 78% erection progress refers to equipment installation and cannot be safely applied to secondary piping spool fitup.",
        signals: {
          semantic: 45,
          assetTag: 20,
          wbsContext: 60,
          discipline: 100,
          temporal: 65,
          location: 50,
        },
        reasoning: "Piping discipline and general timeframe overlap, but asset tag P-110 does not match spool fitup scope in Area 4.",
      },
    ],
    routing: "Human verification required",
  },
  {
    id: "REV-002",
    eventId: "EVT-0145",
    priority: "High",
    category: "High Priority",
    status: "Needs Review",
    time: "09:18",
    date: "26 Sep 2026",
    timestamp: "26 Sep 2026 · 09:18",
    discipline: "Civil",
    eventTitle: "Foundation concrete pour completed",
    rawFieldUpdate: "“Area B foundation pour finished. Total volume 180 m³ poured versus schedule estimate of 165 m³.”",
    structuredExtraction: {
      eventType: "Concrete Pour Completion",
      discipline: "Civil",
      assetTag: "FND-C240",
      location: "Area B / Sector 3",
      reportedProgress: "100% (180 m³)",
      source: "DPR Import",
      reportedBy: "DPR Batch 2026-269",
      role: "Concreting Lead",
      received: "26 Sep 2026 · 09:18",
    },
    evidence: {
      type: "document",
      count: "1 attachment",
      reference: "DPR-2026-269-Row-184.pdf",
      reporter: "Delta Infra Batch Plant",
      timestamp: "26 Sep 2026 · 09:18",
      summary: "Daily Progress Report batch ticket #BT-4491 records 180 m³ poured for Area B foundation.",
      imageUrl: "/evidence/p110-alignment-evidence.jpg",
      aiObservation: "Digital batch manifest logs 180 m³ certified ready-mix concrete delivered to Sector 3. Exceeds baseline schedule quantity by 15 m³ (+9%).",
      isSyntheticDemo: true,
    },
    recommendedCandidate: {
      id: "ACT-C240",
      name: "Foundation Concrete Pour — Area B",
      discipline: "Civil",
      wbs: "North River Expansion → Area B → Civil Works → Foundations",
      confidence: 88,
      confidenceTier: "Review",
      baselineStart: "20 Sep 2026",
      baselineFinish: "26 Sep 2026",
      currentProgress: 45,
      proposedProgress: 100,
      deltaProgress: 55,
      totalFloat: "1d",
      scheduleStatus: "In Progress",
      isProgressCompatible: true,
      signals: {
        semantic: 92,
        assetTag: 88,
        wbsContext: 89,
        discipline: 100,
        temporal: 84,
        location: 85,
      },
      reasoning: "Area B and foundation pour terminology match ACT-C240 directly. Confidence is routed to Review because reported pour volume (180 m³) exceeds baseline estimate (165 m³) by 9%, requiring planner verification before schedule closeout.",
    },
    alternativeCandidates: [
      {
        id: "ACT-C245",
        name: "Area B Mud Mat & Blinding Concrete",
        discipline: "Civil",
        wbs: "North River Expansion → Area B → Civil Works → Substructure",
        confidence: 62,
        confidenceTier: "Weak",
        baselineStart: "14 Sep 2026",
        baselineFinish: "19 Sep 2026",
        currentProgress: 100,
        proposedProgress: 100,
        deltaProgress: 0,
        totalFloat: "0d",
        scheduleStatus: "Completed",
        isProgressCompatible: false,
        incompatibilityReason: "The reported structural foundation pour cannot be credited to the already completed mud mat activity.",
        signals: {
          semantic: 64,
          assetTag: 70,
          wbsContext: 80,
          discipline: 100,
          temporal: 40,
          location: 82,
        },
        reasoning: "Substructure blinding layer was already marked 100% complete on 19 Sep and closed out.",
      },
      {
        id: "ACT-C250",
        name: "Area B Equipment Pad Grouting",
        discipline: "Civil",
        wbs: "North River Expansion → Area B → Civil Works → Finishing",
        confidence: 48,
        confidenceTier: "Weak",
        baselineStart: "28 Sep 2026",
        baselineFinish: "03 Oct 2026",
        currentProgress: 0,
        proposedProgress: 0,
        deltaProgress: 0,
        totalFloat: "3d",
        scheduleStatus: "Not Started",
        isProgressCompatible: false,
        incompatibilityReason: "Foundation pour volume cannot be attributed to finishing grouting which has not yet started.",
        signals: {
          semantic: 48,
          assetTag: 60,
          wbsContext: 75,
          discipline: 100,
          temporal: 35,
          location: 80,
        },
        reasoning: "Successor finishing activity scheduled for after concrete curing cycle.",
      },
    ],
    routing: "Human verification required (Volume variance)",
  },
  {
    id: "REV-003",
    eventId: "EVT-0144",
    priority: "Medium",
    category: "Ambiguous",
    status: "Needs Review",
    time: "08:51",
    date: "26 Sep 2026",
    timestamp: "26 Sep 2026 · 08:51",
    discipline: "Electrical",
    eventTitle: "MCC-02 cable termination progress updated",
    rawFieldUpdate: "“Power feeder cables pulled into MCC-02 cubicles 1-4. Termination held pending access clearance.”",
    structuredExtraction: {
      eventType: "Cable Pull & Termination",
      discipline: "Electrical",
      assetTag: "MCC-02",
      location: "Utilities / Substation 2",
      reportedProgress: "42% Terminated",
      source: "Site Diary",
      reportedBy: "M. Iqbal",
      role: "Electrical Lead",
      received: "26 Sep 2026 · 08:51",
    },
    evidence: {
      type: "document",
      count: "1 attachment",
      reference: "SD-0926-E-02.pdf",
      reporter: "M. Iqbal · Electrical Lead",
      timestamp: "26 Sep 2026 · 08:51",
      summary: "Shift handover log notes cable pulling complete, terminations held for safety permit clearance.",
      imageUrl: "/evidence/p110-alignment-evidence.jpg",
      aiObservation: "Handover document indicates power cables pulled into Substation 2 MCC cubicles 1-4. Termination work paused awaiting hot work safety isolation permit.",
      isSyntheticDemo: true,
    },
    recommendedCandidate: {
      id: "ACT-E315",
      name: "MCC-02 Cable Termination",
      discipline: "Electrical",
      wbs: "North River Expansion → Utilities → Electrical → MCC-02",
      confidence: 84,
      confidenceTier: "Review",
      baselineStart: "22 Sep 2026",
      baselineFinish: "29 Sep 2026",
      currentProgress: 20,
      proposedProgress: 42,
      deltaProgress: 22,
      totalFloat: "1d",
      scheduleStatus: "In Progress",
      isProgressCompatible: true,
      signals: {
        semantic: 86,
        assetTag: 94,
        wbsContext: 88,
        discipline: 100,
        temporal: 82,
        location: 80,
      },
      reasoning: "The field statement mentions both cable pulling and cubicle terminations for MCC-02. Two valid schedule activities exist: ACT-E315 (Termination) and ACT-E320 (Feeder Pulling). ExecLink recommends ACT-E315 based on cubicle specificity, but planner judgment is required to confirm scope allocation.",
    },
    alternativeCandidates: [
      {
        id: "ACT-E320",
        name: "Substation 2 Feeder Cable Pulling",
        discipline: "Electrical",
        wbs: "North River Expansion → Utilities → Electrical → Cable Trays",
        confidence: 81,
        confidenceTier: "Review",
        baselineStart: "20 Sep 2026",
        baselineFinish: "27 Sep 2026",
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
        reasoning: "Feeder cable pulling is explicitly described as completed into the cubicles, making this an equally plausible destination for progress credit.",
      },
      {
        id: "ACT-E325",
        name: "MCC-02 Cold Loop Testing",
        discipline: "Electrical",
        wbs: "North River Expansion → Utilities → Electrical → Testing",
        confidence: 38,
        confidenceTier: "Weak",
        baselineStart: "01 Oct 2026",
        baselineFinish: "06 Oct 2026",
        currentProgress: 0,
        proposedProgress: 0,
        deltaProgress: 0,
        totalFloat: "4d",
        scheduleStatus: "Not Started",
        isProgressCompatible: false,
        incompatibilityReason: "Testing activity requires all terminations complete and cannot take cable pulling progress.",
        signals: {
          semantic: 36,
          assetTag: 94,
          wbsContext: 70,
          discipline: 100,
          temporal: 30,
          location: 80,
        },
        reasoning: "Pre-commissioning test milestone scheduled after all terminations complete.",
      },
    ],
    routing: "Planner arbitration required",
  },
  {
    id: "REV-004",
    eventId: "EVT-0142",
    priority: "Medium",
    category: "Unmatched",
    status: "Needs Review",
    time: "08:26",
    date: "26 Sep 2026",
    timestamp: "26 Sep 2026 · 08:26",
    discipline: "Instrumentation",
    eventTitle: "Instrument junction box field statement unmatched",
    rawFieldUpdate: "“Subcontractor mounted unreferenced JB-840 near cooling tower auxiliary line. No tag in current L5 schedule.”",
    structuredExtraction: {
      eventType: "Unplanned Installation",
      discipline: "Instrumentation",
      assetTag: "JB-840",
      location: "Cooling Tower / Aux",
      reportedProgress: "1 JB Installed",
      source: "Field Update",
      reportedBy: "P. Nair",
      role: "Instrumentation Inspector",
      received: "26 Sep 2026 · 08:26",
    },
    evidence: {
      type: "photo",
      count: "1 attachment",
      reference: "IMG-JB840-0926-01.jpg",
      reporter: "P. Nair · Instrumentation Inspector",
      timestamp: "26 Sep 2026 · 08:26",
      summary: "Field photograph showing junction box installed without WBS schedule tag.",
      imageUrl: "/evidence/p110-alignment-evidence.jpg",
      aiObservation: "Enclosure mounted to structural column near cooling line. No project control tag or L5 WBS identifier found.",
      isSyntheticDemo: true,
    },
    recommendedCandidate: {
      id: "ACT-I110",
      name: "Cooling Tower Aux Instrument Wiring",
      discipline: "Instrumentation",
      wbs: "North River Expansion → Cooling Tower → Instrumentation",
      confidence: 41,
      confidenceTier: "Weak",
      baselineStart: "24 Sep 2026",
      baselineFinish: "02 Oct 2026",
      currentProgress: 0,
      proposedProgress: 0,
      deltaProgress: 0,
      totalFloat: "6d",
      scheduleStatus: "Not Started",
      isProgressCompatible: false,
      incompatibilityReason: "Tag JB-840 does not match any registered asset identifier in the current L5 schedule. Unreferenced work cannot mutate planned activities.",
      signals: {
        semantic: 48,
        assetTag: 12,
        wbsContext: 52,
        discipline: 95,
        temporal: 44,
        location: 62,
      },
      reasoning: "Tag JB-840 does not match any registered asset identifier in the current L5 schedule. While the cooling tower location aligns with general offsites instrumentation, no planned activity exists for this installation. Recommended action: Mark as New Activity to create a change request.",
    },
    alternativeCandidates: [
      {
        id: "ACT-I095",
        name: "Offsites Junction Box Common Trays",
        discipline: "Instrumentation",
        wbs: "North River Expansion → Offsites → Instrumentation",
        confidence: 34,
        confidenceTier: "Weak",
        baselineStart: "18 Sep 2026",
        baselineFinish: "25 Sep 2026",
        currentProgress: 25,
        proposedProgress: 25,
        deltaProgress: 0,
        totalFloat: "0d",
        scheduleStatus: "In Progress",
        isProgressCompatible: false,
        incompatibilityReason: "Tray cable run scope does not encompass auxiliary cooling tower junction box installation.",
        signals: {
          semantic: 40,
          assetTag: 10,
          wbsContext: 42,
          discipline: 95,
          temporal: 40,
          location: 45,
        },
        reasoning: "Low confidence across all signals; tray cable run does not specify auxiliary cooling line boxes.",
      },
    ],
    routing: "Potential new activity flag",
  },
];
