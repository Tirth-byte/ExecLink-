"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronRight,
  ArrowRight,
  Radio,
  FileSpreadsheet,
  BookOpen,
  Clock,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import {
  liveExecutionFixture,
  ExecutionEvent,
  ExecutionDiscipline,
  EventStatus,
  EventSource,
} from "@/data/live-execution";
import {
  MajorPanel,
  PanelHeader,
  StatusBadge,
  DisciplineBadge,
  Button,
} from "@/components/ui";

// Source icon helper
function SourceIndicator({ source }: { source: EventSource }) {
  const getIcon = () => {
    switch (source) {
      case "Field Update":
        return <Radio size={13} className="source-icon field" />;
      case "DPR Import":
        return <FileSpreadsheet size={13} className="source-icon dpr" />;
      case "Site Diary":
        return <BookOpen size={13} className="source-icon diary" />;
      case "Time Agent":
        return <Clock size={13} className="source-icon time" />;
      case "Spreadsheet":
        return <TableIcon size={13} className="source-icon sheet" />;
      default:
        return <FileText size={13} className="source-icon" />;
    }
  };

  return (
    <span className="source-cell-wrap">
      {getIcon()}
      <span className="source-name">{source}</span>
    </span>
  );
}

// Confidence display with subtle semantic indicator
function ConfidenceIndicator({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="confidence-null">—</span>;
  }

  const tone = value >= 90 ? "high" : value >= 70 ? "review" : "low";

  return (
    <div className={`confidence-cell-wrap ${tone}`} title={`${value}% match confidence`}>
      <span className="confidence-dot" />
      <span className="confidence-text">{value}%</span>
    </div>
  );
}

