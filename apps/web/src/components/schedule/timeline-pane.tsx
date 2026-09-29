"use client";

import React, { memo, useMemo } from "react";
import { AlertTriangle, Check, Clock } from "lucide-react";
import type { ScheduleActivity } from "@/data/schedule-explorer";
import {
  ROW_ACT_H,
  ROW_WBS_H,
  TIMELINE,
  fmtDate,
  fmtDateLong,
  spanGeometry,
  type StructureRow,
  type ZoomLevel,
} from "./schedule-model";

/* ── Minimalist Grid: Month & Week boundaries, Weekend shading, Data Date line ── */
function CalendarGrid({ dayWidth }: { dayWidth: number }) {
  const bands = useMemo(() => {
    const weekends: { key: string; left: number; width: number }[] = [];
    let run: { start: number; len: number } | null = null;
    for (let i = 0; i < TIMELINE.days.length; i += 1) {
      if (TIMELINE.days[i].isWeekend) {
        if (!run) run = { start: i, len: 0 };
        run.len += 1;
      } else if (run) {
        weekends.push({ key: `we-${run.start}`, left: run.start * dayWidth, width: run.len * dayWidth });
        run = null;
      }
    }
    if (run) weekends.push({ key: `we-${run.start}`, left: run.start * dayWidth, width: run.len * dayWidth });

    return {
      weekends,
      weekLines: TIMELINE.weeks.slice(1).map((w) => ({ key: w.key, left: w.startIndex * dayWidth })),
      monthLines: TIMELINE.months.slice(1).map((m) => ({ key: m.key, left: m.startIndex * dayWidth })),
    };
  }, [dayWidth]);

  return (
    <div className="scr-grid" aria-hidden>
      {bands.weekends.map((b) => (
        <span key={b.key} className="scr-grid-weekend" style={{ left: b.left, width: b.width }} />
      ))}
      {bands.weekLines.map((l) => (
        <span key={l.key} className="scr-grid-week" style={{ left: l.left }} />
      ))}
      {bands.monthLines.map((l) => (
        <span key={l.key} className="scr-grid-month" style={{ left: l.left }} />
      ))}
    </div>
  );
}

