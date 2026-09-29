"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  PROJECT_DATA_DATE,
  PROJECT_DATA_DATE_DISPLAY,
  SCHEDULE_ACTIVITIES,
  SCHEDULE_METRICS,
  type ScheduleActivity,
} from "@/data/schedule-explorer";
import { StructurePane } from "./schedule/structure-pane";
import { TimelinePane } from "./schedule/timeline-pane";
import {
  ActivityInspector,
  EvidenceLightbox,
  isInspectorTab,
  type InspectorTab,
} from "./schedule/activity-inspector";
import {
  ALL_EXPANDED,
  DISCIPLINES,
  ROOT_ONLY_EXPANDED,
  SCHEDULE_PULSE,
  TIMELINE,
  ZOOM_ORDER,
  activeFilterCount,
  applyFilters,
  buildStructureRows,
  DAY_WIDTH,
  EMPTY_FILTERS,
  ROW_ACT_H,
  ROW_WBS_H,
  type ScheduleFilters,
  type ZoomLevel,
} from "./schedule/schedule-model";

/* ── Quick filter chips ──────────────────────────────────────────────────── */
type QuickFilter = "All" | "Critical" | "Delayed" | "Blocked";

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Critical", label: "Critical" },
  { key: "Delayed", label: "Delayed" },
  { key: "Blocked", label: "Blocked" },
];

