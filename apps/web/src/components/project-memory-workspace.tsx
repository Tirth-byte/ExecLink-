"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  BookOpen,
  Filter,
  X,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Download,
  Info,
  ChevronDown,
  RefreshCw,
  Eye,
  Database,
  ArrowRight,
  FileCheck,
} from "lucide-react";
import {
  historicalActivitiesFixture,
  memoryCoverageFixture,
  relatedPatternsFixture,
  naturalLanguageAnswers,
  reusableLessonsFixture,
  type HistoricalActivity,
  type EvidenceItem,
} from "@/data/project-memory";

// ============================================================================
// HELPER CALCULATIONS
// ============================================================================

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
}

export function ProjectMemoryWorkspace() {
  // Search query state
  const [searchQuery, setSearchQuery] = useState<string>("P-110 Hydrotest");
  const [searchInputText, setSearchInputText] = useState<string>("P-110 Hydrotest");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filters State
  const [selectedProject, setSelectedProject] = useState<string>("All");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("All");
  const [selectedDelayCause, setSelectedDelayCause] = useState<string>("All");
  const [selectedWbsLevel, setSelectedWbsLevel] = useState<string>("All");
  const [verificationStatusFilter, setVerificationStatusFilter] = useState<string>("Verified");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Selected Activity ID & Right Drawer State
  const [drawerActivityId, setDrawerActivityId] = useState<string | null>(null);

  // Selected Lesson to highlight supporting records
  const [highlightedLessonId, setHighlightedLessonId] = useState<string | null>(null);

  // Evidence Viewer Modal
  const [activeEvidence, setActiveEvidence] = useState<{
    item: EvidenceItem;
    activity: HistoricalActivity;
  } | null>(null);

  // Memory Coverage Modal
  const [coverageModalOpen, setCoverageModalOpen] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulated QA States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus search & Esc to close drawer/modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === "Escape") {
        if (activeEvidence) setActiveEvidence(null);
        else if (coverageModalOpen) setCoverageModalOpen(false);
        else if (drawerActivityId) setDrawerActivityId(null);
        else if (isFilterDropdownOpen) setIsFilterDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEvidence, coverageModalOpen, drawerActivityId, isFilterDropdownOpen]);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target as Node)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };
    if (isFilterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterDropdownOpen]);

  // Natural Language QA Matcher
  const matchedQA = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;
    for (const [key, answer] of Object.entries(naturalLanguageAnswers)) {
      if (q.includes(key) || key.includes(q)) {
        return { queryKey: key, ...answer };
      }
    }
    if (
      q.includes("why") &&
      (q.includes("hydrotest") || q.includes("late") || q.includes("delay"))
    ) {
      return {
        queryKey: "why do hydrotests run late",
        ...naturalLanguageAnswers["why do hydrotests run late"],
      };
    }
    if (
      q.includes("how long") &&
      (q.includes("hydrotest") || q.includes("take") || q.includes("duration"))
    ) {
      return {
        queryKey: "how long do similar hydrotests usually take",
        ...naturalLanguageAnswers["how long do similar hydrotests usually take"],
      };
    }
    return null;
  }, [searchQuery]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return historicalActivitiesFixture.filter((item) => {
      // 1. Text Query Filter
      const queryLower = searchQuery.toLowerCase().trim();
      let queryMatch = true;
      if (queryLower) {
        if (
          queryLower === "p-110 hydrotest" ||
          queryLower === "similar hydrotest activities" ||
          queryLower === "similar hydrotests"
        ) {
          queryMatch = item.tags.includes("Hydrotest") || item.discipline === "Piping";
        } else if (
          queryLower.includes("piping activities delayed by permits") ||
          queryLower === "permit delays" ||
          (queryLower.includes("permit") && queryLower.includes("hydrotest"))
        ) {
          queryMatch = item.discipline === "Piping" && item.delayCause === "Permit";
        } else if (
          queryLower.includes("foundation pours in area b") ||
          (queryLower.includes("foundation") && queryLower.includes("b"))
        ) {
          queryMatch =
            item.workfront === "Area B" &&
            (item.tags.includes("Foundation") || item.tags.includes("Civil"));
        } else if (
          queryLower.includes("activities involving p-110") ||
          queryLower === "p-110 history" ||
          queryLower.includes("p-110")
        ) {
          queryMatch = item.tags.includes("P-110") || item.tags.includes("Hydrotest");
        } else if (
          queryLower.includes("structural erection overruns") ||
          queryLower === "structural overruns" ||
          (queryLower.includes("structural") && queryLower.includes("overrun"))
        ) {
          queryMatch = item.discipline === "Structural" && item.variance > 0;
        } else {
          // General field search
          const searchable = `${item.name} ${item.project} ${item.discipline} ${item.wbs} ${item.contractor} ${item.delayCause} ${item.recordedNote} ${item.reusableLesson} ${item.tags.join(" ")}`.toLowerCase();
          queryMatch = searchable.includes(queryLower);
        }
      }

      // 2. Project Filter
      const projectMatch = selectedProject === "All" || item.project === selectedProject;

      // 3. Discipline Filter
      const disciplineMatch =
        selectedDiscipline === "All" || item.discipline === selectedDiscipline;

      // 4. Delay Cause Filter
      const delayMatch =
        selectedDelayCause === "All" || item.delayCause === selectedDelayCause;

      // 5. WBS Level Filter
      const wbsMatch = selectedWbsLevel === "All" || item.wbsLevel === selectedWbsLevel;

      // 6. Verification Status (All synthetic records are verified)
      const verificationMatch =
        verificationStatusFilter === "All" ||
        item.provenance.status === "Planner verified";

      return (
        queryMatch &&
        projectMatch &&
        disciplineMatch &&
        delayMatch &&
        wbsMatch &&
        verificationMatch
      );
    });
  }, [
    searchQuery,
    selectedProject,
    selectedDiscipline,
    selectedDelayCause,
    selectedWbsLevel,
    verificationStatusFilter,
  ]);

  // Currently Selected Activity for Drawer
  const drawerActivity = useMemo(() => {
    if (!drawerActivityId) return null;
    return (
      historicalActivitiesFixture.find((a) => a.id === drawerActivityId) || null
    );
  }, [drawerActivityId]);

  // Compute Active Filters Count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedProject !== "All") count++;
    if (selectedDiscipline !== "All") count++;
    if (selectedDelayCause !== "All") count++;
    if (selectedWbsLevel !== "All") count++;
    if (verificationStatusFilter !== "Verified") count++;
    return count;
  }, [
    selectedProject,
    selectedDiscipline,
    selectedDelayCause,
    selectedWbsLevel,
    verificationStatusFilter,
  ]);

  // Compute Historical Pattern Statistics
  const patternMetrics = useMemo(() => {
    const totalCount = filteredActivities.length;
    if (totalCount === 0) {
      return {
        plannedMedian: 0,
        actualMedian: 0,
        typicalVariance: "+0.0d",
        onTimeRate: "0%",
        sampleSize: 0,
        delayedCount: 0,
      };
    }
    const plannedArr = filteredActivities.map((a) => a.plannedDuration);
    const actualArr = filteredActivities.map((a) => a.actualDuration);
    const varianceArr = filteredActivities.map((a) => a.variance);
    const onTimeCount = filteredActivities.filter((a) => a.variance <= 0).length;
    const delayedCount = filteredActivities.filter((a) => a.variance > 0 || a.delayCause !== "None").length;

    const plannedMedian = calculateMedian(plannedArr);
    const actualMedian = calculateMedian(actualArr);
    const typicalVariance = calculateMedian(varianceArr);
    const onTimeRate = Math.round((onTimeCount / totalCount) * 100);

    return {
      plannedMedian,
      actualMedian,
      typicalVariance: typicalVariance > 0 ? `+${typicalVariance} days` : `${typicalVariance} days`,
      onTimeRate: `${onTimeRate}%`,
      sampleSize: totalCount,
      delayedCount,
    };
  }, [filteredActivities]);

  // Compute Delay Causes Breakdown over current set
  const delayCausesStats = useMemo(() => {
    const total = filteredActivities.length;
    if (total === 0) return [];
    const counts: Record<string, number> = {
      Permit: 0,
      Inspection: 0,
      Access: 0,
      Material: 0,
      Other: 0,
    };
    filteredActivities.forEach((act) => {
      if (act.delayCause === "Permit") counts.Permit++;
      else if (act.delayCause === "Inspection") counts.Inspection++;
      else if (act.delayCause === "Access") counts.Access++;
      else if (act.delayCause === "Material") counts.Material++;
      else counts.Other++;
    });

    const categories = [
      { name: "Permit", count: counts.Permit },
      { name: "Inspection", count: counts.Inspection },
      { name: "Access", count: counts.Access },
      { name: "Material", count: counts.Material },
      { name: "Other", count: counts.Other },
    ];

    return categories.map((cat) => ({
      name: cat.name,
      count: cat.count,
      pct: Math.round((cat.count / total) * 100),
    }));
  }, [filteredActivities]);

  // Execute Search
  const handleExecuteSearch = (newQuery?: string) => {
    const q = newQuery !== undefined ? newQuery : searchInputText;
    setIsLoading(true);
    setSearchQuery(q);
    setSearchInputText(q);
    setSelectedDelayCause("All");
    setHighlightedLessonId(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 220);
  };

  // Reset to default
  const handleResetDefault = () => {
    setSearchQuery("P-110 Hydrotest");
    setSearchInputText("P-110 Hydrotest");
    setSelectedProject("All");
    setSelectedDiscipline("All");
    setSelectedDelayCause("All");
    setSelectedWbsLevel("All");
    setVerificationStatusFilter("Verified");
    setHighlightedLessonId(null);
    setHasError(false);
  };

  // Export Evidence Action
  const handleExportEvidence = () => {
    setToastMessage(
      "Generating verified historical evidence bundle (ZIP) with cryptographic audit receipts..."
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="pm-workspace">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="pm-toast" role="status">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="pm-toast-close"
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. HEADER (SIMPLIFIED & QUIETER) */}
      {/* ==================================================================== */}
      <header className="pm-hdr">
        <div className="pm-hdr-main">
          <div className="pm-hdr-kicker">
            <span className="pm-kicker-tag">INTELLIGENCE · 08</span>
            <span className="pm-kicker-sep">/</span>
            <span className="pm-kicker-label">PROJECT MEMORY</span>
          </div>
          <h1 className="pm-hdr-title">Project Memory</h1>
          <p className="pm-hdr-desc">
            Search verified execution history and reuse lessons from similar work.
          </p>

          {/* 2. ONE COMPACT METADATA LINE (REPLACES 6 KPI BLOCKS) */}
          <div className="pm-meta-line" aria-label="Project memory repository status">
            <span>{memoryCoverageFixture.verifiedRecords.toLocaleString()} verified records</span>
            <span className="pm-meta-dot">•</span>
            <span>{memoryCoverageFixture.projectsCount} projects</span>
            <span className="pm-meta-dot">•</span>
            <span>{memoryCoverageFixture.activitiesWithHistory} activities with history</span>
            <span className="pm-meta-dot">•</span>
            <span>{memoryCoverageFixture.evidenceCoveragePct}% evidence coverage</span>
            <span className="pm-meta-dot">•</span>
            <span>Indexed {memoryCoverageFixture.lastIndexed.split(" · ")[0]}</span>
          </div>
        </div>

        <div className="pm-hdr-actions">
          <button
            type="button"
            className="pm-btn-quiet"
            onClick={() => setCoverageModalOpen(true)}
            id="btn-memory-coverage"
            title="Inspect historical knowledge coverage"
          >
            <Database size={13} />
            <span>Memory Coverage</span>
          </button>
          <button
            type="button"
            className="pm-btn-quiet"
            onClick={handleExportEvidence}
            id="btn-export-evidence"
            title="Export audited evidence dossier"
          >
            <Download size={13} />
            <span>Export Evidence</span>
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 3. HERO SEARCH (CLEAN, DOMINANT INTERACTION) */}
      {/* ==================================================================== */}
      <section className="pm-search-hero" aria-label="Search Project Memory">
        <div className="pm-search-hero-label-row">
          <span className="pm-search-title">ASK PROJECT MEMORY</span>

          {/* 4. SUBTLE INLINE TRUST INDICATOR (REPLACES GIANT GREEN BANNER) */}
          <div
            className="pm-trust-inline"
            title="Only planner-verified execution records contribute to historical statistics."
          >
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span className="pm-trust-bold">Verified history only</span>
            <span className="pm-trust-muted">· Excludes unverified proposals</span>
          </div>
        </div>

        <form
          className="pm-search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteSearch();
          }}
        >
          <Search size={17} className="pm-search-icon" aria-hidden="true" />
          <input
            id="pm-search-input"
            ref={searchInputRef}
            type="text"
            value={searchInputText}
            onChange={(e) => setSearchInputText(e.target.value)}
            placeholder="Search historical activities, delays, assets, lessons..."
            className="pm-search-input"
          />
          {searchInputText && (
            <button
              type="button"
              className="pm-search-clear"
              onClick={() => {
                setSearchInputText("");
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <div className="pm-search-kbd">
            <kbd>⌘ K</kbd>
          </div>
          <button type="submit" className="pm-search-submit-btn" id="btn-search-memory">
            Search
          </button>
        </form>

        {/* Suggestion Prompts */}
        <div className="pm-search-suggestions">
          <span className="pm-try-label">Try:</span>
          {[
            "Similar hydrotests",
            "Permit delays",
            "P-110 history",
            "Structural overruns",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={`pm-try-btn ${
                searchQuery.toLowerCase() === prompt.toLowerCase() ? "pm-try-btn-active" : ""
              }`}
              onClick={() => handleExecuteSearch(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* NATURAL LANGUAGE QA ANSWER (WHEN A QUESTION IS DETECTED) */}
      {/* ==================================================================== */}
      {matchedQA && (
        <section className="pm-qa-banner" aria-label="Natural language historical answer">
          <div className="pm-qa-header">
            <BookOpen size={14} className="text-sky-400" />
            <span className="pm-qa-heading">HISTORICAL ANSWER</span>
            <span className="pm-qa-basis">Based on {matchedQA.sampleSize} verified records</span>
          </div>
          <p className="pm-qa-text">{matchedQA.summary}</p>
          <div className="pm-qa-points">
            {matchedQA.keyTakeaways.map((point, idx) => (
              <div key={idx} className="pm-qa-point">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* 6. RESULT CONTEXT ROW & 5. COLLAPSED FILTERS POPOVER */}
      {/* ==================================================================== */}
      <section className="pm-context-bar" aria-label="Query result context and filters">
        <div className="pm-context-left">
          <h2 className="pm-context-title">{searchQuery || "All Verified Activities"}</h2>
          <span className="pm-context-wbs">Piping • Process Area • L6</span>
          <span className="pm-context-sep">•</span>
          <span className="pm-context-count">
            {filteredActivities.length} comparable verified activities
          </span>
          <span className="pm-context-sep">•</span>
          <span className="pm-context-cov">Coverage: 2019–2026</span>
        </div>

        <div className="pm-context-right" ref={filterDropdownRef}>
          {/* Active Filter Chips */}
          {selectedDelayCause !== "All" && (
            <span className="pm-active-filter-chip">
              Delay: {selectedDelayCause}
              <button
                type="button"
                onClick={() => setSelectedDelayCause("All")}
                aria-label="Remove delay filter"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {selectedProject !== "All" && (
            <span className="pm-active-filter-chip">
              Project: {selectedProject}
              <button
                type="button"
                onClick={() => setSelectedProject("All")}
                aria-label="Remove project filter"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {selectedDiscipline !== "All" && (
            <span className="pm-active-filter-chip">
              Discipline: {selectedDiscipline}
              <button
                type="button"
                onClick={() => setSelectedDiscipline("All")}
                aria-label="Remove discipline filter"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {selectedWbsLevel !== "All" && (
            <span className="pm-active-filter-chip">
              WBS: {selectedWbsLevel}
              <button
                type="button"
                onClick={() => setSelectedWbsLevel("All")}
                aria-label="Remove WBS filter"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {/* Collapsed Filter Button */}
          <div className="pm-filter-trigger-wrap">
            <button
              type="button"
              className={`pm-filter-btn ${
                activeFiltersCount > 0 ? "pm-filter-btn-active" : ""
              }`}
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              id="btn-toggle-filters"
              aria-expanded={isFilterDropdownOpen}
            >
              <Filter size={13} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="pm-filter-count-badge">{activeFiltersCount}</span>
              )}
              <ChevronDown size={13} />
            </button>

            {/* Filter Popover Dropdown */}
            {isFilterDropdownOpen && (
              <div className="pm-filter-popover" role="dialog" aria-label="Filter options">
                <div className="pm-popover-header">
                  <span className="pm-popover-title">FILTER HISTORICAL RECORDS</span>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      className="pm-popover-reset"
                      onClick={() => {
                        setSelectedProject("All");
                        setSelectedDiscipline("All");
                        setSelectedDelayCause("All");
                        setSelectedWbsLevel("All");
                        setVerificationStatusFilter("Verified");
                      }}
                    >
                      Reset all
                    </button>
                  )}
                </div>

                <div className="pm-popover-fields">
                  <div className="pm-popover-field">
                    <label htmlFor="pop-proj">Project</label>
                    <select
                      id="pop-proj"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                    >
                      <option value="All">All Projects (7)</option>
                      <option value="South Process Expansion">South Process Expansion</option>
                      <option value="North Utility Upgrade">North Utility Upgrade</option>
                      <option value="West Process Revamp">West Process Revamp</option>
                      <option value="Terminal Expansion">Terminal Expansion</option>
                      <option value="Utility Modernization">Utility Modernization</option>
                      <option value="Process Train Upgrade">Process Train Upgrade</option>
                    </select>
                  </div>

                  <div className="pm-popover-field">
                    <label htmlFor="pop-disc">Discipline</label>
                    <select
                      id="pop-disc"
                      value={selectedDiscipline}
                      onChange={(e) => setSelectedDiscipline(e.target.value)}
                    >
                      <option value="All">All Disciplines (8)</option>
                      <option value="Piping">Piping</option>
                      <option value="Civil">Civil</option>
                      <option value="Structural">Structural</option>
                      <option value="Static Equipment">Static Equipment</option>
                      <option value="Rotating Equipment">Rotating Equipment</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Instrumentation">Instrumentation</option>
                      <option value="HSE">HSE</option>
                    </select>
                  </div>

                  <div className="pm-popover-field">
                    <label htmlFor="pop-delay">Delay Cause</label>
                    <select
                      id="pop-delay"
                      value={selectedDelayCause}
                      onChange={(e) => setSelectedDelayCause(e.target.value)}
                    >
                      <option value="All">All Delays</option>
                      <option value="Permit">Permit</option>
                      <option value="Inspection">Inspection</option>
                      <option value="Access">Access</option>
                      <option value="Material">Material</option>
                      <option value="Weather">Weather</option>
                      <option value="None">None (On-Time)</option>
                    </select>
                  </div>

                  <div className="pm-popover-field">
                    <label htmlFor="pop-wbs">WBS Level</label>
                    <select
                      id="pop-wbs"
                      value={selectedWbsLevel}
                      onChange={(e) => setSelectedWbsLevel(e.target.value)}
                    >
                      <option value="All">All Levels</option>
                      <option value="L3">L3 Package</option>
                      <option value="L4">L4 Subsystem</option>
                      <option value="L5">L5 Component</option>
                      <option value="L6">L6 Activity</option>
                    </select>
                  </div>

                  <div className="pm-popover-field">
                    <label htmlFor="pop-verif">Verification Status</label>
                    <select
                      id="pop-verif"
                      value={verificationStatusFilter}
                      onChange={(e) => setVerificationStatusFilter(e.target.value)}
                    >
                      <option value="Verified">Verified Only (Recommended)</option>
                      <option value="All">All Records</option>
                    </select>
                  </div>
                </div>

                <div className="pm-popover-footer">
                  <button
                    type="button"
                    className="pm-btn-quiet pm-btn-sm"
                    onClick={() => setIsFilterDropdownOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 21. EMPTY STATE / 22. SMALL SAMPLE WARNING / MAIN CONTENT */}
      {/* ==================================================================== */}
      {isLoading ? (
        <div className="pm-skeleton-loader" aria-label="Loading historical insights">
          <div className="pm-skeleton-box pm-sk-hero" />
          <div className="pm-skeleton-box pm-sk-table" />
        </div>
      ) : hasError ? (
        <div className="pm-error-state" role="alert">
          <AlertTriangle size={32} className="text-amber-400" />
          <h3>Project Memory could not load historical execution records.</h3>
          <p>An index timeout occurred. Your schedule baseline remains intact.</p>
          <div className="pm-empty-actions">
            <button
              type="button"
              className="pm-btn-quiet"
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  setHasError(false);
                  setIsLoading(false);
                }, 200);
              }}
            >
              <RefreshCw size={13} />
              <span>Retry Query</span>
            </button>
            <button type="button" className="pm-btn-quiet" onClick={handleResetDefault}>
              Reset to Default
            </button>
          </div>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="pm-empty-state">
          <Info size={32} className="text-slate-500 mb-2" />
          <h3 className="pm-empty-title">No verified historical matches</h3>
          <p className="pm-empty-desc">
            We couldn&apos;t find comparable verified execution records matching &quot;{searchQuery}&quot;.
            Project Memory only includes planner-verified actuals.
          </p>
          <div className="pm-empty-actions">
            <button
              type="button"
              className="pm-btn-quiet"
              onClick={handleResetDefault}
              id="btn-clear-search"
            >
              Clear search
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 22. SMALL SAMPLE WARNING */}
          {patternMetrics.sampleSize > 0 && patternMetrics.sampleSize <= 2 && (
            <div className="pm-sample-warning">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <span>
                <strong>Limited historical sample:</strong> Based on only {patternMetrics.sampleSize}{" "}
                verified activities. Historical patterns should not imply strong certainty.
              </span>
            </div>
          )}

          {/* ================================================================ */}
          {/* 7. PRIMARY HISTORICAL INSIGHT (THE VISUAL CENTER) */}
          {/* ================================================================ */}
          <section className="pm-insight-panel" aria-label="Primary Historical Insight">
            <div className="pm-insight-header">
              <div className="pm-insight-title-wrap">
                <h3 className="pm-insight-title">HISTORICAL PATTERN</h3>
                <span className="pm-insight-sub">
                  Based on {patternMetrics.sampleSize} verified comparable activities
                </span>
              </div>
            </div>

            {/* 4 Compact Key Metrics */}
            <div className="pm-metrics-row">
              <div className="pm-metric-item">
                <span className="pm-metric-lbl">PLANNED MEDIAN</span>
                <span className="pm-metric-val">{patternMetrics.plannedMedian} days</span>
                <span className="pm-metric-note">Baseline estimate</span>
              </div>

              <div className="pm-metric-item">
                <span className="pm-metric-lbl">ACTUAL MEDIAN</span>
                <span className="pm-metric-val text-sky-400">
                  {patternMetrics.actualMedian} days
                </span>
                <span className="pm-metric-note">Observed outcome</span>
              </div>

              <div className="pm-metric-item">
                <span className="pm-metric-lbl">TYPICAL VARIANCE</span>
                <span className="pm-metric-val text-amber-400">
                  {patternMetrics.typicalVariance}
                </span>
                <span className="pm-metric-note">Historical delta</span>
              </div>

              <div className="pm-metric-item">
                <span className="pm-metric-lbl">ON-TIME RATE</span>
                <span className="pm-metric-val">{patternMetrics.onTimeRate}</span>
                <span className="pm-metric-note">Within planned baseline</span>
              </div>
            </div>

            {/* Unified Insight Layout: Left (What History Shows & Delays) | Right (Reusable Lessons) */}
            <div className="pm-insight-grid">
              {/* Left Column: What History Shows & Delay Causes */}
              <div className="pm-history-summary-col">
                <h4 className="pm-subheading">WHAT HISTORY SHOWS</h4>
                <div className="pm-takeaway-box">
                  <p className="pm-takeaway-main">
                    Similar hydrotest activities typically required{" "}
                    <strong>~1.6 days longer</strong> than planned.
                  </p>
                  <div className="pm-takeaway-intelligence">
                    <span className="pm-takeaway-dot" />
                    <span>
                      <strong>{patternMetrics.delayedCount} of {patternMetrics.sampleSize}</strong> encountered a recorded delay.
                    </span>
                  </div>
                </div>

                {/* 9. Clean Delay Causes Visualization (Horizontal Bars) */}
                <div className="pm-delays-wrap">
                  <span className="pm-delays-title">Most common recorded constraints:</span>
                  <div className="pm-delays-list">
                    {delayCausesStats.map((item) => {
                      const isFilterActive = selectedDelayCause === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          className={`pm-delay-row ${
                            isFilterActive ? "pm-delay-row-active" : ""
                          }`}
                          onClick={() => {
                            setSelectedDelayCause(isFilterActive ? "All" : item.name);
                          }}
                          title={`Click to filter activities delayed by ${item.name}`}
                        >
                          <span className="pm-delay-name">{item.name}</span>
                          <div className="pm-delay-bar-bg">
                            <div
                              className={`pm-delay-bar-fill ${
                                item.name === "Permit"
                                  ? "fill-permit"
                                  : item.name === "Inspection"
                                  ? "fill-inspection"
                                  : item.name === "Access"
                                  ? "fill-access"
                                  : "fill-other"
                              }`}
                              style={{ width: `${Math.max(item.pct, 3)}%` }}
                            />
                          </div>
                          <span className="pm-delay-stat">{item.pct}%</span>
                          <span className="pm-delay-cnt">({item.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: 8. Reusable Lessons (Front and Center!) */}
              <div className="pm-lessons-col">
                <div className="pm-lessons-header">
                  <h4 className="pm-subheading">REUSABLE LESSONS</h4>
                  <span className="pm-lessons-note">Derived from verified actuals</span>
                </div>

                <div className="pm-lessons-list">
                  {reusableLessonsFixture.map((les) => {
                    const isHighlighted = highlightedLessonId === les.id;
                    return (
                      <div
                        key={les.id}
                        className={`pm-lesson-card ${
                          isHighlighted ? "pm-lesson-card-active" : ""
                        }`}
                        onClick={() => {
                          setHighlightedLessonId(isHighlighted ? null : les.id);
                        }}
                      >
                        <span className="pm-lesson-num">{les.number}</span>
                        <div className="pm-lesson-body">
                          <p className="pm-lesson-text">&quot;{les.lesson}&quot;</p>
                          <span className="pm-lesson-context">{les.observedContext}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* 14. RELATED PATTERNS (MOVED UP BEFORE TABLE!) */}
          {/* ================================================================ */}
          <section className="pm-related-strip" aria-label="Related Execution Patterns">
            <div className="pm-strip-header">
              <span className="pm-subheading">RELATED PATTERNS</span>
              <span className="pm-strip-desc">Click pattern to inspect historical execution</span>
            </div>

            <div className="pm-patterns-row">
              {relatedPatternsFixture.map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  className="pm-pattern-pill"
                  onClick={() => {
                    handleExecuteSearch(pat.queryParam);
                    if (pat.delayCause) setSelectedDelayCause(pat.delayCause);
                    if (pat.discipline) setSelectedDiscipline(pat.discipline);
                  }}
                >
                  <span className="pm-pattern-name">{pat.title}</span>
                  <span className="pm-pattern-badge">{pat.recordsCount} records</span>
                  <ArrowRight size={12} className="pm-pattern-arr" />
                </button>
              ))}
            </div>
          </section>

          {/* ================================================================ */}
          {/* 10. COMPARABLE ACTIVITIES (REDESIGNED FULL-WIDTH TABLE) */}
          {/* ================================================================ */}
          <section
            className="pm-table-section"
            aria-label="Comparable historical activities table"
          >
            <div className="pm-table-title-row">
              <div>
                <h3 className="pm-section-heading">Comparable Historical Execution</h3>
                <span className="pm-table-subnote">
                  Click any row to inspect execution timeline and source evidence
                </span>
              </div>
              <span className="pm-table-count">
                Showing {filteredActivities.length} verified records
              </span>
            </div>

            <div className="pm-table-container">
              <table className="pm-table" id="comparable-activities-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>Similarity</th>
                    <th>Activity</th>
                    <th>Project</th>
                    <th style={{ textAlign: "right", width: "70px" }}>Plan</th>
                    <th style={{ textAlign: "right", width: "70px" }}>Actual</th>
                    <th style={{ textAlign: "right", width: "75px" }}>Variance</th>
                    <th>Delay</th>
                    <th style={{ textAlign: "center", width: "100px" }}>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.map((act) => {
                    const isDrawerOpen = drawerActivityId === act.id;
                    const isLessonHighlighted =
                      highlightedLessonId !== null &&
                      reusableLessonsFixture
                        .find((l) => l.id === highlightedLessonId)
                        ?.activityIds.includes(act.id);

                    return (
                      <tr
                        key={act.id}
                        className={`pm-table-tr ${isDrawerOpen ? "pm-tr-active" : ""} ${
                          isLessonHighlighted ? "pm-tr-highlight" : ""
                        }`}
                        onClick={() => setDrawerActivityId(act.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDrawerActivityId(act.id);
                          }
                        }}
                        aria-selected={isDrawerOpen}
                      >
                        {/* Similarity */}
                        <td>
                          <span
                            className={`pm-sim-pill ${
                              act.similarityPct >= 90
                                ? "sim-high"
                                : act.similarityPct >= 80
                                ? "sim-med"
                                : "sim-low"
                            }`}
                          >
                            {act.similarityPct}%
                          </span>
                        </td>

                        {/* Activity */}
                        <td>
                          <div className="pm-act-cell">
                            <span className="pm-act-title">{act.name}</span>
                            <span className="pm-act-code">{act.id}</span>
                          </div>
                        </td>

                        {/* Project */}
                        <td>
                          <span className="pm-proj-cell">{act.project}</span>
                        </td>

                        {/* Plan */}
                        <td style={{ textAlign: "right" }} className="pm-mono">
                          {act.plannedDuration}d
                        </td>

                        {/* Actual */}
                        <td
                          style={{ textAlign: "right" }}
                          className={`pm-mono ${
                            act.variance > 0 ? "text-amber-400 font-semibold" : ""
                          }`}
                        >
                          {act.actualDuration}d
                        </td>

                        {/* Variance */}
                        <td style={{ textAlign: "right" }}>
                          <span
                            className={`pm-var-badge ${
                              act.variance > 0
                                ? "var-over"
                                : act.variance < 0
                                ? "var-under"
                                : "var-on"
                            }`}
                          >
                            {act.variance > 0 ? `+${act.variance}d` : `${act.variance}d`}
                          </span>
                        </td>

                        {/* Delay */}
                        <td>
                          <span
                            className={`pm-delay-tag ${
                              act.delayCause === "Permit"
                                ? "tag-permit"
                                : act.delayCause === "Inspection"
                                ? "tag-inspection"
                                : act.delayCause === "Access"
                                ? "tag-access"
                                : act.delayCause === "Material"
                                ? "tag-material"
                                : act.delayCause === "None"
                                ? "tag-none"
                                : "tag-other"
                            }`}
                          >
                            {act.delayCause}
                          </span>
                        </td>

                        {/* Evidence */}
                        <td style={{ textAlign: "center" }}>
                          <span className="pm-ev-cell">
                            <FileText size={11} className="text-slate-400" />
                            <span>{act.sourceEvidence.length} files</span>
                            <span className="pm-ev-dot" title="Planner verified" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ==================================================================== */}
      {/* 11 & 12. RIGHT DRAWER — HISTORICAL RECORD (OPENS PROGRESSIVELY) */}
      {/* ==================================================================== */}
      {drawerActivity && (
        <div
          className="pm-drawer-backdrop"
          onClick={() => setDrawerActivityId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Historical record drawer"
        >
          <aside
            className="pm-drawer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Historical Record Details"
          >
            {/* Drawer Header */}
            <div className="pm-drawer-header">
              <div className="pm-drawer-title-row">
                <div>
                  <span className="pm-drawer-kicker">HISTORICAL RECORD</span>
                  <h3 className="pm-drawer-name">{drawerActivity.name}</h3>
                  <div className="pm-drawer-subtags">
                    <span className="pm-drawer-id">{drawerActivity.id}</span>
                    <span className="pm-drawer-sim">{drawerActivity.similarityPct}% similarity</span>
                    <span className="pm-drawer-proj">{drawerActivity.project}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="pm-drawer-close"
                  onClick={() => setDrawerActivityId(null)}
                  aria-label="Close drawer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body (Divided Cleanly by Spacing & Subtle Dividers) */}
            <div className="pm-drawer-body">
              {/* OUTCOME */}
              <div className="pm-drawer-sec">
                <span className="pm-sec-label">OUTCOME</span>
                <div className="pm-outcome-highlight">
                  <div className="pm-outcome-dur">
                    <span className="pm-dur-planned">{drawerActivity.plannedDuration}d plan</span>
                    <ArrowRight size={14} className="text-slate-500" />
                    <span className="pm-dur-actual">{drawerActivity.actualDuration}d actual</span>
                    <span className="pm-dur-delta">+{drawerActivity.variance}d</span>
                  </div>
                  {drawerActivity.delayCause !== "None" && (
                    <div className="pm-outcome-cause">
                      <span>Primary delay: <strong>{drawerActivity.delayCause}</strong></span>
                      {drawerActivity.delayDurationDays > 0 && (
                        <span>({drawerActivity.delayDurationDays} days)</span>
                      )}
                    </div>
                  )}
                  {drawerActivity.recordedNote && (
                    <p className="pm-outcome-quote">&quot;{drawerActivity.recordedNote}&quot;</p>
                  )}
                </div>
              </div>

              <div className="pm-drawer-div" />

              {/* 13. WHY IT IS SIMILAR */}
              <div className="pm-drawer-sec">
                <span className="pm-sec-label">WHY IT IS SIMILAR</span>
                <div className="pm-sim-clean-grid">
                  {[
                    { label: "Activity Type", val: drawerActivity.similarityBreakdown.activityType },
                    { label: "Discipline", val: drawerActivity.similarityBreakdown.discipline },
                    { label: "Asset Context", val: drawerActivity.similarityBreakdown.assetContext },
                    { label: "WBS Context", val: drawerActivity.similarityBreakdown.wbsContext },
                    { label: "Location", val: drawerActivity.similarityBreakdown.locationContext },
                    { label: "Pattern", val: drawerActivity.similarityBreakdown.executionPattern },
                  ].map((item) => (
                    <div key={item.label} className="pm-sim-item">
                      <span className="pm-sim-k">{item.label}</span>
                      <span
                        className={`pm-sim-v ${
                          item.val.toLowerCase().includes("exact")
                            ? "strength-exact"
                            : item.val.toLowerCase().includes("strong")
                            ? "strength-strong"
                            : "strength-moderate"
                        }`}
                      >
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="pm-sim-desc">{drawerActivity.similarityExplanation}</p>
              </div>

              <div className="pm-drawer-div" />

              {/* EXECUTION HISTORY (COMPACT VERTICAL TIMELINE) */}
              <div className="pm-drawer-sec">
                <span className="pm-sec-label">EXECUTION HISTORY</span>
                <div className="pm-timeline">
                  {drawerActivity.executionTimeline.map((ev, idx) => (
                    <div key={idx} className="pm-tl-item">
                      <span
                        className={`pm-tl-circle ${
                          ev.type === "delay"
                            ? "circ-delay"
                            : ev.type === "verification"
                            ? "circ-verify"
                            : ev.type === "schedule"
                            ? "circ-sched"
                            : "circ-field"
                        }`}
                      />
                      <div className="pm-tl-info">
                        <div className="pm-tl-hdr">
                          <span className="pm-tl-date">{ev.date}</span>
                          <span className="pm-tl-tag">{ev.type}</span>
                        </div>
                        <span className="pm-tl-desc">{ev.title}</span>
                        {ev.note && <span className="pm-tl-note">{ev.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pm-drawer-div" />

              {/* REUSABLE LESSON */}
              <div className="pm-drawer-sec">
                <span className="pm-sec-label">REUSABLE LESSON</span>
                <div className="pm-lesson-quote-box">
                  <p className="pm-lq-text">&quot;{drawerActivity.reusableLesson}&quot;</p>
                  <span className="pm-lq-tag">Historical lesson from verified field actuals</span>
                </div>
              </div>

              <div className="pm-drawer-div" />

              {/* SOURCE EVIDENCE */}
              <div className="pm-drawer-sec">
                <span className="pm-sec-label">SOURCE EVIDENCE</span>
                <div className="pm-evidence-rows">
                  {drawerActivity.sourceEvidence.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className="pm-ev-item"
                      onClick={() =>
                        setActiveEvidence({
                          item: ev,
                          activity: drawerActivity,
                        })
                      }
                      title={`Preview ${ev.filename}`}
                    >
                      <div className="pm-ev-ic">
                        {ev.type === "dpr" ? (
                          <FileSpreadsheet size={15} className="text-emerald-400" />
                        ) : ev.type === "pdf" ? (
                          <FileText size={15} className="text-sky-400" />
                        ) : ev.type === "image" ? (
                          <ImageIcon size={15} className="text-amber-400" />
                        ) : (
                          <FileCheck size={15} className="text-purple-400" />
                        )}
                      </div>
                      <div className="pm-ev-details">
                        <span className="pm-ev-name">{ev.filename}</span>
                        <span className="pm-ev-meta">
                          {ev.label} · {ev.date}
                        </span>
                      </div>
                      <Eye size={13} className="text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pm-drawer-div" />

              {/* DATA PROVENANCE */}
              <div className="pm-drawer-sec pm-prov-sec">
                <span className="pm-sec-label">DATA PROVENANCE</span>
                <div className="pm-prov-rows">
                  <div className="pm-prov-item">
                    <span>Verification status</span>
                    <span className="text-emerald-400">
                      <CheckCircle2 size={11} className="inline mr-1" />
                      {drawerActivity.provenance.status}
                    </span>
                  </div>
                  <div className="pm-prov-item">
                    <span>Verifier</span>
                    <span>{drawerActivity.provenance.verifier}</span>
                  </div>
                  <div className="pm-prov-item">
                    <span>Audit integrity</span>
                    <span className="text-emerald-400">
                      <ShieldCheck size={11} className="inline mr-1" />
                      SHA-256 Verified
                    </span>
                  </div>
                  <div className="pm-prov-item">
                    <span>Last indexed</span>
                    <span>{drawerActivity.provenance.lastIndexed}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ==================================================================== */}
      {/* EVIDENCE VIEWER MODAL */}
      {/* ==================================================================== */}
      {activeEvidence && (
        <div
          className="pm-modal-bg"
          onClick={() => setActiveEvidence(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Evidence preview"
        >
          <div className="pm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-top">
              <div className="pm-modal-title-wrap">
                <FileText size={16} className="text-emerald-400" />
                <div>
                  <h4 className="pm-modal-heading">{activeEvidence.item.filename}</h4>
                  <span className="pm-modal-sub">
                    {activeEvidence.item.label} · Linked to {activeEvidence.activity.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="pm-modal-x"
                onClick={() => setActiveEvidence(null)}
                aria-label="Close preview"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pm-modal-inner">
              <div className="pm-doc-sheet">
                <div className="pm-sheet-hdr">
                  <span className="pm-sheet-badge">AUDITED EVIDENCE RECORD</span>
                  <span className="pm-sheet-date">{activeEvidence.item.date}</span>
                </div>
                <div className="pm-sheet-content">
                  <p className="pm-sheet-desc">{activeEvidence.item.description}</p>
                  <div className="pm-sheet-meta-grid">
                    <div>
                      <span className="pm-sm-k">Project:</span>
                      <span className="pm-sm-v">{activeEvidence.activity.project}</span>
                    </div>
                    <div>
                      <span className="pm-sm-k">Workfront:</span>
                      <span className="pm-sm-v">{activeEvidence.activity.workfront}</span>
                    </div>
                    <div>
                      <span className="pm-sm-k">Contractor:</span>
                      <span className="pm-sm-v">{activeEvidence.activity.contractor}</span>
                    </div>
                    <div>
                      <span className="pm-sm-k">Verifier:</span>
                      <span className="pm-sm-v">
                        {activeEvidence.item.verifier ||
                          activeEvidence.activity.provenance.verifier}
                      </span>
                    </div>
                    <div>
                      <span className="pm-sm-k">Checksum:</span>
                      <span className="pm-sm-v font-mono text-emerald-400 text-xs">
                        sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                      </span>
                    </div>
                  </div>

                  {activeEvidence.item.type === "dpr" && (
                    <div className="pm-sheet-excerpt">
                      <span className="pm-ex-label">DPR Daily Shift Excerpt:</span>
                      <p>
                        &quot;Shift completed initial line flushing and hydrostatic manifold setup.
                        Confined space entry permit validation delayed by safety team review. Standby
                        hours logged: 11.2 crew hours.&quot;
                      </p>
                    </div>
                  )}

                  {activeEvidence.item.type === "pdf" && (
                    <div className="pm-sheet-excerpt">
                      <span className="pm-ex-label">Permit Register Excerpt:</span>
                      <p>
                        &quot;Permit #CS-PA3-087 re-issued following atmospheric gas monitoring
                        re-check. Certified safe for hot work and pressure testing.&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pm-modal-bottom">
              <span className="pm-modal-provenance-tag">
                <ShieldCheck size={13} className="text-emerald-400 inline mr-1" />
                Verified Historical Record · Read-Only
              </span>
              <button
                type="button"
                className="pm-btn-quiet"
                onClick={() => setActiveEvidence(null)}
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MEMORY COVERAGE MODAL */}
      {/* ==================================================================== */}
      {coverageModalOpen && (
        <div
          className="pm-modal-bg"
          onClick={() => setCoverageModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Memory coverage details"
        >
          <div className="pm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-top">
              <div className="pm-modal-title-wrap">
                <Database size={16} className="text-sky-400" />
                <div>
                  <h4 className="pm-modal-heading">Project Memory Coverage</h4>
                  <span className="pm-modal-sub">Institutional Repository Index</span>
                </div>
              </div>
              <button
                type="button"
                className="pm-modal-x"
                onClick={() => setCoverageModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pm-modal-inner">
              <div className="pm-cov-stat-grid">
                <div className="pm-cov-stat-cell">
                  <span className="pm-cov-number">
                    {memoryCoverageFixture.verifiedRecords.toLocaleString()}
                  </span>
                  <span className="pm-cov-lbl">Verified Execution Records</span>
                  <span className="pm-cov-subtext">100% human-planner verified actuals</span>
                </div>
                <div className="pm-cov-stat-cell">
                  <span className="pm-cov-number">{memoryCoverageFixture.projectsCount}</span>
                  <span className="pm-cov-lbl">Industrial Projects</span>
                  <span className="pm-cov-subtext">Capital process & utility facilities</span>
                </div>
                <div className="pm-cov-stat-cell">
                  <span className="pm-cov-number">{memoryCoverageFixture.disciplinesCount}</span>
                  <span className="pm-cov-lbl">Disciplines Covered</span>
                  <span className="pm-cov-subtext">Civil through HSE & Commissioning</span>
                </div>
                <div className="pm-cov-stat-cell">
                  <span className="pm-cov-number">
                    {memoryCoverageFixture.evidenceCoveragePct}%
                  </span>
                  <span className="pm-cov-lbl">Evidence Coverage</span>
                  <span className="pm-cov-subtext">Primary DPRs & inspection records</span>
                </div>
              </div>

              <div className="pm-cov-projects-box">
                <span className="pm-cov-projects-title">Indexed Projects:</span>
                <ul>
                  <li>South Process Expansion (2024–2026) · 318 records</li>
                  <li>North Utility Upgrade (2023–2025) · 246 records</li>
                  <li>West Process Revamp (2022–2024) · 198 records</li>
                  <li>Terminal Expansion (2021–2023) · 184 records</li>
                  <li>Utility Modernization (2020–2022) · 142 records</li>
                  <li>Process Train Upgrade (2019–2021) · 112 records</li>
                  <li>Offshore Pipeline Link (2019–2020) · 48 records</li>
                </ul>
              </div>
            </div>

            <div className="pm-modal-bottom">
              <span className="pm-modal-provenance-tag">
                Last indexed: {memoryCoverageFixture.lastIndexed}
              </span>
              <button
                type="button"
                className="pm-btn-quiet"
                onClick={() => setCoverageModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
