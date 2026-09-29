import { SCHEDULE_ACTIVITIES, WBS_HIERARCHY } from "./schedule-explorer";
import { liveExecutionFixture } from "./live-execution";
import {
  historicalActivitiesFixture,
  reusableLessonsFixture,
  relatedPatternsFixture,
} from "./project-memory";

export type SearchEntityType =
  | "activity"
  | "event"
  | "wbs"
  | "evidence"
  | "memory"
  | "navigation"
  | "command";

export interface SearchResultItem {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
  tag?: string;
  badge?: string;
  status?: string;
  progress?: number;
  url: string;
  searchTokens: string[];
  score?: number;
}

export interface SearchGroup {
  type: SearchEntityType;
  title: string;
  count: number;
  items: SearchResultItem[];
}

// ----------------------------------------------------------------------------
// STATIC EVIDENCE ENTITIES
// ----------------------------------------------------------------------------
const EVIDENCE_ENTITIES: SearchResultItem[] = [
  {
    id: "EVD-DPR-0926",
    type: "evidence",
    title: "DPR_26_Sep_2026.xlsx",
    subtitle: "Linked to P-110 & Train 1 · Daily progress sheet · 26 Sep 2026",
    tag: "P-110",
    badge: "Excel DPR",
    status: "Verified Source",
    url: "/data-ingestion",
    searchTokens: [
      "dpr",
      "dpr_26_sep_2026.xlsx",
      "p-110",
      "p110",
      "daily progress",
      "excel",
      "spreadsheets",
      "train 1",
    ],
  },
  {
    id: "EVD-DPR-0925",
    type: "evidence",
    title: "DPR_25_Sep_2026.pdf",
    subtitle: "Mechanical & Piping daily progress report · 25 Sep 2026",
    tag: "Process Area",
    badge: "PDF Report",
    status: "Archived",
    url: "/data-ingestion",
    searchTokens: [
      "dpr",
      "dpr_25_sep_2026.pdf",
      "piping",
      "mechanical",
      "pdf",
      "yesterday",
      "field report",
    ],
  },
  {
    id: "EVD-IMG-P110",
    type: "evidence",
    title: "IMG-EL-P110-0926-04.jpg",
    subtitle: "P-110 pump soleplate & dial indicator alignment photo",
    tag: "P-110",
    badge: "Site Photo",
    status: "Verified",
    url: "/schedule-explorer?activity=ACT-P110&tab=evidence",
    searchTokens: [
      "img",
      "img-el-p110-0926-04.jpg",
      "photo",
      "alignment",
      "p-110",
      "p110",
      "soleplate",
      "dial indicator",
    ],
  },
  {
    id: "EVD-QC-HYD",
    type: "evidence",
    title: "QC_Hydro_P110_Signoff.pdf",
    subtitle: "Hydrostatic test package & blinding manifest for P-110 line pack",
    tag: "P-110",
    badge: "QC Sign-off",
    status: "Pending Witness",
    url: "/schedule-explorer?activity=ACT-P125&tab=evidence",
    searchTokens: [
      "qc",
      "hydro",
      "hydrotest",
      "qc_hydro_p110_signoff.pdf",
      "p-110",
      "p110",
      "blinding",
      "signoff",
      "witness",
    ],
  },
  {
    id: "EVD-CALIB-01",
    type: "evidence",
    title: "LOOP_CALIB_CMP01.pdf",
    subtitle: "Loop calibration certificate for Compressor Train 1 leads",
    tag: "CMP-01",
    badge: "Cert",
    status: "Verified",
    url: "/live-execution?event=EVT-0148",
    searchTokens: [
      "calibration",
      "loop",
      "loop check",
      "cmp-01",
      "compressor",
      "instrumentation",
      "cert",
    ],
  },
];

