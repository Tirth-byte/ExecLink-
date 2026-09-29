/**
 * The five approved report types, with their exact columns and CSV headers.
 *
 * This is the authority for report shape. services/api builds the export from this
 * file and QA asserts against it, because "a report exists" is not verifiable — the
 * header row, the column order and the grain are what make an export checkable.
 *
 * Rules that hold for every report:
 *  - Column order below IS the CSV column order. Do not reorder, do not append.
 *  - Headers are the exact `name` strings. snake_case, no display labels in the CSV.
 *  - One row per the stated grain. Totals are separate rows flagged in the notes, or
 *    absent; a total mixed into the data rows makes every consumer re-implement the
 *    filter.
 *  - Every column is populated from stored state. A report never recomputes progress.
 *  - Timestamps are UTC RFC 3339. Dates are the project's local calendar date.
 */
import type { ReportType } from "./index.js";

export type ReportColumnType = "string" | "integer" | "number" | "percent" | "date" | "instant" | "boolean";

export interface ReportColumn {
  /** Exact CSV header. */
  name: string;
  type: ReportColumnType;
  description: string;
}

export interface ReportSpec {
  id: ReportType;
  label: string;
  /** What one row represents. Ambiguity here is the usual cause of a wrong export. */
  grain: string;
  description: string;
  columns: readonly ReportColumn[];
  notes: readonly string[];
}

const percent: ReportColumnType = "percent";

