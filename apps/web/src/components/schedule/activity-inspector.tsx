"use client";

import React, { useEffect, useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  X,
} from "lucide-react";
import type { ScheduleActivity, ScheduleAuditRecord } from "@/data/schedule-explorer";
import {
  DISCIPLINE_DOT,
  STATUS_LABEL,
  fmtDate,
  progressVariance,
  statusTone,
  verifiedSource,
} from "./schedule-model";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "events", label: "Events" },
  { key: "evidence", label: "Evidence" },
  { key: "dependencies", label: "Dependencies" },
  { key: "history", label: "History" },
] as const;

export type InspectorTab = (typeof TABS)[number]["key"];

export function isInspectorTab(v: string | null): v is InspectorTab {
  return v !== null && TABS.some((t) => t.key === v);
}

function Fact({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="scr-fact">
      <dt>{label}</dt>
      <dd className={mono ? "scr-mono" : undefined}>{value}</dd>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="scr-ins-empty">
      <FileText size={15} aria-hidden />
      <p>{children}</p>
    </div>
  );
}

function AuditRow({ record }: { record: ScheduleAuditRecord }) {
  return (
    <li className="scr-audit">
      <div className="scr-audit-top">
        <span className="scr-audit-time">{record.timestamp}</span>
        <span className="scr-audit-actor">{record.actor}</span>
      </div>
      <p className="scr-audit-action">{record.action}</p>
      {record.from !== undefined && record.to !== undefined && (
        <div className="scr-audit-delta scr-mono">
          {record.from}% <ArrowRight size={10} aria-hidden /> {record.to}%
        </div>
      )}
      {record.note && <p className="scr-audit-note">{record.note}</p>}
    </li>
  );
}

