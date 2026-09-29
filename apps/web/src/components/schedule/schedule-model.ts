import {
  PROJECT_DATA_DATE,
  SCHEDULE_ACTIVITIES,
  SCHEDULE_METRICS,
  WBS_HIERARCHY,
  type ScheduleActivity,
  type ScheduleStatus,
  type WbsNode,
} from "@/data/schedule-explorer";

/* ── Zoom ────────────────────────────────────────────────────────────────── */
export type ZoomLevel = "Day" | "Week" | "Month";
export const ZOOM_ORDER: ZoomLevel[] = ["Month", "Week", "Day"];
export const DAY_WIDTH: Record<ZoomLevel, number> = { Month: 22, Week: 44, Day: 68 };

/* ── Row metrics (shared with CSS so panes stay pixel-synchronised) ────────── */
export const ROW_WBS_H = 46;
export const ROW_ACT_H = 60;

/* ── Date helpers ────────────────────────────────────────────────────────── */
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_MS = 86400000;

export function toUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function shiftIso(iso: string, days: number): string {
  return isoOf(new Date(toUtc(iso).getTime() + days * DAY_MS));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / DAY_MS);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = toUtc(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
}

export function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = toUtc(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function isoWeekNumber(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dow + 3);
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const firstDow = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDow + 3);
  return 1 + Math.round((t.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}

/* ── Timeline model ──────────────────────────────────────────────────────── */
export interface TimelineDay {
  iso: string;
  dom: number;
  dow: string;
  isMonthStart: boolean;
  isWeekStart: boolean;
  isWeekend: boolean;
  isDataDate: boolean;
}

export interface TimelineBand {
  key: string;
  label: string;
  startIndex: number;
  days: number;
}

export interface TimelineModel {
  startIso: string;
  endIso: string;
  dayCount: number;
  days: TimelineDay[];
  months: TimelineBand[];
  weeks: TimelineBand[];
  /** Index of the Data Date column. -1 when the Data Date is outside the range. */
  dataDateIndex: number;
  dataDateIso: string;
}

const dataDateMs = toUtc(PROJECT_DATA_DATE).getTime();

/** Earliest / latest dates actually present in the schedule, then padded and snapped to whole weeks. */
const RANGE_START = (() => {
  let min = dataDateMs;
  for (const a of SCHEDULE_ACTIVITIES) {
    for (const iso of [a.baselineStart, a.currentStart, a.actualStart]) {
      if (!iso) continue;
      const t = toUtc(iso).getTime();
      if (t < min) min = t;
    }
  }
  const d = new Date(min - DAY_MS);
  // snap back to Monday
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return isoOf(d);
})();

const RANGE_END = (() => {
  let max = dataDateMs;
  for (const a of SCHEDULE_ACTIVITIES) {
    for (const iso of [a.baselineFinish, a.currentFinish, a.actualFinish]) {
      if (!iso) continue;
      const t = toUtc(iso).getTime();
      if (t > max) max = t;
    }
  }
  const d = new Date(max + DAY_MS);
  // snap forward to Saturday so every week is closed
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() + (6 - dow));
  return isoOf(d);
})();