export function LiveExecutionWorkspace({
  activeFilterCount,
  setActiveFilterCount,
}: {
  activeFilterCount: number;
  setActiveFilterCount: (count: number) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search & Filters state
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<"All" | "Needs Review" | "Blocked" | "Unmatched">("All");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("All");
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("All");

  // Selected event for detail drawer (null by default per strict requirements)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Evidence preview toggle in drawer
  const [evidencePreviewOpen, setEvidencePreviewOpen] = useState(false);

  // Check URL query parameters on initial load
  useEffect(() => {
    const eventParam = searchParams.get("event");
    if (eventParam) {
      setSelectedEventId(eventParam);
    }
  }, [searchParams]);

  // Sync active filter count to header button
  useEffect(() => {
    let count = 0;
    if (search.trim() !== "") count++;
    if (quickFilter !== "All") count++;
    if (disciplineFilter !== "All") count++;
    if (sourceFilter !== "All") count++;
    if (dateFilter !== "All") count++;
    if (confidenceFilter !== "All") count++;
    setActiveFilterCount(count);
  }, [search, quickFilter, disciplineFilter, sourceFilter, dateFilter, confidenceFilter, setActiveFilterCount]);

  // Reset all filters
  const handleClearFilters = () => {
    setSearch("");
    setQuickFilter("All");
    setDisciplineFilter("All");
    setSourceFilter("All");
    setDateFilter("All");
    setConfidenceFilter("All");
  };

  // Filtered dataset
  const filteredEvents = useMemo(() => {
    return liveExecutionFixture.events.filter((item) => {
      // Search across event title, assetTag, location, reporter, activity name/ID
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        const matchedAct = item.matchedActivity?.name?.toLowerCase() || "";
        const matchedId = item.matchedActivity?.id?.toLowerCase() || "";
        const matches =
          item.event.toLowerCase().includes(q) ||
          item.assetTag.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.reporter.toLowerCase().includes(q) ||
          item.rawUpdate.toLowerCase().includes(q) ||
          matchedAct.includes(q) ||
          matchedId.includes(q);

        if (!matches) return false;
      }

      // Quick filter tabs
      if (quickFilter === "Needs Review" && item.status !== "Review") return false;
      if (quickFilter === "Blocked" && item.status !== "Blocked") return false;
      if (quickFilter === "Unmatched" && item.status !== "Unmatched") return false;

      // Discipline filter
      if (disciplineFilter !== "All" && item.discipline !== disciplineFilter) return false;

      // Source filter
      if (sourceFilter !== "All" && item.source !== sourceFilter) return false;

      // Confidence filter
      if (confidenceFilter === "High (≥90%)") {
        if (!item.confidence || item.confidence < 90) return false;
      } else if (confidenceFilter === "Review (70–89%)") {
        if (!item.confidence || item.confidence < 70 || item.confidence >= 90) return false;
      } else if (confidenceFilter === "Low (<70%)") {
        if (item.confidence && item.confidence >= 70) return false;
      }

      return true;
    });
  }, [search, quickFilter, disciplineFilter, sourceFilter, dateFilter, confidenceFilter]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return liveExecutionFixture.events.find((e) => e.id === selectedEventId) || null;
  }, [selectedEventId]);

  const handleRowClick = (event: ExecutionEvent) => {
    setSelectedEventId(event.id);
    setEvidencePreviewOpen(false);
  };

  const handleCloseDrawer = () => {
    setSelectedEventId(null);
    setEvidencePreviewOpen(false);
  };

  // Keyboard shortcut: Escape closes drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedEventId) {
        handleCloseDrawer();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEventId]);

  return (
    <div className="live-execution-container">
      {/* 1. OPERATIONAL SUMMARY KPI STRIP */}
      <section className="live-kpi-strip" aria-label="Operational Summary">
        <div className="kpi-grid-4">
          <div className="kpi-card">
            <span className="kpi-label">TOTAL EVENTS</span>
            <div className="kpi-value">{liveExecutionFixture.summary.total}</div>
            <span className="kpi-context">Ingested field execution ledger</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">VERIFIED</span>
            <div className="kpi-value kpi-val-verified">{liveExecutionFixture.summary.verified}</div>
            <span className="kpi-context">76% confirmed by project controls</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">NEEDS REVIEW</span>
            <div className="kpi-value kpi-val-review">{liveExecutionFixture.summary.needsReview}</div>
            <span className="kpi-context">16% pending planner action</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">UNMATCHED</span>
            <div className="kpi-value kpi-val-unmatched">{liveExecutionFixture.summary.unmatched}</div>
            <span className="kpi-context">8% unmatched to schedule WBS</span>
          </div>
        </div>
      </section>

      {/* 2. MAIN EVENT WORKSPACE */}
      <MajorPanel className="execution-events-panel">
        <PanelHeader
          title="Execution Events"
          meta={`Showing ${filteredEvents.length} of ${liveExecutionFixture.summary.total} events  •  Last update ${liveExecutionFixture.summary.lastReceived}`}
        />

        {/* Operational Toolbar */}
        <div className="execution-toolbar" role="search" aria-label="Filter execution events">
          {/* Row 1: Search + Quick Status Filter Segment */}
          <div className="toolbar-top-row">
            <div className="execution-search-wrap">
              <Search size={15} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                className="execution-search-input"
                placeholder="Search activity, asset, location or event…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search execution events"
              />
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearch("")}
                  aria-label="Clear search query"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="quick-filter-pills" role="tablist" aria-label="Quick status filters">
              <button
                type="button"
                role="tab"
                aria-selected={quickFilter === "All"}
                className={`quick-pill ${quickFilter === "All" ? "is-active" : ""}`}
                onClick={() => setQuickFilter("All")}
              >
                All Events <span className="pill-count">{liveExecutionFixture.summary.total}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={quickFilter === "Needs Review"}
                className={`quick-pill ${quickFilter === "Needs Review" ? "is-active" : ""}`}
                onClick={() => setQuickFilter("Needs Review")}
              >
                Needs Review <span className="pill-count amber">{liveExecutionFixture.summary.needsReview}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={quickFilter === "Blocked"}
                className={`quick-pill ${quickFilter === "Blocked" ? "is-active" : ""}`}
                onClick={() => setQuickFilter("Blocked")}
              >
                Blocked <span className="pill-count red">{liveExecutionFixture.summary.blocked}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={quickFilter === "Unmatched"}
                className={`quick-pill ${quickFilter === "Unmatched" ? "is-active" : ""}`}
                onClick={() => setQuickFilter("Unmatched")}
              >
                Unmatched <span className="pill-count slate">{liveExecutionFixture.summary.unmatched}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Self-describing Dropdowns + Clear filters on the right */}
          <div className="toolbar-secondary-row">
            <div className="secondary-dropdown-group">
              <div className="filter-select-wrap">
                <select
                  value={disciplineFilter}
                  onChange={(e) => setDisciplineFilter(e.target.value)}
                  className={`filter-select ${disciplineFilter !== "All" ? "is-active" : ""}`}
                  aria-label="Filter by discipline"
                >
                  <option value="All">All disciplines</option>
                  <option value="Civil">Civil</option>
                  <option value="Structural">Structural</option>
                  <option value="Piping">Piping</option>
                  <option value="Static Equipment">Static Equipment</option>
                  <option value="Rotating Equipment">Rotating Equipment</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Instrumentation">Instrumentation</option>
                  <option value="HSE">HSE</option>
                </select>
                <ChevronDown size={13} className="select-chevron" aria-hidden="true" />
              </div>

              <div className="filter-select-wrap">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className={`filter-select ${sourceFilter !== "All" ? "is-active" : ""}`}
                  aria-label="Filter by source"
                >
                  <option value="All">All sources</option>
                  <option value="Field Update">Field Update</option>
                  <option value="DPR Import">DPR Import</option>
                  <option value="Site Diary">Site Diary</option>
                  <option value="Time Agent">Time Agent</option>
                  <option value="Spreadsheet">Spreadsheet</option>
                </select>
                <ChevronDown size={13} className="select-chevron" aria-hidden="true" />
              </div>

              <div className="filter-select-wrap">
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  className={`filter-select ${confidenceFilter !== "All" ? "is-active" : ""}`}
                  aria-label="Filter by confidence"
                >
                  <option value="All">All confidence</option>
                  <option value="High (≥90%)">High confidence (≥90%)</option>
                  <option value="Review (70–89%)">Review range (70–89%)</option>
                  <option value="Low (<70%)">Low confidence (&lt;70%)</option>
                </select>
                <ChevronDown size={13} className="select-chevron" aria-hidden="true" />
              </div>

              <div className="filter-select-wrap">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={`filter-select ${dateFilter !== "All" ? "is-active" : ""}`}
                  aria-label="Filter by date"
                >
                  <option value="All">All dates</option>
                  <option value="Today">Today (26 Sep)</option>
                  <option value="Yesterday">Yesterday (25 Sep)</option>
                </select>
                <ChevronDown size={13} className="select-chevron" aria-hidden="true" />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="clear-all-filters-btn"
                aria-label="Clear all active filters"
              >
                Clear filters <RotateCcw size={11} />
              </button>
            )}
          </div>
        </div>

        {/* 3. EVENT TABLE */}
        <div className="table-scroll-container">
          <table className="data-table execution-table" aria-label="Execution Events Ledger">
            <thead>
              <tr>
                <th className="col-time">TIME</th>
                <th className="col-event">EXECUTION EVENT</th>
                <th className="col-discipline">DISCIPLINE</th>
                <th className="col-tag">ASSET / TAG</th>
                <th className="col-location">LOCATION</th>
                <th className="col-source">SOURCE</th>
                <th className="col-matched">MATCHED ACTIVITY</th>
                <th className="col-confidence">CONFIDENCE</th>
                <th className="col-status">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-table-cell">
                    <div className="table-empty-state">
                      <HelpCircle size={24} className="empty-icon" />
                      <h4>No execution events match these filters.</h4>
                      <p>Clear or adjust filters to view all project execution activity.</p>
                      <Button variant="secondary" onClick={handleClearFilters}>
                        Clear Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const isSelected = selectedEventId === evt.id;
                  return (
                    <tr
                      key={evt.id}
                      className={`execution-row ${isSelected ? "selected" : ""}`}
                      onClick={() => handleRowClick(evt)}
                      tabIndex={0}
                      role="row"
                      aria-selected={isSelected}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick(evt);
                        }
                      }}
                    >
                      <td className="col-time">
                        <time className="time-val">{evt.time}</time>
                      </td>
                      <td className="col-event">
                        <div className="event-title-cell" title={`${evt.event} — ${evt.rawUpdate}`}>
                          <span className="event-primary-title" title={evt.event}>{evt.event}</span>
                          <span className="event-raw-preview" title={evt.rawUpdate}>{evt.rawUpdate}</span>
                        </div>
                      </td>
                      <td className="col-discipline">
                        <DisciplineBadge>{evt.discipline}</DisciplineBadge>
                      </td>
                      <td className="col-tag">
                        <code className="asset-tag" title={evt.assetTag}>{evt.assetTag}</code>
                      </td>
                      <td className="col-location">
                        <span className="location-text" title={evt.location}>{evt.location}</span>
                      </td>
                      <td className="col-source">
                        <SourceIndicator source={evt.source} />
                      </td>
                      <td className="col-matched">
                        {evt.matchedActivity ? (
                          <div className="matched-act-cell" title={`${evt.matchedActivity.name} (${evt.matchedActivity.id})`}>
                            <span className="matched-act-name" title={evt.matchedActivity.name}>{evt.matchedActivity.name}</span>
                            <span className="matched-act-id">{evt.matchedActivity.id}</span>
                          </div>
                        ) : (
                          <span className="unmatched-label">No schedule match</span>
                        )}
                      </td>
                      <td className="col-confidence">
                        <ConfidenceIndicator value={evt.confidence} />
                      </td>
                      <td className="col-status">
                        <StatusBadge>{evt.status}</StatusBadge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </MajorPanel>

      {/* 4. EVENT DETAIL DRAWER */}
      {selectedEvent && (
        <div
          className="context-drawer-layer"
          role="presentation"
          onMouseDown={(e) => e.currentTarget === e.target && handleCloseDrawer()}
        >
          <aside
            className="context-drawer live-execution-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-drawer-title"
          >
            {/* Header */}
            <header className="context-drawer-head">
              <div>
                <p className="panel-header-eyebrow">Execution Event · {selectedEvent.id}</p>
                <h2 id="event-drawer-title">{selectedEvent.event}</h2>
                <div className="drawer-subhead">
                  <span className="drawer-id">{selectedEvent.time}</span>
                  <DisciplineBadge>{selectedEvent.discipline}</DisciplineBadge>
                  <StatusBadge>{selectedEvent.status}</StatusBadge>
                </div>
              </div>
              <button
                className="icon-button"
                aria-label="Close detail drawer"
                onClick={handleCloseDrawer}
                autoFocus
              >
                <X size={17} />
              </button>
            </header>

            {/* Scrollable Body */}
            <div className="context-drawer-scroll">
              {/* SECTION 1: RAW FIELD UPDATE */}
              <section className="drawer-section field-update-section">
                <div className="section-label-row">
                  <h3>Raw Field Update</h3>
                  <span className="section-meta-tag">{selectedEvent.source}</span>
                </div>
                <div className="raw-field-quote">
                  <p className="raw-quote-text">“{selectedEvent.rawUpdate}”</p>
                  <div className="raw-quote-footer">
                    <span>Reported by <strong>{selectedEvent.reporter}</strong></span>
                    <time>{selectedEvent.timestamp}</time>
                  </div>
                </div>
              </section>

              {/* SECTION 2: EXTRACTED DETAILS */}
              <section className="drawer-section">
                <h3>Extracted Details</h3>
                <dl className="extracted-details-grid">
                  <div>
                    <dt>Event Type</dt>
                    <dd>{selectedEvent.extractedDetails.eventType}</dd>
                  </div>
                  <div>
                    <dt>Timestamp</dt>
                    <dd>{selectedEvent.extractedDetails.timestamp}</dd>
                  </div>
                  <div>
                    <dt>Discipline</dt>
                    <dd>
                      <DisciplineBadge>{selectedEvent.extractedDetails.discipline}</DisciplineBadge>
                    </dd>
                  </div>
                  <div>
                    <dt>Asset / Tag</dt>
                    <dd>
                      <code>{selectedEvent.extractedDetails.assetTag}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{selectedEvent.extractedDetails.location}</dd>
                  </div>
                  <div>
                    <dt>Contractor</dt>
                    <dd>{selectedEvent.extractedDetails.contractor}</dd>
                  </div>
                  <div>
                    <dt>Quantity / Delta</dt>
                    <dd><strong>{selectedEvent.extractedDetails.quantity}</strong></dd>
                  </div>
                  <div>
                    <dt>Ingestion Source</dt>
                    <dd>{selectedEvent.extractedDetails.source}</dd>
                  </div>
                </dl>
              </section>

              {/* SECTION 3: SCHEDULE MATCH */}
              <section className="drawer-section schedule-match-section">
                <div className="section-label-row">
                  <h3>Schedule Match</h3>
                  {selectedEvent.confidence && (
                    <span className="confidence-pill-header">
                      {selectedEvent.confidence}% confidence
                    </span>
                  )}
                </div>

                {selectedEvent.matchedActivity ? (
                  <div className="schedule-candidate-card">
                    <div className="candidate-header">
                      <span className="candidate-id">{selectedEvent.matchedActivity.id}</span>
                      <span className="candidate-routing">{selectedEvent.routing}</span>
                    </div>
                    <h4 className="candidate-title">{selectedEvent.matchedActivity.name}</h4>
                    <p className="candidate-wbs">{selectedEvent.matchedActivity.wbs}</p>

                    {/* Verification Required Notice */}
                    {(selectedEvent.status === "Review" || selectedEvent.status === "Blocked") && (
                      <div className="verification-callout">
                        <AlertCircle size={14} className="callout-icon" />
                        <div>
                          <strong>Planner verification required</strong>
                          <p>AI proposal must be confirmed by human verification before schedule actuals are updated.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="unmatched-candidate-card">
                    <HelpCircle size={16} className="unmatched-icon" />
                    <div>
                      <strong>No confirmed schedule candidate</strong>
                      <p>Field event tags could not be automatically mapped to L5 activities. Manual planner assignment required in Match Review.</p>
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION 4: MATCH SIGNALS */}
              {selectedEvent.matchSignals && (
                <section className="drawer-section">
                  <h3>Match Signals</h3>
                  <div className="signals-compact-grid">
                    <div className="signal-item">
                      <div className="signal-top">
                        <span>Semantic</span>
                        <strong>{selectedEvent.matchSignals.semantic}%</strong>
                      </div>
                      <div className="signal-bar-track">
                        <div
                          className="signal-bar-fill"
                          style={{ width: `${selectedEvent.matchSignals.semantic}%` }}
                        />
                      </div>
                    </div>

                    <div className="signal-item">
                      <div className="signal-top">
                        <span>Asset / Tag</span>
                        <strong>{selectedEvent.matchSignals.assetTag}%</strong>
                      </div>
                      <div className="signal-bar-track">
                        <div
                          className="signal-bar-fill"
                          style={{ width: `${selectedEvent.matchSignals.assetTag}%` }}
                        />
                      </div>
                    </div>

                    <div className="signal-item">
                      <div className="signal-top">
                        <span>WBS Context</span>
                        <strong>{selectedEvent.matchSignals.wbsContext}%</strong>
                      </div>
                      <div className="signal-bar-track">
                        <div
                          className="signal-bar-fill"
                          style={{ width: `${selectedEvent.matchSignals.wbsContext}%` }}
                        />
                      </div>
                    </div>

                    <div className="signal-item">
                      <div className="signal-top">
                        <span>Discipline</span>
                        <strong>{selectedEvent.matchSignals.discipline}%</strong>
                      </div>
                      <div className="signal-bar-track">
                        <div
                          className="signal-bar-fill"
                          style={{ width: `${selectedEvent.matchSignals.discipline}%` }}
                        />
                      </div>
                    </div>

                    <div className="signal-item">
                      <div className="signal-top">
                        <span>Temporal</span>
                        <strong>{selectedEvent.matchSignals.temporal}%</strong>
                      </div>
                      <div className="signal-bar-track">
                        <div
                          className="signal-bar-fill"
                          style={{ width: `${selectedEvent.matchSignals.temporal}%` }}
                        />
                      </div>
                    </div>

                    <div className="signal-item">
                      <div className="signal-top">
                        <span>Location</span>
                        <strong>{selectedEvent.matchSignals.location}%</strong>
                      </div>
                      <div className="signal-bar-track">
                        <div
                          className="signal-bar-fill"
                          style={{ width: `${selectedEvent.matchSignals.location}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION 5: EVIDENCE */}
              <section className="drawer-section">
                <div className="section-label-row">
                  <h3>Evidence & Lineage</h3>
                  <button
                    type="button"
                    className="view-evidence-toggle-btn"
                    onClick={() => setEvidencePreviewOpen((prev) => !prev)}
                  >
                    {evidencePreviewOpen ? "Hide Evidence" : "View Evidence"}
                  </button>
                </div>
                <div className="evidence-card">
                  <div className="evidence-meta">
                    <span className="evidence-ref-tag">
                      {selectedEvent.evidence.type === "photo" && <ImageIcon size={12} />}
                      {selectedEvent.evidence.type === "document" && <FileText size={12} />}
                      {selectedEvent.evidence.type === "transcript" && <Radio size={12} />}
                      {selectedEvent.evidence.type === "sheet" && <TableIcon size={12} />}
                      {selectedEvent.evidence.reference}
                    </span>
                    <span className="evidence-time">{selectedEvent.evidence.timestamp}</span>
                  </div>
                  <p className="evidence-summary">{selectedEvent.evidence.summary}</p>
                  <div className="evidence-reporter">
                    Source: {selectedEvent.evidence.reporter}
                  </div>

                  {/* Inline Preview Toggle */}
                  {evidencePreviewOpen && (
                    <div className="evidence-preview-box">
                      <div className="preview-header">
                        <span>Attached Field Artifact</span>
                        <code className="text-mono">{selectedEvent.evidence.reference}</code>
                      </div>
                      <div className="preview-content">
                        {selectedEvent.evidence.type === "photo" ? (
                          <div className="preview-placeholder photo">
                            <ImageIcon size={32} />
                            <span>Field Photo Attachment ({selectedEvent.evidence.reference})</span>
                            <small>Resolution: 2048 × 1536 · Geotag: Lat 45.241 / Long -73.592</small>
                          </div>
                        ) : (
                          <div className="preview-placeholder doc">
                            <FileText size={32} />
                            <span>Verification Record ({selectedEvent.evidence.reference})</span>
                            <small>Digital verification stamp verified with cryptographic checksum</small>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* SECTION 6: AUDIT HISTORY */}
              <section className="drawer-section">
                <h3>Audit History</h3>
                <div className="drawer-timeline">
                  {selectedEvent.auditHistory.map((step, idx) => (
                    <div className="timeline-node" key={idx}>
                      <span className="timeline-time">{step.time}</span>
                      <span className="timeline-connector">
                        <i className="timeline-dot" />
                        {idx < selectedEvent.auditHistory.length - 1 && <b className="timeline-stem" />}
                      </span>
                      <div className="timeline-body">
                        <strong className="timeline-action">{step.action}</strong>
                        <span className="timeline-actor">{step.actor}</span>
                        {step.note && <span className="timeline-note">{step.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* SECTION 7: DRAWER ACTIONS */}
            <footer className="context-drawer-footer execution-drawer-footer">
              {selectedEvent.status === "Review" ? (
                <>
                  <Link
                    href={`/match-review?event=${selectedEvent.id}`}
                    className="button primary flex-1"
                  >
                    Review Match <ArrowRight size={14} />
                  </Link>
                  {selectedEvent.matchedActivity && (
                    <Link
                      href={`/schedule-explorer?activity=${selectedEvent.matchedActivity.id}`}
                      className="button secondary"
                      title="View Schedule Activity"
                    >
                      View Activity
                    </Link>
                  )}
                </>
              ) : selectedEvent.status === "Unmatched" ? (
                <Link
                  href={`/match-review?event=${selectedEvent.id}&unmatched=true`}
                  className="button primary flex-1"
                >
                  Review Unmatched Event <ArrowRight size={14} />
                </Link>
              ) : selectedEvent.status === "Blocked" ? (
                <>
                  <Link
                    href={`/verification-center?event=${selectedEvent.id}`}
                    className="button primary flex-1"
                  >
                    Review Blocked Item <ArrowRight size={14} />
                  </Link>
                  {selectedEvent.matchedActivity && (
                    <Link
                      href={`/schedule-explorer?activity=${selectedEvent.matchedActivity.id}`}
                      className="button secondary"
                    >
                      View Activity
                    </Link>
                  )}
                </>
              ) : (
                selectedEvent.matchedActivity && (
                  <Link
                    href={`/schedule-explorer?activity=${selectedEvent.matchedActivity.id}`}
                    className="button primary flex-1"
                  >
                    View Schedule Activity <ArrowRight size={14} />
                  </Link>
                )
              )}
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