// ----------------------------------------------------------------------------
// STATIC NAVIGATION ENTITIES
// ----------------------------------------------------------------------------
export const NAVIGATION_ITEMS: SearchResultItem[] = [
  {
    id: "NAV-01",
    type: "navigation",
    title: "Overview",
    subtitle: "Execution command center & critical schedule metrics",
    badge: "01",
    url: "/",
    searchTokens: ["overview", "dashboard", "kpi", "summary", "command center", "01"],
  },
  {
    id: "NAV-02",
    type: "navigation",
    title: "Live Execution",
    subtitle: "Real-time field updates, feed events & activity matching",
    badge: "02",
    url: "/live-execution",
    searchTokens: ["live execution", "events", "stream", "feed", "updates", "02"],
  },
  {
    id: "NAV-03",
    type: "navigation",
    title: "Match Review",
    subtitle: "Explainable AI schedule reconciliation & match proposals",
    badge: "03",
    url: "/match-review",
    searchTokens: ["match review", "proposals", "ai matching", "reconciliation", "confidence", "03"],
  },
  {
    id: "NAV-04",
    type: "navigation",
    title: "Schedule Explorer",
    subtitle: "L5/L6 Gantt schedule, critical path & activity inspector",
    badge: "04",
    url: "/schedule-explorer",
    searchTokens: ["schedule explorer", "gantt", "wbs", "activities", "critical path", "inspector", "04"],
  },
  {
    id: "NAV-05",
    type: "navigation",
    title: "Data Ingestion",
    subtitle: "Multi-source DPR parser, document uploads & sync pipelines",
    badge: "05",
    url: "/data-ingestion",
    searchTokens: ["data ingestion", "dpr", "upload", "parser", "import", "spreadsheets", "05"],
  },
  {
    id: "NAV-06",
    type: "navigation",
    title: "Verification Center",
    subtitle: "Planner review queue, confidence routing & schedule mutation boundary",
    badge: "06",
    url: "/verification-center",
    searchTokens: ["verification center", "verification queue", "human review", "approvals", "audit", "06"],
  },
  {
    id: "NAV-07",
    type: "navigation",
    title: "Analytics",
    subtitle: "Earned value S-curve, discipline variance & delay root causes",
    badge: "07",
    url: "/analytics",
    searchTokens: ["analytics", "s-curve", "variance", "earned value", "delays", "charts", "07"],
  },
  {
    id: "NAV-08",
    type: "navigation",
    title: "Project Memory",
    subtitle: "Historical comparable activities, reusable lessons & institutional intelligence",
    badge: "08",
    url: "/project-memory",
    searchTokens: ["project memory", "historical", "lessons", "patterns", "knowledge", "08"],
  },
];

// ----------------------------------------------------------------------------
// QUICK COMMAND ACTIONS
// ----------------------------------------------------------------------------
export const QUICK_ACTIONS: SearchResultItem[] = [
  {
    id: "CMD-IMPORT",
    type: "command",
    title: "Import DPR",
    subtitle: "Upload and parse new daily progress report spreadsheet or PDF",
    badge: "Action",
    url: "/data-ingestion",
    searchTokens: ["import dpr", "upload", "parse", "file", "dpr"],
  },
  {
    id: "CMD-QUEUE",
    type: "command",
    title: "Open Verification Queue",
    subtitle: "Review pending high-priority match proposals requiring planner verification",
    badge: "Action",
    url: "/verification-center",
    searchTokens: ["open verification queue", "verification", "queue", "review", "approve"],
  },
  {
    id: "CMD-SCHEDULE",
    type: "command",
    title: "Open Schedule Explorer",
    subtitle: "Inspect Rev 04 baseline schedule and Gantt timeline",
    badge: "Action",
    url: "/schedule-explorer",
    searchTokens: ["open schedule explorer", "schedule", "gantt", "activities"],
  },
  {
    id: "CMD-LIVE",
    type: "command",
    title: "Open Live Execution",
    subtitle: "View live execution event feed and field updates",
    badge: "Action",
    url: "/live-execution",
    searchTokens: ["open live execution", "live", "feed", "field updates"],
  },
  {
    id: "CMD-MEMORY",
    type: "command",
    title: "Project Memory",
    subtitle: "Explore comparable past projects and reusable lessons",
    badge: "Action",
    url: "/project-memory",
    searchTokens: ["project memory", "memory", "lessons", "past projects"],
  },
];

// ----------------------------------------------------------------------------
// RECENT SEARCH ITEMS (FOR DEFAULT STATE)
// ----------------------------------------------------------------------------
export const RECENT_ITEMS: SearchResultItem[] = [
  {
    id: "ACT-P125",
    type: "activity",
    title: "P-110 Hydrotest",
    subtitle: "ACT-P125 · Piping · Process Area → Mechanical Works · 0%",
    tag: "P-110",
    badge: "Blocked",
    progress: 0,
    status: "Blocked",
    url: "/schedule-explorer?activity=ACT-P125",
    searchTokens: ["p-110 hydrotest", "act-p125", "piping", "hydrotest"],
  },
  {
    id: "ACT-P110",
    type: "activity",
    title: "P-110 Erection & Alignment",
    subtitle: "ACT-P110 · Piping · Process Area → Row 4 · 64% verified",
    tag: "P-110",
    badge: "64%",
    progress: 64,
    status: "In Progress",
    url: "/schedule-explorer?activity=ACT-P110",
    searchTokens: ["act-p110", "p-110 erection & alignment", "piping"],
  },
  {
    id: "NAV-06",
    type: "navigation",
    title: "Verification Center",
    subtitle: "Planner review queue · 2 items awaiting verification",
    badge: "06",
    url: "/verification-center",
    searchTokens: ["verification center", "queue", "reviews"],
  },
];

