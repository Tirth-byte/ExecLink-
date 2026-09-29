"use client";

import React, { memo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  TriangleAlert,
} from "lucide-react";
import type { ScheduleActivity } from "@/data/schedule-explorer";
import {
  ROW_ACT_H,
  ROW_WBS_H,
  STATUS_LABEL,
  type StructureRow,
} from "./schedule-model";

/* ── WBS summary group node ──────────────────────────────────────────────── */
const WbsNodeRow = memo(function WbsNodeRow({
  row,
  onToggle,
  hovered,
  onHoverRow,
}: {
  row: Extract<StructureRow, { type: "wbs" }>;
  onToggle: (id: string) => void;
  hovered: boolean;
  onHoverRow: (id: string | null) => void;
}) {
  const { node, open, rollup } = row;
  const chevron = open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />;
  const padLeft = 12 + (node.level - 1) * 11;

  return (
    <div
      className={`scr-wbs-row scr-lv-${node.level}${open ? " is-open" : ""}${hovered ? " is-row-hovered" : ""}`}
      style={{ height: ROW_WBS_H }}
      title={`${node.name} · ${node.code}`}
      onMouseEnter={() => onHoverRow(`wbs:${node.id}`)}
      onMouseLeave={() => onHoverRow(null)}
    >
      <button
        type="button"
        className="scr-wbs-toggle"
        style={{ paddingLeft: padLeft }}
        onClick={() => onToggle(node.id)}
        aria-expanded={open}
        aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
      >
        <span className="scr-wbs-chevron">{chevron}</span>
        <div className="scr-wbs-info">
          <span className="scr-wbs-name">{node.name}</span>
          <span className="scr-wbs-count">
            {rollup.count} {rollup.count === 1 ? "activity" : "activities"}
          </span>
        </div>
      </button>

      <div className="scr-wbs-rollup">
        <span className="scr-wbs-pct">{rollup.verified}%</span>
        <span className="scr-wbs-track" aria-hidden>
          <span className="scr-wbs-track-done" style={{ width: `${rollup.verified}%` }} />
        </span>
      </div>
    </div>
  );
});

/* ── Activity execution row ──────────────────────────────────────────────── */
const ActivityRow = memo(function ActivityRow({
  activity,
  depth,
  selected,
  onSelect,
  hovered,
  onHoverRow,
}: {
  activity: ScheduleActivity;
  depth: number;
  selected: boolean;
  onSelect: (activity: ScheduleActivity) => void;
  hovered: boolean;
  onHoverRow: (id: string | null) => void;
}) {
  const padLeft = 12 + Math.min(depth, 3) * 11;

  return (
    <div
      className={`scr-exec-row${selected ? " is-selected" : ""}${hovered ? " is-row-hovered" : ""}`}
      style={{ height: ROW_ACT_H }}
      onMouseEnter={() => onHoverRow(`act:${activity.id}`)}
      onMouseLeave={() => onHoverRow(null)}
    >
      <button
        type="button"
        className="scr-exec-hit"
        style={{ paddingLeft: padLeft }}
        onClick={() => onSelect(activity)}
        aria-pressed={selected}
        aria-label={`${activity.name}, ${activity.id}, ${activity.discipline}, ${activity.currentProgress}% verified, ${STATUS_LABEL[activity.status]}`}
      >
        <div className="scr-exec-main">
          {/* Primary Line */}
          <span className="scr-exec-name" title={activity.name}>
            {activity.name}
          </span>
          {/* Secondary Line */}
          <span className="scr-exec-sub">
            {activity.id} · {activity.discipline} · {STATUS_LABEL[activity.status]}
          </span>
        </div>

        {/* Exceptional far-right information */}
        <div className="scr-exec-end">
          {activity.isCritical && (
            <span className="scr-badge-critical" title="Critical path activity">
              Critical
            </span>
          )}
          <span className="scr-exec-pct">{activity.currentProgress}%</span>
        </div>
      </button>
    </div>
  );
});

/* ── Pane ────────────────────────────────────────────────────────────────── */
export function StructurePane({
  rows,
  selectedId,
  hoveredRowId,
  onHoverRow,
  onSelect,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
  onClearFilters,
  hasFilters,
  scrollRef,
}: {
  rows: StructureRow[];
  selectedId: string | null;
  hoveredRowId: string | null;
  onHoverRow: (id: string | null) => void;
  onSelect: (activity: ScheduleActivity) => void;
  onToggleNode: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClearFilters: () => void;
  hasFilters: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const actCount = rows.filter((r) => r.type === "act").length;

  return (
    <section className="scr-pane scr-pane-structure" aria-label="Project structure">
      <header className="scr-pane-cap">
        <h2 className="scr-pane-cap-title">ACTIVITY / WBS</h2>
        <span className="scr-pane-cap-note">{actCount} activities</span>
        <div className="scr-pane-cap-tools">
          <button type="button" className="scr-icon-btn" onClick={onExpandAll} title="Expand all WBS nodes">
            <Maximize2 size={13} aria-hidden />
            <span className="sr-only">Expand all WBS nodes</span>
          </button>
          <button type="button" className="scr-icon-btn" onClick={onCollapseAll} title="Collapse to project level">
            <Minimize2 size={13} aria-hidden />
            <span className="sr-only">Collapse to project level</span>
          </button>
        </div>
      </header>

      <div className="scr-pane-scroll" ref={scrollRef}>
        {rows.length === 0 ? (
          <div className="scr-empty">
            <TriangleAlert size={18} aria-hidden />
            <p>No activities match the current command bar filters.</p>
            {hasFilters && (
              <button type="button" className="scr-ghost-btn" onClick={onClearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          rows.map((row) =>
            row.type === "wbs" ? (
              <WbsNodeRow key={row.node.id} row={row} onToggle={onToggleNode} hovered={hoveredRowId === `wbs:${row.node.id}`} onHoverRow={onHoverRow} />
            ) : (
              <ActivityRow
                key={row.activity.id}
                activity={row.activity}
                depth={row.depth}
                selected={selectedId === row.activity.id}
                onSelect={onSelect}
                hovered={hoveredRowId === `act:${row.activity.id}`}
                onHoverRow={onHoverRow}
              />
            ),
          )
        )}
      </div>
    </section>
  );
}