function quickFilterState(filters: ScheduleFilters): QuickFilter {
  if (filters.status === "Delayed") return "Delayed";
  if (filters.status === "Blocked") return "Blocked";
  if (filters.critical === "Critical") return "Critical";
  return "All";
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export function ScheduleExplorerWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialActivity = searchParams.get("activity");
  const initialTab = searchParams.get("tab");

  const [filters, setFilters] = useState<ScheduleFilters>(EMPTY_FILTERS);
  const [zoom, setZoom] = useState<ZoomLevel>("Week");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(ALL_EXPANDED);
  const [selectedId, setSelectedId] = useState<string | null>(initialActivity);
  const [inspectorOpen, setInspectorOpen] = useState(Boolean(initialActivity));
  const [tab, setTab] = useState<InspectorTab>(isInspectorTab(initialTab) ? initialTab : "overview");
  const [evidenceActivity, setEvidenceActivity] = useState<ScheduleActivity | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [leftPct, setLeftPct] = useState(35);
  const [resizing, setResizing] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const ddAnchor = useRef<number | null>(null);

  /* Deep link from Live Execution: /schedule-explorer?activity=ACT-P110&tab=events.
     Adjusting during render keeps the selection in sync without a cascading effect. */
  const [deepLink, setDeepLink] = useState<string | null>(initialActivity);
  if (initialActivity && initialActivity !== deepLink) {
    setDeepLink(initialActivity);
    setSelectedId(initialActivity);
    setInspectorOpen(true);
    if (isInspectorTab(initialTab)) setTab(initialTab);
  }

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const visible = useMemo(() => applyFilters(filters), [filters]);
  const rows = useMemo(() => buildStructureRows(visible, expanded), [visible, expanded]);
  const selected = useMemo(
    () => SCHEDULE_ACTIVITIES.find((a) => a.id === selectedId) ?? null,
    [selectedId],
  );
  const filterCount = activeFilterCount(filters);
  const quick = quickFilterState(filters);

  /* The chart always fills its pane. At coarse zooms the natural canvas is
     narrower than the pane, so widen the day columns to fit rather than leave
     dead space beside the schedule. Measured here because the Data Date
     anchoring and centring below share the same geometry. */
  const [hostWidth, setHostWidth] = useState(0);
  useEffect(() => {
    const host = rightScrollRef.current;
    if (!host) return;
    const measure = () => setHostWidth(host.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const dayWidth = hostWidth > 0 ? Math.max(DAY_WIDTH[zoom], hostWidth / TIMELINE.dayCount) : DAY_WIDTH[zoom];

  /* Mirror the selection back into the URL so the deep link stays shareable and
     survives a reload. `replace` keeps row-clicking from filling the history
     stack; the URL is only rewritten when the shape actually changes. */
  const urlActivity = inspectorOpen ? selectedId : null;
  const urlTab = tab;
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (urlActivity) params.set("activity", urlActivity);
    else params.delete("activity");
    if (urlActivity && urlTab !== "overview") params.set("tab", urlTab);
    else params.delete("tab");
    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [urlActivity, urlTab, router, pathname, searchParams]);

  /* ── Effects ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [exportOpen]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (event: MouseEvent) => {
      const host = workspaceRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const pct = ((event.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(56, Math.max(26, Math.round(pct))));
    };
    const onUp = () => setResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  /* Keep the Data Date pinned to the same screen position across zoom changes. */
  useEffect(() => {
    const host = rightScrollRef.current;
    if (!host) return;
    if (ddAnchor.current === null) {
      ddAnchor.current = TIMELINE.dataDateIndex * dayWidth;
      const target = TIMELINE.dataDateIndex * dayWidth + dayWidth / 2 - host.clientWidth / 2;
      host.scrollLeft = Math.max(0, target);
      return;
    }
    const delta = TIMELINE.dataDateIndex * dayWidth - ddAnchor.current;
    if (delta !== 0) {
      host.scrollLeft = Math.max(0, host.scrollLeft + delta);
      ddAnchor.current = TIMELINE.dataDateIndex * dayWidth;
    }
  }, [dayWidth]);

  /* Reveal the selected activity. Jump (do not animate) so a deep link arriving
     from another page lands on its target on the very first painted frame. */
  useEffect(() => {
    if (!selectedId) return;
    const index = rows.findIndex((r) => r.type === "act" && r.activity.id === selectedId);
    if (index < 0) return;
    const host = leftScrollRef.current;
    if (!host) return;
    const offset = rows.slice(0, index).reduce((h, r) => h + (r.type === "wbs" ? ROW_WBS_H : ROW_ACT_H), 0);
    if (offset < host.scrollTop || offset + ROW_ACT_H > host.scrollTop + host.clientHeight) {
      host.scrollTop = Math.max(0, Math.min(offset - host.clientHeight / 2 + ROW_ACT_H / 2, host.scrollHeight - host.clientHeight));
    }
  }, [selectedId, rows]);

  /* ── Actions ───────────────────────────────────────────────────────────── */
  function selectActivity(activity: ScheduleActivity) {
    setSelectedId(activity.id);
    setInspectorOpen(true);
  }

  function closeInspector() {
    setInspectorOpen(false);
  }

  function navigateTo(id: string) {
    const target = SCHEDULE_ACTIVITIES.find((a) => a.id === id);
    if (target) selectActivity(target);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const applyQuickFilter = (key: QuickFilter) => {
    setFilters((prev) => {
      if (key === "All") return { ...prev, status: "All", critical: "All" };
      if (key === "Critical") return { ...prev, critical: prev.critical === "Critical" ? "All" : "Critical", status: "All" };
      return { ...prev, status: prev.status === key ? "All" : key, critical: "All" };
    });
  };

  const nudgeZoom = (direction: 1 | -1) => {
    setZoom((current) => {
      const index = ZOOM_ORDER.indexOf(current);
      const next = ZOOM_ORDER[Math.min(ZOOM_ORDER.length - 1, Math.max(0, index + direction))];
      return next;
    });
  };

  const centerOnDataDate = () => {
    const host = rightScrollRef.current;
    if (!host || TIMELINE.dataDateIndex < 0) return;
    const target = TIMELINE.dataDateIndex * dayWidth + dayWidth / 2 - host.clientWidth / 2;
    host.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  };

  /* ── Exports (unchanged contract) ──────────────────────────────────────── */
  const download = (filename: string, mime: string, payload: string) => {
    const el = document.createElement("a");
    el.href = `data:${mime};charset=utf-8,` + encodeURIComponent(payload);
    el.download = filename;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    setExportOpen(false);
  };

  const exportCSV = () => {
    const header = [
      "Activity ID", "Activity Name", "Discipline", "WBS Path", "Baseline Start", "Baseline Finish",
      "Current Start", "Current Finish", "Actual Start", "Actual Finish", "Baseline %", "Verified %",
      "Float", "Status", "Critical", "Milestone", "Location", "Contractor", "Asset",
    ];
    const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = visible.map((a) =>
      [
        a.id, quote(a.name), a.discipline, quote(a.wbsPath), a.baselineStart, a.baselineFinish,
        a.currentStart, a.currentFinish, a.actualStart || "—", a.actualFinish || "—",
        a.baselineProgress, a.currentProgress, a.totalFloat, a.status,
        a.isCritical ? "Yes" : "No", a.isMilestone ? "Yes" : "No", quote(a.location),
        quote(a.contractor), a.assetTag,
      ].join(","),
    );
    download(`execlink-schedule-${PROJECT_DATA_DATE}.csv`, "text/csv", [header.join(","), ...body].join("\n"));
  };

  const exportJSON = () => {
    download(
      `execlink-schedule-${PROJECT_DATA_DATE}.json`,
      "text/json",
      JSON.stringify(
        {
          project: "North River Expansion Project (PRJ-DEMO-001)",
          dataDate: PROJECT_DATA_DATE,
          exportTimestamp: new Date().toISOString(),
          metrics: SCHEDULE_METRICS,
          activities: visible,
        },
        null,
        2,
      ),
    );
  };

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="scr-root">
      <header className="scr-head">
        <div className="scr-head-id">
          <h1 className="scr-head-title">Schedule Explorer</h1>
          <p className="scr-head-sub">North River Expansion · L6 Schedule</p>
        </div>
        <div className="scr-head-tools">
          <button type="button" className="scr-dd-btn" onClick={centerOnDataDate} title="Centre the timeline on the Data Date">
            <CalendarDays size={13} aria-hidden />
            <span className="scr-dd-btn-lbl">Data Date</span>
            <strong>{PROJECT_DATA_DATE_DISPLAY}</strong>
          </button>
          <div className="scr-export" ref={exportRef}>
            <button
              type="button"
              className="scr-btn"
              onClick={() => setExportOpen((v) => !v)}
              aria-expanded={exportOpen}
              aria-haspopup="menu"
            >
              <Download size={13} aria-hidden />
              Export
              <ChevronDown size={12} aria-hidden />
            </button>
            {exportOpen && (
              <div className="scr-export-menu" role="menu">
                <button type="button" role="menuitem" onClick={exportCSV}>
                  Export CSV
                </button>
                <button type="button" role="menuitem" onClick={exportJSON}>
                  Export JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="scr-pulse" aria-label="Schedule pulse">
        {SCHEDULE_PULSE.map((metric) => (
          <article key={metric.key} className={`scr-gauge scr-gauge-${metric.tone}`}>
            <div className="scr-gauge-top">
              <span className="scr-gauge-value">
                {metric.value}
                {metric.unit && <span className="scr-gauge-unit">{metric.unit}</span>}
              </span>
              <span className="scr-gauge-label">{metric.label}</span>
            </div>
            <div className="scr-gauge-hint">{metric.hint}</div>
          </article>
        ))}
      </section>

      <div className="scr-command">
        <div className="scr-search">
          <Search size={13} aria-hidden />
          <input
            id="schedule-search"
            type="search"
            value={filters.query}
            onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
            placeholder="Search schedule"
            aria-label="Search schedule"
          />
          {filters.query && (
            <button type="button" onClick={() => setFilters((p) => ({ ...p, query: "" }))} aria-label="Clear search">
              <X size={12} aria-hidden />
            </button>
          )}
        </div>

        <div className="scr-chips" role="group" aria-label="Quick filters">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`scr-chip${quick === f.key ? " is-on" : ""}${f.key !== "All" ? ` is-${f.key.toLowerCase()}` : ""}`}
              onClick={() => applyQuickFilter(f.key)}
              aria-pressed={quick === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="scr-select">
          <span className="sr-only">Filter by discipline</span>
          <select
            value={filters.discipline}
            onChange={(e) => setFilters((p) => ({ ...p, discipline: e.target.value }))}
          >
            <option value="All">All disciplines</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown size={12} aria-hidden />
        </label>

        <details className="scr-more">
          <summary className="scr-btn">
            <Filter size={12} aria-hidden />
            More filters
            {(filters.status !== "All" || filters.critical !== "All" || filters.progress !== "All") && (
              <span className="scr-more-dot" aria-hidden />
            )}
          </summary>
          <div className="scr-more-pop">
            <label className="scr-more-field">
              <span>Status</span>
              <select
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="All">Any status</option>
                <option value="Not Started">Not started</option>
                <option value="In Progress">In progress</option>
                <option value="Delayed">Delayed</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
              </select>
            </label>
            <label className="scr-more-field">
              <span>Critical path</span>
              <select
                value={filters.critical}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, critical: e.target.value as ScheduleFilters["critical"] }))
                }
              >
                <option value="All">All activities</option>
                <option value="Critical">Critical only</option>
                <option value="Non-Critical">Non-critical only</option>
              </select>
            </label>
            <label className="scr-more-field">
              <span>Verified progress</span>
              <select
                value={filters.progress}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, progress: e.target.value as ScheduleFilters["progress"] }))
                }
              >
                <option value="All">Any progress</option>
                <option value="0%">0% — not started</option>
                <option value="1–99%">1–99% — partial</option>
                <option value="100%">100% — verified complete</option>
              </select>
            </label>
            {filterCount > 0 && (
              <button type="button" className="scr-more-clear" onClick={clearFilters}>
                Clear {filterCount} active filter{filterCount === 1 ? "" : "s"}
              </button>
            )}
          </div>
        </details>

        {filterCount > 0 && (
          <span className="scr-filtercount">
            {filterCount} active
            <button type="button" onClick={clearFilters} aria-label="Clear all filters">
              <X size={11} aria-hidden />
            </button>
          </span>
        )}

        <div className="scr-command-right">
          <div className="scr-zoom" role="group" aria-label="Timeline zoom">
            <button
              type="button"
              onClick={() => nudgeZoom(-1)}
              disabled={zoom === ZOOM_ORDER[0]}
              aria-label="Zoom out"
            >
              <Minus size={12} aria-hidden />
            </button>
            <span aria-live="polite">{zoom}</span>
            <button
              type="button"
              onClick={() => nudgeZoom(1)}
              disabled={zoom === ZOOM_ORDER[ZOOM_ORDER.length - 1]}
              aria-label="Zoom in"
            >
              <Plus size={12} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="scr-workspace" ref={workspaceRef} style={{ ["--scr-left" as string]: `${leftPct}%` }}>
        <StructurePane
          rows={rows}
          selectedId={selectedId}
          hoveredRowId={hoveredRowId}
          onHoverRow={setHoveredRowId}
          onSelect={selectActivity}
          onToggleNode={(id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))}
          onExpandAll={() => setExpanded(ALL_EXPANDED)}
          onCollapseAll={() => setExpanded(ROOT_ONLY_EXPANDED)}
          onClearFilters={clearFilters}
          hasFilters={filterCount > 0}
          scrollRef={leftScrollRef}
        />

        <div
          className={`scr-split${resizing ? " is-resizing" : ""}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize project structure pane"
          aria-valuenow={leftPct}
          aria-valuemin={26}
          aria-valuemax={56}
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault();
            setResizing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setLeftPct((v) => Math.max(26, v - 2));
            if (e.key === "ArrowRight") setLeftPct((v) => Math.min(56, v + 2));
          }}
        />

        <TimelinePane
          rows={rows}
          zoom={zoom}
          dayWidth={dayWidth}
          selectedId={selectedId}
          hoveredRowId={hoveredRowId}
          onHoverRow={setHoveredRowId}
          onSelect={selectActivity}
          scrollRef={rightScrollRef}
          emptyAction={
            <div className="scr-tl-empty-inner">
              <p>No activities to plot for the current filters.</p>
              {filterCount > 0 && (
                <button type="button" className="scr-ghost-btn" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          }
        />

        {inspectorOpen && selected && (
          <ActivityInspector
            activity={selected}
            tab={tab}
            onTabChange={setTab}
            onClose={closeInspector}
            onNavigate={navigateTo}
            onOpenEvidence={setEvidenceActivity}
          />
        )}

        <footer className="scr-workspace-foot">
          <span className="scr-foot-hint">Click an activity to inspect · Drag divider to resize · Shift+wheel to scroll dates</span>
        </footer>
      </div>

      {evidenceActivity && (
        <EvidenceLightbox activity={evidenceActivity} onClose={() => setEvidenceActivity(null)} />
      )}
    </div>
  );
}
