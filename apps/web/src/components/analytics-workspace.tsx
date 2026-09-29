"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Download,
  Filter,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  Activity,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import {
  analyticsFixture,
  type DrilldownActivity,
  type SCurveDataPoint,
  type DisciplinePerformance,
  type DelayCauseItem,
  type DurationScatterPoint,
} from "@/data/analytics";

// ============================================================================
// 1. TOP-LEVEL ANALYTICS WORKSPACE COMPONENT
// ============================================================================

export function AnalyticsWorkspace() {
  // Filter States
  const [dateRange, setDateRange] = useState<string>("Last 30 Days");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("All");
  const [selectedWorkfront, setSelectedWorkfront] = useState<string>("All");
  const [selectedContractor, setSelectedContractor] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("All Levels");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  // Interactive Drilldown Drawer State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTitle, setDrawerTitle] = useState<string>("");
  const [drawerSubtitle, setDrawerSubtitle] = useState<string>("");
  const [drawerActivities, setDrawerActivities] = useState<DrilldownActivity[]>([]);

  // Toast State for Export Report
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Loading & Error Simulation States (for robust QA)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return analyticsFixture.activities.filter((act) => {
      if (selectedDiscipline !== "All" && act.discipline !== selectedDiscipline) return false;
      if (selectedWorkfront !== "All" && act.workfront !== selectedWorkfront) return false;
      if (selectedContractor !== "All" && act.contractor !== selectedContractor) return false;
      if (selectedLevel !== "All Levels" && act.scheduleLevel !== selectedLevel) return false;
      if (selectedStatus !== "All") {
        if (selectedStatus === "Verified Only" && act.status !== "Complete") return false;
        if (selectedStatus === "Pending Review" && act.status !== "Review Required") return false;
        if (selectedStatus === "At Risk" && act.status !== "At Risk" && act.status !== "Delayed") return false;
      }
      return true;
    });
  }, [selectedDiscipline, selectedWorkfront, selectedContractor, selectedLevel, selectedStatus]);

  // Dynamic Discipline Performance derived from filter
  const disciplineData = useMemo(() => {
    if (selectedDiscipline === "All") {
      return analyticsFixture.disciplines;
    }
    return analyticsFixture.disciplines.filter((d) => d.discipline === selectedDiscipline);
  }, [selectedDiscipline]);

  // Reset Filters
  const handleResetFilters = () => {
    setDateRange("Last 30 Days");
    setSelectedDiscipline("All");
    setSelectedWorkfront("All");
    setSelectedContractor("All");
    setSelectedLevel("All Levels");
    setSelectedStatus("All");
    showToast("Filters reset to default.");
  };

  // Open Drilldown Drawer with Context
  const openDrawer = (
    title: string,
    subtitle: string,
    activities: DrilldownActivity[]
  ) => {
    setDrawerTitle(title);
    setDrawerSubtitle(subtitle);
    setDrawerActivities(activities);
    setDrawerOpen(true);
  };

  // Drilldown Triggers
  const handleDisciplineClick = (discName: string) => {
    const matched = analyticsFixture.activities.filter((a) => a.discipline === discName);
    openDrawer(
      `${discName} Activities`,
      `Showing ${matched.length} schedule activities tracked under ${discName}`,
      matched
    );
  };

  const handleDelayCauseClick = (cause: string) => {
    const matched = analyticsFixture.activities.filter((a) => a.delayCause === cause);
    openDrawer(
      `${cause} Delays`,
      `Showing ${matched.length} activities delayed due to ${cause.toLowerCase()} constraints`,
      matched
    );
  };

  const handleAtRiskClick = () => {
    const matched = analyticsFixture.activities.filter(
      (a) => a.status === "At Risk" || a.status === "Delayed"
    );
    openDrawer(
      "Critical & At-Risk Activities",
      `Showing ${matched.length} activities with negative progress variance or critical float impact`,
      matched
    );
  };

  const handleConfidenceClick = (tier: "High" | "Review" | "Unmatched") => {
    let matched: DrilldownActivity[] = [];
    if (tier === "High") {
      matched = analyticsFixture.activities.filter((a) => (a.confidence ?? 0) >= 90);
    } else if (tier === "Review") {
      matched = analyticsFixture.activities.filter(
        (a) => (a.confidence ?? 0) >= 70 && (a.confidence ?? 0) < 90
      );
    } else {
      matched = analyticsFixture.activities.filter((a) => (a.confidence ?? 0) < 70);
    }
    openDrawer(
      `${tier} Confidence Proposals`,
      `Showing ${matched.length} activities matching ${tier.toLowerCase()} pipeline criteria`,
      matched
    );
  };

  const handleInsightClick = (insightId: string) => {
    const insight = analyticsFixture.insights.find((i) => i.id === insightId);
    if (!insight) return;
    let matched = analyticsFixture.activities;
    if (insight.filterTarget.discipline) {
      matched = matched.filter((a) => a.discipline === insight.filterTarget.discipline);
    }
    if (insight.filterTarget.delayCause) {
      matched = matched.filter((a) => a.delayCause === insight.filterTarget.delayCause);
    }
    if (insight.filterTarget.status) {
      matched = matched.filter((a) => a.status === insight.filterTarget.status);
    }
    if (insight.filterTarget.confidenceTier === "Unmatched") {
      matched = matched.filter((a) => (a.confidence ?? 0) < 70);
    }
    openDrawer(
      insight.title,
      insight.description,
      matched
    );
  };

  const handleScatterPointClick = (point: DurationScatterPoint) => {
    const matched = analyticsFixture.activities.filter((a) => a.id === point.id);
    openDrawer(
      `${point.id} — ${point.name}`,
      `Planned: ${point.plannedDuration}d · Actual / Forecast: ${point.actualDuration}d · Variance: +${point.overrun}d`,
      matched.length > 0 ? matched : [
        {
          id: point.id,
          name: point.name,
          discipline: point.discipline,
          workfront: point.workfront,
          contractor: point.contractor,
          scheduleLevel: "L5",
          plannedProgress: 60,
          verifiedActual: 45,
          variance: -15,
          status: point.status === "On Track" ? "In Progress" : point.status,
          confidence: 90,
          plannedDuration: point.plannedDuration,
          actualDuration: point.actualDuration,
          baselineFinish: "28 Sep 2026",
        },
      ]
    );
  };

  // Export Report action
  const handleExportReport = () => {
    showToast("Generating ExecLink Project Controls PDF / Excel Export (PRJ-DEMO-001)...");
  };

  if (hasError) {
    return (
      <div className="analytics-error-state">
        <AlertTriangle size={32} className="text-rose-500 mb-2" />
        <h3>Analytics data could not be loaded.</h3>
        <p className="text-secondary text-sm mb-4">
          Failed to load schedule actuals and verification telemetry for PRJ-DEMO-001.
        </p>
        <button
          className="button primary sm"
          onClick={() => {
            setHasError(false);
            setIsLoading(true);
            setTimeout(() => setIsLoading(false), 400);
          }}
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="analytics-toast" role="status" aria-live="polite">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <header className="analytics-header">
        <div className="analytics-header-titles">
          <span className="analytics-eyebrow">INTELLIGENCE · 07</span>
          <h1 className="analytics-title">Analytics</h1>
          <p className="analytics-subtitle">
            Analyze schedule performance, execution variance and data confidence.
          </p>
        </div>

        <div className="analytics-header-actions">
          <button
            className="button secondary sm"
            onClick={handleExportReport}
            id="export-report-btn"
          >
            <Download size={13} /> Export Report
          </button>

          <div className="analytics-date-picker-wrap">
            <select
              className="analytics-select-pill"
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                showToast(`Date range adjusted to: ${e.target.value}`);
              }}
              aria-label="Select Date Range"
            >
              <option value="Last 30 Days">Date Range: Last 30 Days</option>
              <option value="Last 14 Days">Date Range: Last 14 Days</option>
              <option value="Last 60 Days">Date Range: Last 60 Days</option>
              <option value="Quarter to Date">Date Range: Quarter to Date</option>
            </select>
          </div>
        </div>
      </header>

      {/* 2. COMPACT FILTER ROW */}
      <section className="analytics-filter-bar" aria-label="Filters">
        <div className="analytics-filter-icon-label">
          <Filter size={13} className="text-muted" />
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Filters</span>
        </div>

        <div className="analytics-filter-group">
          {/* Discipline */}
          <select
            className="analytics-filter-select"
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            aria-label="Filter Discipline"
          >
            <option value="All">All Disciplines</option>
            <option value="Civil">Civil</option>
            <option value="Structural">Structural</option>
            <option value="Piping">Piping</option>
            <option value="Static Equipment">Static Equipment</option>
            <option value="Rotating Equipment">Rotating Equipment</option>
            <option value="Electrical">Electrical</option>
            <option value="Instrumentation">Instrumentation</option>
            <option value="HSE">HSE</option>
          </select>

          {/* Workfront */}
          <select
            className="analytics-filter-select"
            value={selectedWorkfront}
            onChange={(e) => setSelectedWorkfront(e.target.value)}
            aria-label="Filter Workfront"
          >
            <option value="All">All Workfronts</option>
            <option value="Area A">Area A</option>
            <option value="Area B">Area B</option>
            <option value="Area C">Area C</option>
          </select>

          {/* Contractor */}
          <select
            className="analytics-filter-select"
            value={selectedContractor}
            onChange={(e) => setSelectedContractor(e.target.value)}
            aria-label="Filter Contractor"
          >
            <option value="All">All Contractors</option>
            <option value="Apex Constructors">Apex Constructors</option>
            <option value="Delta Piping Ltd">Delta Piping Ltd</option>
            <option value="Summit Civil">Summit Civil</option>
          </select>

          {/* Schedule Level */}
          <select
            className="analytics-filter-select"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            aria-label="Filter Schedule Level"
          >
            <option value="All Levels">All Levels (L3–L6)</option>
            <option value="L3">L3 Summary</option>
            <option value="L4">L4 Control</option>
            <option value="L5">L5 Detailed</option>
            <option value="L6">L6 Steps</option>
          </select>

          {/* Verification Status */}
          <select
            className="analytics-filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter Verification Status"
          >
            <option value="All">All Statuses</option>
            <option value="Verified Only">Verified Only</option>
            <option value="Pending Review">Pending Review</option>
            <option value="At Risk">At Risk / Delayed</option>
          </select>

          {(selectedDiscipline !== "All" ||
            selectedWorkfront !== "All" ||
            selectedContractor !== "All" ||
            selectedLevel !== "All Levels" ||
            selectedStatus !== "All" ||
            dateRange !== "Last 30 Days") && (
            <button
              className="button tertiary sm text-xs analytics-reset-btn"
              onClick={handleResetFilters}
            >
              <RefreshCw size={11} /> Reset
            </button>
          )}
        </div>
      </section>

      {/* 3. TOP PROJECT-CONTROL SUMMARY STRIP */}
      <section className="analytics-summary-strip" aria-label="Project Controls Summary">
        <div className="analytics-summary-cell">
          <span className="analytics-summary-label">PLANNED PROGRESS</span>
          <span className="analytics-summary-val text-blue-400">
            {analyticsFixture.summary.plannedProgress}%
          </span>
          <span className="analytics-summary-note">Baseline schedule through data date</span>
        </div>

        <div className="analytics-summary-cell-divider" />

        <div className="analytics-summary-cell">
          <span className="analytics-summary-label">VERIFIED ACTUAL</span>
          <span className="analytics-summary-val text-emerald-400">
            {analyticsFixture.summary.verifiedActual}%
          </span>
          <span className="analytics-summary-note">Human-verified physical progress</span>
        </div>

        <div className="analytics-summary-cell-divider" />

        <div className="analytics-summary-cell">
          <span className="analytics-summary-label">SCHEDULE VARIANCE</span>
          <span className="analytics-summary-val text-rose-400">
            {analyticsFixture.summary.scheduleVariance.toFixed(1)}%
          </span>
          <span className="analytics-summary-note">7.0 percentage points behind plan</span>
        </div>

        <div className="analytics-summary-cell-divider" />

        <div
          className="analytics-summary-cell is-interactive"
          onClick={handleAtRiskClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleAtRiskClick();
            }
          }}
          title="Click to view at-risk activities"
        >
          <span className="analytics-summary-label">ACTIVITIES AT RISK</span>
          <div className="flex items-center gap-1.5">
            <span className="analytics-summary-val text-amber-400">
              {analyticsFixture.summary.activitiesAtRisk}
            </span>
            <ChevronRight size={14} className="text-muted" />
          </div>
          <span className="analytics-summary-note">Critical path / negative float</span>
        </div>

        <div className="analytics-summary-cell-divider" />

        <div
          className="analytics-summary-cell is-interactive"
          onClick={() => handleConfidenceClick("High")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleConfidenceClick("High");
            }
          }}
          title="Click to view high-confidence proposals"
        >
          <span className="analytics-summary-label">DATA CONFIDENCE</span>
          <div className="flex items-center gap-1.5">
            <span className="analytics-summary-val text-cyan-400">
              {analyticsFixture.summary.dataConfidence}%
            </span>
            <ChevronRight size={14} className="text-muted" />
          </div>
          <span className="analytics-summary-note">Data through 26 Sep 2026</span>
        </div>
      </section>

      {/* EMPTY STATE (If filters yield no activities) */}
      {filteredActivities.length === 0 ? (
        <div className="analytics-empty-state">
          <Filter size={24} className="text-muted mb-2" />
          <h3>No analytics available for the selected filters.</h3>
          <p className="text-secondary text-sm mb-4">
            Try resetting your filters to view project-wide schedule telemetry.
          </p>
          <button className="button secondary sm" onClick={handleResetFilters}>
            <RefreshCw size={13} /> Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* 4. PRIMARY ANALYTIC ROW: S-CURVE (62%) + VARIANCE TREND (38%) */}
          <section className="analytics-grid-two-unequal">
            {/* 4A. PROGRESS S-CURVE */}
            <div className="analytics-card analytics-scurve-card">
              <div className="analytics-card-head">
                <div>
                  <h3 className="analytics-card-title">Progress S-Curve</h3>
                  <p className="analytics-card-subtitle">
                    Cumulative planned and verified execution progress.
                  </p>
                </div>
                <div className="analytics-scurve-legend">
                  <span className="legend-item">
                    <span className="legend-line baseline" />
                    <span>Baseline Plan</span>
                  </span>
                  <span className="legend-item">
                    <span className="legend-line current" />
                    <span>Current Plan (68%)</span>
                  </span>
                  <span className="legend-item">
                    <span className="legend-line actual" />
                    <span>Verified Actual (61%)</span>
                  </span>
                </div>
              </div>

              {/* S-CURVE PERIOD CONTEXT ROW (Document layout outside plot) */}
              <div className="analytics-scurve-context-row">
                <div className="context-item">
                  <span className="context-dot is-actual" />
                  <span>Reported actuals through 26 Sep</span>
                </div>
                <div className="context-item">
                  <span className="context-dot is-future" />
                  <span>Future scheduled plan after data date</span>
                </div>
              </div>

              {/* S-CURVE SVG VISUALIZATION */}
              <SCurveChart data={analyticsFixture.scurve} />
            </div>

            {/* 4B. VARIANCE TREND */}
            <div className="analytics-card analytics-variance-card">
              <div className="analytics-card-head">
                <div>
                  <h3 className="analytics-card-title">Schedule Variance</h3>
                  <p className="analytics-card-subtitle">
                    Actual minus current planned progress.
                  </p>
                </div>
                <div className="analytics-variance-stats">
                  <div className="stat-col">
                    <span className="stat-label">CURRENT</span>
                    <span className="stat-val text-rose-400 font-bold">-7.0%</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-label">30-DAY CHANGE</span>
                    <span className="stat-val text-amber-400 font-semibold">-5.8 pts</span>
                  </div>
                </div>
              </div>

              {/* VARIANCE TREND SVG VISUALIZATION */}
              <VarianceTrendChart data={analyticsFixture.varianceTrend} />
            </div>
          </section>

          {/* 5. EXECUTION BY DISCIPLINE (FULL WIDTH SECTION) */}
          <section className="analytics-card analytics-discipline-section">
            <div className="analytics-card-head">
              <div>
                <h3 className="analytics-card-title">Execution by Discipline</h3>
                <p className="analytics-card-subtitle">
                  Where is the project losing progress? (Click any row to drill into activities)
                </p>
              </div>
              <span className="analytics-table-hint text-[11px] text-muted">
                Showing {disciplineData.length} disciplines
              </span>
            </div>

            {/* DISCIPLINE TABLE WITH COMPARATIVE BARS */}
            <div className="analytics-table-wrap">
              <table className="analytics-discipline-table">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>DISCIPLINE</th>
                    <th style={{ width: "38%" }}>PROGRESS COMPARISON</th>
                    <th style={{ width: "10%", textAlign: "right" }}>PLANNED</th>
                    <th style={{ width: "10%", textAlign: "right" }}>VERIFIED</th>
                    <th style={{ width: "10%", textAlign: "right" }}>VARIANCE</th>
                    <th style={{ width: "10%", textAlign: "right" }}>AT RISK</th>
                  </tr>
                </thead>
                <tbody>
                  {disciplineData.map((d) => (
                    <tr
                      key={d.discipline}
                      className="analytics-discipline-row"
                      onClick={() => handleDisciplineClick(d.discipline)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleDisciplineClick(d.discipline);
                        }
                      }}
                      title={`Click to inspect ${d.discipline} activities`}
                    >
                      <td className="font-semibold text-primary">
                        <div className="flex items-center gap-2">
                          <span>{d.discipline}</span>
                          <span className="text-[10px] text-muted font-normal font-mono">
                            ({d.activitiesCount} acts)
                          </span>
                        </div>
                      </td>

                      {/* DUAL COMPARATIVE PROGRESS BARS */}
                      <td>
                        <div className="analytics-dual-bar-container">
                          <div className="analytics-dual-bar-row">
                            <span className="dual-bar-label text-blue-400">Plan</span>
                            <div className="dual-bar-track">
                              <div
                                className="dual-bar-fill is-plan"
                                style={{ width: `${d.planned}%` }}
                              />
                            </div>
                            <span className="dual-bar-pct font-mono">{d.planned}%</span>
                          </div>
                          <div className="analytics-dual-bar-row">
                            <span className="dual-bar-label text-emerald-400">Act</span>
                            <div className="dual-bar-track">
                              <div
                                className="dual-bar-fill is-actual"
                                style={{ width: `${d.verified}%` }}
                              />
                            </div>
                            <span className="dual-bar-pct font-mono">{d.verified}%</span>
                          </div>
                        </div>
                      </td>

                      <td className="text-right font-mono text-secondary font-medium">
                        {d.planned}%
                      </td>
                      <td className="text-right font-mono text-emerald-400 font-bold">
                        {d.verified}%
                      </td>
                      <td className="text-right font-mono">
                        <span
                          className={`analytics-var-tag ${
                            d.variance <= -5
                              ? "is-critical"
                              : d.variance < 0
                              ? "is-warning"
                              : "is-positive"
                          }`}
                        >
                          {d.variance > 0 ? `+${d.variance}%` : `${d.variance}%`}
                        </span>
                      </td>
                      <td className="text-right">
                        {d.atRiskCount > 0 ? (
                          <span className="analytics-risk-badge font-bold">
                            {d.atRiskCount}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 6. SECOND ANALYTIC ROW: DELAY CAUSES (50%) + PLANNED VS ACTUAL DURATION (50%) */}
          <section className="analytics-grid-two-equal">
            {/* 6A. DELAY CAUSES */}
            <div className="analytics-card">
              <div className="analytics-card-head">
                <div>
                  <h3 className="analytics-card-title">Delay Causes</h3>
                  <p className="analytics-card-subtitle">
                    Verified reasons associated with delayed or blocked execution.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    32 delay events
                  </span>
                </div>
              </div>

              {/* HORIZONTAL BARS FOR DELAY CAUSES */}
              <div className="analytics-delay-causes-list">
                {analyticsFixture.delayCauses.map((item) => (
                  <div
                    key={item.category}
                    className="analytics-delay-cause-row"
                    onClick={() => handleDelayCauseClick(item.category)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleDelayCauseClick(item.category);
                      }
                    }}
                    title={`Click to inspect ${item.count} ${item.category} delay events`}
                  >
                    <div className="analytics-delay-header">
                      <span className="analytics-delay-name font-medium">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="analytics-delay-count font-mono font-bold text-primary">
                          {item.count}
                        </span>
                        <span className="analytics-delay-pct font-mono text-muted text-xs">
                          ({item.pctOfTotal}%)
                        </span>
                      </div>
                    </div>
                    <div className="analytics-delay-track">
                      <div
                        className="analytics-delay-fill"
                        style={{
                          width: `${(item.count / 8) * 100}%`,
                          backgroundColor:
                            item.category === "Permit"
                              ? "#ef4444"
                              : item.category === "Material" || item.category === "Access"
                              ? "#f59e0b"
                              : "#3b82f6",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6B. PLANNED VS ACTUAL DURATION (SCATTER PLOT) */}
            <div className="analytics-card">
              <div className="analytics-card-head">
                <div>
                  <h3 className="analytics-card-title">Planned vs Actual Duration</h3>
                  <p className="analytics-card-subtitle">
                    Points above the reference line indicate schedule overrun · dashed line = planned duration.
                  </p>
                </div>
                <div className="analytics-scatter-legend text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span>Overrun</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 ml-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>On Plan</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 ml-2 text-muted">
                    <span className="w-3.5 h-0 border-t border-dashed border-slate-400 inline-block" />
                    <span>Planned Ref</span>
                  </span>
                </div>
              </div>

              {/* SCATTER PLOT SVG */}
              <DurationScatterPlot
                data={analyticsFixture.durations}
                onPointClick={handleScatterPointClick}
              />
            </div>
          </section>

          {/* 7. THIRD ANALYTIC ROW: MATCHING CONFIDENCE (50%) + VERIFICATION THROUGHPUT (50%) */}
          <section className="analytics-grid-two-equal">
            {/* 7A. MATCHING CONFIDENCE */}
            <div className="analytics-card">
              <div className="analytics-card-head">
                <div>
                  <h3 className="analytics-card-title">Matching Confidence</h3>
                  <p className="analytics-card-subtitle">
                    How reliable is automatic schedule linking?
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-muted">Avg Confidence</span>
                  <div className="text-sm font-bold text-blue-400 font-mono">
                    {analyticsFixture.confidence.avgConfidence}%
                  </div>
                </div>
              </div>

              {/* STACKED CONFIDENCE DISTRIBUTION BAR */}
              <div className="analytics-conf-container">
                <div className="analytics-conf-stacked-bar">
                  <div
                    className="conf-seg is-high"
                    style={{ width: `${analyticsFixture.confidence.highPct}%` }}
                    onClick={() => handleConfidenceClick("High")}
                    title={`High Confidence ≥90%: ${analyticsFixture.confidence.highPct}% (${analyticsFixture.confidence.autoSuggestedCount} items)`}
                  />
                  <div
                    className="conf-seg is-review"
                    style={{ width: `${analyticsFixture.confidence.reviewPct}%` }}
                    onClick={() => handleConfidenceClick("Review")}
                    title={`Review Required 70–89%: ${analyticsFixture.confidence.reviewPct}% (${analyticsFixture.confidence.plannerReviewCount} items)`}
                  />
                  <div
                    className="conf-seg is-unmatched"
                    style={{ width: `${analyticsFixture.confidence.unmatchedPct}%` }}
                    onClick={() => handleConfidenceClick("Unmatched")}
                    title={`Unmatched <70%: ${analyticsFixture.confidence.unmatchedPct}% (${analyticsFixture.confidence.unmatchedCount} items)`}
                  />
                </div>

                <div className="analytics-conf-breakdown">
                  <div
                    className="conf-breakdown-item is-clickable"
                    onClick={() => handleConfidenceClick("High")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="conf-dot is-high" />
                      <span className="font-medium">High Confidence (≥90%)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-bold text-emerald-400">
                        {analyticsFixture.confidence.highPct}%
                      </span>
                      <span className="text-[11px] text-muted">
                        ({analyticsFixture.confidence.autoSuggestedCount} auto-suggested)
                      </span>
                    </div>
                  </div>

                  <div
                    className="conf-breakdown-item is-clickable"
                    onClick={() => handleConfidenceClick("Review")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="conf-dot is-review" />
                      <span className="font-medium">Planner Review (70–89%)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-bold text-amber-400">
                        {analyticsFixture.confidence.reviewPct}%
                      </span>
                      <span className="text-[11px] text-muted">
                        ({analyticsFixture.confidence.plannerReviewCount} reviews)
                      </span>
                    </div>
                  </div>

                  <div
                    className="conf-breakdown-item is-clickable"
                    onClick={() => handleConfidenceClick("Unmatched")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="conf-dot is-unmatched" />
                      <span className="font-medium">Unmatched (&lt;70%)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-bold text-rose-400">
                        {analyticsFixture.confidence.unmatchedPct}%
                      </span>
                      <span className="text-[11px] text-muted">
                        ({analyticsFixture.confidence.unmatchedCount} exceptions)
                      </span>
                    </div>
                  </div>
                </div>

                {/* MANDATORY INVARIANT SAFETY NOTE */}
                <div className="analytics-invariant-callout">
                  <ShieldCheck size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-secondary leading-snug">
                    <strong>Human Trust Invariant:</strong> AI recommendations remain proposals
                    until planner verification. Auto-suggested matches never directly mutate
                    baseline actuals.
                  </p>
                </div>
              </div>
            </div>

            {/* 7B. VERIFICATION THROUGHPUT */}
            <div className="analytics-card">
              <div className="analytics-card-head">
                <div>
                  <h3 className="analytics-card-title">Verification Throughput</h3>
                  <p className="analytics-card-subtitle">
                    Can planners keep up with incoming execution data? (Last 7 Days)
                  </p>
                </div>
                <div className="analytics-scurve-legend">
                  <span className="legend-item">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                    <span>Received</span>
                  </span>
                  <span className="legend-item">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              {/* THROUGHPUT METRIC STRIP */}
              <div className="analytics-throughput-kpis">
                <div className="kpi-mini">
                  <span className="kpi-label">PENDING REVIEW</span>
                  <span className="kpi-val text-amber-400 font-bold">
                    {analyticsFixture.throughput.pendingReview}
                  </span>
                </div>
                <div className="kpi-mini">
                  <span className="kpi-label">MEDIAN REVIEW TIME</span>
                  <span className="kpi-val text-primary font-bold">
                    {analyticsFixture.throughput.medianReviewTime}
                  </span>
                </div>
                <div className="kpi-mini">
                  <span className="kpi-label">VERIFIED TODAY</span>
                  <span className="kpi-val text-emerald-400 font-bold">
                    {analyticsFixture.throughput.verifiedToday}
                  </span>
                </div>
                <div className="kpi-mini">
                  <span className="kpi-label">REJECTED TODAY</span>
                  <span className="kpi-val text-muted font-bold">
                    {analyticsFixture.throughput.rejectedToday}
                  </span>
                </div>
              </div>

              {/* THROUGHPUT 7-DAY BAR CHART */}
              <ThroughputBarChart data={analyticsFixture.throughput.daily} />
            </div>
          </section>

          {/* 8. CONTROL INSIGHTS (BOTTOM SECTION) */}
          <section className="analytics-card analytics-insights-section">
            <div className="analytics-card-head">
              <div>
                <h3 className="analytics-card-title">Control Insights</h3>
                <p className="analytics-card-subtitle">
                  Deterministic project controls observations calculated from active schedule actuals.
                </p>
              </div>
              <span className="text-[11px] text-muted">Click insight to drill into affected data</span>
            </div>

            <div className="analytics-insights-grid">
              {analyticsFixture.insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`analytics-insight-card is-${insight.type.toLowerCase()}`}
                  onClick={() => handleInsightClick(insight.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleInsightClick(insight.id);
                    }
                  }}
                  title={`Inspect data for: ${insight.title}`}
                >
                  <div className="insight-top">
                    <span className={`insight-badge is-${insight.type.toLowerCase()}`}>
                      {insight.type}
                    </span>
                    <ArrowUpRight size={13} className="text-muted insight-arrow" />
                  </div>
                  <h4 className="insight-title">{insight.title}</h4>
                  <p className="insight-desc">{insight.description}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* 9. REUSABLE RIGHT-SIDE ANALYTICAL DRILLDOWN DRAWER */}
      {drawerOpen && (
        <div className="analytics-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside
            className="analytics-drawer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Analytical Drilldown Drawer"
          >
            <div className="analytics-drawer-head">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  DRILLDOWN ANALYSIS
                </span>
                <h3 className="analytics-drawer-title truncate">{drawerTitle}</h3>
                <p className="analytics-drawer-subtitle">{drawerSubtitle}</p>
              </div>
              <button
                className="analytics-drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close Drawer"
              >
                <X size={16} />
              </button>
            </div>

            {/* QUICK LINK TO RELEVANT FULL WORKSPACES */}
            <div className="analytics-drawer-actions">
              <Link
                href="/verification-center"
                className="button secondary sm text-xs flex-1 justify-center"
              >
                <CheckCircle2 size={12} /> Verification Center
              </Link>
              <Link
                href="/schedule-explorer"
                className="button secondary sm text-xs flex-1 justify-center"
              >
                <Layers size={12} /> Schedule Explorer
              </Link>
            </div>

            {/* ACTIVITY LIST */}
            <div className="analytics-drawer-body">
              {drawerActivities.length === 0 ? (
                <div className="analytics-drawer-empty">
                  <p className="text-secondary text-xs">No individual activities in this filter.</p>
                </div>
              ) : (
                <div className="analytics-drawer-list">
                  {drawerActivities.map((act) => (
                    <div key={act.id} className="analytics-drawer-item">
                      <div className="analytics-drawer-item-top">
                        <span className="font-mono font-bold text-xs text-primary">
                          {act.id}
                        </span>
                        <span
                          className={`analytics-status-chip is-${act.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {act.status}
                        </span>
                      </div>

                      <div className="font-medium text-xs text-secondary mt-1">
                        {act.name}
                      </div>

                      <div className="analytics-drawer-item-meta">
                        <span>{act.discipline}</span>
                        <span>•</span>
                        <span>{act.workfront}</span>
                        <span>•</span>
                        <span>{act.contractor}</span>
                      </div>

                      <div className="analytics-drawer-metrics-row">
                        <div className="metric-box">
                          <span className="label">Planned</span>
                          <span className="val text-blue-400">{act.plannedProgress}%</span>
                        </div>
                        <div className="metric-box">
                          <span className="label">Verified</span>
                          <span className="val text-emerald-400">{act.verifiedActual}%</span>
                        </div>
                        <div className="metric-box">
                          <span className="label">Variance</span>
                          <span
                            className={`val ${
                              act.variance < 0 ? "text-rose-400" : "text-emerald-400"
                            }`}
                          >
                            {act.variance > 0 ? `+${act.variance}%` : `${act.variance}%`}
                          </span>
                        </div>
                        <div className="metric-box">
                          <span className="label">Duration</span>
                          <span className="val text-secondary">
                            {act.actualDuration}d / {act.plannedDuration}d
                          </span>
                        </div>
                      </div>

                      {act.delayCause && (
                        <div className="analytics-drawer-delay-tag">
                          <AlertTriangle size={11} className="text-amber-400" />
                          <span>Delay Cause: {act.delayCause}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. REUSABLE CHART COMPONENTS (CLEAN SVG IMPLEMENTATION)
// ============================================================================

/**
 * 2A. S-Curve Chart (Baseline Plan, Current Plan, Verified Actual, Data Date Marker)
 */
function SCurveChart({ data }: { data: SCurveDataPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(7); // Default to data date index (26 Sep)

  const width = 640;
  const height = 260;
  const paddingLeft = 40;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const count = data.length;
  const getX = (i: number) => paddingLeft + (i / (count - 1)) * chartW;
  const getY = (val: number) => paddingTop + chartH - (val / 100) * chartH;

  // Baseline and Current lines across full timeline
  const baselinePoints = data.map((d, i) => `${getX(i)},${getY(d.baseline)}`).join(" ");
  const currentPoints = data.map((d, i) => `${getX(i)},${getY(d.current)}`).join(" ");

  // Actual strictly up to data date using original index - NEVER draws into future
  const actualPoints = data
    .map((d, origIdx) => (d.actual !== null ? `${getX(origIdx)},${getY(d.actual)}` : null))
    .filter(Boolean)
    .join(" ");

  // Data date index
  const dataDateIdx = data.findIndex((d) => d.isDataDate);
  const dataDateX = dataDateIdx >= 0 ? getX(dataDateIdx) : null;

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="analytics-scurve-wrapper">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="analytics-scurve-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Subtle Future Scheduled Period Treatment (Right of Data Date, calm background tint, no floating text) */}
        {dataDateX !== null && (
          <g className="future-period-zone">
            <rect
              x={dataDateX}
              y={paddingTop}
              width={width - paddingRight - dataDateX}
              height={chartH}
              fill="rgba(255, 255, 255, 0.02)"
              stroke="none"
            />
          </g>
        )}

        {/* Horizontal grid lines */}
        {[0, 25, 50, 75, 100].map((val) => {
          const y = getY(val);
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fill="var(--text-muted)"
                className="analytics-axis-text"
              >
                {val}%
              </text>
            </g>
          );
        })}

        {/* X Axis labels */}
        {data.map((d, i) => {
          if (i % 2 !== 0 && !d.isDataDate && i !== count - 1) return null;
          const x = getX(i);
          return (
            <text
              key={d.date}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fill={d.isDataDate ? "#f59e0b" : "var(--text-muted)"}
              className={`analytics-axis-text ${d.isDataDate ? "is-active" : ""}`}
            >
              {d.label}
            </text>
          );
        })}

        {/* Baseline Plan Line (dashed slate/blue) */}
        <polyline
          fill="none"
          stroke="#64748b"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          points={baselinePoints}
        />

        {/* Current Plan Line (solid blue) */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={currentPoints}
        />

        {/* Verified Actual Line (solid emerald - STOPS strictly at data date) */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          points={actualPoints}
        />

        {/* DATA DATE VERTICAL LINE & BADGE */}
        {dataDateX !== null && (
          <g className="data-date-marker">
            {/* Top Badge: centered precisely over vertical line, compact amber semantic */}
            <rect
              x={dataDateX - 54}
              y={paddingTop - 21}
              width="108"
              height="18"
              rx="4"
              fill="var(--surface-elevated)"
              stroke="#f59e0b"
              strokeWidth="1.2"
            />
            <text
              x={dataDateX}
              y={paddingTop - 9}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#f59e0b"
              className="text-[9.5px] font-mono font-bold select-none"
            >
              DATA DATE · 26 SEP
            </text>

            {/* Vertical dashed line begins strictly below badge, does not pass through text */}
            <line
              x1={dataDateX}
              y1={paddingTop - 2}
              x2={dataDateX}
              y2={paddingTop + chartH}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            {/* Terminal Actual Point at Data Date (61%) */}
            {dataDateIdx >= 0 && data[dataDateIdx].actual !== null && (
              <circle
                cx={dataDateX}
                cy={getY(data[dataDateIdx].actual as number)}
                r="4.5"
                fill="#10b981"
                stroke="#fff"
                strokeWidth="1.5"
              />
            )}
          </g>
        )}

        {/* Interactive Hover Columns */}
        {data.map((d, i) => {
          const x = getX(i);
          return (
            <rect
              key={d.date}
              x={x - 15}
              y={paddingTop}
              width={30}
              height={chartH}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          );
        })}

        {/* Hover Highlight Dot */}
        {activePoint && hoveredIdx !== null && (
          <g>
            <circle
              cx={getX(hoveredIdx)}
              cy={getY(activePoint.current)}
              r="4"
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth="1.5"
            />
            {activePoint.actual !== null && (
              <circle
                cx={getX(hoveredIdx)}
                cy={getY(activePoint.actual)}
                r="4.5"
                fill="#10b981"
                stroke="#fff"
                strokeWidth="1.5"
              />
            )}
          </g>
        )}
      </svg>

      {/* S-CURVE INTERACTIVE TOOLTIP */}
      {activePoint && (
        <div className="analytics-chart-tooltip">
          <div className="tooltip-head">
            <span className="font-semibold text-primary">
              {activePoint.isDataDate ? "26 Sep 2026" : activePoint.label}
            </span>
            {activePoint.isDataDate ? (
              <span className="tooltip-badge">Data Date (26 Sep 2026)</span>
            ) : activePoint.actual === null ? (
              <span className="tooltip-badge is-future">Future Period</span>
            ) : (
              <span className="tooltip-badge is-historical">Reported Period</span>
            )}
          </div>
          <div className="tooltip-row">
            <span className="text-muted">Baseline Plan:</span>
            <span className="font-mono font-semibold text-secondary">
              {activePoint.baseline}%
            </span>
          </div>
          <div className="tooltip-row">
            <span className="text-muted">Current Plan:</span>
            <span className="font-mono font-semibold text-blue-400">
              {activePoint.current}%
            </span>
          </div>
          <div className="tooltip-row">
            <span className="text-muted">Verified Actual:</span>
            <span
              className={`font-mono font-bold ${
                activePoint.actual !== null ? "text-emerald-400" : "text-muted"
              }`}
            >
              {activePoint.actual !== null ? `${activePoint.actual}%` : "Not reported"}
            </span>
          </div>
          <div className="tooltip-row border-t border-border-subtle pt-1 mt-1">
            <span className="text-muted font-medium">Variance:</span>
            <span
              className={`font-mono font-bold ${
                activePoint.actual !== null
                  ? activePoint.actual - activePoint.current < 0
                    ? "text-rose-400"
                    : "text-emerald-400"
                  : "text-muted"
              }`}
            >
              {activePoint.actual !== null
                ? `${activePoint.actual - activePoint.current}%`
                : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 2B. Variance Trend Chart (Actual minus current planned, zero reference line)
 */
function VarianceTrendChart({ data }: { data: { date: string; label: string; variance: number }[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(6);

  const width = 380;
  const height = 260;
  const paddingLeft = 35;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  // Range: 0 down to -8.0%
  const minVar = -8.0;
  const maxVar = 0.0;

  const count = data.length;
  const getX = (i: number) => paddingLeft + (i / (count - 1)) * chartW;
  const getY = (val: number) => paddingTop + ((maxVar - val) / (maxVar - minVar)) * chartH;

  const zeroY = getY(0);

  // Area coordinates below zero
  const linePoints = data.map((d, i) => `${getX(i)},${getY(d.variance)}`).join(" ");
  const areaPoints = `${linePoints} ${getX(count - 1)},${zeroY} ${getX(0)},${zeroY}`;

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="analytics-variance-wrapper">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="analytics-variance-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Zero Reference Line */}
        <line
          x1={paddingLeft}
          y1={zeroY}
          x2={width - paddingRight}
          y2={zeroY}
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
        <text
          x={paddingLeft - 6}
          y={zeroY + 3.5}
          textAnchor="end"
          fill="var(--text-secondary)"
          className="analytics-axis-text font-bold"
        >
          0.0%
        </text>

        {/* Negative grid levels: -2%, -4%, -6%, -8% */}
        {[-2.0, -4.0, -6.0, -8.0].map((val) => {
          const y = getY(val);
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={y + 3.5}
                textAnchor="end"
                fill="var(--text-muted)"
                className="analytics-axis-text"
              >
                {val.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* X Axis labels */}
        {data.map((d, i) => {
          const x = getX(i);
          return (
            <text
              key={d.date}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fill="var(--text-muted)"
              className="analytics-axis-text"
            >
              {d.label}
            </text>
          );
        })}

        {/* Area fill with restrained red/amber tint */}
        <polygon
          fill="rgba(239, 68, 68, 0.08)"
          stroke="none"
          points={areaPoints}
        />

        {/* Line for variance trend */}
        <polyline
          fill="none"
          stroke="#f87171"
          strokeWidth="2"
          points={linePoints}
        />

        {/* Hover interaction columns */}
        {data.map((d, i) => {
          const x = getX(i);
          return (
            <rect
              key={d.date}
              x={x - 15}
              y={paddingTop}
              width={30}
              height={chartH}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          );
        })}

        {/* Hover point marker */}
        {activePoint && hoveredIdx !== null && (
          <circle
            cx={getX(hoveredIdx)}
            cy={getY(activePoint.variance)}
            r="4.5"
            fill="#ef4444"
            stroke="#fff"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {/* Tooltip */}
      {activePoint && (
        <div className="analytics-chart-tooltip is-compact">
          <div className="tooltip-head">
            <span className="font-semibold text-primary">{activePoint.label}</span>
          </div>
          <div className="tooltip-row">
            <span className="text-muted">Schedule Variance:</span>
            <span className="font-mono font-bold text-rose-400">
              {activePoint.variance.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 2C. Duration Scatter Plot (Planned vs Actual Duration, Actual = Planned line)
 */
function DurationScatterPlot({
  data,
  onPointClick,
}: {
  data: DurationScatterPoint[];
  onPointClick: (p: DurationScatterPoint) => void;
}) {
  const [selectedPoint, setSelectedPoint] = useState<DurationScatterPoint>(
    data.find((p) => p.id === "ACT-P110") || data[0]
  );
  const [hoveredPoint, setHoveredPoint] = useState<DurationScatterPoint | null>(null);

  const width = 460;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  // Max X: 16 days, Max Y: 20 days
  const maxX = 16;
  const maxY = 20;

  const getX = (val: number) => paddingLeft + (val / maxX) * chartW;
  const getY = (val: number) => paddingTop + chartH - (val / maxY) * chartH;

  const displayPoint = hoveredPoint || selectedPoint;

  return (
    <div className="analytics-scatter-wrapper">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="analytics-scatter-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y Grid lines */}
        {[0, 5, 10, 15, 20].map((val) => {
          const y = getY(val);
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={y + 3.5}
                textAnchor="end"
                fill="var(--text-muted)"
                className="analytics-axis-text"
              >
                {val}d
              </text>
            </g>
          );
        })}

        {/* X Grid lines & labels */}
        {[0, 4, 8, 12, 16].map((val) => {
          const x = getX(val);
          return (
            <g key={val}>
              <line
                x1={x}
                y1={paddingTop}
                x2={x}
                y2={paddingTop + chartH}
                stroke="var(--border-subtle)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                fill="var(--text-muted)"
                className="analytics-axis-text"
              >
                {val}d
              </text>
            </g>
          );
        })}

        {/* Actual = Planned Diagonal Reference Line (visually behind data points, no floating text) */}
        <line
          x1={getX(0)}
          y1={getY(0)}
          x2={getX(16)}
          y2={getY(16)}
          stroke="#475569"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.6"
        />

        {/* Axis Labels */}
        <text
          x={paddingLeft + chartW / 2}
          y={height - 2}
          textAnchor="middle"
          fill="var(--text-secondary)"
          className="analytics-axis-label"
        >
          Planned Duration (Days)
        </text>
        <text
          x={12}
          y={paddingTop + chartH / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${paddingTop + chartH / 2})`}
          fill="var(--text-secondary)"
          className="analytics-axis-label"
        >
          Actual / Forecast (Days)
        </text>

        {/* Scatter Points */}
        {data.map((p) => {
          const cx = getX(p.plannedDuration);
          const cy = getY(p.actualDuration);
          const isOverrun = p.overrun > 0;
          const isSelected = displayPoint?.id === p.id;

          return (
            <circle
              key={p.id}
              cx={cx}
              cy={cy}
              r={isSelected ? 6 : 4.5}
              fill={isOverrun ? "#ef4444" : "#10b981"}
              stroke="#fff"
              strokeWidth={isSelected ? 2 : 1}
              className="cursor-pointer transition-all duration-100 hover:opacity-100"
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={() => {
                setSelectedPoint(p);
                onPointClick(p);
              }}
            />
          );
        })}
      </svg>

      {/* Selected Activity Information Panel (Structured Below Plot) */}
      {displayPoint && (
        <div className="analytics-scatter-selection-card">
          <div className="selection-card-head">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary">{displayPoint.id}</span>
              <span className="text-secondary font-medium text-xs">· {displayPoint.discipline}</span>
            </div>
            <span
              className={`tooltip-badge ${
                displayPoint.overrun > 0 ? "is-red" : "is-green"
              }`}
            >
              {displayPoint.overrun > 0 ? `+${displayPoint.overrun}d Overrun` : "On Plan"}
            </span>
          </div>
          <div className="text-xs font-semibold text-primary">
            {displayPoint.name}
          </div>
          <div className="selection-card-grid">
            <div className="grid-item">
              <span className="text-muted text-[10.5px]">Planned Duration:</span>
              <span className="font-mono font-semibold text-secondary">{displayPoint.plannedDuration}d</span>
            </div>
            <div className="grid-item">
              <span className="text-muted text-[10.5px]">Actual / Forecast:</span>
              <span className="font-mono font-bold text-primary">{displayPoint.actualDuration}d</span>
            </div>
            <div className="grid-item">
              <span className="text-muted text-[10.5px]">Schedule Overrun:</span>
              <span
                className={`font-mono font-bold ${
                  displayPoint.overrun > 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {displayPoint.overrun > 0 ? `+${displayPoint.overrun}d` : "0d"}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-muted border-t border-border-subtle pt-1 mt-1 flex items-center justify-between">
            <span>Click point to open drilldown drawer</span>
            <span className="font-mono text-faint">Area: {displayPoint.workfront}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 2D. Verification Throughput 7-Day Bar Chart
 */
function ThroughputBarChart({ data }: { data: { date: string; day: string; received: number; verified: number }[] }) {
  const [hoveredDay, setHoveredDay] = useState<{ day: string; received: number; verified: number } | null>(null);

  const maxVal = 35;

  return (
    <div className="analytics-throughput-chart-wrap">
      <div className="analytics-throughput-bars">
        {data.map((d) => {
          const recH = (d.received / maxVal) * 100;
          const verH = (d.verified / maxVal) * 100;

          return (
            <div
              key={d.date}
              className="throughput-bar-group"
              onMouseEnter={() => setHoveredDay(d)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div className="throughput-bar-pair">
                {/* Received Bar (Blue) */}
                <div
                  className="throughput-bar is-received"
                  style={{ height: `${recH}%` }}
                />
                {/* Verified Bar (Emerald) */}
                <div
                  className="throughput-bar is-verified"
                  style={{ height: `${verH}%` }}
                />
              </div>
              <span className="throughput-day-label">{d.day}</span>
            </div>
          );
        })}
      </div>

      {hoveredDay && (
        <div className="analytics-chart-tooltip is-compact">
          <div className="tooltip-head">
            <span className="font-semibold text-primary">{hoveredDay.day}</span>
          </div>
          <div className="tooltip-row">
            <span className="text-muted">Received:</span>
            <span className="font-mono font-bold text-blue-400">{hoveredDay.received}</span>
          </div>
          <div className="tooltip-row">
            <span className="text-muted">Verified:</span>
            <span className="font-mono font-bold text-emerald-400">{hoveredDay.verified}</span>
          </div>
        </div>
      )}
    </div>
  );
}
