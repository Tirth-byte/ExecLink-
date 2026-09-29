export type ExecutionDiscipline =
  | "Civil"
  | "Structural"
  | "Piping"
  | "Static Equipment"
  | "Rotating Equipment"
  | "Electrical"
  | "Instrumentation"
  | "HSE";

export type EventStatus =
  | "Verified"
  | "Auto-suggest"
  | "Review"
  | "Unmatched"
  | "Rejected"
  | "Blocked";

export type EventSource =
  | "Field Update"
  | "DPR Import"
  | "Site Diary"
  | "Time Agent"
  | "Spreadsheet";

export type ExecutionEvent = {
  id: string;
  time: string;
  date: string;
  timestamp: string;
  event: string;
  rawUpdate: string;
  discipline: ExecutionDiscipline;
  assetTag: string;
  location: string;
  source: EventSource;
  reporter: string;
  matchedActivity: {
    id: string;
    name: string;
    wbs: string;
  } | null;
  confidence: number | null;
  status: EventStatus;
  routing: "Auto-suggest" | "Review" | "Unmatched" | "Blocked";
  extractedDetails: {
    eventType: string;
    timestamp: string;
    discipline: ExecutionDiscipline;
    assetTag: string;
    location: string;
    contractor: string;
    quantity: string;
    source: EventSource;
  };
  matchSignals?: {
    semantic: number;
    assetTag: number;
    wbsContext: number;
    discipline: number;
    temporal: number;
    location: number;
  };
  evidence: {
    type: "photo" | "document" | "transcript" | "sheet";
    reference: string;
    reporter: string;
    timestamp: string;
    summary: string;
  };
  auditHistory: Array<{
    time: string;
    action: string;
    actor: string;
    note?: string;
  }>;
};

