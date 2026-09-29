"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DisciplineBadge,
  EmptyState,
  MajorPanel,
  PanelHeader,
  ProgressBar,
  StatusBadge,
} from "@/components/ui";
import { overviewFixture, type CurvePoint } from "@/data/overview";

type ActivityId = keyof typeof overviewFixture.activityDetails;
type RecentEvent = (typeof overviewFixture.recentEvents)[number];
type DrawerSelection = { kind: "activity"; id: ActivityId } | { kind: "event"; event: RecentEvent } | null;

function linePath(points: CurvePoint[], key: "baseline" | "current" | "actual", width: number, height: number) {
  const plot = points.filter((point) => point[key] !== null);
  return plot
    .map((point, index) => {
      const sourceIndex = points.indexOf(point);
      const x = 48 + (sourceIndex / (points.length - 1)) * (width - 72);
      const y = 20 + (1 - Number(point[key]) / 100) * (height - 56);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function SCurve() {
  const width = 820;
  const height = 300;
  const points = overviewFixture.curve;
  const dataIndex = 5; // Month: Sep (index 5)
  const [hovered, setHovered] = useState<number | null>(null);
  const dataX = 48 + (dataIndex / (points.length - 1)) * (width - 72);
  const actualY = 20 + (1 - 37.8 / 100) * (height - 56);

  return (
    <div className="curve-wrap" onMouseLeave={() => setHovered(null)}>
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i className="legend-line baseline" />
          Baseline Planned
        </span>
        <span>
          <i className="legend-line current" />
          Current Planned
        </span>
        <span>
          <i className="legend-line actual" />
          Verified Actual
        </span>
      </div>

      <svg
        className="s-curve"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="curve-title curve-desc"
      >
        <title id="curve-title">Project progress S-curve</title>
        <desc id="curve-desc">
          Baseline and current planned progress reach 44.2 percent at the data date. Verified actual
          progress is 37.8 percent, 6.4 points behind plan.
        </desc>

        {/* Horizontal grid lines */}
        {[0, 20, 40, 60, 80, 100].map((value) => {
          const y = 20 + (1 - value / 100) * (height - 56);
          return (
            <g key={value}>
              <line x1="48" x2={width - 24} y1={y} y2={y} className="chart-grid" />
              <text x="38" y={y + 4} className="axis-label" textAnchor="end">
                {value}%
              </text>
            </g>
          );
        })}

        {/* Month labels */}
        {points.map((point, index) => {
          const x = 48 + (index / (points.length - 1)) * (width - 72);
          return (
            <text
              key={point.period}
              x={x}
              y={height - 8}
              className={`axis-label ${index === dataIndex ? "axis-label-active" : ""}`}
              textAnchor="middle"
            >
              {point.period}
            </text>
          );
        })}

        {/* Data date reference line */}
        <line x1={dataX} x2={dataX} y1="20" y2={height - 34} className="data-date-line" />
        <text x={dataX + 8} y="32" className="data-date-label">
          DATA DATE · 26 SEP
        </text>

        {/* Lines */}
        <path d={linePath(points, "baseline", width, height)} className="curve-line curve-baseline" />
        <path d={linePath(points, "current", width, height)} className="curve-line curve-current" />
        <path d={linePath(points, "actual", width, height)} className="curve-line curve-actual" />

        {/* Current verified actual point */}
        <circle cx={dataX} cy={actualY} r="4.5" className="actual-point" />

        {/* Interactive hit areas */}
        {points.map((point, index) => {
          const x = 48 + (index / (points.length - 1)) * (width - 72);
          return (
            <rect
              key={`hit-${point.period}`}
              x={x - 22}
              y="12"
              width="44"
              height={height - 40}
              className="chart-hit"
              tabIndex={0}
              aria-label={`${point.period}: baseline ${point.baseline}%, current ${point.current}%, actual ${
                point.actual !== null ? `${point.actual}%` : "not available"
              }`}
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
            />
          );
        })}
      </svg>

      {/* Hover Tooltip showing all series */}
      {hovered !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${Math.min(88, Math.max(12, 6 + (hovered / (points.length - 1)) * 88))}%`,
          }}
        >
          <strong>{points[hovered].period} 2026</strong>
          <span>
            Baseline Planned <b>{points[hovered].baseline}%</b>
          </span>
          <span>
            Current Planned <b>{points[hovered].current}%</b>
          </span>
          <span>
            Verified Actual{" "}
            <b>{points[hovered].actual === null ? "—" : `${points[hovered].actual}%`}</b>
          </span>
          {points[hovered].actual !== null && (
            <span className="tooltip-variance">
              Variance{" "}
              <b>
                {(points[hovered].actual! - points[hovered].current).toFixed(1)} pts
              </b>
            </span>
          )}
        </div>
      )}

      {/* Variance annotation */}
      <div className="curve-gap">
        <span className="curve-gap-label">Current Variance</span>
        <strong className="curve-gap-val">−6.4 pts</strong>
        <span className="curve-gap-sub">Behind baseline</span>
      </div>
    </div>
  );
}

function ProgressPanel() {
  return (
    <MajorPanel className="progress-panel">
      <PanelHeader
        title="Physical Progress"
        meta={`Data Date · ${overviewFixture.project.dataDate}`}
      />
      <div className="progress-instrument">
        <div className="progress-summary" aria-label="Physical progress summary">
          <div className="progress-primary-metric">
            <strong>44.2%</strong>
            <span>Planned</span>
          </div>
          <div className="progress-primary-metric actual">
            <strong>37.8%</strong>
            <span>Verified actual</span>
          </div>
          <div className="progress-variance-metric">
            <strong>−6.4 pts</strong>
            <span>Behind plan</span>
          </div>
        </div>

        <div className="progress-comparator">
          <div className="comparator-track-wrap">
            <div
              className="comparator-track"
              role="progressbar"
              aria-valuenow={37.8}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Physical progress comparison against baseline"
            >
              <div className="comparator-fill" style={{ width: "37.8%" }} />
              <div
                className="comparator-gap-region"
                style={{ left: "37.8%", width: "6.4%" }}
                aria-hidden="true"
              />
              <div className="comparator-actual-end" style={{ left: "37.8%" }}>
                <span>Actual</span>
              </div>
              <div className="comparator-plan-marker" style={{ left: "44.2%" }}>
                <span className="plan-marker-pin" />
                <span className="plan-marker-label">Plan</span>
              </div>
              <span className="comparator-gap-label" style={{ left: "37.8%" }}>
                6.4 pts gap
              </span>
            </div>
          </div>
        </div>

        <div className="progress-audit-strip">
          <span>Last verified field update · 22 min ago</span>
          <span>Project {overviewFixture.project.id} · Human-verified against the L5/L6 schedule</span>
        </div>
      </div>
    </MajorPanel>
  );
}

function AttentionPanel({
  selected,
  onSelect,
}: {
  selected: ActivityId | null;
  onSelect: (id: ActivityId) => void;
}) {
  return (
    <MajorPanel className="attention-panel">
      <PanelHeader title="Attention Required" badge={<span className="badge neutral">4 open</span>} />
      <div className="attention-list" role="listbox" aria-label="Operational exceptions">
        {overviewFixture.attention.map((item) => (
          <div
            className={`attention-row selectable-row ${selected === item.activityId ? "is-selected" : ""}`}
            key={item.activityId}
            role="option"
            tabIndex={0}
            aria-selected={selected === item.activityId}
            onClick={() => onSelect(item.activityId as ActivityId)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(item.activityId as ActivityId);
              }
            }}
          >
            <span className={`priority-bar ${item.priority.toLowerCase()}`} />
            <div className="attention-main">
              <div className="attention-topline">
                <span className="attention-id">{item.activityId}</span>
                <DisciplineBadge>{item.discipline}</DisciplineBadge>
                <span className="attention-priority-meta">{item.priority}</span>
              </div>
              <div className="attention-name">{item.activity}</div>
              <div className="attention-context">
                <strong>{item.issue}</strong> · {item.context}
              </div>
            </div>
            <div className="attention-side">
              <StatusBadge>{item.state}</StatusBadge>
            </div>
          </div>
        ))}
      </div>
      <div className="panel-link-row">
        <Link href="/verification-center">
          View verification queue <ArrowRight size={13} />
        </Link>
      </div>
    </MajorPanel>
  );
}

function DisciplinePanel({
  selectedDiscipline,
  onSelectDiscipline,
  onClearDiscipline,
}: {
  selectedDiscipline: (typeof overviewFixture.disciplines)[number] | null;
  onSelectDiscipline: (discipline: (typeof overviewFixture.disciplines)[number]) => void;
  onClearDiscipline: () => void;
}) {
  const issues: Record<string, [number, number]> = {
    Civil: [2, 1],
    Structural: [1, 1],
    Piping: [4, 3],
    "Static Equipment": [1, 1],
    "Rotating Equipment": [1, 0],
    Electrical: [3, 2],
    Instrumentation: [3, 3],
    HSE: [0, 0],
  };

  const isSelected = selectedDiscipline !== null;
  const selectedVariance = selectedDiscipline ? selectedDiscipline.actual - selectedDiscipline.plan : 0;

  return (
    <MajorPanel>
      <PanelHeader
        title="Execution by Discipline"
        meta="Actual progress vs planned target"
        action={
          isSelected ? (
            <button
              className="clear-discipline-btn"
              onClick={onClearDiscipline}
              aria-label="Clear discipline selection"
            >
              Clear selection <X size={12} />
            </button>
          ) : undefined
        }
      />
      <div className={`discipline-layout ${isSelected ? "has-selection" : "full-width"}`}>
        <div className="discipline-list" role="listbox" aria-label="Disciplines">
          <div className="discipline-header-row" aria-hidden="true">
            <span className="col-discipline">Discipline</span>
            <span className="col-plot">Progress vs Planned</span>
            <span className="col-actual">Actual</span>
            <span className="col-plan">Planned</span>
            <span className="col-variance">Variance</span>
          </div>

          {overviewFixture.disciplines.map((item) => {
            const variance = item.actual - item.plan;
            // Strict project controls variance thresholds:
            // 0 to -3 pts: neutral
            // -4 to -6 pts: amber/subtle warning
            // <= -7 pts: stronger warning/critical
            const varianceTone =
              variance <= -7 ? "critical" : variance <= -4 ? "warning" : "neutral";
            const rowSelected = selectedDiscipline?.name === item.name;

            return (
              <div
                className={`discipline-row selectable-row ${rowSelected ? "is-selected" : ""}`}
                key={item.name}
                role="option"
                tabIndex={0}
                aria-selected={rowSelected}
                onClick={() => {
                  if (rowSelected) {
                    onClearDiscipline();
                  } else {
                    onSelectDiscipline(item);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (rowSelected) {
                      onClearDiscipline();
                    } else {
                      onSelectDiscipline(item);
                    }
                  }
                }}
              >
                <div className="discipline-identity-cell">
                  <DisciplineBadge>{item.name}</DisciplineBadge>
                </div>
                <div className="discipline-plot-cell">
                  <ProgressBar
                    value={item.actual}
                    planMarker={item.plan}
                    tone="default"
                    size="sm"
                    showValue={false}
                    ariaLabel={`${item.name}: actual ${item.actual}%, plan ${item.plan}%`}
                  />
                </div>
                <span className="discipline-actual">{item.actual}%</span>
                <span className="discipline-plan">{item.plan}%</span>
                <span className={`variance ${varianceTone}`}>
                  {variance < 0 ? `−${Math.abs(variance)} pts` : variance > 0 ? `+${variance} pts` : `0 pts`}
                </span>
              </div>
            );
          })}
        </div>

        {selectedDiscipline && (
          <div className="discipline-detail">
            <div className="discipline-detail-head">
              <div>
                <p className="panel-header-eyebrow">Selected discipline</p>
                <h4>{selectedDiscipline.name}</h4>
              </div>
              <button
                className="icon-button close-detail-button"
                onClick={onClearDiscipline}
                aria-label="Close discipline detail"
              >
                <X size={14} />
              </button>
            </div>
            <div className="discipline-detail-body">
              <div className="detail-stat-row">
                <span>Domain</span>
                <DisciplineBadge>{selectedDiscipline.name}</DisciplineBadge>
              </div>
              <div className="detail-stat-row">
                <span>Planned</span>
                <strong>{selectedDiscipline.plan}%</strong>
              </div>
              <div className="detail-stat-row">
                <span>Verified Actual</span>
                <strong className="blue-text">{selectedDiscipline.actual}%</strong>
              </div>
              <div className="detail-stat-row">
                <span>Schedule Variance</span>
                <strong
                  className={
                    selectedVariance <= -7 ? "red-text" : selectedVariance <= -4 ? "amber-text" : ""
                  }
                >
                  {selectedVariance < 0
                    ? `−${Math.abs(selectedVariance)} pts`
                    : selectedVariance > 0
                    ? `+${selectedVariance} pts`
                    : `0 pts`}
                </strong>
              </div>
              <div className="detail-stat-row">
                <span>Open issues</span>
                <strong>{issues[selectedDiscipline.name][0]}</strong>
              </div>
              <div className="detail-stat-row">
                <span>Awaiting review</span>
                <strong>{issues[selectedDiscipline.name][1]}</strong>
              </div>
            </div>
            <div className="discipline-detail-action">
              <Link className="detail-action-link" href="/live-execution">
                View execution events <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </MajorPanel>
  );
}

function MatchingPanel() {
  const data = overviewFixture.matching;
  return (
    <section className="intelligence-section">
      <div className="integrated-section-head">
        <div>
          <p className="panel-header-eyebrow">Intelligence</p>
          <h4>Matching Health</h4>
        </div>
        <Link href="/match-review" className="quiet-open-link">
          Open <ArrowRight size={12} />
        </Link>
      </div>

      <div className="intelligence-primary-metric">
        <div className="primary-num-wrap">
          <strong className="primary-big-number">{data.total}</strong>
          <span className="primary-num-label">Execution events ingested</span>
        </div>
      </div>

      <div className="compact-stats">
        <div>
          <span className="stat-bullet bullet-blue" />
          <div className="stat-inner">
            <span>High confidence</span>
            <strong className="blue-text">{data.high}</strong>
            <small>76%</small>
          </div>
        </div>
        <div>
          <span className="stat-bullet bullet-amber" />
          <div className="stat-inner">
            <span>Review required</span>
            <strong className="amber-text">{data.review}</strong>
            <small>16%</small>
          </div>
        </div>
        <div>
          <span className="stat-bullet bullet-neutral" />
          <div className="stat-inner">
            <span>Unmatched</span>
            <strong className="neutral-text">{data.unmatched}</strong>
            <small>8%</small>
          </div>
        </div>
      </div>

      <div className="distribution" aria-label="Matching confidence distribution">
        <span className="dist-high" style={{ width: `${(data.high / data.total) * 100}%` }} />
        <span className="dist-review" style={{ width: `${(data.review / data.total) * 100}%` }} />
        <span
          className="dist-unmatched"
          style={{ width: `${(data.unmatched / data.total) * 100}%` }}
        />
      </div>
      <div className="distribution-labels">
        <span>High confidence (≥90%)</span>
        <span>Human review (70–89%)</span>
        <span>Unmatched (&lt;70%)</span>
      </div>
    </section>
  );
}

function VerificationPanel() {
  const data = overviewFixture.verification;
  const max = Math.max(...data.ages.map((age) => age.value));
  return (
    <section className="intelligence-section verification-section">
      <div className="integrated-section-head">
        <div>
          <p className="panel-header-eyebrow">Human control</p>
          <h4>Verification Backlog</h4>
        </div>
        <Link href="/verification-center" className="quiet-open-link">
          Open <ArrowRight size={12} />
        </Link>
      </div>

      <div className="backlog-metrics-grid">
        <div className="backlog-metric-card">
          <strong className="backlog-metric-val">{data.awaiting}</strong>
          <span className="backlog-metric-lbl">Awaiting verification</span>
        </div>
        <div className="backlog-metric-card">
          <strong className="backlog-metric-val">{data.priority}</strong>
          <span className="backlog-metric-lbl">High priority</span>
        </div>
        <div className="backlog-metric-card">
          <strong className="backlog-metric-val">{data.oldest}</strong>
          <span className="backlog-metric-lbl">Oldest item</span>
        </div>
      </div>

      <div className="age-list">
        <div className="age-list-header">Unresolved Queue Age Distribution</div>
        {data.ages.map((age) => (
          <div className="age-row" key={age.label}>
            <span>{age.label}</span>
            <div>
              <i style={{ width: `${(age.value / max) * 100}%` }} />
            </div>
            <strong>{age.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntelligenceWorkspace() {
  return (
    <MajorPanel>
      <PanelHeader title="Intelligence & Verification" meta="Current routing health" />
      <MatchingPanel />
      <VerificationPanel />
    </MajorPanel>
  );
}

function CriticalWatch({
  selected,
  onSelect,
}: {
  selected: ActivityId | null;
  onSelect: (id: ActivityId) => void;
}) {
  return (
    <MajorPanel className="table-workspace">
      <PanelHeader title="Critical Execution Watch" meta="Critical and near-critical activities" />
      <div className="table-scroll">
        <table className="data-table selectable-table">
          <thead>
            <tr>
              <th className="col-watch-activity">Activity</th>
              <th className="col-watch-discipline">Discipline</th>
              <th className="col-watch-float numeric">Float</th>
              <th className="col-watch-progress">Verified Progress</th>
              <th className="col-watch-issue">Issue</th>
              <th className="col-watch-impact">Impact</th>
            </tr>
          </thead>
          <tbody>
            {overviewFixture.criticalWatch.map((item) => (
              <tr
                key={item.id}
                className={selected === item.id ? "selected" : undefined}
                tabIndex={0}
                aria-selected={selected === item.id}
                onClick={() => onSelect(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item.id);
                  }
                }}
              >
                <td>
                  <div className="activity-cell">
                    <span className="activity-name">{item.activity}</span>
                    <span className="activity-id">{item.id}</span>
                  </div>
                </td>
                <td>
                  <DisciplineBadge>{item.discipline}</DisciplineBadge>
                </td>
                <td className="numeric">
                  <span className="float-metric">{item.float}</span>
                </td>
                <td className="progress-cell">
                  <ProgressBar
                    value={item.progress}
                    tone={item.progress === 100 ? "verified" : "default"}
                    size="md"
                    ariaLabel={`${item.activity} progress: ${item.progress}%`}
                  />
                </td>
                <td>
                  <div className="issue-cell">
                    <StatusBadge>{item.issue === "Blocked" ? "Blocked" : "Review"}</StatusBadge>
                    <span className="issue-inline-text">{item.issue}</span>
                  </div>
                </td>
                <td className="impact-text">{item.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MajorPanel>
  );
}

function RecentEvents({
  selected,
  onSelect,
}: {
  selected: RecentEvent | null;
  onSelect: (event: RecentEvent) => void;
}) {
  return (
    <MajorPanel>
      <PanelHeader title="Recent Verified Events" meta="Today · 26 Sep" />
      <div className="timeline" role="listbox" aria-label="Recent verified events">
        {overviewFixture.recentEvents.map((event, index) => {
          const isSelected = selected === event;
          return (
            <div
              className={`timeline-row selectable-row ${isSelected ? "is-selected" : ""}`}
              key={`${event.time}-${event.activityId}`}
              role="option"
              tabIndex={0}
              aria-selected={isSelected}
              onClick={() => onSelect(event)}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                  keyEvent.preventDefault();
                  onSelect(event);
                }
              }}
            >
              <time>{event.time}</time>
              <span className="timeline-line">
                <i className={isSelected ? "node-selected" : ""} />
                {index < overviewFixture.recentEvents.length - 1 && <b />}
              </span>
              <div className="timeline-content">
                <strong className="timeline-title">{event.text}</strong>
                <span className="timeline-meta">
                  <code>{event.activityId}</code> · Source: {event.source} · {event.reporter}
                </span>
              </div>
              <span className="inspect-label">
                Inspect <ChevronRight size={12} />
              </span>
            </div>
          );
        })}
      </div>
    </MajorPanel>
  );
}

function DataIntegrity() {
  const data = overviewFixture.integrity;
  return (
    <MajorPanel>
      <PanelHeader
        title="Data Integrity"
        badge={
          <span className="valid-status-badge">
            <CheckCircle2 size={13} />
            Valid
          </span>
        }
      />
      <div className="integrity-list quiet-integrity">
        <div>
          <span>Audit chain</span>
          <strong>{data.auditChain}</strong>
        </div>
        <div>
          <span>Verified actuals</span>
          <strong>{data.verifiedActuals}</strong>
        </div>
        <div>
          <span>Unlinked events</span>
          <strong>{data.unlinkedEvents}</strong>
        </div>
        <div>
          <span>Last ingestion</span>
          <strong>{data.lastIngestion}</strong>
        </div>
      </div>
      <div className="panel-link-row">
        <Link href="/audit-trail">
          View audit trail <ArrowRight size={13} />
        </Link>
      </div>
    </MajorPanel>
  );
}

function ContextDrawer({
  selection,
  onClose,
}: {
  selection: Exclude<DrawerSelection, null>;
  onClose: () => void;
}) {
  const activityId =
    selection.kind === "activity" ? selection.id : (selection.event.activityId as ActivityId);
  const activity = overviewFixture.activityDetails[activityId];
  const event = selection.kind === "event" ? selection.event : null;

  return (
    <div
      className="context-drawer-layer"
      role="presentation"
      onMouseDown={(mouseEvent) => mouseEvent.currentTarget === mouseEvent.target && onClose()}
    >
      <aside
        className="context-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="context-drawer-title"
      >
        <header className="context-drawer-head">
          <div>
            <p className="panel-header-eyebrow">
              {event ? "Verified event detail" : "Activity detail"}
            </p>
            <h2 id="context-drawer-title">{event ? event.text : activity.activity}</h2>
            <div className="drawer-subhead">
              <span className="drawer-id">{activityId}</span>
              <DisciplineBadge>{activity.discipline}</DisciplineBadge>
            </div>
          </div>
          <button
            className="icon-button"
            aria-label="Close detail drawer"
            onClick={onClose}
            autoFocus
          >
            <X size={17} />
          </button>
        </header>

        <div className="context-drawer-scroll">
          <section className="drawer-summary">
            <div>
              <span>Verified Progress</span>
              <strong>{activity.verified}%</strong>
            </div>
            <div>
              <span>Planned to Date</span>
              <strong>{activity.plan}%</strong>
            </div>
            <div>
              <span>Schedule Variance</span>
              <strong className={activity.actual - activity.plan <= -6 ? "red-text" : ""}>
                {activity.actual - activity.plan < 0
                  ? `−${Math.abs(activity.actual - activity.plan)} pts`
                  : `${activity.actual - activity.plan} pts`}
              </strong>
            </div>
            <div>
              <span>Float</span>
              <strong>{activity.float}</strong>
            </div>
          </section>

          {event && (
            <section className="drawer-section">
              <h3>Event & evidence</h3>
              <dl>
                <div>
                  <dt>Verified value</dt>
                  <dd>{event.value}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{event.evidence}</dd>
                </div>
                <div>
                  <dt>Reporter / source</dt>
                  <dd>{event.reporter}</dd>
                </div>
                <div>
                  <dt>Audit</dt>
                  <dd>{event.audit}</dd>
                </div>
              </dl>
            </section>
          )}

          <section className="drawer-section">
            <h3>Operational context</h3>
            <dl>
              <div>
                <dt>Activity</dt>
                <dd>{activity.activity}</dd>
              </div>
              <div>
                <dt>WBS</dt>
                <dd>{activity.wbs}</dd>
              </div>
              <div>
                <dt>Discipline</dt>
                <dd>
                  <DisciplineBadge>{activity.discipline}</DisciplineBadge>
                </dd>
              </div>
              <div>
                <dt>Issue</dt>
                <dd>{activity.issue}</dd>
              </div>
              <div>
                <dt>Impact</dt>
                <dd>{activity.impact}</dd>
              </div>
            </dl>
          </section>

          <section className="drawer-section">
            <h3>Latest field evidence</h3>
            <p>{event?.evidence ?? activity.evidence}</p>
          </section>

          <section className="drawer-section">
            <h3>Verification & audit</h3>
            <dl>
              <div>
                <dt>State</dt>
                <dd>{activity.state}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{event?.source ?? activity.source}</dd>
              </div>
              <div>
                <dt>Timestamp</dt>
                <dd>{event ? `26 Sep 2026 · ${event.time}` : activity.timestamp}</dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className="context-drawer-footer">
          <Link className="button primary" href={activity.route}>
            {activity.route === "/match-review"
              ? "Open in Match Review"
              : "Open in Verification Center"}
            <ArrowRight size={14} />
          </Link>
        </footer>
      </aside>
    </div>
  );
}

export function Overview() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selection states
  const [drawerSelection, setDrawerSelection] = useState<DrawerSelection>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<
    (typeof overviewFixture.disciplines)[number] | null
  >(null);

  // URL activity parameter reconciliation
  const activityParam = searchParams.get("activity");
  const urlSelection: DrawerSelection =
    activityParam && activityParam in overviewFixture.activityDetails
      ? { kind: "activity", id: activityParam as ActivityId }
      : null;

  const activeDrawerSelection = drawerSelection ?? urlSelection;
  const selectedActivityId =
    activeDrawerSelection?.kind === "activity" ? activeDrawerSelection.id : null;
  const selectedEvent =
    activeDrawerSelection?.kind === "event" ? activeDrawerSelection.event : null;

  // Escape key handler: closes drawer first; if no drawer, clears discipline selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activeDrawerSelection) {
          setDrawerSelection(null);
          if (searchParams.has("activity")) {
            router.replace("/");
          }
        } else if (selectedDiscipline) {
          setSelectedDiscipline(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDrawerSelection, selectedDiscipline, searchParams, router]);

  function closeDrawer() {
    setDrawerSelection(null);
    if (searchParams.has("activity")) {
      router.replace("/");
    }
  }

  if (!overviewFixture.progress.length) {
    return <EmptyState />;
  }

  return (
    <>
      <ProgressPanel />

      <div className="overview-primary-grid">
        <MajorPanel>
          <PanelHeader title="Progress S-Curve" meta="Cumulative Progress (%)" />
          <div className="major-panel-body">
            <SCurve />
          </div>
        </MajorPanel>

        <AttentionPanel
          selected={selectedActivityId}
          onSelect={(id) => setDrawerSelection({ kind: "activity", id })}
        />
      </div>

      <div className="overview-middle-grid">
        <DisciplinePanel
          selectedDiscipline={selectedDiscipline}
          onSelectDiscipline={(item) => setSelectedDiscipline(item)}
          onClearDiscipline={() => setSelectedDiscipline(null)}
        />
        <IntelligenceWorkspace />
      </div>

      <CriticalWatch
        selected={selectedActivityId}
        onSelect={(id) => setDrawerSelection({ kind: "activity", id })}
      />

      <div className="overview-bottom-grid">
        <RecentEvents
          selected={selectedEvent}
          onSelect={(event) => setDrawerSelection({ kind: "event", event })}
        />
        <DataIntegrity />
      </div>

      {activeDrawerSelection && (
        <ContextDrawer selection={activeDrawerSelection} onClose={closeDrawer} />
      )}
    </>
  );
}
