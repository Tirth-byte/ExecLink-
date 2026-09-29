export type ProgressSummary = {
  plannedProgress: number; // 68%
  verifiedActual: number;  // 61%
  scheduleVariance: number; // -7.0%
  activitiesAtRisk: number; // 4
  dataConfidence: number;  // 89%
  dataDate: string;        // "26 Sep 2026"
};

export type SCurveDataPoint = {
  date: string;
  label: string;
  baseline: number;
  current: number;
  actual: number | null;
  variance?: number | null;
  isDataDate?: boolean;
};

export type VarianceTrendPoint = {
  date: string;
  label: string;
  variance: number;
};

export type DisciplinePerformance = {
  discipline: string;
  planned: number;
  verified: number;
  variance: number;
  activitiesCount: number;
  atRiskCount: number;
};

export type DelayCauseItem = {
  category: "Permit" | "Material" | "Access" | "Design" | "Inspection" | "Equipment" | "Manpower" | "Weather";
  count: number;
  pctOfTotal: number;
};

export type DurationScatterPoint = {
  id: string;
  name: string;
  discipline: string;
  workfront: string;
  contractor: string;
  plannedDuration: number; // in days
  actualDuration: number;  // in days
  overrun: number;         // in days (+ or -)
  status: "At Risk" | "Delayed" | "In Progress" | "On Track" | "Complete";
};

export type ConfidenceDistribution = {
  highPct: number;    // 68%
  reviewPct: number;  // 21%
  unmatchedPct: number; // 11%
  avgConfidence: number; // 89%
  autoSuggestedCount: number; // 42
  plannerReviewCount: number; // 13
  unmatchedCount: number;     // 7
};

export type ThroughputDay = {
  date: string;
  day: string;
  received: number;
  verified: number;
};

export type VerificationThroughputData = {
  daily: ThroughputDay[];
  pendingReview: number;    // 5
  medianReviewTime: string; // "18 min"
  verifiedToday: number;    // 19
  rejectedToday: number;    // 2
};

export type ControlInsight = {
  id: string;
  type: "CRITICAL" | "WATCH" | "BOTTLENECK" | "DATA";
  title: string;
  description: string;
  filterTarget: {
    discipline?: string;
    delayCause?: string;
    confidenceTier?: string;
    status?: string;
  };
};

export type DrilldownActivity = {
  id: string;
  name: string;
  discipline: string;
  workfront: string;
  contractor: string;
  scheduleLevel: "L3" | "L4" | "L5" | "L6";
  plannedProgress: number;
  verifiedActual: number;
  variance: number;
  status: "At Risk" | "Delayed" | "In Progress" | "Review Required" | "Complete";
  delayCause?: string;
  confidence?: number;
  plannedDuration: number;
  actualDuration: number;
  baselineFinish: string;
  actualFinish?: string;
};