export const liveExecutionFixture = {
  summary: {
    total: 148,
    verified: 112,
    needsReview: 23,
    unmatched: 13,
    blocked: 2,
    lastReceived: "09:47",
    dataDate: "26 Sep 2026",
  },
  events: [
    {
      id: "EVT-0148",
      time: "09:47",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 09:47",
      event: "Inspection completed on Loop Check Train 1",
      rawUpdate: "QC sign-off complete on Loop Check Compressor Train 1. Instrumentation leads calibrated to spec.",
      discipline: "Instrumentation",
      assetTag: "CMP-01",
      location: "Compressor / Train 1",
      source: "Field Update",
      reporter: "D. Vance · QC Lead",
      matchedActivity: {
        id: "ACT-I085",
        name: "Loop Check — Compressor Train 1",
        wbs: "NRX / Compressor / Instrumentation / Loop Checks",
      },
      confidence: 96,
      status: "Verified",
      routing: "Auto-suggest",
      extractedDetails: {
        eventType: "Inspection Sign-off",
        timestamp: "26 Sep 2026 · 09:47",
        discipline: "Instrumentation",
        assetTag: "CMP-01",
        location: "Compressor Train 1 Area",
        contractor: "PetroControls Ltd",
        quantity: "1 Loop Sign-off (100%)",
        source: "Field Update",
      },
      matchSignals: {
        semantic: 98,
        assetTag: 95,
        wbsContext: 94,
        discipline: 100,
        temporal: 96,
        location: 93,
      },
      evidence: {
        type: "document",
        reference: "QC-INSP-0926-088",
        reporter: "D. Vance · QC Lead",
        timestamp: "09:47",
        summary: "Digital calibration sheet signed off with zero punch items.",
      },
      auditHistory: [
        { time: "09:47", action: "Received", actor: "Field Update Ingestion", note: "Mobile app payload validated" },
        { time: "09:47", action: "Structured", actor: "Ingestion Pipeline", note: "Extracted tags CMP-01, loop check" },
        { time: "09:48", action: "Match Proposed", actor: "AI Matching Engine", note: "High confidence match to ACT-I085 (96%)" },
        { time: "09:50", action: "Verified", actor: "Tirth Patel (Planner)", note: "Confirmed against QA/QC milestone" },
      ],
    },
    {
      id: "EVT-0147",
      time: "09:42",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 09:42",
      event: "P-110 erection progress updated to 78%",
      rawUpdate: "P-110 structural erection and pump alignment completed at 09:35. Grouting prep started. Measured progress 78%.",
      discipline: "Piping",
      assetTag: "P-110",
      location: "Process Area / Row 4",
      source: "Field Update",
      reporter: "R. Sharma · Piping Supervisor",
      matchedActivity: {
        id: "ACT-P110",
        name: "P-110 Erection & Alignment",
        wbs: "NRX / Process Area / Piping / Pumps",
      },
      confidence: 97,
      status: "Verified",
      routing: "Auto-suggest",
      extractedDetails: {
        eventType: "Installation Progress",
        timestamp: "26 Sep 2026 · 09:42",
        discipline: "Piping",
        assetTag: "P-110",
        location: "Process Area / Row 4",
        contractor: "Apex Mechanical EPC",
        quantity: "78% Complete",
        source: "Field Update",
      },
      matchSignals: {
        semantic: 97,
        assetTag: 100,
        wbsContext: 98,
        discipline: 100,
        temporal: 95,
        location: 92,
      },
      evidence: {
        type: "photo",
        reference: "IMG-EL-P110-0926-04.jpg",
        reporter: "R. Sharma · Piping Supervisor",
        timestamp: "09:42",
        summary: "Field photo showing pump base seated on soleplates with torque stamps verified.",
      },
      auditHistory: [
        { time: "09:42", action: "Received", actor: "Field Update Ingestion" },
        { time: "09:42", action: "Structured", actor: "Ingestion Pipeline" },
        { time: "09:43", action: "Match Proposed", actor: "AI Matching Engine", note: "Score 97% to ACT-P110" },
        { time: "09:44", action: "Verified", actor: "Tirth Patel (Planner)", note: "Approved field quantity" },
      ],
    },
    {
      id: "EVT-0146",
      time: "09:35",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 09:35",
      event: "Hydrotest blocked — permit dependency",
      rawUpdate: "Hydrotest on line 12-P-110 blocked due to unresolved hot work permit on adjacent platform.",
      discipline: "Piping",
      assetTag: "12-P-110",
      location: "Process Area / Pipe Rack",
      source: "Time Agent",
      reporter: "Voice transcript · Field Supervisor",
      matchedActivity: {
        id: "ACT-P125",
        name: "P-110 Hydrotest",
        wbs: "NRX / Process Area / Piping / Testing",
      },
      confidence: 94,
      status: "Blocked",
      routing: "Blocked",
      extractedDetails: {
        eventType: "Execution Blocker",
        timestamp: "26 Sep 2026 · 09:35",
        discipline: "Piping",
        assetTag: "12-P-110",
        location: "Process Area / Pipe Rack",
        contractor: "Apex Mechanical EPC",
        quantity: "0% Tested (Blocked)",
        source: "Time Agent",
      },
      matchSignals: {
        semantic: 95,
        assetTag: 92,
        wbsContext: 96,
        discipline: 100,
        temporal: 90,
        location: 91,
      },
      evidence: {
        type: "transcript",
        reference: "TA-AUDIO-0926-0935",
        reporter: "Voice Agent · Field Supervisor",
        timestamp: "09:35",
        summary: "Audio recording: 'We cannot start hydrotest on 12-P-110 until permit office signs off isolation zone.'",
      },
      auditHistory: [
        { time: "09:35", action: "Received", actor: "Time Agent Voice Pipeline" },
        { time: "09:35", action: "Structured", actor: "Ingestion Pipeline", note: "Extracted blocker intent: permit dependency" },
        { time: "09:36", action: "Match Proposed", actor: "AI Matching Engine", note: "Linked to ACT-P125" },
        { time: "09:39", action: "Flagged Blocked", actor: "Tirth Patel (Planner)", note: "Critical execution watch notification triggered" },
      ],
    },
    {
      id: "EVT-0145",
      time: "09:18",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 09:18",
      event: "Foundation concrete pour completed",
      rawUpdate: "Area B foundation pour finished. Total volume 180 m³ poured versus schedule estimate of 165 m³.",
      discipline: "Civil",
      assetTag: "FND-C240",
      location: "Area B / Sector 3",
      source: "DPR Import",
      reporter: "DPR Import Batch 2026-269",
      matchedActivity: {
        id: "ACT-C240",
        name: "Foundation Concrete Pour — Area B",
        wbs: "NRX / Area B / Civil / Foundations",
      },
      confidence: 88,
      status: "Review",
      routing: "Review",
      extractedDetails: {
        eventType: "Concrete Pour Completion",
        timestamp: "26 Sep 2026 · 09:18",
        discipline: "Civil",
        assetTag: "FND-C240",
        location: "Area B / Sector 3",
        contractor: "Delta Infra Concreting",
        quantity: "180 m³ (100% physically complete)",
        source: "DPR Import",
      },
      matchSignals: {
        semantic: 92,
        assetTag: 88,
        wbsContext: 89,
        discipline: 100,
        temporal: 84,
        location: 85,
      },
      evidence: {
        type: "document",
        reference: "DPR-2026-269-Row-184",
        reporter: "DPR System",
        timestamp: "09:18",
        summary: "Daily Progress Report line item records 180 m³ actual volume with batch ticket #BT-4491.",
      },
      auditHistory: [
        { time: "09:18", action: "Received", actor: "DPR Automated Ingestion" },
        { time: "09:18", action: "Structured", actor: "Ingestion Pipeline" },
        { time: "09:19", action: "Match Proposed", actor: "AI Matching Engine", note: "Routed to Review: volume exceeds plan by 15 m³" },
        { time: "09:20", action: "Awaiting Verification", actor: "System", note: "Assigned to Civil Area Planner" },
      ],
    },
    {
      id: "EVT-0144",
      time: "08:51",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 08:51",
      event: "MCC-02 cable termination progress updated",
      rawUpdate: "Power feeder cables pulled into MCC-02 cubicles 1-4. Termination held pending access clearance.",
      discipline: "Electrical",
      assetTag: "MCC-02",
      location: "Utilities / Substation 2",
      source: "Site Diary",
      reporter: "M. Iqbal · Electrical Lead",
      matchedActivity: {
        id: "ACT-E315",
        name: "MCC-02 Cable Termination",
        wbs: "NRX / Utilities / Electrical / MCC-02",
      },
      confidence: 84,
      status: "Review",
      routing: "Review",
      extractedDetails: {
        eventType: "Cable Pull & Termination",
        timestamp: "26 Sep 2026 · 08:51",
        discipline: "Electrical",
        assetTag: "MCC-02",
        location: "Substation 2 / MCC Room",
        contractor: "Voltaic Systems",
        quantity: "42% Terminated (Feeder Pulled)",
        source: "Site Diary",
      },
      matchSignals: {
        semantic: 86,
        assetTag: 94,
        wbsContext: 88,
        discipline: 100,
        temporal: 82,
        location: 80,
      },
      evidence: {
        type: "document",
        reference: "SD-0926-E-02.pdf",
        reporter: "M. Iqbal · Electrical Lead",
        timestamp: "08:51",
        summary: "Shift handover log notes cable pulling complete, terminations waiting for safety permit clearance.",
      },
      auditHistory: [
        { time: "08:51", action: "Received", actor: "Site Diary Ingestion" },
        { time: "08:51", action: "Structured", actor: "Ingestion Pipeline" },
        { time: "08:52", action: "Match Proposed", actor: "AI Matching Engine", note: "Review routing: activity on critical execution watch" },
      ],
    },
    {
      id: "EVT-0143",
      time: "08:34",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 08:34",
      event: "Material delay reported on pipe spools",
      rawUpdate: "Delivery of 8-inch stainless spools for Area 4 delayed by vendor transport. ETA pushed 48 hours.",
      discipline: "Piping",
      assetTag: "SPL-SS-08",
      location: "Warehouse / Laydown Yard",
      source: "Spreadsheet",
      reporter: "Procurement Logistics",
      matchedActivity: {
        id: "ACT-P140",
        name: "Area 4 Secondary Piping Spool Fitup",
        wbs: "NRX / Process Area / Piping / Spools",
      },
      confidence: 76,
      status: "Review",
      routing: "Review",
      extractedDetails: {
        eventType: "Supply Chain Exception",
        timestamp: "26 Sep 2026 · 08:34",
        discipline: "Piping",
        assetTag: "SPL-SS-08",
        location: "Laydown Yard 2",
        contractor: "Global Piping Logistics",
        quantity: "24 Spools Delayed",
        source: "Spreadsheet",
      },
      matchSignals: {
        semantic: 78,
        assetTag: 85,
        wbsContext: 74,
        discipline: 100,
        temporal: 70,
        location: 68,
      },
      evidence: {
        type: "sheet",
        reference: "XLS-LOG-0926-R4",
        reporter: "Procurement Import",
        timestamp: "08:34",
        summary: "Vendor shipment manifest revised date stamped 28 Sep.",
      },
      auditHistory: [
        { time: "08:34", action: "Received", actor: "Spreadsheet Sync" },
        { time: "08:34", action: "Structured", actor: "Ingestion Pipeline" },
        { time: "08:35", action: "Match Proposed", actor: "AI Matching Engine", note: "Confidence 76% (Review range)" },
      ],
    },
    {
      id: "EVT-0142",
      time: "08:26",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 08:26",
      event: "Instrument junction box field statement unmatched",
      rawUpdate: "Subcontractor mounted unreferenced JB-840 near cooling tower auxiliary line. No tag in current L5 schedule.",
      discipline: "Instrumentation",
      assetTag: "JB-840",
      location: "Cooling Tower / Aux",
      source: "Field Update",
      reporter: "P. Nair · Instrumentation Inspector",
      matchedActivity: null,
      confidence: null,
      status: "Unmatched",
      routing: "Unmatched",
      extractedDetails: {
        eventType: "Unplanned Installation",
        timestamp: "26 Sep 2026 · 08:26",
        discipline: "Instrumentation",
        assetTag: "JB-840",
        location: "Cooling Tower / Aux",
        contractor: "PetroControls Ltd",
        quantity: "1 JB Installed",
        source: "Field Update",
      },
      evidence: {
        type: "photo",
        reference: "IMG-JB840-0926-01.jpg",
        reporter: "P. Nair",
        timestamp: "08:26",
        summary: "Field photograph showing junction box installed without WBS schedule tag.",
      },
      auditHistory: [
        { time: "08:26", action: "Received", actor: "Field Update Ingestion" },
        { time: "08:26", action: "Structured", actor: "Ingestion Pipeline", note: "Tag JB-840 extracted" },
        { time: "08:27", action: "Matching Attempted", actor: "AI Matching Engine", note: "No schedule candidate above threshold (max 41%)" },
        { time: "08:27", action: "Routed Unmatched", actor: "Routing Rule", note: "Requires planner manual review in Match Review" },
      ],
    },
    {
      id: "EVT-0141",
      time: "08:12",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 08:12",
      event: "Equipment alignment started on compressor shaft",
      rawUpdate: "Pre-alignment dial indicators mounted on CMP-01 drive shaft. Runout measurement within OEM tolerance.",
      discipline: "Rotating Equipment",
      assetTag: "CMP-01",
      location: "Compressor Building",
      source: "Site Diary",
      reporter: "K. Becker · Rotating Lead",
      matchedActivity: {
        id: "ACT-R205",
        name: "Compressor C-01 Alignment",
        wbs: "NRX / Compressor / Rotating / Train 1",
      },
      confidence: 95,
      status: "Verified",
      routing: "Auto-suggest",
      extractedDetails: {
        eventType: "Shaft Alignment",
        timestamp: "26 Sep 2026 · 08:12",
        discipline: "Rotating Equipment",
        assetTag: "CMP-01",
        location: "Compressor Building / Deck",
        contractor: "Turbine Tech International",
        quantity: "Rough Alignment Complete (32%)",
        source: "Site Diary",
      },
      matchSignals: {
        semantic: 96,
        assetTag: 98,
        wbsContext: 94,
        discipline: 100,
        temporal: 92,
        location: 90,
      },
      evidence: {
        type: "document",
        reference: "ALIGN-REC-CMP01-0926",
        reporter: "K. Becker · Rotating Lead",
        timestamp: "08:12",
        summary: "Laser alignment report sheet showing 0.03mm coplanar deviation.",
      },
      auditHistory: [
        { time: "08:12", action: "Received", actor: "Site Diary Ingestion" },
        { time: "08:12", action: "Structured", actor: "Ingestion Pipeline" },
        { time: "08:13", action: "Match Proposed", actor: "AI Matching Engine", note: "High confidence match (95%)" },
        { time: "08:15", action: "Verified", actor: "Tirth Patel (Planner)", note: "Aligned with planned progress curve" },
      ],
    },
    {
      id: "EVT-0140",
      time: "07:55",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 07:55",
      event: "Structural steel erection bay 4 torque check",
      rawUpdate: "High-strength bolt torque verification complete on bay 4 structural beams. 96 bolts certified.",
      discipline: "Structural",
      assetTag: "STR-BAY-04",
      location: "Process Area / Bay 4",
      source: "Field Update",
      reporter: "S. Thorne · Structural Inspector",
      matchedActivity: {
        id: "ACT-S102",
        name: "Main Piperack Steel Erection — Tier 2",
        wbs: "NRX / Process Area / Structural / Rack 2",
      },
      confidence: 93,
      status: "Verified",
      routing: "Auto-suggest",
      extractedDetails: {
        eventType: "Torque Certification",
        timestamp: "26 Sep 2026 · 07:55",
        discipline: "Structural",
        assetTag: "STR-BAY-04",
        location: "Process Area / Bay 4",
        contractor: "Apex Structural Fabricators",
        quantity: "96 Bolts Torqued (51%)",
        source: "Field Update",
      },
      matchSignals: {
        semantic: 94,
        assetTag: 95,
        wbsContext: 92,
        discipline: 100,
        temporal: 91,
        location: 89,
      },
      evidence: {
        type: "document",
        reference: "TORQUE-CERT-0926-4B",
        reporter: "S. Thorne · Structural Inspector",
        timestamp: "07:55",
        summary: "Calibrated torque wrench digital record certificate signed by third party.",
      },
      auditHistory: [
        { time: "07:55", action: "Received", actor: "Field Update Ingestion" },
        { time: "07:56", action: "Structured & Matched", actor: "AI Pipeline" },
        { time: "08:00", action: "Verified", actor: "Tirth Patel (Planner)" },
      ],
    },
    {
      id: "EVT-0139",
      time: "07:40",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 07:40",
      event: "Pressure safety valve hydro-testing",
      rawUpdate: "Bench testing complete for PSV-101 and PSV-102. Set pressure verified at 18.5 bar gauge.",
      discipline: "Static Equipment",
      assetTag: "PSV-101",
      location: "Workshop / Valve Test Bench",
      source: "DPR Import",
      reporter: "DPR-2026-269",
      matchedActivity: {
        id: "ACT-ST301",
        name: "Vessel V-101 Valve Testing & Installation",
        wbs: "NRX / Process Area / Static Equipment / Vessels",
      },
      confidence: 91,
      status: "Verified",
      routing: "Auto-suggest",
      extractedDetails: {
        eventType: "Pressure Safety Test",
        timestamp: "26 Sep 2026 · 07:40",
        discipline: "Static Equipment",
        assetTag: "PSV-101",
        location: "Test Bench Area",
        contractor: "ValvePro Services",
        quantity: "2 Valves Tested (39%)",
        source: "DPR Import",
      },
      matchSignals: {
        semantic: 92,
        assetTag: 94,
        wbsContext: 89,
        discipline: 100,
        temporal: 88,
        location: 82,
      },
      evidence: {
        type: "document",
        reference: "CERT-PSV-101-POP",
        reporter: "DPR Lead Inspector",
        timestamp: "07:40",
        summary: "Pop test calibration cert with chart recorder printout.",
      },
      auditHistory: [
        { time: "07:40", action: "Received", actor: "DPR Automated Ingestion" },
        { time: "07:41", action: "Structured & Matched", actor: "AI Pipeline" },
        { time: "07:45", action: "Verified", actor: "A. Mehta (Planner)" },
      ],
    },
    {
      id: "EVT-0138",
      time: "07:15",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 07:15",
      event: "Safety induction completed for shift crew",
      rawUpdate: "Toolbox talk and HSE safety briefing completed for 48 incoming shift personnel across Area A and B.",
      discipline: "HSE",
      assetTag: "HSE-TBT-01",
      location: "Site Main Gate",
      source: "Field Update",
      reporter: "C. O'Connor · HSE Manager",
      matchedActivity: {
        id: "ACT-HSE01",
        name: "Daily Workfront Safety Protocols & Briefing",
        wbs: "NRX / Site Management / HSE",
      },
      confidence: 99,
      status: "Verified",
      routing: "Auto-suggest",
      extractedDetails: {
        eventType: "Safety Briefing",
        timestamp: "26 Sep 2026 · 07:15",
        discipline: "HSE",
        assetTag: "HSE-TBT-01",
        location: "Site Briefing Canopy",
        contractor: "ExecLink Direct",
        quantity: "48 Attendees (100%)",
        source: "Field Update",
      },
      matchSignals: {
        semantic: 99,
        assetTag: 100,
        wbsContext: 98,
        discipline: 100,
        temporal: 100,
        location: 97,
      },
      evidence: {
        type: "document",
        reference: "HSE-ATTEND-0926",
        reporter: "C. O'Connor · HSE Manager",
        timestamp: "07:15",
        summary: "Digital roster signed with biometric confirmations.",
      },
      auditHistory: [
        { time: "07:15", action: "Received", actor: "Field Update Ingestion" },
        { time: "07:15", action: "Verified", actor: "Auto-Verification Protocol", note: "Routine mandatory safety sync" },
      ],
    },
    {
      id: "EVT-0137",
      time: "06:50",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 06:50",
      event: "Unassigned civil trench excavation noted",
      rawUpdate: "Backhoe operator excavated 40m drainage swale near perimeter fence. Not on current work package schedule.",
      discipline: "Civil",
      assetTag: "TR-SWALE-09",
      location: "Perimeter West",
      source: "Time Agent",
      reporter: "Voice transcript · Site Engineer",
      matchedActivity: null,
      confidence: null,
      status: "Unmatched",
      routing: "Unmatched",
      extractedDetails: {
        eventType: "Unscheduled Earthwork",
        timestamp: "26 Sep 2026 · 06:50",
        discipline: "Civil",
        assetTag: "TR-SWALE-09",
        location: "Perimeter West",
        contractor: "EarthMove Ltd",
        quantity: "40 meters excavated",
        source: "Time Agent",
      },
      evidence: {
        type: "transcript",
        reference: "TA-AUDIO-0926-0650",
        reporter: "Voice Agent · Site Engineer",
        timestamp: "06:50",
        summary: "'We have a trench dug along West fence not matching any WBS activity in package C-3.'",
      },
      auditHistory: [
        { time: "06:50", action: "Received", actor: "Time Agent Pipeline" },
        { time: "06:51", action: "Unmatched", actor: "AI Matching Engine", note: "Candidate similarity score 32% (below threshold)" },
      ],
    },
    {
      id: "EVT-0136",
      time: "06:30",
      date: "Today · 26 Sep",
      timestamp: "26 Sep 2026 · 06:30",
      event: "Transformer TX-01 oil sampling rejected",
      rawUpdate: "Dielectric breakdown voltage test failed for TX-01 sample. Sample rejected, re-filtration mandated.",
      discipline: "Electrical",
      assetTag: "TX-01",
      location: "Switchyard Substation",
      source: "Field Update",
      reporter: "J. Larsson · High Voltage Tech",
      matchedActivity: {
        id: "ACT-E220",
        name: "Transformer TX-01 Testing & Energization Prep",
        wbs: "NRX / Utilities / Electrical / Transformers",
      },
      confidence: 90,
      status: "Rejected",
      routing: "Review",
      extractedDetails: {
        eventType: "QA Test Rejection",
        timestamp: "26 Sep 2026 · 06:30",
        discipline: "Electrical",
        assetTag: "TX-01",
        location: "Switchyard Substation",
        contractor: "HighVolt Power Services",
        quantity: "Oil Sample Test (Failed)",
        source: "Field Update",
      },
      matchSignals: {
        semantic: 92,
        assetTag: 98,
        wbsContext: 88,
        discipline: 100,
        temporal: 85,
        location: 87,
      },
      evidence: {
        type: "document",
        reference: "LAB-TEST-TX01-D",
        reporter: "J. Larsson · High Voltage Tech",
        timestamp: "06:30",
        summary: "Lab analysis report indicating moisture content above 25ppm threshold.",
      },
      auditHistory: [
        { time: "06:30", action: "Received", actor: "Field Update Ingestion" },
        { time: "06:32", action: "Marked Rejected", actor: "QA Supervisor", note: "Sample rejected due to out-of-spec test" },
      ],
    },
  ] as ExecutionEvent[],
};
