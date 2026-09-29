export type ID = string;
export type ISODateTime = string;
export type Role = "supervisor" | "planner" | "viewer" | "admin";
export type ProposalStatus = "proposed" | "verified" | "rejected";
export type EventStatus = "submitted" | "proposed" | "verified" | "rejected";
export type MatchingMode = "primary" | "deterministic_fallback";
export type ReportType = "schedule-variance" | "verification-audit" | "match-quality" | "delay-register" | "discipline-progress";

export const REPORT_TYPES = [
  { id: "schedule-variance", label: "Schedule Variance" },
  { id: "verification-audit", label: "Verification Audit" },
  { id: "match-quality", label: "Match Quality" },
  { id: "delay-register", label: "Delay Register" },
  { id: "discipline-progress", label: "Discipline Progress" }
] as const satisfies ReadonlyArray<{ id: ReportType; label: string }>;

export interface LocationInterval { kind: "chainage"; alignment: string; start: number; end: number; unit: "m" | "km" }
export interface Quantity { value: number; unit: string }
export interface Evidence { text: string; transcript?: string; attachmentIds: ID[] }
export interface ExtractedFacts { assetId?: ID; discipline?: string; workType?: string; location?: LocationInterval; quantity?: Quantity; keywords: string[] }

export interface ScheduleActivity {
  id: ID; projectId: ID; snapshotId: ID; wbs: string; level: 5 | 6; name: string;
  discipline: string; workType: string; assetId: ID; location: LocationInterval;
  plannedStart: string; plannedFinish: string; plannedQuantity?: Quantity; actualProgressPercent: number;
}

export interface ExecutionEvent {
  id: ID; projectId: ID; reporterId: ID; observedAt: ISODateTime; receivedAt: ISODateTime;
  evidence: Evidence; extractedFacts: ExtractedFacts; status: EventStatus;
}

export type SignalName = "asset" | "discipline" | "location" | "text" | "workType" | "temporal";
export interface SignalExplanation { signal: SignalName; score: number; weight: number; contribution: number; input: Record<string, unknown>; explanation: string; missing: boolean }
export interface MatchCandidate { activityId: ID; activityWbs: string; score: number; band: "auto_suggest" | "review" | "unmatched"; explanation: SignalExplanation[] }
export interface MatchProposal { id: ID; projectId: ID; executionEventId: ID; snapshotId: ID; engineVersion: string; configVersion: string; mode: MatchingMode; status: ProposalStatus; candidates: MatchCandidate[]; createdAt: ISODateTime }

export interface VerifyMatchCommand { activityId: ID; progressPercent: number; actualQuantity?: Quantity; note?: string; expectedActivityVersion: number }
export interface VerificationResult { verificationId: ID; proposalId: ID; activityId: ID; previousProgressPercent: number; progressPercent: number; activityVersion: number; auditSequence: number }
export interface ApiError { error: { code: string; message: string; requestId: ID; details?: Record<string, unknown> } }
export interface Page<T> { items: T[]; nextCursor: string | null }

export const MATCHING_DEFAULTS = {
  weights: { asset: 0.4, discipline: 0.2, location: 0.15, text: 0.1, workType: 0.1, temporal: 0.05 },
  thresholds: { autoSuggest: 0.9, review: 0.7 },
  tieBreaker: ["score:desc", "activityWbs:asc", "activityId:asc"]
} as const;

/* ------------------------------------------------------------------ *
 * Sub-modules
 *
 * Re-exported as types only. index.ts is the type surface, and a runtime
 * re-export would make it circular with dpr.ts, which imports its primitives
 * from here. Value consumers (matching defaults, report specs, canonical JSON)
 * import the sub-module path directly: "@execlink/contracts/reports",
 * "@execlink/contracts/canonical", "@execlink/contracts/dpr".
 * ------------------------------------------------------------------ */

export type {
  DprPercentComplete,
  DprLine,
  DprLineStatus,
  DprStatus
} from "./dpr.js";
export { DPR_APPROVAL_RULE, DPR_LINE_STATUSES, DPR_STATUSES } from "./dpr.js";

export type { ReportColumn, ReportColumnType, ReportRow, ReportSpec } from "./reports.js";
export { REPORTS, REPORT_IDS, reportHeader } from "./reports.js";