export const analyticsFixture = {
  summary: {
    plannedProgress: 68,
    verifiedActual: 61,
    scheduleVariance: -7.0,
    activitiesAtRisk: 4,
    dataConfidence: 89,
    dataDate: "26 Sep 2026",
  } satisfies ProgressSummary,

  scurve: [
    { date: "2026-05-01", label: "May", baseline: 8, current: 8, actual: 8, variance: 0 },
    { date: "2026-06-01", label: "Jun", baseline: 18, current: 18, actual: 17, variance: -1 },
    { date: "2026-07-01", label: "Jul", baseline: 32, current: 31, actual: 29, variance: -2 },
    { date: "2026-08-01", label: "Aug", baseline: 46, current: 45, actual: 42, variance: -3 },
    { date: "2026-08-15", label: "15 Aug", baseline: 53, current: 52, actual: 48, variance: -4 },
    { date: "2026-09-01", label: "01 Sep", baseline: 60, current: 59, actual: 54, variance: -5 },
    { date: "2026-09-15", label: "15 Sep", baseline: 65, current: 64, actual: 58, variance: -6 },
    { date: "2026-09-26", label: "26 Sep", baseline: 70, current: 68, actual: 61, variance: -7, isDataDate: true },
    { date: "2026-10-15", label: "15 Oct", baseline: 78, current: 76, actual: null },
    { date: "2026-11-01", label: "Nov", baseline: 86, current: 84, actual: null },
    { date: "2026-12-01", label: "Dec", baseline: 94, current: 92, actual: null },
    { date: "2027-01-15", label: "Jan '27", baseline: 100, current: 100, actual: null },
  ] satisfies SCurveDataPoint[],

  varianceTrend: [
    { date: "2026-08-27", label: "27 Aug", variance: -1.2 },
    { date: "2026-09-02", label: "02 Sep", variance: -2.1 },
    { date: "2026-09-07", label: "07 Sep", variance: -3.0 },
    { date: "2026-09-12", label: "12 Sep", variance: -4.6 },
    { date: "2026-09-17", label: "17 Sep", variance: -5.2 },
    { date: "2026-09-22", label: "22 Sep", variance: -6.1 },
    { date: "2026-09-26", label: "26 Sep", variance: -7.0 },
  ] satisfies VarianceTrendPoint[],

  disciplines: [
    { discipline: "Civil", planned: 72, verified: 68, variance: -4, activitiesCount: 18, atRiskCount: 2 },
    { discipline: "Structural", planned: 67, verified: 58, variance: -9, activitiesCount: 14, atRiskCount: 3 },
    { discipline: "Piping", planned: 64, verified: 55, variance: -9, activitiesCount: 26, atRiskCount: 4 },
    { discipline: "Static Equipment", planned: 59, verified: 57, variance: -2, activitiesCount: 10, atRiskCount: 1 },
    { discipline: "Rotating Equipment", planned: 52, verified: 48, variance: -4, activitiesCount: 8, atRiskCount: 1 },
    { discipline: "Electrical", planned: 61, verified: 59, variance: -2, activitiesCount: 21, atRiskCount: 2 },
    { discipline: "Instrumentation", planned: 48, verified: 43, variance: -5, activitiesCount: 19, atRiskCount: 2 },
    { discipline: "HSE", planned: 88, verified: 87, variance: -1, activitiesCount: 12, atRiskCount: 0 },
  ] satisfies DisciplinePerformance[],

  delayCauses: [
    { category: "Permit", count: 8, pctOfTotal: 25.0 },
    { category: "Material", count: 6, pctOfTotal: 18.8 },
    { category: "Access", count: 5, pctOfTotal: 15.6 },
    { category: "Design", count: 4, pctOfTotal: 12.5 },
    { category: "Inspection", count: 3, pctOfTotal: 9.4 },
    { category: "Equipment", count: 3, pctOfTotal: 9.4 },
    { category: "Manpower", count: 2, pctOfTotal: 6.2 },
    { category: "Weather", count: 1, pctOfTotal: 3.1 },
  ] satisfies DelayCauseItem[],

  durations: [
    { id: "ACT-P125", name: "P-110 Hydrotest & NDT Examination", discipline: "Piping", workfront: "Area B", contractor: "Delta Piping Ltd", plannedDuration: 4, actualDuration: 6, overrun: 2, status: "At Risk" },
    { id: "ACT-P110", name: "P-110 Erection & Spool Alignment", discipline: "Piping", workfront: "Area B", contractor: "Delta Piping Ltd", plannedDuration: 12, actualDuration: 16, overrun: 4, status: "At Risk" },
    { id: "ACT-P118", name: "Utility Tie-in Spool Fit-Up", discipline: "Piping", workfront: "Area A", contractor: "Delta Piping Ltd", plannedDuration: 6, actualDuration: 8, overrun: 2, status: "Delayed" },
    { id: "ACT-S204", name: "Pipe Rack Module 3 Heavy Lift", discipline: "Structural", workfront: "Area A", contractor: "Summit Civil", plannedDuration: 14, actualDuration: 19, overrun: 5, status: "At Risk" },
    { id: "ACT-S190", name: "Structural Steel Framing Area B", discipline: "Structural", workfront: "Area B", contractor: "Summit Civil", plannedDuration: 10, actualDuration: 14, overrun: 4, status: "Delayed" },
    { id: "ACT-E315", name: "MCC-02 Cable Termination & Glanding", discipline: "Electrical", workfront: "Area C", contractor: "Apex Constructors", plannedDuration: 8, actualDuration: 11, overrun: 3, status: "At Risk" },
    { id: "ACT-E280", name: "Substation 2 Feeder Cable Pull", discipline: "Electrical", workfront: "Area C", contractor: "Apex Constructors", plannedDuration: 7, actualDuration: 8, overrun: 1, status: "In Progress" },
    { id: "ACT-C240", name: "Foundation Concrete Pour — Area B", discipline: "Civil", workfront: "Area B", contractor: "Summit Civil", plannedDuration: 6, actualDuration: 7, overrun: 1, status: "In Progress" },
    { id: "ACT-C210", name: "Excavation & Trenching Sector 2", discipline: "Civil", workfront: "Area A", contractor: "Summit Civil", plannedDuration: 8, actualDuration: 8, overrun: 0, status: "On Track" },
    { id: "ACT-C235", name: "Sub-base Compaction & Proof Rolling", discipline: "Civil", workfront: "Area B", contractor: "Summit Civil", plannedDuration: 5, actualDuration: 5, overrun: 0, status: "Complete" },
    { id: "ACT-EQ102", name: "V-102 Separator Vessel Placement", discipline: "Static Equipment", workfront: "Area A", contractor: "Apex Constructors", plannedDuration: 5, actualDuration: 6, overrun: 1, status: "Delayed" },
    { id: "ACT-EQ105", name: "Heat Exchanger E-104 Grouting", discipline: "Static Equipment", workfront: "Area A", contractor: "Apex Constructors", plannedDuration: 4, actualDuration: 4, overrun: 0, status: "On Track" },
    { id: "ACT-R301", name: "Pump P-201A Alignment & Coupling", discipline: "Rotating Equipment", workfront: "Area B", contractor: "Apex Constructors", plannedDuration: 6, actualDuration: 7, overrun: 1, status: "Delayed" },
    { id: "ACT-I085", name: "Loop Check — Compressor Train 1", discipline: "Instrumentation", workfront: "Area B", contractor: "Apex Constructors", plannedDuration: 9, actualDuration: 11, overrun: 2, status: "Delayed" },
    { id: "ACT-I092", name: "Pressure Transmitter Calibration", discipline: "Instrumentation", workfront: "Area B", contractor: "Apex Constructors", plannedDuration: 3, actualDuration: 3, overrun: 0, status: "On Track" },
    { id: "ACT-HSE01", name: "Pre-commissioning Safety Clearance", discipline: "HSE", workfront: "Area B", contractor: "Summit Civil", plannedDuration: 3, actualDuration: 3, overrun: 0, status: "Complete" },
  ] satisfies DurationScatterPoint[],

  confidence: {
    highPct: 68,
    reviewPct: 21,
    unmatchedPct: 11,
    avgConfidence: 89,
    autoSuggestedCount: 42,
    plannerReviewCount: 13,
    unmatchedCount: 7,
  } satisfies ConfidenceDistribution,

  throughput: {
    daily: [
      { date: "2026-09-20", day: "20 Sep", received: 18, verified: 16 },
      { date: "2026-09-21", day: "21 Sep", received: 24, verified: 21 },
      { date: "2026-09-22", day: "22 Sep", received: 21, verified: 20 },
      { date: "2026-09-23", day: "23 Sep", received: 29, verified: 24 },
      { date: "2026-09-24", day: "24 Sep", received: 26, verified: 23 },
      { date: "2026-09-25", day: "25 Sep", received: 31, verified: 27 },
      { date: "2026-09-26", day: "26 Sep", received: 24, verified: 19 },
    ],
    pendingReview: 5,
    medianReviewTime: "18 min",
    verifiedToday: 19,
    rejectedToday: 2,
  } satisfies VerificationThroughputData,

  insights: [
    {
      id: "INS-01",
      type: "CRITICAL",
      title: "Piping is 9 pts behind current plan",
      description: "4 piping activities are currently at risk due to hydrotest preparation and spool fit-up delays.",
      filterTarget: { discipline: "Piping", status: "At Risk" },
    },
    {
      id: "INS-02",
      type: "WATCH",
      title: "Structural variance widened from -5% to -9%",
      description: "Pipe rack module heavy lift access delays extended overall structural erection timeline over the past 30 days.",
      filterTarget: { discipline: "Structural" },
    },
    {
      id: "INS-03",
      type: "BOTTLENECK",
      title: "Permit-related delays account for 25% of verified delay events",
      description: "8 of 32 recorded execution bottlenecks stem from hot-work and confined-space permit issuance lag.",
      filterTarget: { delayCause: "Permit" },
    },
    {
      id: "INS-04",
      type: "DATA",
      title: "11% of execution events remain unmatched to the L6 schedule",
      description: "7 field events await planner manual tagging or schedule candidate selection in Verification Center.",
      filterTarget: { confidenceTier: "Unmatched" },
    },
  ] satisfies ControlInsight[],

  activities: [
    // Permit (8 events)
    {
      id: "ACT-P125",
      name: "P-110 Hydrotest & NDT Examination",
      discipline: "Piping",
      workfront: "Area B",
      contractor: "Delta Piping Ltd",
      scheduleLevel: "L6",
      plannedProgress: 40,
      verifiedActual: 20,
      variance: -20,
      status: "At Risk",
      delayCause: "Permit",
      confidence: 85,
      plannedDuration: 4,
      actualDuration: 6,
      baselineFinish: "02 Oct 2026",
    },
    {
      id: "ACT-S175",
      name: "Secondary Steel Member Erection",
      discipline: "Structural",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L6",
      plannedProgress: 55,
      verifiedActual: 38,
      variance: -17,
      status: "At Risk",
      delayCause: "Permit",
      confidence: 86,
      plannedDuration: 7,
      actualDuration: 10,
      baselineFinish: "06 Oct 2026",
    },
    {
      id: "ACT-E315",
      name: "MCC-02 Cable Termination & Glanding",
      discipline: "Electrical",
      workfront: "Area C",
      contractor: "Apex Constructors",
      scheduleLevel: "L5",
      plannedProgress: 60,
      verifiedActual: 42,
      variance: -18,
      status: "At Risk",
      delayCause: "Permit",
      confidence: 76,
      plannedDuration: 8,
      actualDuration: 11,
      baselineFinish: "05 Oct 2026",
    },
    {
      id: "ACT-P130",
      name: "HP Steam Line Radiography Clearance",
      discipline: "Piping",
      workfront: "Area A",
      contractor: "Delta Piping Ltd",
      scheduleLevel: "L5",
      plannedProgress: 50,
      verifiedActual: 35,
      variance: -15,
      status: "Delayed",
      delayCause: "Permit",
      confidence: 88,
      plannedDuration: 5,
      actualDuration: 7,
      baselineFinish: "04 Oct 2026",
    },
    {
      id: "ACT-S182",
      name: "Platform Grating Hot Work Installation",
      discipline: "Structural",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L6",
      plannedProgress: 65,
      verifiedActual: 50,
      variance: -15,
      status: "Delayed",
      delayCause: "Permit",
      confidence: 90,
      plannedDuration: 6,
      actualDuration: 8,
      baselineFinish: "03 Oct 2026",
    },
    {
      id: "ACT-E320",
      name: "Substation Transformer Energization Permit",
      discipline: "Electrical",
      workfront: "Area C",
      contractor: "Apex Constructors",
      scheduleLevel: "L4",
      plannedProgress: 45,
      verifiedActual: 30,
      variance: -15,
      status: "At Risk",
      delayCause: "Permit",
      confidence: 78,
      plannedDuration: 6,
      actualDuration: 9,
      baselineFinish: "07 Oct 2026",
    },
    {
      id: "ACT-C248",
      name: "Deep Trench Confined Space Entry Shoring",
      discipline: "Civil",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L5",
      plannedProgress: 70,
      verifiedActual: 55,
      variance: -15,
      status: "Delayed",
      delayCause: "Permit",
      confidence: 84,
      plannedDuration: 8,
      actualDuration: 10,
      baselineFinish: "01 Oct 2026",
    },
    {
      id: "ACT-I098",
      name: "Safety Instrumented System Field Proof Test",
      discipline: "Instrumentation",
      workfront: "Area B",
      contractor: "Apex Constructors",
      scheduleLevel: "L6",
      plannedProgress: 40,
      verifiedActual: 25,
      variance: -15,
      status: "Review Required",
      delayCause: "Permit",
      confidence: 68,
      plannedDuration: 4,
      actualDuration: 6,
      baselineFinish: "08 Oct 2026",
    },

    // Material (6 events)
    {
      id: "ACT-P118",
      name: "Utility Tie-in Spool Fit-Up",
      discipline: "Piping",
      workfront: "Area A",
      contractor: "Delta Piping Ltd",
      scheduleLevel: "L5",
      plannedProgress: 60,
      verifiedActual: 45,
      variance: -15,
      status: "Delayed",
      delayCause: "Material",
      confidence: 91,
      plannedDuration: 6,
      actualDuration: 8,
      baselineFinish: "30 Sep 2026",
    },
    {
      id: "ACT-E280",
      name: "Substation 2 Feeder Cable Pull",
      discipline: "Electrical",
      workfront: "Area C",
      contractor: "Apex Constructors",
      scheduleLevel: "L5",
      plannedProgress: 75,
      verifiedActual: 68,
      variance: -7,
      status: "In Progress",
      delayCause: "Material",
      confidence: 95,
      plannedDuration: 7,
      actualDuration: 8,
      baselineFinish: "29 Sep 2026",
    },
    {
      id: "ACT-R301",
      name: "Pump P-201A Alignment & Coupling",
      discipline: "Rotating Equipment",
      workfront: "Area B",
      contractor: "Apex Constructors",
      scheduleLevel: "L5",
      plannedProgress: 55,
      verifiedActual: 45,
      variance: -10,
      status: "Delayed",
      delayCause: "Material",
      confidence: 92,
      plannedDuration: 6,
      actualDuration: 7,
      baselineFinish: "30 Sep 2026",
    },
    {
      id: "ACT-P120",
      name: "Stainless Steel Valve Manifold Delivery",
      discipline: "Piping",
      workfront: "Area B",
      contractor: "Delta Piping Ltd",
      scheduleLevel: "L5",
      plannedProgress: 50,
      verifiedActual: 38,
      variance: -12,
      status: "Delayed",
      delayCause: "Material",
      confidence: 89,
      plannedDuration: 8,
      actualDuration: 10,
      baselineFinish: "03 Oct 2026",
    },
    {
      id: "ACT-S195",
      name: "High-Tensile Structural Bolt Consumables",
      discipline: "Structural",
      workfront: "Area A",
      contractor: "Summit Civil",
      scheduleLevel: "L6",
      plannedProgress: 70,
      verifiedActual: 58,
      variance: -12,
      status: "Delayed",
      delayCause: "Material",
      confidence: 93,
      plannedDuration: 5,
      actualDuration: 6,
      baselineFinish: "02 Oct 2026",
    },
    {
      id: "ACT-EQ108",
      name: "Specialty Gasket Sets for Reboiler E-102",
      discipline: "Static Equipment",
      workfront: "Area A",
      contractor: "Apex Constructors",
      scheduleLevel: "L5",
      plannedProgress: 65,
      verifiedActual: 52,
      variance: -13,
      status: "Delayed",
      delayCause: "Material",
      confidence: 94,
      plannedDuration: 4,
      actualDuration: 5,
      baselineFinish: "01 Oct 2026",
    },

    // Access (5 events)
    {
      id: "ACT-P110",
      name: "P-110 Erection & Spool Alignment",
      discipline: "Piping",
      workfront: "Area B",
      contractor: "Delta Piping Ltd",
      scheduleLevel: "L5",
      plannedProgress: 75,
      verifiedActual: 52,
      variance: -23,
      status: "At Risk",
      delayCause: "Access",
      confidence: 88,
      plannedDuration: 12,
      actualDuration: 16,
      baselineFinish: "28 Sep 2026",
    },
    {
      id: "ACT-S204",
      name: "Pipe Rack Module 3 Heavy Lift",
      discipline: "Structural",
      workfront: "Area A",
      contractor: "Summit Civil",
      scheduleLevel: "L4",
      plannedProgress: 70,
      verifiedActual: 45,
      variance: -25,
      status: "At Risk",
      delayCause: "Access",
      confidence: 92,
      plannedDuration: 14,
      actualDuration: 19,
      baselineFinish: "01 Oct 2026",
    },
    {
      id: "ACT-C225",
      name: "Foundation Rebar Staging Area Access",
      discipline: "Civil",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L5",
      plannedProgress: 80,
      verifiedActual: 68,
      variance: -12,
      status: "Delayed",
      delayCause: "Access",
      confidence: 95,
      plannedDuration: 6,
      actualDuration: 7,
      baselineFinish: "29 Sep 2026",
    },
    {
      id: "ACT-R305",
      name: "Lube Oil Skid Crane Staging Roadway",
      discipline: "Rotating Equipment",
      workfront: "Area B",
      contractor: "Apex Constructors",
      scheduleLevel: "L5",
      plannedProgress: 60,
      verifiedActual: 48,
      variance: -12,
      status: "Delayed",
      delayCause: "Access",
      confidence: 87,
      plannedDuration: 5,
      actualDuration: 6,
      baselineFinish: "02 Oct 2026",
    },
    {
      id: "ACT-EQ112",
      name: "Column C-101 Scaffolding Enclosure",
      discipline: "Static Equipment",
      workfront: "Area A",
      contractor: "Apex Constructors",
      scheduleLevel: "L5",
      plannedProgress: 65,
      verifiedActual: 54,
      variance: -11,
      status: "Delayed",
      delayCause: "Access",
      confidence: 90,
      plannedDuration: 7,
      actualDuration: 8,
      baselineFinish: "03 Oct 2026",
    },

    // Design (4 events)
    {
      id: "ACT-S190",
      name: "Structural Steel Framing Area B",
      discipline: "Structural",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L5",
      plannedProgress: 65,
      verifiedActual: 50,
      variance: -15,
      status: "Delayed",
      delayCause: "Design",
      confidence: 89,
      plannedDuration: 10,
      actualDuration: 14,
      baselineFinish: "03 Oct 2026",
    },
    {
      id: "ACT-I085",
      name: "Loop Check — Compressor Train 1",
      discipline: "Instrumentation",
      workfront: "Area B",
      contractor: "Apex Constructors",
      scheduleLevel: "L5",
      plannedProgress: 50,
      verifiedActual: 40,
      variance: -10,
      status: "Review Required",
      delayCause: "Design",
      confidence: 54,
      plannedDuration: 9,
      actualDuration: 11,
      baselineFinish: "05 Oct 2026",
    },
    {
      id: "ACT-P140",
      name: "Flare Header Isometric Rerouting",
      discipline: "Piping",
      workfront: "Area C",
      contractor: "Delta Piping Ltd",
      scheduleLevel: "L5",
      plannedProgress: 55,
      verifiedActual: 42,
      variance: -13,
      status: "Delayed",
      delayCause: "Design",
      confidence: 86,
      plannedDuration: 8,
      actualDuration: 10,
      baselineFinish: "06 Oct 2026",
    },
    {
      id: "ACT-E330",
      name: "Cable Tray Conflict Resolution",
      discipline: "Electrical",
      workfront: "Area C",
      contractor: "Apex Constructors",
      scheduleLevel: "L6",
      plannedProgress: 60,
      verifiedActual: 48,
      variance: -12,
      status: "Delayed",
      delayCause: "Design",
      confidence: 91,
      plannedDuration: 6,
      actualDuration: 8,
      baselineFinish: "04 Oct 2026",
    },

    // Inspection (3 events)
    {
      id: "ACT-P104",
      name: "Cooling Water Line Hydrostatic Test",
      discipline: "Piping",
      workfront: "Area C",
      contractor: "Delta Piping Ltd",
      scheduleLevel: "L5",
      plannedProgress: 80,
      verifiedActual: 62,
      variance: -18,
      status: "At Risk",
      delayCause: "Inspection",
      confidence: 94,
      plannedDuration: 8,
      actualDuration: 11,
      baselineFinish: "04 Oct 2026",
    },
    {
      id: "ACT-C242",
      name: "Sump Pit Waterproofing Inspection",
      discipline: "Civil",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L6",
      plannedProgress: 75,
      verifiedActual: 64,
      variance: -11,
      status: "Delayed",
      delayCause: "Inspection",
      confidence: 96,
      plannedDuration: 4,
      actualDuration: 5,
      baselineFinish: "30 Sep 2026",
    },
    {
      id: "ACT-EQ115",
      name: "Internal Tray Levelness Third-Party Verification",
      discipline: "Static Equipment",
      workfront: "Area A",
      contractor: "Apex Constructors",
      scheduleLevel: "L5",
      plannedProgress: 70,
      verifiedActual: 58,
      variance: -12,
      status: "Delayed",
      delayCause: "Inspection",
      confidence: 92,
      plannedDuration: 5,
      actualDuration: 6,
      baselineFinish: "02 Oct 2026",
    },

    // Equipment (3 events)
    {
      id: "ACT-C228",
      name: "Underground Drainage Piping Pit 4",
      discipline: "Civil",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L6",
      plannedProgress: 60,
      verifiedActual: 45,
      variance: -15,
      status: "At Risk",
      delayCause: "Equipment",
      confidence: 74,
      plannedDuration: 5,
      actualDuration: 7,
      baselineFinish: "01 Oct 2026",
    },
    {
      id: "ACT-EQ102",
      name: "V-102 Separator Vessel Placement",
      discipline: "Static Equipment",
      workfront: "Area A",
      contractor: "Apex Constructors",
      scheduleLevel: "L4",
      plannedProgress: 65,
      verifiedActual: 55,
      variance: -10,
      status: "Delayed",
      delayCause: "Equipment",
      confidence: 98,
      plannedDuration: 5,
      actualDuration: 6,
      baselineFinish: "28 Sep 2026",
    },
    {
      id: "ACT-S210",
      name: "250T Crane Outrigger Cylinder Replacement",
      discipline: "Structural",
      workfront: "Area A",
      contractor: "Summit Civil",
      scheduleLevel: "L5",
      plannedProgress: 55,
      verifiedActual: 44,
      variance: -11,
      status: "Delayed",
      delayCause: "Equipment",
      confidence: 85,
      plannedDuration: 6,
      actualDuration: 7,
      baselineFinish: "02 Oct 2026",
    },

    // Manpower (2 events)
    {
      id: "ACT-C215",
      name: "Rebar Tying Crew Mobilization",
      discipline: "Civil",
      workfront: "Area A",
      contractor: "Summit Civil",
      scheduleLevel: "L5",
      plannedProgress: 85,
      verifiedActual: 75,
      variance: -10,
      status: "Delayed",
      delayCause: "Manpower",
      confidence: 93,
      plannedDuration: 6,
      actualDuration: 7,
      baselineFinish: "29 Sep 2026",
    },
    {
      id: "ACT-E295",
      name: "Certified High-Voltage Cable Splicers",
      discipline: "Electrical",
      workfront: "Area C",
      contractor: "Apex Constructors",
      scheduleLevel: "L6",
      plannedProgress: 70,
      verifiedActual: 60,
      variance: -10,
      status: "Delayed",
      delayCause: "Manpower",
      confidence: 88,
      plannedDuration: 5,
      actualDuration: 6,
      baselineFinish: "03 Oct 2026",
    },

    // Weather (1 event)
    {
      id: "ACT-S220",
      name: "High-Altitude Flare Derrick Wind Standdown",
      discipline: "Structural",
      workfront: "Area C",
      contractor: "Summit Civil",
      scheduleLevel: "L5",
      plannedProgress: 50,
      verifiedActual: 42,
      variance: -8,
      status: "Delayed",
      delayCause: "Weather",
      confidence: 96,
      plannedDuration: 4,
      actualDuration: 5,
      baselineFinish: "01 Oct 2026",
    },

    // On Track / Complete / Additional Base Activities
    {
      id: "ACT-C240",
      name: "Foundation Concrete Pour — Area B",
      discipline: "Civil",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L5",
      plannedProgress: 85,
      verifiedActual: 100,
      variance: 15,
      status: "Complete",
      confidence: 88,
      plannedDuration: 6,
      actualDuration: 7,
      baselineFinish: "26 Sep 2026",
      actualFinish: "26 Sep 2026",
    },
    {
      id: "ACT-C210",
      name: "Excavation & Trenching Sector 2",
      discipline: "Civil",
      workfront: "Area A",
      contractor: "Summit Civil",
      scheduleLevel: "L5",
      plannedProgress: 90,
      verifiedActual: 90,
      variance: 0,
      status: "In Progress",
      confidence: 96,
      plannedDuration: 8,
      actualDuration: 8,
      baselineFinish: "27 Sep 2026",
    },
    {
      id: "ACT-C235",
      name: "Sub-base Compaction & Proof Rolling",
      discipline: "Civil",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L5",
      plannedProgress: 100,
      verifiedActual: 100,
      variance: 0,
      status: "Complete",
      confidence: 98,
      plannedDuration: 5,
      actualDuration: 5,
      baselineFinish: "24 Sep 2026",
      actualFinish: "24 Sep 2026",
    },
    {
      id: "ACT-EQ105",
      name: "Heat Exchanger E-104 Grouting",
      discipline: "Static Equipment",
      workfront: "Area A",
      contractor: "Apex Constructors",
      scheduleLevel: "L5",
      plannedProgress: 100,
      verifiedActual: 100,
      variance: 0,
      status: "Complete",
      confidence: 96,
      plannedDuration: 4,
      actualDuration: 4,
      baselineFinish: "25 Sep 2026",
      actualFinish: "25 Sep 2026",
    },
    {
      id: "ACT-I092",
      name: "Pressure Transmitter Calibration",
      discipline: "Instrumentation",
      workfront: "Area B",
      contractor: "Apex Constructors",
      scheduleLevel: "L6",
      plannedProgress: 45,
      verifiedActual: 45,
      variance: 0,
      status: "In Progress",
      confidence: 90,
      plannedDuration: 3,
      actualDuration: 3,
      baselineFinish: "27 Sep 2026",
    },
    {
      id: "ACT-HSE01",
      name: "Pre-commissioning Safety Clearance",
      discipline: "HSE",
      workfront: "Area B",
      contractor: "Summit Civil",
      scheduleLevel: "L4",
      plannedProgress: 88,
      verifiedActual: 87,
      variance: -1,
      status: "Complete",
      confidence: 100,
      plannedDuration: 3,
      actualDuration: 3,
      baselineFinish: "25 Sep 2026",
      actualFinish: "25 Sep 2026",
    },
  ] satisfies DrilldownActivity[],
};
