/**
 * DPR — Daily Progress Report.
 *
 * A DPR is the per-day record of what an activity was planned to achieve against
 * what has actually been verified. It is a DERIVED reporting artifact assembled
 * from verified actuals; it is never an input to progress and never a source of
 * truth for it.
 *
 * The distinction that matters, and that has already caused one contract defect on
 * this project: a DPR (this module, "Daily Progress Report") is NOT the
 * "Discipline Progress" export. They are unrelated. Discipline Progress is one of
 * the five approved report types; a DPR is bulk per-day schedule data. Do not let
 * the shared acronym merge them.
 *
 * Only verified actuals feed a DPR. A proposal awaiting planner review contributes
 * nothing here, which is the same non-mutation rule that governs the rest of the
 * system expressed in reporting terms.
 */
import type { ID, ISODateTime, Quantity } from "./index.js";

export type DprStatus = "draft" | "submitted" | "approved";
export type DprLineStatus = "not_started" | "in_progress" | "complete" | "delayed";

/**
 * One activity on one report date. Every progress figure here is percent complete
 * to date, never a delta, so that two DPRs can be compared without replaying the
 * days between them.
 */
export interface DprLine {
  activityId: ID;
  wbs: string;
  discipline: string;
  workType: string;
  assetId: ID;
  plannedStart: string;
  plannedFinish: string;
  /** Percent complete expected at the end of reportDate, from the schedule curve. */
  plannedPercentAtReportDate: number;
  /** Percent complete actually verified as of reportDate. 0 when nothing is verified. */
  actualPercentToDate: number;
  plannedQuantity?: Quantity;
  verifiedQuantityToDate?: Quantity;
  /**
   * actualPercentToDate - plannedPercentAtReportDate. Negative means behind plan.
   * Stored rather than derived so that an exported report is a stable byte sequence
   * and a later schedule reissue cannot silently change a historical DPR.
   */
  variancePercent: number;
  /** Planned finish already passed at reportDate while progress is below 100. */
  delayDays: number;
  status: DprLineStatus;
  /** Execution events whose verification produced this line's actual figures. */
  evidenceEventIds: ID[];
  /** Null while the activity has no verified progress at all. */
  lastVerifiedAt: ISODateTime | null;
}

export interface DprPercentComplete {
  id: ID;
  projectId: ID;
  snapshotId: ID;
  /** The day being reported, in the project's timezone, as YYYY-MM-DD. */
  reportDate: string;
  status: DprStatus;
  preparedBy: ID;
  lines: DprLine[];
  preparedAt: ISODateTime;
  submittedAt: ISODateTime | null;
  approvedBy: ID | null;
  approvedAt: ISODateTime | null;
}

export const DPR_STATUSES: readonly DprStatus[] = ["draft", "submitted", "approved"];

export const DPR_LINE_STATUSES: readonly DprLineStatus[] = [
  "not_started",
  "in_progress",
  "complete",
  "delayed"
];

/**
 * A DPR is approved, never verified. Approval freezes a reporting artifact; it does
 * not touch progress. Approval therefore requires planner role and is subject to
 * the same idempotency rules as any other command, but it MUST NOT be wired to the
 * actual-progress write path.
 */
export const DPR_APPROVAL_RULE =
  "DPR approval freezes a report. It never creates, raises or lowers an actual. " +
  "Only match verification and planner correction may write actual progress.";