// ----------------------------------------------------------------------------
// GLOBAL SEARCH INDEX BUILDER
// ----------------------------------------------------------------------------
let cachedSearchIndex: SearchResultItem[] | null = null;

export function getGlobalSearchIndex(): SearchResultItem[] {
  if (cachedSearchIndex) return cachedSearchIndex;

  const items: SearchResultItem[] = [];

  // 1. Activities
  for (const act of SCHEDULE_ACTIVITIES) {
    const wbsLeaf = act.wbsPath.includes("→")
      ? act.wbsPath.split("→").pop()?.trim()
      : act.wbsPath;

    items.push({
      id: act.id,
      type: "activity",
      title: act.name,
      subtitle: `${act.id} · ${act.discipline} · ${wbsLeaf || act.location} · ${act.currentProgress}%`,
      tag: act.assetTag,
      badge: `${act.currentProgress}%`,
      progress: act.currentProgress,
      status: act.status,
      url: `/schedule-explorer?activity=${act.id}`,
      searchTokens: [
        act.id,
        act.name,
        act.discipline,
        act.assetTag,
        act.wbsPath,
        act.location,
        act.status,
        act.contractor,
      ],
    });
  }

  // 2. Execution Events
  for (const evt of liveExecutionFixture.events) {
    items.push({
      id: evt.id,
      type: "event",
      title: evt.event,
      subtitle: `${evt.id} · ${evt.status} · ${evt.discipline} · ${evt.source}`,
      tag: evt.assetTag,
      badge: evt.status,
      status: evt.status,
      url: `/live-execution?event=${evt.id}`,
      searchTokens: [
        evt.id,
        evt.event,
        evt.discipline,
        evt.assetTag,
        evt.location,
        evt.source,
        evt.reporter,
        evt.matchedActivity?.id || "",
        evt.matchedActivity?.name || "",
      ],
    });
  }

  // 3. WBS Work Packages
  for (const wbs of WBS_HIERARCHY) {
    items.push({
      id: wbs.id,
      type: "wbs",
      title: wbs.name,
      subtitle: `Code: ${wbs.code} · Level ${wbs.level} Work Package`,
      tag: wbs.code,
      badge: `L${wbs.level}`,
      url: "/schedule-explorer",
      searchTokens: [wbs.id, wbs.code, wbs.name, `level ${wbs.level}`],
    });
  }

  // 4. Evidence
  items.push(...EVIDENCE_ENTITIES);

  // 5. Project Memory (Historical Activities, Lessons, Patterns)
  for (const hist of historicalActivitiesFixture) {
    items.push({
      id: hist.id,
      type: "memory",
      title: `${hist.name} (Historical)`,
      subtitle: `${hist.project} · ${hist.similarityPct}% similarity · ${hist.discipline} · ${hist.actualDuration}d actual`,
      tag: hist.discipline,
      badge: `${hist.similarityPct}% Match`,
      url: "/project-memory",
      searchTokens: [
        hist.id,
        hist.name,
        hist.discipline,
        hist.project,
        hist.delayCause || "",
        "historical pattern",
        "comparable",
      ],
    });
  }

  for (const lesson of reusableLessonsFixture) {
    items.push({
      id: lesson.id,
      type: "memory",
      title: lesson.lesson,
      subtitle: `Reusable Lesson · ${lesson.observedContext}`,
      tag: lesson.delayCause || "Memory",
      badge: "Lesson",
      url: "/project-memory",
      searchTokens: [
        lesson.id,
        lesson.lesson,
        lesson.observedContext,
        lesson.delayCause || "",
        "lesson",
        "reusable lesson",
      ],
    });
  }

  for (const pat of relatedPatternsFixture) {
    items.push({
      id: pat.id,
      type: "memory",
      title: `${pat.title} Pattern`,
      subtitle: `Historical Execution Pattern · ${pat.recordsCount} records · ${pat.discipline || "General"}`,
      tag: pat.discipline || "Pattern",
      badge: "Pattern",
      url: "/project-memory",
      searchTokens: [
        pat.id,
        pat.title,
        pat.discipline || "",
        pat.delayCause || "",
        "pattern",
        "historical pattern",
      ],
    });
  }

  // 6. Navigation
  items.push(...NAVIGATION_ITEMS);

  // 7. Commands
  items.push(...QUICK_ACTIONS);

  cachedSearchIndex = items;
  return items;
}