export const REPORTS: readonly ReportSpec[] = [
  {
    id: "schedule-variance",
    label: "Schedule Variance",
    grain: "one row per activity in the project's active schedule snapshot",
    description:
      "Planned versus verified progress per activity. Actual columns read the ActivityActual " +
      "row, never a proposal, so an unreviewed match cannot appear as progress.",
    columns: [
      { name: "wbs", type: "string", description: "Activity WBS, the stable human handle." },
      { name: "activity_id", type: "string", description: "Opaque activity id." },
      { name: "name", type: "string", description: "Activity name as scheduled." },
      { name: "discipline", type: "string", description: "Discipline code." },
      { name: "work_type", type: "string", description: "Work type code." },
      { name: "asset_id", type: "string", description: "Asset the work applies to." },
      { name: "planned_start", type: "date", description: "Planned start, project-local date." },
      { name: "planned_finish", type: "date", description: "Planned finish, project-local date." },
      { name: "planned_percent", type: percent, description: "Percent complete expected at report_date." },
      { name: "actual_percent", type: percent, description: "Verified percent complete at report_date. 0 when nothing is verified." },
      { name: "variance_percent", type: percent, description: "actual_percent - planned_percent. Negative is behind plan." },
      { name: "status", type: "string", description: "not_started | in_progress | complete | delayed." },
      { name: "last_verified_at", type: "instant", description: "When the actual was last verified. Empty when never verified." }
    ],
    notes: [
      "report_date is a required query parameter and is not a column; it is the filter.",
      "An activity with no ActivityActual row still appears, with actual_percent 0. Omitting it would hide exactly the activities nobody has reported."
    ]
  },
  {
    id: "verification-audit",
    label: "Verification Audit",
    grain: "one row per Verification decision, ordered by audit sequence",
    description:
      "Who decided what, when, and with what consequence. This is the human-readable face of " +
      "the audit chain; audit_entry_hash lets a reader confirm a row against the chain.",
    columns: [
      { name: "audit_sequence", type: "integer", description: "Position in the project's audit chain. Contiguous from 1." },
      { name: "decided_at", type: "instant", description: "When the planner decided." },
      { name: "actor_id", type: "string", description: "Planner who decided. Derived from authentication." },
      { name: "actor_role", type: "string", description: "Role held at decision time. Always planner for this report." },
      { name: "decision", type: "string", description: "verified | rejected." },
      { name: "execution_event_id", type: "string", description: "Event the decision was about." },
      { name: "proposal_id", type: "string", description: "Proposal reviewed." },
      { name: "activity_id", type: "string", description: "Activity affected. Empty on a rejection." },
      { name: "wbs", type: "string", description: "WBS of that activity. Empty on a rejection." },
      { name: "previous_progress_percent", type: percent, description: "Progress before the decision. Empty on a rejection." },
      { name: "progress_percent", type: percent, description: "Progress after the decision. Empty on a rejection, by contract." },
      { name: "actual_updated", type: "boolean", description: "False on every rejection. Present so the non-mutation rule is visible in the export itself." },
      { name: "reason", type: "string", description: "Planner's stated reason." },
      { name: "audit_entry_hash", type: "string", description: "entry_hash of the chain entry recording this decision." }
    ],
    notes: [
      "A rejected row must never carry a progress_percent value. If an export does, that is an S1 defect, not a formatting bug.",
      "Ordering by decided_at is not safe: two decisions can share an instant. Order by audit_sequence."
    ]
  },
  {
    id: "match-quality",
    label: "Match Quality",
    grain: "one row per MatchCandidate across all proposals, ordered by proposal then rank",
    description:
      "Every candidate the matcher produced, with its score, band and per-signal contributions. " +
      "This is how a matching decision is reviewed after the fact, and how the deterministic " +
      "fallback is audited for behaving differently from the primary mode.",
    columns: [
      { name: "execution_event_id", type: "string", description: "Event the candidates were produced for." },
      { name: "proposal_id", type: "string", description: "Proposal the candidate belongs to." },
      { name: "created_at", type: "instant", description: "When the proposal was produced." },
      { name: "mode", type: "string", description: "primary | deterministic_fallback. Fallback rows must be countable from this column." },
      { name: "engine_version", type: "string", description: "Engine that scored the candidate." },
      { name: "config_version", type: "string", description: "Config in force, so a weight change is attributable." },
      { name: "rank", type: "integer", description: "1-based position after the tie-breaker." },
      { name: "activity_id", type: "string", description: "Candidate activity." },
      { name: "wbs", type: "string", description: "WBS of the candidate activity." },
      { name: "score", type: "number", description: "Weighted sum, 4 decimal places." },
      { name: "band", type: "string", description: "auto_suggest | review | unmatched." },
      { name: "signal_asset", type: "number", description: "Contribution of the asset signal." },
      { name: "signal_discipline", type: "number", description: "Contribution of the discipline signal." },
      { name: "signal_location", type: "number", description: "Contribution of the location signal." },
      { name: "signal_text", type: "number", description: "Contribution of the text signal." },
      { name: "signal_work_type", type: "number", description: "Contribution of the work-type signal." },
      { name: "signal_temporal", type: "number", description: "Contribution of the temporal signal." },
      { name: "missing_signals", type: "string", description: "Pipe-separated signals that were missing and scored zero." },
      { name: "outcome", type: "string", description: "selected | not_selected | rejected | pending." }
    ],
    notes: [
      "The six signal contributions must sum to score. That identity is asserted by tests; an export where it does not hold means the score was recomputed rather than read.",
      "Missing signals contribute 0 and are NOT redistributed to the others, so the contributions still sum to score."
    ]
  },
  {
    id: "delay-register",
    label: "Delay Register",
    grain: "one row per activity that is late at report_date",
    description:
      "Only activities that are actually late. An activity enters when its planned finish has " +
      "passed with progress below 100, and leaves when it reaches 100.",
    columns: [
      { name: "wbs", type: "string", description: "Activity WBS." },
      { name: "activity_id", type: "string", description: "Opaque activity id." },
      { name: "name", type: "string", description: "Activity name." },
      { name: "discipline", type: "string", description: "Discipline code." },
      { name: "asset_id", type: "string", description: "Asset affected." },
      { name: "planned_finish", type: "date", description: "Planned finish that has passed." },
      { name: "actual_percent", type: "percent", description: "Verified percent complete." },
      { name: "remaining_percent", type: percent, description: "100 - actual_percent." },
      { name: "delay_days", type: "integer", description: "Whole days past planned_finish at report_date." },
      { name: "last_verified_at", type: "instant", description: "When progress was last verified. Empty when never verified." },
      { name: "evidence_event_count", type: "integer", description: "Verified events behind the current progress. A zero here is a strong signal the activity is simply unreported." }
    ],
    notes: [
      "delay_days counts calendar days in the project timezone, not 24-hour periods, so a report is reproducible across a timezone-aware client.",
      "An activity that is behind on percent but not yet past its planned finish is NOT in this register. It is in Schedule Variance instead."
    ]
  },
  {
    id: "discipline-progress",
    label: "Discipline Progress",
    grain: "one row per discipline per report_date",
    description:
      "Discipline-level rollup for the progress curve. Unrelated to a DPR (Daily Progress " +
      "Report), which is per-activity bulk data; the two share an acronym and nothing else.",
    columns: [
      { name: "discipline", type: "string", description: "Discipline code." },
      { name: "activity_count", type: "integer", description: "Activities in the discipline in the active snapshot." },
      { name: "started_count", type: "integer", description: "Activities with verified progress above 0." },
      { name: "complete_count", type: "integer", description: "Activities at 100 percent." },
      { name: "average_planned_percent", type: percent, description: "Unweighted mean planned percent. Stated as a mean, not a sum, so disciplines of different sizes stay comparable." },
      { name: "average_actual_percent", type: "number", description: "Unweighted mean verified percent." },
      { name: "average_variance_percent", type: "number", description: "average_actual_percent - average_planned_percent." },
      { name: "delayed_count", type: "integer", description: "Activities past planned finish below 100, cross-referencing the Delay Register." }
    ],
    notes: [
      "Means are unweighted by design. A quantity-weighted average would need a rate per discipline, which the schedule does not carry, and inventing one would make the number unauditable.",
      "Rounding is half-up to 2 decimal places, applied once at the end and never per-row."
    ]
  }
] as const;

export const REPORT_IDS: readonly ReportType[] = REPORTS.map((report) => report.id);

/** CSV header row for a report, in the exact order the columns are declared. */
export function reportHeader(id: ReportType): string[] {
  return reportColumns(id).map((column) => column.name);
}

function reportColumns(id: ReportType): readonly ReportColumn[] {
  const report = REPORTS.find((candidate) => candidate.id === id);
  if (!report) {
    throw new Error(
      `unknown report type "${id}"; approved types are ${REPORT_IDS.join(", ")}`
    );
  }
  return report.columns;
}

export interface ReportRow {
  [column: string]: string | number | boolean | null;
}