export const TIMELINE: TimelineModel = (() => {
  const days: TimelineDay[] = [];
  const cursor = toUtc(RANGE_START);
  const end = toUtc(RANGE_END);
  let prevMonth = -1;
  while (cursor.getTime() <= end.getTime()) {
    const iso = isoOf(cursor);
    const wd = cursor.getUTCDay();
    const month = cursor.getUTCMonth();
    days.push({
      iso,
      dom: cursor.getUTCDate(),
      dow: DOW_SHORT[wd],
      isMonthStart: month !== prevMonth,
      isWeekStart: wd === 1,
      isWeekend: wd === 0 || wd === 6,
      isDataDate: iso === PROJECT_DATA_DATE,
    });
    prevMonth = month;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const months: TimelineBand[] = [];
  const weeks: TimelineBand[] = [];
  days.forEach((d, i) => {
    const dt = toUtc(d.iso);
    if (i === 0 || d.isMonthStart) {
      const key = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
      const label = `${MONTH_SHORT[dt.getUTCMonth()].toUpperCase()} ${dt.getUTCFullYear()}`;
      const prev = months[months.length - 1];
      if (prev && prev.key === key) prev.days += 1;
      else months.push({ key, label, startIndex: i, days: 1 });
    } else {
      months[months.length - 1].days += 1;
    }
    if (i === 0 || d.isWeekStart) {
      weeks.push({ key: d.iso, label: `W${isoWeekNumber(dt)}`, startIndex: i, days: 1 });
    } else {
      weeks[weeks.length - 1].days += 1;
    }
  });

  return {
    startIso: RANGE_START,
    endIso: RANGE_END,
    dayCount: days.length,
    days,
    months,
    weeks,
    dataDateIndex: days.findIndex((d) => d.isDataDate),
    dataDateIso: PROJECT_DATA_DATE,
  };
})();

/** Pixels per day and the total timeline canvas width for a zoom level. */
export function timelineWidth(zoom: ZoomLevel): number {
  return TIMELINE.dayCount * DAY_WIDTH[zoom];
}

/** Left offset (px) of a date column within the timeline canvas. */
export function columnLeft(iso: string, dayWidth: number): number {
  return daysBetween(TIMELINE.startIso, iso) * dayWidth;
}

export interface SpanGeometry {
  left: number;
  width: number;
}

/** Horizontal geometry for a start/finish pair, clamped into the timeline range. */
export function spanGeometry(start: string, finish: string, dayWidth: number): SpanGeometry {
  const from = daysBetween(TIMELINE.startIso, start);
  const to = daysBetween(TIMELINE.startIso, finish);
  const left = Math.max(0, from) * dayWidth;
  const right = Math.min(TIMELINE.dayCount, to + 1) * dayWidth;
  return { left, width: Math.max(dayWidth, right - left) };
}

/* ── Status grammar ──────────────────────────────────────────────────────── */
export type StatusTone = "done" | "active" | "behind" | "blocked" | "pending";

export function statusTone(status: ScheduleStatus): StatusTone {
  switch (status) {
    case "Completed":
      return "done";
    case "In Progress":
      return "active";
    case "Delayed":
      return "behind";
    case "Blocked":
      return "blocked";
    default:
      return "pending";
  }
}

export const STATUS_LABEL: Record<ScheduleStatus, string> = {
  Completed: "Completed",
  "In Progress": "In Progress",
  "Not Started": "Not Started",
  Delayed: "Delayed",
  Blocked: "Blocked",
};

export const DISCIPLINE_DOT: Record<string, string> = {
  Civil: "var(--disc-civil-dot)",
  Structural: "var(--disc-structural-dot)",
  Piping: "var(--disc-piping-dot)",
  "Static Equipment": "var(--disc-static-dot)",
  "Rotating Equipment": "var(--disc-rotating-dot)",
  Electrical: "var(--disc-electrical-dot)",
  Instrumentation: "var(--disc-instrumentation-dot)",
  HSE: "var(--disc-hse-dot)",
};

export const DISCIPLINES = [
  "Civil",
  "Structural",
  "Piping",
  "Static Equipment",
  "Rotating Equipment",
  "Electrical",
  "Instrumentation",
  "HSE",
] as const;

/* ── Activity semantics ──────────────────────────────────────────────────── */
/** Verified progress minus planned progress at the Data Date. */
export function progressVariance(a: ScheduleActivity): number {
  return a.currentProgress - a.baselineProgress;
}

export function isBehindPlan(a: ScheduleActivity): boolean {
  return a.currentProgress < a.baselineProgress;
}

/** True when the activity's current schedule window covers the Data Date. */
export function spansDataDate(a: ScheduleActivity): boolean {
  return a.currentStart <= PROJECT_DATA_DATE && a.currentFinish >= PROJECT_DATA_DATE;
}

/** True when the current finish slipped beyond the baseline finish. */
export function hasSlip(a: ScheduleActivity): boolean {
  return a.currentFinish > a.baselineFinish;
}

export function floatDays(a: ScheduleActivity): number {
  const parsed = Number.parseFloat(a.totalFloat);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Latest verified event source — the only defensible "verified source" we hold. */
export function verifiedSource(a: ScheduleActivity): string | null {
  const verified = a.executionEvents.filter((e) => e.verificationState === "Verified");
  if (verified.length === 0) return null;
  return verified[verified.length - 1].source;
}

/* ── Filter model ────────────────────────────────────────────────────────── */
export interface ScheduleFilters {
  query: string;
  discipline: string;
  status: string;
  critical: "All" | "Critical" | "Non-Critical";
  progress: "All" | "0%" | "1–99%" | "100%";
}

export const EMPTY_FILTERS: ScheduleFilters = {
  query: "",
  discipline: "All",
  status: "All",
  critical: "All",
  progress: "All",
};

export function applyFilters(filters: ScheduleFilters): ScheduleActivity[] {
  const q = filters.query.trim().toLowerCase();
  return SCHEDULE_ACTIVITIES.filter((a) => {
    if (q) {
      const haystack = [a.id, a.name, a.assetTag, a.wbsPath, a.discipline, a.location, a.contractor];
      if (!haystack.some((s) => s.toLowerCase().includes(q))) return false;
    }
    if (filters.discipline !== "All" && a.discipline !== filters.discipline) return false;
    if (filters.status !== "All" && a.status !== filters.status) return false;
    if (filters.critical === "Critical" && !a.isCritical) return false;
    if (filters.critical === "Non-Critical" && a.isCritical) return false;
    if (filters.progress === "0%" && a.currentProgress !== 0) return false;
    if (filters.progress === "1–99%" && (a.currentProgress <= 0 || a.currentProgress >= 100)) return false;
    if (filters.progress === "100%" && a.currentProgress !== 100) return false;
    return true;
  });
}

export function activeFilterCount(filters: ScheduleFilters): number {
  return [
    filters.query.trim() !== "",
    filters.discipline !== "All",
    filters.status !== "All",
    filters.critical !== "All",
    filters.progress !== "All",
  ].filter(Boolean).length;
}

/* ── Structure rows ──────────────────────────────────────────────────────── */
export interface WbsRollup {
  count: number;
  verified: number;
  planned: number;
  fromIso: string;
  toIso: string;
}

export type StructureRow =
  | { type: "wbs"; node: WbsNode; open: boolean; depth: number; rollup: WbsRollup }
  | { type: "act"; activity: ScheduleActivity; depth: number };

const childrenOf = (id: string) => WBS_HIERARCHY.filter((n) => n.parentId === id);
const activitiesOf = (id: string) => SCHEDULE_ACTIVITIES.filter((a) => a.wbsId === id);

function rollupFor(nodeId: string, allowed: Set<string>): WbsRollup | null {
  const members: ScheduleActivity[] = [];
  const collect = (id: string) => {
    for (const a of activitiesOf(id)) members.push(a);
    for (const child of childrenOf(id)) collect(child.id);
  };
  collect(nodeId);

  const visible = members.filter((a) => allowed.has(a.id));
  if (visible.length === 0) return null;

  let fromIso = visible[0].currentStart;
  let toIso = visible[0].currentFinish;
  let verified = 0;
  let planned = 0;
  for (const a of visible) {
    if (a.currentStart < fromIso) fromIso = a.currentStart;
    if (a.currentFinish > toIso) toIso = a.currentFinish;
    verified += a.currentProgress;
    planned += a.baselineProgress;
  }
  return {
    count: visible.length,
    verified: Math.round(verified / visible.length),
    planned: Math.round(planned / visible.length),
    fromIso,
    toIso,
  };
}

/**
 * Flatten the WBS hierarchy into the synchronised render list used by both panes.
 * Branches with no matching activity are omitted entirely.
 */
export function buildStructureRows(
  visible: ScheduleActivity[],
  expanded: Record<string, boolean>,
): StructureRow[] {
  const allowed = new Set(visible.map((a) => a.id));
  const rows: StructureRow[] = [];

  const walk = (node: WbsNode) => {
    const rollup = rollupFor(node.id, allowed);
    if (!rollup) return;
    const open = !!expanded[node.id];
    rows.push({ type: "wbs", node, open, depth: node.level, rollup });
    if (!open) return;
    for (const a of activitiesOf(node.id)) {
      if (allowed.has(a.id)) rows.push({ type: "act", activity: a, depth: node.level });
    }
    for (const child of childrenOf(node.id)) walk(child);
  };

  for (const root of WBS_HIERARCHY.filter((n) => !n.parentId)) walk(root);
  return rows;
}

export const ALL_EXPANDED: Record<string, boolean> = Object.fromEntries(
  WBS_HIERARCHY.map((n) => [n.id, true]),
);

export const ROOT_ONLY_EXPANDED: Record<string, boolean> = Object.fromEntries(
  WBS_HIERARCHY.map((n) => [n.id, !n.parentId]),
);

/** Row count per depth so panes can report what is actually plotted. */
export function structureMetrics(rows: StructureRow[]) {
  let activities = 0;
  let nodes = 0;
  for (const r of rows) {
    if (r.type === "act") activities += 1;
    else nodes += 1;
  }
  return { activities, nodes };
}

/* ── Pulse metrics ───────────────────────────────────────────────────────── */
export interface PulseMetric {
  key: string;
  value: string;
  unit?: string;
  label: string;
  hint: string;
  tone: StatusTone | "critical";
}

export interface ExecutionContext {
  executing: number;
  behind: number;
  blocked: number;
  finished: number;
  upcoming: number;
}

const dataDateBand: ExecutionContext = SCHEDULE_ACTIVITIES.reduce<ExecutionContext>(
  (acc, a) => {
    if (a.status === "Completed" || (a.actualFinish && a.actualFinish < PROJECT_DATA_DATE)) {
      acc.finished += 1;
    } else if (spansDataDate(a)) {
      acc.executing += 1;
      if (isBehindPlan(a)) acc.behind += 1;
      if (a.status === "Blocked") acc.blocked += 1;
    } else if (a.currentStart > PROJECT_DATA_DATE) {
      acc.upcoming += 1;
    }
    return acc;
  },
  { executing: 0, behind: 0, blocked: 0, finished: 0, upcoming: 0 },
);

const blockedTotal = SCHEDULE_ACTIVITIES.filter((a) => a.status === "Blocked").length;

export const SCHEDULE_PULSE: PulseMetric[] = [
  {
    key: "verified",
    value: `${SCHEDULE_METRICS.verifiedActualProgress}%`,
    label: "Verified",
    hint: `${SCHEDULE_METRICS.plannedProgress}% planned`,
    tone: "done",
  },
  {
    key: "variance",
    value: `${SCHEDULE_METRICS.variancePts > 0 ? "+" : ""}${SCHEDULE_METRICS.variancePts} pts`,
    label: "Variance",
    hint: "Behind plan",
    tone: "behind",
  },
  {
    key: "critical",
    value: `${SCHEDULE_METRICS.criticalCount}`,
    label: "Critical",
    hint: "critical-path activities",
    tone: "critical",
  },
  {
    key: "blocked",
    value: `${blockedTotal}`,
    label: "Blocked",
    hint: "need action",
    tone: "blocked",
  },
];

export const EXECUTION_CONTEXT = dataDateBand;

export { PROJECT_DATA_DATE, SCHEDULE_METRICS, WBS_HIERARCHY };