// ----------------------------------------------------------------------------
// SEARCH SCORING & FILTERING
// ----------------------------------------------------------------------------
function scoreItem(item: SearchResultItem, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  const qAlpha = q.replace(/[^a-z0-9]/g, "");
  if (!q) return 0;

  const idLower = item.id.toLowerCase();
  const idAlpha = idLower.replace(/[^a-z0-9]/g, "");
  const titleLower = item.title.toLowerCase();
  const titleAlpha = titleLower.replace(/[^a-z0-9]/g, "");
  const tagLower = (item.tag || "").toLowerCase();
  const tagAlpha = tagLower.replace(/[^a-z0-9]/g, "");
  const subLower = item.subtitle.toLowerCase();

  let score = 0;

  // 1. Exact ID
  if (idLower === q || (qAlpha && idAlpha === qAlpha)) {
    score += 1000;
  }
  // 2. ID prefix
  else if (idLower.startsWith(q) || (qAlpha && idAlpha.startsWith(qAlpha))) {
    score += 600;
  }
  // ID contains
  else if (idLower.includes(q) || (qAlpha && idAlpha.includes(qAlpha))) {
    score += 400;
  }

  // 3. Exact title/name
  if (titleLower === q || (qAlpha && titleAlpha === qAlpha)) {
    score += 500;
  }
  // 4. Title/name prefix
  else if (titleLower.startsWith(q) || (qAlpha && titleAlpha.startsWith(qAlpha))) {
    score += 350;
  }
  // Word in title starts with query
  else if (titleLower.split(/[\s—–\-_/]+/).some((w) => w.startsWith(q))) {
    score += 260;
  }
  // Title contains query
  else if (titleLower.includes(q)) {
    score += 180;
  }

  // 5. Asset / Tag
  if (tagLower && (tagLower === q || (qAlpha && tagAlpha === qAlpha))) {
    score += 320;
  } else if (tagLower && (tagLower.startsWith(q) || (qAlpha && tagAlpha.startsWith(qAlpha)))) {
    score += 220;
  } else if (tagLower && (tagLower.includes(q) || (qAlpha && tagAlpha.includes(qAlpha)))) {
    score += 150;
  }

  // 6. WBS / context (in subtitle)
  if (subLower.includes(q) || (qAlpha && subLower.replace(/[^a-z0-9]/g, "").includes(qAlpha))) {
    score += 110;
  }

  // 7. Search tokens
  if (item.searchTokens) {
    for (const token of item.searchTokens) {
      const tLower = token.toLowerCase();
      if (tLower === q) {
        score += 80;
      } else if (tLower.startsWith(q)) {
        score += 50;
      } else if (tLower.includes(q)) {
        score += 25;
      }
    }
  }

  return score;
}

const CATEGORY_ORDER: { type: SearchEntityType; title: string }[] = [
  { type: "activity", title: "ACTIVITIES" },
  { type: "event", title: "EXECUTION EVENTS" },
  { type: "memory", title: "PROJECT MEMORY" },
  { type: "evidence", title: "EVIDENCE" },
  { type: "wbs", title: "WBS WORK PACKAGES" },
  { type: "navigation", title: "NAVIGATION" },
  { type: "command", title: "QUICK ACTIONS" },
];

export function executeGlobalSearch(query: string): SearchGroup[] {
  const q = query.trim();
  if (!q) return [];

  const index = getGlobalSearchIndex();
  const scoredItems: SearchResultItem[] = [];

  for (const item of index) {
    const score = scoreItem(item, q);
    if (score > 0) {
      scoredItems.push({ ...item, score });
    }
  }

  // Sort descending by score
  scoredItems.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Group by category in predefined logical order
  const groups: SearchGroup[] = [];

  for (const cat of CATEGORY_ORDER) {
    const itemsInCat = scoredItems.filter((i) => i.type === cat.type);
    if (itemsInCat.length > 0) {
      groups.push({
        type: cat.type,
        title: cat.title,
        count: itemsInCat.length,
        items: itemsInCat.slice(0, 8), // cap per section for clean scanning
      });
    }
  }

  return groups;
}