/* ── Calendar Header: Month banner, Data Date badge, clean Day cells ─────── */
function CalendarHeader({ dayWidth, zoom }: { dayWidth: number; zoom: ZoomLevel }) {
  const ddLeft = TIMELINE.dataDateIndex >= 0 ? TIMELINE.dataDateIndex * dayWidth + dayWidth / 2 : 0;

  return (
    <div className="scr-cal" data-zoom={zoom}>
      {/* Sticky Data Date Marker Badge */}
      <div className="scr-cal-dd-lane" aria-hidden>
        <div className="scr-dd-flag" style={{ left: ddLeft }}>
          <span className="scr-dd-flag-title">DATA DATE · 26 SEP</span>
        </div>
      </div>

      {/* Month Level */}
      <div className="scr-cal-months">
        {TIMELINE.months.map((m) => (
          <span
            key={m.key}
            className="scr-cal-month"
            style={{ left: m.startIndex * dayWidth, width: m.days * dayWidth }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Day Level */}
      <div className="scr-cal-days">
        {TIMELINE.days.map((d, i) => (
          <div
            key={d.iso}
            className={`scr-cal-day${d.isDataDate ? " is-dd" : ""}${d.isWeekend ? " is-weekend" : ""}${
              d.isWeekStart ? " is-week-start" : ""
            }`}
            style={{ left: i * dayWidth, width: dayWidth }}
          >
            <span className="scr-cal-dow">{d.dow}</span>
            <span className="scr-cal-dom">{d.dom}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Activity Execution Bar (The Hero Schedule Block) ─────────────────────── */
const ActivityBar = memo(function ActivityBar({
  activity,
  dayWidth,
  selected,
  onSelect,
  hovered,
  onHoverRow,
}: {
  activity: ScheduleActivity;
  dayWidth: number;
  canvasWidth: number;
  selected: boolean;
  onSelect: (activity: ScheduleActivity) => void;
  hovered: boolean;
  onHoverRow: (id: string | null) => void;
}) {
  const baseline = spanGeometry(activity.baselineStart, activity.baselineFinish, dayWidth);
  const current = spanGeometry(activity.currentStart, activity.currentFinish, dayWidth);
  const verified = Math.min(100, Math.max(0, activity.currentProgress));

  const hoverTooltip = `${activity.name}\nBaseline: ${fmtDate(activity.baselineStart)} – ${fmtDate(
    activity.baselineFinish,
  )}\nCurrent: ${fmtDate(activity.currentStart)} – ${fmtDate(
    activity.currentFinish,
  )}\nVerified: ${activity.currentProgress}%`;

  // Milestone representation
  if (activity.isMilestone) {
    const at = current.left + current.width / 2;
    return (
      <div
        className={`scr-tl-row scr-tl-row-act${selected ? " is-selected" : ""}${hovered ? " is-row-hovered" : ""}`}
        style={{ height: ROW_ACT_H }}
        onMouseEnter={() => onHoverRow(`act:${activity.id}`)}
        onMouseLeave={() => onHoverRow(null)}
      >
        <button
          type="button"
          className="scr-rowhit"
          onClick={() => onSelect(activity)}
          aria-label={`${activity.name}, Milestone at ${fmtDate(activity.currentStart)}`}
          title={hoverTooltip}
        />
        <div className="scr-ms-pill" style={{ left: at }}>
          <span className="scr-ms-diamond" aria-hidden />
          <span className="scr-ms-text">Milestone · {fmtDate(activity.currentStart)}</span>
        </div>
      </div>
    );
  }

  // Determine state style and readable label
  let blockStateClass = "scr-blk-neutral";
  let blockContent = <span>{activity.name}</span>;

  if (activity.status === "Completed") {
    blockStateClass = "scr-blk-completed";
    blockContent = (
      <>
        <Check size={13} className="scr-blk-icon" aria-hidden />
        <span className="scr-blk-text">
          {current.width > 110 ? "✓ Completed · 100%" : "✓ 100%"}
        </span>
      </>
    );
  } else if (activity.status === "Blocked") {
    blockStateClass = "scr-blk-blocked";
    blockContent = (
      <>
        <AlertTriangle size={13} className="scr-blk-icon" aria-hidden />
        <span className="scr-blk-text">
          {current.width > 100 ? "! Blocked" : "!"}
        </span>
      </>
    );
  } else if (activity.status === "Delayed") {
    blockStateClass = "scr-blk-delayed";
    blockContent = (
      <>
        <Clock size={13} className="scr-blk-icon" aria-hidden />
        <span className="scr-blk-text">
          {current.width > 120
            ? `${activity.currentProgress}% · Delayed`
            : `${activity.currentProgress}%`}
        </span>
      </>
    );
  } else if (activity.status === "In Progress") {
    blockStateClass = "scr-blk-active";
    blockContent = (
      <span className="scr-blk-text">
        {current.width > 160
          ? `${activity.currentProgress}% · ${activity.name}`
          : current.width > 90
          ? `${activity.currentProgress}% · In Progress`
          : `${activity.currentProgress}%`}
      </span>
    );
  } else {
    // Not Started
    blockStateClass = "scr-blk-neutral";
    blockContent = (
      <span className="scr-blk-text">
        {current.width > 90 ? "Not Started" : "0%"}
      </span>
    );
  }

  return (
    <div
      className={`scr-tl-row scr-tl-row-act${selected ? " is-selected" : ""}${hovered ? " is-row-hovered" : ""}`}
      style={{ height: ROW_ACT_H }}
      onMouseEnter={() => onHoverRow(`act:${activity.id}`)}
      onMouseLeave={() => onHoverRow(null)}
    >
      {/* Background click target */}
      <button
        type="button"
        className="scr-rowhit"
        onClick={() => onSelect(activity)}
        aria-label={`${activity.name}, ${activity.id}, ${activity.status}, ${activity.currentProgress}%`}
        title={hoverTooltip}
      />

      {/* Baseline thin neutral line (positioned above the primary block) */}
      <div
        className="scr-baseline-line"
        style={{ left: baseline.left, width: baseline.width }}
        title={`Baseline Schedule: ${fmtDate(activity.baselineStart)} – ${fmtDate(activity.baselineFinish)}`}
        aria-hidden
      />

      {/* Large Rounded Schedule Block (Primary Hero) */}
      <div
        className={`scr-schedule-block ${blockStateClass}${selected ? " is-block-selected" : ""}`}
        style={{ left: current.left, width: current.width }}
        onClick={() => onSelect(activity)}
        role="button"
        tabIndex={0}
      >
        {/* Subtle tonal progress fill */}
        {verified > 0 && activity.status === "In Progress" && (
          <div className="scr-blk-progress-fill" style={{ width: `${verified}%` }} aria-hidden />
        )}
        <div className="scr-blk-inner">{blockContent}</div>
      </div>
      <div className="scr-block-tooltip" style={{ left: current.left }} role="tooltip">
        <strong>{activity.name}</strong>
        <span className="scr-block-tooltip-id">{activity.id}</span>
        <span className="scr-block-tooltip-dates">{fmtDate(activity.currentStart)} → {fmtDate(activity.currentFinish)}</span>
        <dl>
          <div><dt>Verified progress</dt><dd>{activity.currentProgress}%</dd></div>
          <div><dt>Status</dt><dd>{activity.status}</dd></div>
          <div><dt>Total Float</dt><dd>{activity.totalFloat}</dd></div>
          <div><dt>Discipline</dt><dd>{activity.discipline}</dd></div>
        </dl>
      </div>
    </div>
  );
});

/* ── WBS summary row in Timeline ─────────────────────────────────────────── */
const WbsBar = memo(function WbsBar({
  row,
  dayWidth,
  hovered,
  onHoverRow,
}: {
  row: Extract<StructureRow, { type: "wbs" }>;
  dayWidth: number;
  hovered: boolean;
  onHoverRow: (id: string | null) => void;
}) {
  const span = spanGeometry(row.rollup.fromIso, row.rollup.toIso, dayWidth);
  return (
    <div className={`scr-tl-row scr-tl-row-wbs${hovered ? " is-row-hovered" : ""}`} style={{ height: ROW_WBS_H }} onMouseEnter={() => onHoverRow(`wbs:${row.node.id}`)} onMouseLeave={() => onHoverRow(null)}>
      <div
        className="scr-wbs-bar"
        style={{ left: span.left, width: span.width }}
        title={`${row.node.name} · ${row.rollup.count} activities · ${row.rollup.verified}% verified`}
      >
        <div className="scr-wbs-bar-fill" style={{ width: `${row.rollup.verified}%` }} />
      </div>
    </div>
  );
});

/* ── Execution Timeline Pane ─────────────────────────────────────────────── */
export function TimelinePane({
  rows,
  zoom,
  dayWidth,
  selectedId,
  hoveredRowId,
  onHoverRow,
  onSelect,
  scrollRef,
  emptyAction,
}: {
  rows: StructureRow[];
  zoom: ZoomLevel;
  dayWidth: number;
  selectedId: string | null;
  hoveredRowId: string | null;
  onHoverRow: (id: string | null) => void;
  onSelect: (activity: ScheduleActivity) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  emptyAction?: React.ReactNode;
}) {
  const canvasWidth = TIMELINE.dayCount * dayWidth;
  const ddLeft = TIMELINE.dataDateIndex >= 0 ? TIMELINE.dataDateIndex * dayWidth + dayWidth / 2 : 0;
  const totalHeight = rows.reduce((h, r) => h + (r.type === "wbs" ? ROW_WBS_H : ROW_ACT_H), 0);

  return (
    <section className="scr-pane scr-pane-timeline" aria-label="Execution timeline">
      <header className="scr-pane-cap">
        <h2 className="scr-pane-cap-title">EXECUTION CALENDAR</h2>
        <span className="scr-pane-cap-note">
          {fmtDate(TIMELINE.startIso)} – {fmtDateLong(TIMELINE.endIso)}
        </span>
      </header>

      <div className="scr-tl-scroll" ref={scrollRef}>
        {rows.length === 0 ? (
          <div className="scr-tl-empty">{emptyAction}</div>
        ) : (
          <div className="scr-tl-canvas" style={{ width: canvasWidth }}>
            <CalendarHeader dayWidth={dayWidth} zoom={zoom} />

            <div className="scr-tl-rows" style={{ height: totalHeight }}>
              <CalendarGrid dayWidth={dayWidth} />

              {/* Clean Single Blue Data Date Vertical Line */}
              <div className="scr-dd-line" style={{ left: ddLeft }} aria-hidden />

              {rows.map((row) =>
                row.type === "wbs" ? (
                  <WbsBar key={row.node.id} row={row} dayWidth={dayWidth} hovered={hoveredRowId === `wbs:${row.node.id}`} onHoverRow={onHoverRow} />
                ) : (
                  <ActivityBar
                    key={row.activity.id}
                    activity={row.activity}
                    dayWidth={dayWidth}
                    canvasWidth={canvasWidth}
                    selected={selectedId === row.activity.id}
                    onSelect={onSelect}
                    hovered={hoveredRowId === `act:${row.activity.id}`}
                    onHoverRow={onHoverRow}
                  />
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