export function ActivityInspector({
  activity,
  tab,
  onTabChange,
  onClose,
  onNavigate,
  onOpenEvidence,
}: {
  activity: ScheduleActivity;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onOpenEvidence: (activity: ScheduleActivity) => void;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const tone = statusTone(activity.status);
  const variance = progressVariance(activity);
  const source = verifiedSource(activity);
  const hasProposal = typeof activity.proposedProgress === "number";
  const proposalDelta = hasProposal ? activity.proposedProgress! - activity.currentProgress : 0;
  const events = activity.executionEvents;
  const pending = events.filter((e) => e.verificationState !== "Verified");

  return (
    <aside className="scr-inspector" role="dialog" aria-label={`Activity inspector — ${activity.name}`}>
      <header className="scr-ins-head">
        <div className="scr-ins-head-top">
          <span className="scr-ins-id scr-mono">{activity.id}</span>
          <span className="scr-ins-sep" aria-hidden>
            ·
          </span>
          <span className="scr-ins-disc">
            <span className="scr-disc-dot" style={{ background: DISCIPLINE_DOT[activity.discipline] }} aria-hidden />
            {activity.discipline}
          </span>
          {activity.isMilestone && <span className="scr-tag scr-tag-ms">Milestone</span>}
          {activity.isCritical && <span className="scr-tag scr-tag-crit">Critical path</span>}
          <button type="button" className="scr-ins-close" onClick={onClose} aria-label="Close activity inspector">
            <X size={15} aria-hidden />
          </button>
        </div>

        <h2 className="scr-ins-title">{activity.name}</h2>

        <div className="scr-ins-score">
          <div className="scr-ins-score-main">
            <span className="scr-ins-score-num">{activity.currentProgress}%</span>
            <span className="scr-ins-score-lbl">Verified</span>
          </div>
          <div className="scr-ins-score-side">
            <span className={`scr-status scr-pill scr-tone-${tone}`}>
              <span className="scr-status-dot" aria-hidden />
              {STATUS_LABEL[activity.status]}
            </span>
            <span className="scr-ins-score-plan">
              Planned {activity.baselineProgress}%
              <em className={variance < 0 ? "is-behind" : "is-ok"}>
                {variance > 0 ? "+" : ""}
                {variance} pts
              </em>
            </span>
          </div>
        </div>

        <dl className="scr-ins-facts">
          <Fact
            label="Baseline"
            value={`${fmtDate(activity.baselineStart)} → ${fmtDate(activity.baselineFinish)}`}
          />
          <Fact
            label="Current"
            value={`${fmtDate(activity.currentStart)} → ${fmtDate(activity.currentFinish)}`}
          />
          <Fact
            label="Actual"
            value={`${activity.actualStart ? fmtDate(activity.actualStart) : "—"} → ${
              activity.actualFinish ? fmtDate(activity.actualFinish) : "—"
            }`}
          />
          <Fact label="Float" value={activity.totalFloat} />
        </dl>
      </header>

      <nav className="scr-ins-tabs" role="tablist" aria-label="Activity detail sections">
        {TABS.map((t) => {
          const count =
            t.key === "events"
              ? events.length
              : t.key === "evidence"
                ? activity.evidence
                  ? 1
                  : 0
                : t.key === "history"
                  ? activity.history.length
                  : t.key === "dependencies"
                    ? activity.dependencies.predecessors.length + activity.dependencies.successors.length
                    : 0;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`scr-ins-tab${tab === t.key ? " is-active" : ""}`}
              onClick={() => onTabChange(t.key)}
            >
              {t.label}
              {count > 0 && <span className="scr-ins-tab-cnt">{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className="scr-ins-body">
        {tab === "overview" && (
          <div className="scr-ins-section">
            {hasProposal && (
              <div className="scr-notice">
                <Info size={13} aria-hidden />
                <div>
                  <p className="scr-notice-head">Reconciliation proposal in flight</p>
                  <p className="scr-notice-body">
                    A field update proposes <strong>{activity.proposedProgress}%</strong> (
                    {proposalDelta > 0 ? "+" : ""}
                    {proposalDelta} pts) over the verified {activity.currentProgress}%. Verified actual stays at{" "}
                    {activity.currentProgress}% until a planner approves it in Match Review.
                  </p>
                </div>
              </div>
            )}

            <div className="scr-ins-block">
              <span className="scr-ins-block-lbl">WBS path</span>
              <p className="scr-ins-block-val">{activity.wbsPath}</p>
            </div>

            <div className="scr-ins-block">
              <span className="scr-ins-block-lbl">Progress against plan</span>
              <div className="scr-ins-bar" role="img" aria-label={`Verified ${activity.currentProgress}% against planned ${activity.baselineProgress}%`}>
                <span className="scr-ins-bar-plan" style={{ width: `${activity.baselineProgress}%` }} />
                <span className="scr-ins-bar-done" style={{ width: `${activity.currentProgress}%` }} />
              </div>
              <div className="scr-ins-bar-legend">
                <span>Planned {activity.baselineProgress}%</span>
                <span>Verified {activity.currentProgress}%</span>
              </div>
            </div>

            <div className="scr-ins-block">
              <span className="scr-ins-block-lbl">Execution</span>
              <dl className="scr-ins-grid">
                <Fact label="Location" value={activity.location} />
                <Fact label="Contractor" value={activity.contractor} />
                <Fact label="Asset / tag" value={activity.assetTag} mono />
                <Fact label="Verified source" value={source ?? "No verified event on record"} />
              </dl>
            </div>

            {pending.length > 0 && (
              <div className="scr-ins-block">
                <span className="scr-ins-block-lbl">Awaiting verification</span>
                <ul className="scr-ins-pending">
                  {pending.map((e, i) => (
                    <li key={i}>
                      <span>{e.title}</span>
                      <em>{e.verificationState}</em>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "events" && (
          <div className="scr-ins-section">
            {events.length === 0 ? (
              <EmptyNote>No field execution events have been logged against this activity.</EmptyNote>
            ) : (
              <ol className="scr-events">
                {events.map((e, i) => (
                  <li key={i} className="scr-event">
                    <span
                      className={`scr-event-mark${e.verificationState === "Verified" ? " is-verified" : " is-pending"}`}
                      aria-hidden
                    >
                      {e.verificationState === "Verified" ? <CheckCircle2 size={12} /> : <Info size={12} />}
                    </span>
                    <div className="scr-event-body">
                      <div className="scr-event-top">
                        <span className="scr-event-time">{e.timestamp}</span>
                        <span className={`scr-event-state${e.verificationState === "Verified" ? " is-verified" : ""}`}>
                          {e.verificationState}
                        </span>
                      </div>
                      <p className="scr-event-title">{e.title}</p>
                      <p className="scr-event-src">
                        {e.source}
                        {e.actor ? ` · ${e.actor}` : ""}
                      </p>
                      {e.note && <p className="scr-event-note">{e.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {tab === "evidence" && (
          <div className="scr-ins-section">
            {activity.evidence ? (
              <article className="scr-evidence">
                <div className="scr-evidence-top">
                  <span className="scr-ins-block-lbl">Supporting field evidence</span>
                  {activity.evidence.isSyntheticDemo && <span className="scr-synth">Synthetic demo</span>}
                </div>
                {activity.evidence.imageUrl ? (
                  <button
                    type="button"
                    className="scr-evidence-img"
                    onClick={() => onOpenEvidence(activity)}
                    aria-label="Open evidence preview"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activity.evidence.imageUrl} alt={activity.evidence.summary} />
                    <span className="scr-evidence-zoom">
                      <ExternalLink size={14} aria-hidden />
                      View full
                    </span>
                  </button>
                ) : (
                  <div className="scr-evidence-doc">
                    <FileText size={15} aria-hidden />
                    <span>{activity.evidence.reference}</span>
                  </div>
                )}
                <p className="scr-evidence-summary">{activity.evidence.summary}</p>
                <dl className="scr-ins-grid">
                  <Fact label="Reporter" value={activity.evidence.reporter} />
                  <Fact label="Captured" value={activity.evidence.timestamp} />
                  <Fact label="Reference" value={activity.evidence.reference} mono />
                  <Fact label="Type" value={activity.evidence.type} />
                </dl>
              </article>
            ) : (
              <EmptyNote>No evidence has been attached to this activity yet.</EmptyNote>
            )}
          </div>
        )}

        {tab === "dependencies" && (
          <div className="scr-ins-section">
            <div className="scr-dep-group">
              <span className="scr-ins-block-lbl">Predecessors ({activity.dependencies.predecessors.length})</span>
              {activity.dependencies.predecessors.length === 0 ? (
                <p className="scr-ins-subtle">No predecessors — this is a lead task.</p>
              ) : (
                <ul className="scr-dep-list">
                  {activity.dependencies.predecessors.map((d, i) => (
                    <li key={i}>
                      <button type="button" className="scr-dep" onClick={() => onNavigate(d.id)}>
                        <span className="scr-dep-type">{d.type}</span>
                        <span className="scr-dep-id scr-mono">{d.id}</span>
                        <span className="scr-dep-name">{d.name}</span>
                        {d.lag && <span className="scr-dep-lag">{d.lag}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="scr-dep-group">
              <span className="scr-ins-block-lbl">Successors ({activity.dependencies.successors.length})</span>
              {activity.dependencies.successors.length === 0 ? (
                <p className="scr-ins-subtle">No successors — terminal activity.</p>
              ) : (
                <ul className="scr-dep-list">
                  {activity.dependencies.successors.map((d, i) => (
                    <li key={i}>
                      <button type="button" className="scr-dep" onClick={() => onNavigate(d.id)}>
                        <span className="scr-dep-type">{d.type}</span>
                        <span className="scr-dep-id scr-mono">{d.id}</span>
                        <span className="scr-dep-name">{d.name}</span>
                        {d.lag && <span className="scr-dep-lag">{d.lag}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="scr-ins-section">
            {activity.history.length === 0 ? (
              <EmptyNote>No schedule mutations have been recorded for this activity.</EmptyNote>
            ) : (
              <ol className="scr-audits">
                {activity.history.map((r, i) => (
                  <AuditRow key={i} record={r} />
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export function EvidenceLightbox({
  activity,
  onClose,
}: {
  activity: ScheduleActivity;
  onClose: () => void;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const evidence = activity.evidence;
  if (!evidence?.imageUrl) return null;

  return (
    <div className="scr-lbox" role="dialog" aria-modal="true" aria-label="Evidence preview" onClick={onClose}>
      <div className="scr-lbox-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scr-lbox-head">
          <div>
            <span className="scr-ins-block-lbl">Field evidence · {activity.id}</span>
            <h3 className="scr-lbox-title">{evidence.summary}</h3>
          </div>
          <button type="button" className="scr-ins-close" onClick={onClose} aria-label="Close evidence preview">
            <X size={15} aria-hidden />
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="scr-lbox-img" src={evidence.imageUrl} alt={evidence.summary} />
        <div className="scr-lbox-foot">
          <span>
            {evidence.reporter} · {evidence.timestamp}
          </span>
          {evidence.isSyntheticDemo && <span className="scr-synth">Synthetic demo</span>}
        </div>
      </div>
    </div>
  );
}
