"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  activities,
  alternativeProposal,
  benchmarkDurations,
  confidenceDistribution,
  delayCauses,
  disciplineBurndown,
  durationVarianceStats,
  historicalActivities,
  ingestionHistoryList,
  liveEvents,
  navItems,
  primaryProposal,
  productivityPatterns,
  reports,
  sCurveData,
  wbsHierarchy,
  type ExecutionEvent,
  type ProposalCandidate
} from "@/lib/demo-data";
import {
  assertProgressNotRegressing,
  downloadReportCsv,
  fetchAuditChainStatus,
  fetchProjectJson,
  verifyMatchOnline,
  type AuditChainStatus
} from "@/lib/demo-api";
import { AppShell, type ShellDestination } from "@/components/app-shell";
import { Icon } from "@/components/ui/icons";

type View = (typeof navItems)[number][0];

function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "info" | "danger";
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}

export function ControlCenter() {
  const { hasPermission } = useAuth();
  const [view, setView] = useState<View>("overview");
  const [verified, setVerified] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(30);
  const [auditSequence, setAuditSequence] = useState<number | null>(null);
  const [progress, setProgress] = useState(45);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<{ message: string; sub: string } | null>(null);
  const [errorMessage, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const activeTitle = navItems.find(([id]) => id === view)?.[1] ?? "Overview";

  function showToast(message: string, sub: string) {
    setToast({ message, sub });
    window.setTimeout(() => setToast(null), 4500);
  }

  async function approve() {
    setConfirming(false);
    setError(null);
    try {
      assertProgressNotRegressing(currentProgress, progress);
      const res = await verifyMatchOnline("PRJ-METRO-001", "MPR-DEMO-001", "ACT-1.2.1", progress, 1);
      const serverSequence = res.auditSequence ?? null;
      setVerified(true);
      setCurrentProgress(progress);
      setAuditSequence(serverSequence);
      showToast(
        "Progress verified",
        serverSequence === null
          ? `ACT-1.2.1 updated to ${progress}%`
          : `ACT-1.2.1 updated to ${progress}% · Audit #${serverSequence}`
      );
      setView("overview");
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Verification request failed";
      setError(`Verification failed: ${errText}. Activity remains unverified.`);
    }
  }

  return (
    <AppShell active={(view === "audit" || view === "reports" ? "overview" : view) as ShellDestination} title={activeTitle} onNavigate={(destination) => setView(destination as View)}>
          {errorMessage && (
            <div className="ingestion-error" role="alert">
              <span>!</span>
              <div>
                <b>Verification Notice</b>
                <small>{errorMessage}</small>
              </div>
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
          {view === "overview" && (
            <Overview
              verified={verified}
              progress={currentProgress}
              onReview={() => setView("review")}
              onSchedule={() => setView("schedule")}
              onAnalytics={() => setView("analytics")}
            />
          )}
          {view === "live" && <LiveExecution onReview={() => setView("review")} />}
          {view === "review" && (
            <Review
              verified={verified}
              progress={progress}
              setProgress={setProgress}
              onApprove={() => setConfirming(true)}
              onToast={showToast}
              hasPermission={hasPermission}
            />
          )}
          {view === "schedule" && (
            <Schedule
              query={query}
              setQuery={setQuery}
              verified={verified}
              progress={currentProgress}
            />
          )}
          {view === "ingestion" && <DataIngestion onToast={showToast} hasPermission={hasPermission} />}
          {view === "verification" && (
            <VerificationCenter
              verified={verified}
              progress={currentProgress}
              onReview={() => setView("review")}
              onApprove={() => setConfirming(true)}
              hasPermission={hasPermission}
            />
          )}
          {view === "analytics" && <Analytics verified={verified} />}
          {view === "memory" && <ProjectMemory />}
          {view === "audit" && <Audit verified={verified} sequence={auditSequence} />}
          {view === "reports" && <Reports />}
          {view === "settings" && <Settings />}
        

      {confirming && (
        <ConfirmDialog
          progress={progress}
          onCancel={() => setConfirming(false)}
          onConfirm={approve}
        />
      )}

      {toast && (
        <div className="toast" role="alert">
          <span>✓</span>
          <div>
            <b>{toast.message}</b>
            <small>{toast.sub}</small>
          </div>
          <button onClick={() => setView("audit")}>View audit</button>
        </div>
      )}
    </AppShell>
  );
}

/* =========================================================================
   01 OVERVIEW
   ========================================================================= */
function Overview({
  verified,
  progress: currentProgress,
  onReview,
  onSchedule,
  onAnalytics
}: {
  verified: boolean;
  progress: number;
  onReview: () => void;
  onSchedule: () => void;
  onAnalytics: () => void;
}) {
  const overall = verified ? 38.6 : 37.8;
  return (
    <>
      <section className="welcome">
        <div>
          <p>Saturday, 26 September 2026</p>
          <h2>Good morning, Priya.</h2>
          <span>Here’s what needs attention across Blue Line Metro Extension.</span>
        </div>
        <div className="snapshot">
          <small>ACTIVE BASELINE</small>
          <b>BL-MASTER-R12</b>
          <span>Data date · 25 Sep 2026</span>
        </div>
      </section>

      <section className="status-strip">
        <div className="ring" style={{ "--value": `${overall * 3.6}deg` } as React.CSSProperties}>
          <span>
            {overall}
            <small>%</small>
          </span>
        </div>
        <div>
          <small>VERIFIED PROJECT PROGRESS</small>
          <b>{verified ? "+0.8 since last verification" : "+2.4 this week"}</b>
        </div>
        <div className="divider" />
        <div className="mini-stat">
          <small>PLAN TO DATE</small>
          <b>44.2%</b>
          <span className="negative">6.4 pts behind</span>
        </div>
        <div className="mini-stat">
          <small>SCHEDULE VARIANCE</small>
          <b>-14 days</b>
          <span className="negative">Critical path slip</span>
        </div>
        <div className="mini-stat">
          <small>FIELD EVENTS · 24H</small>
          <b>18</b>
          <span>15 matched · 3 review</span>
        </div>
        <div className="mini-stat">
          <small>LAST VERIFIED</small>
          <b>{verified ? "Just now" : "22 min ago"}</b>
          <span>{verified ? "by Priya Shah" : "by R. Narayan"}</span>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel attention">
          <div className="panel-head">
            <div>
              <small>REQUIRES ATTENTION</small>
              <h3>Planner review queue (3 pending)</h3>
            </div>
            <button onClick={onReview}>View all →</button>
          </div>
          {!verified ? (
            <button className="review-card" onClick={onReview}>
              <span className="confidence">
                97<small>%</small>
              </span>
              <span className="review-copy">
                <b>Pier P12 reinforcement fixing</b>
                <small>1.2.1 · Structural · PIER-P12</small>
                <q>“Fixed 3 tonnes of rebar at Pier P12…”</q>
              </span>
              <Badge tone="success">Auto-suggest</Badge>
              <span className="arrow">›</span>
            </button>
          ) : (
            <div className="success-empty">
              <span>✓</span>
              <div>
                <b>High-confidence match cleared</b>
                <small>The verified update is now reflected in project progress and the audit chain.</small>
              </div>
            </div>
          )}
          <button className="review-card muted" onClick={onReview}>
            <span className="confidence amber">
              79<small>%</small>
            </span>
            <span className="review-copy">
              <b>Crew working at P12; preparation continuing</b>
              <small>2 close candidates · more evidence needed</small>
            </span>
            <Badge tone="warning">Needs judgement</Badge>
            <span className="arrow">›</span>
          </button>
          <button className="review-card muted" onClick={onReview}>
            <span className="confidence gray">
              42<small>%</small>
            </span>
            <span className="review-copy">
              <b>Drain cleaning near depot</b>
              <small>Deterministic fallback · unlinked civil work</small>
            </span>
            <Badge tone="neutral">Unmatched</Badge>
            <span className="arrow">›</span>
          </button>
        </section>

        <section className="panel progress-panel">
          <div className="panel-head">
            <div>
              <small>SCHEDULE HEALTH</small>
              <h3>Progress by discipline</h3>
            </div>
            <button onClick={onSchedule}>Explore schedule →</button>
          </div>
          {[
            ["Civil & Earthworks", 68, 72, -4],
            ["Structural (Piers & Girders)", verified ? 46 : 42, 57, verified ? -11 : -15],
            ["Track & Permanent Way", 34, 38, -4],
            ["Electrical & Traction", 18, 31, -13],
            ["Signaling & Telecom", 12, 14, -2]
          ].map(([name, actual, plan, delta]) => (
            <div className="progress-row" key={name as string}>
              <span>{name}</span>
              <div className="bar">
                <i style={{ width: `${actual}%` }} />
                <em style={{ left: `${plan}%` }} />
              </div>
              <b>{actual}%</b>
              <small>{Number(delta) < 0 ? `${Math.abs(Number(delta))} pts behind` : "On plan"}</small>
            </div>
          ))}
          <div className="legend">
            <span>
              <i /> Verified actual
            </span>
            <span>
              <i /> Plan to date
            </span>
          </div>
        </section>

        {/* S-Curve Overview Widget */}
        <section className="panel" style={{ paddingBottom: 15 }}>
          <div className="panel-head">
            <div>
              <small>CUMULATIVE EARNED VALUE</small>
              <h3>Project S-Curve</h3>
            </div>
            <button onClick={onAnalytics}>Full analytics →</button>
          </div>
          <div className="scurve-container" style={{ padding: "0 22px" }}>
            <MiniSCurve verified={verified} />
            <div className="scurve-legend">
              <span className="scurve-legend-item">
                <i style={{ background: "#102a43" }} /> Planned baseline (44.2%)
              </span>
              <span className="scurve-legend-item">
                <i style={{ background: "#0b7899" }} /> Verified actual ({overall}%)
              </span>
              <span className="scurve-legend-item">
                <i style={{ background: "#c45447" }} /> Data date (25 Sep)
              </span>
            </div>
          </div>
        </section>

        <section className="panel integrity">
          <div className="panel-head">
            <div>
              <small>DATA INTEGRITY & TRUST</small>
              <h3>Traceability chain</h3>
            </div>
            <Badge tone="success">Chain valid</Badge>
          </div>
          <div className="integrity-grid">
            <div>
              <small>AUDIT RECORDS</small>
              <b>{verified ? "1,842" : "1,841"}</b>
            </div>
            <div>
              <small>UNLINKED EVENTS</small>
              <b>1</b>
            </div>
            <div>
              <small>LAST INGESTION</small>
              <b>06:12 IST</b>
            </div>
            <div>
              <small>ACTIVE SNAPSHOT</small>
              <b>BL-MASTER-R12</b>
            </div>
          </div>
          <button className="secondary wide">
            Verify SHA-256 chain <span>→</span>
          </button>
        </section>
      </div>
    </>
  );
}

/* =========================================================================
   02 LIVE EXECUTION
   ========================================================================= */
function LiveExecution({ onReview }: { onReview: () => void }) {
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [inspectedEvent, setInspectedEvent] = useState<ExecutionEvent | null>(null);

  function refresh() {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 600);
  }

  const filtered = useMemo(() => {
    return liveEvents.filter((e) => {
      const matchDisc = filterDiscipline === "all" || e.discipline.toLowerCase() === filterDiscipline.toLowerCase();
      const matchStat = filterStatus === "all" || e.matchStatus === filterStatus;
      const matchSearch =
        !search ||
        `${e.id} ${e.evidence} ${e.assetId} ${e.reporter}`.toLowerCase().includes(search.toLowerCase());
      return matchDisc && matchStat && matchSearch;
    });
  }, [filterDiscipline, filterStatus, search]);

  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Live field execution stream</h2>
          <p>Dense, timestamped feed of captured field evidence, extracted facts, and matching status.</p>
        </div>
        <div className="page-actions">
          <button className="secondary" onClick={refresh}>
            {loading ? "Refreshing…" : "↻ Refresh feed"}
          </button>
          <button className="primary" onClick={onReview}>
            Review queue (3)
          </button>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="filter-row">
          <Badge tone="success">Live stream connected</Badge>
          <span className="count-badge">{filtered.length} events displayed</span>

          <div className="filter-pills">
            <span style={{ fontSize: "8px", fontWeight: 700, color: "#778c9d" }}>DISCIPLINE:</span>
            {["all", "Structural", "Civil", "Electrical", "Track"].map((d) => (
              <button
                key={d}
                className={`pill-btn ${filterDiscipline.toLowerCase() === d.toLowerCase() ? "active" : ""}`}
                onClick={() => setFilterDiscipline(d.toLowerCase())}
              >
                {d}
              </button>
            ))}
          </div>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All match statuses</option>
            <option value="auto_suggest">Auto-suggest (90%+)</option>
            <option value="review">Needs review (70–89%)</option>
            <option value="unmatched">Unmatched fallback (&lt;70%)</option>
            <option value="verified">Verified actual</option>
          </select>

          <label className="search">
            ⌕
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search evidence, asset, tag…"
            />
          </label>
        </div>

        {loading ? (
          <div className="loading-state" role="status">
            <span />
            <span />
            <span />
            <p>Syncing field events from SSE broker…</p>
          </div>
        ) : filtered.length ? (
          <table>
            <thead>
              <tr>
                <th>Event / Channel</th>
                <th>Observed Evidence & Tags</th>
                <th>Discipline</th>
                <th>Extracted Facts</th>
                <th>Match Proposed</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>{item.id}</b>
                    <small>
                      {item.source} · {item.observedAt}
                    </small>
                  </td>
                  <td>
                    <b>{item.evidence}</b>
                    <small>Reported by {item.reporter} ({item.role})</small>
                    <div className="tag-list">
                      {item.tags.map((t) => (
                        <span className="feed-tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <Badge
                      tone={
                        item.discipline === "Structural"
                          ? "info"
                          : item.discipline === "Civil"
                          ? "warning"
                          : item.discipline === "Track"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {item.discipline}
                    </Badge>
                  </td>
                  <td>
                    <small>Asset: <b>{item.assetId}</b></small>
                    {item.quantity && <small>Qty: <b>{item.quantity}</b></small>}
                    {item.chainage && <small>Ch: <b>{item.chainage}</b></small>}
                  </td>
                  <td>
                    {item.proposedActivityId ? (
                      <>
                        <b>{item.proposedActivityId}</b>
                        <small>{item.proposedActivityName}</small>
                      </>
                    ) : (
                      <small style={{ color: "#a43e33" }}>No candidate &gt;70%</small>
                    )}
                  </td>
                  <td>
                    {item.matchStatus === "auto_suggest" && (
                      <Badge tone="success">{item.matchScore}% Auto-suggest</Badge>
                    )}
                    {item.matchStatus === "review" && (
                      <Badge tone="warning">{item.matchScore}% Review</Badge>
                    )}
                    {item.matchStatus === "unmatched" && (
                      <Badge tone="neutral">{item.matchScore}% Fallback</Badge>
                    )}
                    {item.matchStatus === "verified" && (
                      <Badge tone="success">✓ Verified</Badge>
                    )}
                  </td>
                  <td>
                    {item.matchStatus === "auto_suggest" || item.matchStatus === "review" ? (
                      <button onClick={onReview}>Review proposal →</button>
                    ) : (
                      <button onClick={() => setInspectedEvent(item)}>Inspect event →</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <StateMessage
            icon="⌕"
            title="No matching events found"
            body="Try resetting the discipline or match status filters."
            action="Clear filters"
            onAction={() => {
              setFilterDiscipline("all");
              setFilterStatus("all");
              setSearch("");
            }}
          />
        )}
      </div>

      {inspectedEvent && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <span className="modal-icon">⌕</span>
            <h2>Field Event Details · {inspectedEvent.id}</h2>
            <p>
              Captured via <b>{inspectedEvent.source}</b> at {inspectedEvent.observedAt} by{" "}
              {inspectedEvent.reporter}.
            </p>
            <div className="consequence">
              <b>Raw Evidence:</b>
              <span>“{inspectedEvent.evidence}”</span>
            </div>
            <div className="fact-row">
              <span>Asset: {inspectedEvent.assetId}</span>
              <span>Discipline: {inspectedEvent.discipline}</span>
              {inspectedEvent.quantity && <span>Quantity: {inspectedEvent.quantity}</span>}
              {inspectedEvent.chainage && <span>Chainage: {inspectedEvent.chainage}</span>}
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="secondary" onClick={() => setInspectedEvent(null)}>
                Close
              </button>
              <button
                className="primary"
                onClick={() => {
                  setInspectedEvent(null);
                  onReview();
                }}
              >
                Go to Match Review
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================================
   03 MATCH REVIEW (FLAGSHIP)
   ========================================================================= */
function Review({
  verified,
  progress,
  setProgress,
  onApprove,
  onToast,
  hasPermission
}: {
  verified: boolean;
  progress: number;
  setProgress: (n: number) => void;
  onApprove: () => void;
  onToast: (msg: string, sub: string) => void;
  hasPermission: (p: string) => boolean;
}) {
  const [selectedCandidate, setSelectedCandidate] = useState<"primary" | "alternative">("primary");
  const [rejected, setRejected] = useState(false);
  const [markedNew, setMarkedNew] = useState(false);

  const activeCandidate: ProposalCandidate =
    selectedCandidate === "primary" ? primaryProposal : alternativeProposal;

  if (verified) {
    return (
      <StateMessage
        icon="✓"
        title="Proposal already verified"
        body="This immutable proposal was approved and ACT-1.2.1 now reflects 45% verified progress."
        action="Open audit record"
      />
    );
  }

  if (rejected) {
    return (
      <StateMessage
        icon="✕"
        title="Proposal rejected"
        body="The proposal was flagged as non-matching and archived. Actual progress on the baseline was left completely untouched."
        action="Undo rejection"
        onAction={() => setRejected(false)}
      />
    );
  }

  if (markedNew) {
    return (
      <StateMessage
        icon="+"
        title="Marked as unlinked scope change"
        body="A work package modification request has been queued for project controls review. Baseline actuals were not mutated."
        action="Back to proposal"
        onAction={() => setMarkedNew(false)}
      />
    );
  }

  return (
    <div className="review-layout">
      {/* Review Queue Sidebar */}
      <section className="queue panel">
        <div className="queue-head">
          <div>
            <small>REVIEW QUEUE</small>
            <b>3 open proposals</b>
          </div>
          <button>≡ Filter</button>
        </div>
        <button
          className="queue-item selected"
          onClick={() => setSelectedCandidate("primary")}
        >
          <span>97%</span>
          <div>
            <b>Pier P12 reinforcement fixing</b>
            <small>EVT-DEMO-001 · 10:00 IST</small>
          </div>
          <i />
        </button>
        <button
          className="queue-item"
          onClick={() => setSelectedCandidate("alternative")}
        >
          <span className="warn">79%</span>
          <div>
            <b>Preparation continuing at P12</b>
            <small>EVT-DEMO-002 · 10:30 IST</small>
          </div>
        </button>
        <button className="queue-item">
          <span className="low">—</span>
          <div>
            <b>Drain cleaning near depot</b>
            <small>EVT-DEMO-003 · Fallback</small>
          </div>
        </button>
      </section>

      {/* Main Flagship Review Area */}
      <section className="review-main">
        <div className="review-title">
          <div>
            <span className="eyebrow">PROPOSAL MPR-DEMO-001 · {selectedCandidate === "primary" ? "PRIMARY CANDIDATE" : "ALTERNATIVE CANDIDATE"}</span>
            <h2>Review field evidence vs schedule candidate</h2>
            <p>
              Confirm whether the submitted field facts match the schedule activity before updating actuals.
            </p>
          </div>
          <Badge tone={activeCandidate.score >= 90 ? "success" : "warning"}>
            {activeCandidate.score}% {activeCandidate.band === "auto_suggest" ? "High confidence auto-suggest" : "Needs judgement"}
          </Badge>
        </div>

        {/* Candidate Switcher Header */}
        <div className="candidate-switcher">
          <div className="candidate-switcher-head">
            <small>SCHEDULE CANDIDATES RANKED BY HYBRID MATCHER</small>
            <span>2 candidates retrieved</span>
          </div>
          <div className="candidate-options">
            <button
              className={`candidate-btn ${selectedCandidate === "primary" ? "active" : ""}`}
              onClick={() => setSelectedCandidate("primary")}
            >
              <span className="confidence" style={{ width: 28, height: 28, fontSize: 8 }}>
                97%
              </span>
              <div>
                <b>ACT-1.2.1 Pier P12 reinforcement fixing</b>
                <small>Top ranked candidate · Exact asset & work type</small>
              </div>
            </button>
            <button
              className={`candidate-btn ${selectedCandidate === "alternative" ? "active" : ""}`}
              onClick={() => setSelectedCandidate("alternative")}
            >
              <span
                className="confidence amber"
                style={{ width: 28, height: 28, fontSize: 8 }}
              >
                62%
              </span>
              <div>
                <b>ACT-1.2.2 Pier P12 formwork installation</b>
                <small>Alternative candidate · Asset match, work type mismatch</small>
              </div>
            </button>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="evidence-activity">
          <article className="evidence panel">
            <div className="card-label">
              <span>01</span> FIELD EVIDENCE (EVT-DEMO-001)
            </div>
            <blockquote>“Fixed 3 tonnes of rebar at Pier P12, chainage 12+410 to 12+425.”</blockquote>
            <div className="evidence-meta">
              <div>
                <small>OBSERVED</small>
                <b>26 Sep · 10:00 IST</b>
              </div>
              <div>
                <small>REPORTED BY</small>
                <b>Asha Rao (Supervisor)</b>
              </div>
              <div>
                <small>QUANTITY</small>
                <b>3 tonnes</b>
              </div>
            </div>
            <div className="fact-row">
              <span>Asset: PIER-P12</span>
              <span>Discipline: Structural</span>
              <span>Ch. 12+410–425</span>
              <span>Photo: ATT-DEMO-001.jpg</span>
            </div>
          </article>

          <div className="connector">
            <span>{activeCandidate.score}%</span>
          </div>

          <article className="proposed panel">
            <div className="card-label">
              <span>02</span> PROPOSED SCHEDULE CANDIDATE
            </div>
            <div className="wbs">WBS {activeCandidate.activityWbs} · LEVEL 6</div>
            <h3>{activeCandidate.activityName}</h3>
            <div className="activity-detail">
              <div>
                <small>ASSET ID</small>
                <b>{activeCandidate.assetId}</b>
              </div>
              <div>
                <small>DISCIPLINE</small>
                <b>{activeCandidate.discipline}</b>
              </div>
              <div>
                <small>PLANNED WINDOW</small>
                <b>{activeCandidate.window}</b>
              </div>
              <div>
                <small>CURRENT ACTUAL</small>
                <b>{activeCandidate.currentActual}%</b>
              </div>
            </div>
          </article>
        </div>

        {/* 6 Visual Signals (Normative Specification) */}
        <section className="panel signal-panel">
          <div className="panel-head">
            <div>
              <small>6 VISUAL SIGNALS BREAKDOWN</small>
              <h3>Explainable Hybrid Matcher Scoring</h3>
            </div>
            <span className="model">engine: matcher-v1 · config: match-config-v1</span>
          </div>

          <div className="signal-grid">
            {activeCandidate.signals.map((s) => (
              <div className="signal" key={s.name}>
                <div>
                  <b>{s.name}</b>
                  <span>
                    {s.contribution} pts <small style={{ color: "#7b8d9c" }}>({s.weight}%)</small>
                  </span>
                </div>
                <div className="signal-bar">
                  <i style={{ width: `${s.score}%` }} />
                </div>
                <small>{s.detail}</small>
              </div>
            ))}
          </div>

          {/* Reasoning Narrative */}
          <div className="reasoning-box">
            <b>Matcher Reasoning: </b>
            {activeCandidate.reasoning}
          </div>

          {/* Schedule Impact Preview */}
          <div className="impact-preview">
            <div>
              <small>TARGET ACTUAL</small>
              <b>{activeCandidate.scheduleImpact.targetProgress}% verified</b>
            </div>
            <div>
              <small>ACTIVITY DELTA</small>
              <b>+{activeCandidate.scheduleImpact.targetProgress - activeCandidate.currentActual} pts</b>
            </div>
            <div>
              <small>PROJECT IMPACT</small>
              <b>+{activeCandidate.scheduleImpact.projectProgressDelta} pts overall</b>
            </div>
            <div>
              <small>SUCCESSOR UNBLOCKED</small>
              <b>{activeCandidate.scheduleImpact.unblocksSuccessor}</b>
            </div>
          </div>
        </section>

        {/* Decision & Action Bar */}
        <section className="decision panel">
          <div>
            <div className="card-label">
              <span>03</span> AUTHORIZED PLANNER VERIFICATION
            </div>
            <h3>Set verified progress for {activeCandidate.activityId}</h3>
            <p>
              Only authorized planner verification writes to system-of-record actuals. A tamper-evident
              SHA-256 audit entry will be generated.
            </p>
          </div>

          <div className="progress-input">
            <label htmlFor="progress">PROPOSED ACTUAL (%)</label>
            <div>
              <button onClick={() => setProgress(Math.max(activeCandidate.currentActual, progress - 5))}>
                −
              </button>
              <input
                id="progress"
                type="number"
                min={activeCandidate.currentActual}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
              />
              <span>%</span>
              <button onClick={() => setProgress(Math.min(100, progress + 5))}>+</button>
            </div>
            <small>
              Current {activeCandidate.currentActual}% <span>→</span> Change +{progress - activeCandidate.currentActual} pts
            </small>
          </div>

          <div className="decision-actions">
            <button
              className="secondary"
              onClick={() => {
                setRejected(true);
                onToast("Proposal rejected", "MPR-DEMO-001 archived; actual progress unchanged.");
              }}
              disabled={!hasPermission("match.verify")}
            >
              Reject proposal
            </button>
            <button
              className="secondary"
              onClick={() => {
                setMarkedNew(true);
                onToast("Marked as new scope", "Queued for project controls scope review.");
              }}
            >
              Mark new activity
            </button>
            <button className="primary" onClick={onApprove} disabled={!hasPermission("match.verify")}>
              Approve & verify actual
            </button>
          </div>
        </section>
      </section>
    </div>
  );
}

/* =========================================================================
   04 SCHEDULE EXPLORER
   ========================================================================= */
function Schedule({
  query,
  setQuery,
  verified,
  progress: currentProgress
}: {
  query: string;
  setQuery: (s: string) => void;
  verified: boolean;
  progress: number;
}) {
  const [viewMode, setViewMode] = useState<"table" | "gantt">("gantt");
  const [selectedDiscipline, setSelectedDiscipline] = useState("all");

  const filteredWbs = useMemo(() => {
    return wbsHierarchy.filter((item) => {
      const matchDisc = selectedDiscipline === "all" || item.discipline.toLowerCase() === selectedDiscipline.toLowerCase();
      const matchSearch =
        !query ||
        `${item.code} ${item.name} ${item.discipline}`.toLowerCase().includes(query.toLowerCase());
      return matchDisc && matchSearch;
    });
  }, [selectedDiscipline, query]);

  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Schedule Explorer & WBS (L1–L6)</h2>
          <p>
            Active Baseline: <b>BL-MASTER-R12</b> · Data Date: <b>25 September 2026</b> · 320 total activities
          </p>
        </div>
        <div className="page-actions">
          <button
            className={`pill-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            Hierarchical Table
          </button>
          <button
            className={`pill-btn ${viewMode === "gantt" ? "active" : ""}`}
            onClick={() => setViewMode("gantt")}
          >
            Gantt Timeline
          </button>
          <button className="secondary">Export snapshot (CSV)</button>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="filter-row">
          <Badge tone="info">Baseline: BL-MASTER-R12</Badge>
          <span className="count-badge">{filteredWbs.length} WBS elements shown</span>

          <div className="filter-pills">
            <span style={{ fontSize: "8px", fontWeight: 700, color: "#778c9d" }}>DISCIPLINE:</span>
            {["all", "Structural", "Civil", "Electrical", "Track"].map((d) => (
              <button
                key={d}
                className={`pill-btn ${selectedDiscipline.toLowerCase() === d.toLowerCase() ? "active" : ""}`}
                onClick={() => setSelectedDiscipline(d.toLowerCase())}
              >
                {d}
              </button>
            ))}
          </div>

          <label className="search">
            ⌕
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search WBS code or activity…"
            />
          </label>
        </div>

        {viewMode === "table" ? (
          <table>
            <thead>
              <tr>
                <th>WBS Code</th>
                <th>Level & Name</th>
                <th>Discipline</th>
                <th>Planned Target</th>
                <th>Verified Actual</th>
                <th>Variance</th>
                <th>Critical Path</th>
              </tr>
            </thead>
            <tbody>
              {filteredWbs.map((item) => {
                const actProg = item.code === "1.2.1" && verified ? 45 : item.progress;
                const delta = actProg - item.plan;
                return (
                  <tr key={item.code}>
                    <td>
                      <b className="wbs-code">{item.code}</b>
                    </td>
                    <td>
                      <div
                        style={{
                          paddingLeft: `${(item.level - 1) * 16}px`,
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        <span className="wbs-level-tag">L{item.level}</span>
                        <b>{item.name}</b>
                      </div>
                    </td>
                    <td>{item.discipline}</td>
                    <td>{item.plan}%</td>
                    <td>
                      <span className="inline-progress">
                        <i style={{ width: `${actProg}%` }} />
                      </span>
                      <b>{actProg}%</b>
                    </td>
                    <td>
                      <span className={delta < 0 ? "negative" : "positive"}>
                        {delta === 0 ? "On plan" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts`}
                      </span>
                    </td>
                    <td>
                      {item.isCritical ? (
                        <Badge tone="danger">Critical</Badge>
                      ) : (
                        <Badge tone="neutral">Float</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Gantt Timeline View */
          <div className="wbs-tree">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1.4fr 90px 90px 110px 70px 80px",
                gap: 8,
                padding: "9px 18px",
                background: "#f4f7f9",
                fontSize: "8px",
                fontWeight: 750,
                color: "#718594",
                letterSpacing: ".08em",
                textTransform: "uppercase"
              }}
            >
              <span>WBS Code</span>
              <span>Name / Hierarchy</span>
              <span>Discipline</span>
              <span>Planned Window</span>
              <span>Baseline vs Verified Gantt</span>
              <span>Actual %</span>
              <span>Confidence</span>
            </div>

            {filteredWbs.map((item) => {
              const actProg = item.code === "1.2.1" && verified ? 45 : item.progress;
              const hasLink = item.code === "1.2.1" || item.code === "1.2.2" || item.code === "3.1.4";
              return (
                <div className="wbs-row" key={item.code}>
                  <span className="wbs-code">{item.code}</span>
                  <div
                    className="wbs-name"
                    style={{ paddingLeft: `${(item.level - 1) * 14}px` }}
                  >
                    <span className="wbs-level-tag">L{item.level}</span>
                    <b style={{ fontSize: "9px" }}>{item.name}</b>
                  </div>
                  <span>{item.discipline}</span>
                  <span style={{ fontSize: "8px", color: "#617485" }}>
                    {item.level === 6 ? "24–28 Sep" : "Sep–Nov 26"}
                  </span>
                  <div className="gantt-bar-wrap">
                    <div
                      className="gantt-plan-bar"
                      style={{ width: `${item.plan}%` }}
                      title={`Planned baseline: ${item.plan}%`}
                    />
                    <div
                      className="gantt-actual-bar"
                      style={{ width: `${actProg}%` }}
                      title={`Verified actual: ${actProg}%`}
                    />
                  </div>
                  <b>{actProg}%</b>
                  <span>
                    {hasLink ? (
                      <Badge tone="success">
                        {item.code === "1.2.1" ? "97% Link" : "79% Link"}
                      </Badge>
                    ) : (
                      <small style={{ color: "#8aa0af" }}>—</small>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================================
   05 DATA INGESTION
   ========================================================================= */
function DataIngestion({ onToast, hasPermission }: { onToast: (msg: string, sub: string) => void, hasPermission: (p: string) => boolean }) {
  const [lifecycleStage, setLifecycleStage] = useState<number>(0);
  const [simulating, setSimulating] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const stages = [
    { title: "Uploaded", desc: "File received & SHA-256 computed" },
    { title: "Parsing", desc: "Schema decoded & dialect checked" },
    { title: "Extracting", desc: "Assets, quantities & chainages" },
    { title: "Matching", desc: "6-signal candidate scoring" },
    { title: "Complete", desc: "Dispatched to planner queue" }
  ];

  function runSimulation() {
    if (simulating) return;
    setSimulating(true);
    setLifecycleStage(1);

    const step2 = window.setTimeout(() => setLifecycleStage(2), 700);
    const step3 = window.setTimeout(() => setLifecycleStage(3), 1500);
    const step4 = window.setTimeout(() => setLifecycleStage(4), 2300);
    const step5 = window.setTimeout(() => {
      setLifecycleStage(5);
      setSimulating(false);
      onToast("Ingestion complete", "42 records extracted, 40 matched, 2 flagged for review.");
    }, 3100);
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Schedule & DPR Data Ingestion</h2>
          <p>
            Controlled import pipeline for Primavera P6 XER, Daily Progress Reports (DPR), spreadsheets,
            and field diaries. Ingestion never mutates active baseline actuals.
          </p>
        </div>
        <div className="page-actions">
          <button className="primary" onClick={runSimulation} disabled={simulating || !hasPermission("ingestion.create")}>
            {simulating ? "Processing pipeline…" : "Simulate DPR Ingestion (xlsx)"}
          </button>
        </div>
      </div>

      {/* Lifecycle Progress Stepper */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <small>INGESTION PIPELINE LIFECYCLE</small>
            <h3>
              {lifecycleStage === 0
                ? "Pipeline idle · Ready for ingestion"
                : lifecycleStage === 5
                ? "Lifecycle complete · 40 proposals generated"
                : `Processing stage ${lifecycleStage} of 5: ${stages[lifecycleStage - 1].title}`}
            </h3>
          </div>
          <Badge tone={lifecycleStage === 5 ? "success" : lifecycleStage > 0 ? "info" : "neutral"}>
            {lifecycleStage === 0 ? "Idle" : lifecycleStage === 5 ? "Complete" : "In Flight"}
          </Badge>
        </div>

        <div className="lifecycle-stepper">
          {stages.map((st, i) => {
            const stepNum = i + 1;
            const isCompleted = lifecycleStage > stepNum || lifecycleStage === 5;
            const isActive = lifecycleStage === stepNum;
            return (
              <div
                key={st.title}
                className={`step-node ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
              >
                <span className="step-num">{isCompleted ? "✓" : stepNum}</span>
                <b>{st.title}</b>
                <small>{st.desc}</small>
              </div>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="ingestion-stats">
          <div className="ingestion-stat-box">
            <small>FILES PROCESSED</small>
            <b>18 snapshots</b>
          </div>
          <div className="ingestion-stat-box">
            <small>EXTRACTED FACTS</small>
            <b>342 records</b>
          </div>
          <div className="ingestion-stat-box">
            <small>MATCHED TO SCHEDULE</small>
            <b style={{ color: "#16794a" }}>318 (93%)</b>
          </div>
          <div className="ingestion-stat-box">
            <small>REVIEW BACKLOG</small>
            <b style={{ color: "#9a6700" }}>24 proposals</b>
          </div>
          <div className="ingestion-stat-box">
            <small>QUARANTINED</small>
            <b style={{ color: "#b42318" }}>2 files</b>
          </div>
        </div>
      </div>

      {/* Dropzone & Ingestion History */}
      <div className="two-col">
        <section className="panel dropzone">
          <div className="upload-icon">↑</div>
          <h3>Drag & Drop Schedule or DPR file here</h3>
          <p>Supports Primavera P6 (.xer, .xml), Excel DPR (.xlsx), CSV, and Audio Diaries</p>
          <div style={{ marginTop: 16 }}>
            <button className="secondary" onClick={runSimulation}>
              Choose file to upload
            </button>
          </div>
          <small>
            Ingestion validates data integrity against canonical schemas. Non-conforming records are
            quarantined without corrupting the baseline.
          </small>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <small>INGESTION LOG</small>
              <h3>Recent file intake</h3>
            </div>
            <button>Filter history</button>
          </div>

          {ingestionHistoryList.map((f) => (
            <div className="ingestion-row" key={f.id}>
              <span>{f.status === "failed" ? "!" : "✓"}</span>
              <div>
                <b>{f.filename}</b>
                <small>{f.details}</small>
              </div>
              <Badge
                tone={
                  f.status === "active"
                    ? "success"
                    : f.status === "completed"
                    ? "info"
                    : "danger"
                }
              >
                {f.status.toUpperCase()}
              </Badge>
            </div>
          ))}

          <div className="ingestion-error">
            <span>!</span>
            <div>
              <b>BL-WEEKLY-DRAFT.csv was not imported</b>
              <small>Validation failed: 2 activities missing stable IDs. Baseline was not mutated.</small>
            </div>
            <button onClick={() => setSelectedError("CSV Row 14: Activity missing task_code. Active baseline BL-MASTER-R12 preserved.")}>
              View details →
            </button>
          </div>
        </section>
      </div>

      {selectedError && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <span className="modal-icon" style={{ background: "#fbeaea", color: "#c13b2e" }}>
              !
            </span>
            <h2>Ingestion Quarantine Report</h2>
            <p>Execution halted safely before any baseline actual modification:</p>
            <div className="consequence" style={{ borderLeftColor: "#c13b2e", background: "#fdf3f2" }}>
              <b>Error diagnostic:</b>
              <span>{selectedError}</span>
            </div>
            <div className="modal-actions">
              <button className="primary" onClick={() => setSelectedError(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================================
   06 VERIFICATION CENTER
   ========================================================================= */
function VerificationCenter({
  verified,
  progress,
  onReview,
  onApprove,
  hasPermission
}: {
  verified: boolean;
  progress: number;
  onReview: () => void;
  onApprove: () => void;
  hasPermission: (p: string) => boolean;
}) {
  const [filterBand, setFilterBand] = useState("all");
  const [filterDiscipline, setFilterDiscipline] = useState("all");

  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Planner Verification Center</h2>
          <p>
            Authoritative work queue for human planner sign-off. Only approved proposals update system
            actuals.
          </p>
        </div>
        <div className="page-actions">
          <button className="secondary" disabled={!hasPermission("match.verify")}>Batch verify high confidence</button>
          <button className="primary" onClick={onReview}>
            Open match review
          </button>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="filter-row">
          <Badge tone="warning">Work Queue: {verified ? "2 items pending" : "3 items pending"}</Badge>
          <span className="count-badge">Average turnaround: 4.2 min</span>

          <div className="filter-pills">
            <span style={{ fontSize: "8px", fontWeight: 700, color: "#778c9d" }}>CONFIDENCE:</span>
            {[
              ["all", "All"],
              ["auto", "Auto-Suggest (90%+)"],
              ["review", "Review (70–89%)"],
              ["fallback", "Fallback (<70%)"]
            ].map(([id, label]) => (
              <button
                key={id}
                className={`pill-btn ${filterBand === id ? "active" : ""}`}
                onClick={() => setFilterBand(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            className="filter-select"
            value={filterDiscipline}
            onChange={(e) => setFilterDiscipline(e.target.value)}
          >
            <option value="all">All disciplines</option>
            <option value="structural">Structural</option>
            <option value="civil">Civil</option>
            <option value="electrical">Electrical</option>
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>Proposal ID</th>
              <th>Observed Evidence</th>
              <th>Target Activity</th>
              <th>Discipline</th>
              <th>Confidence Tier</th>
              <th>Proposed Delta</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {!verified && (
              <tr>
                <td>
                  <b>MPR-DEMO-001</b>
                  <small>EVT-DEMO-001 · 10:00</small>
                </td>
                <td>
                  <b>“Fixed 3 tonnes of rebar at Pier P12…”</b>
                  <small>Reported by Asha Rao · Attachment: ATT-001.jpg</small>
                </td>
                <td>
                  <b>ACT-1.2.1</b>
                  <small>Pier P12 reinforcement fixing</small>
                </td>
                <td>
                  <Badge tone="info">Structural</Badge>
                </td>
                <td>
                  <Badge tone="success">97% Auto-Suggest</Badge>
                </td>
                <td>
                  <b>30% → 45%</b>
                  <small className="positive">+15 pts</small>
                </td>
                <td>
                  <button onClick={onReview}>Review & Verify →</button>
                </td>
              </tr>
            )}
            <tr>
              <td>
                <b>MPR-DEMO-002</b>
                <small>EVT-DEMO-002 · 10:30</small>
              </td>
              <td>
                <b>“Crew working at P12; preparation continuing…”</b>
                <small>Reported by Asha Rao · Sparse detail</small>
              </td>
              <td>
                <b>ACT-1.2.1 or ACT-1.2.2</b>
                <small>2 candidates ranked</small>
              </td>
              <td>
                <Badge tone="info">Structural</Badge>
              </td>
              <td>
                <Badge tone="warning">79% Review</Badge>
              </td>
              <td>
                <b>10% → 20%</b>
                <small>+10 pts proposed</small>
              </td>
              <td>
                <button onClick={onReview}>Resolve candidates →</button>
              </td>
            </tr>
            <tr>
              <td>
                <b>MPR-DEMO-003</b>
                <small>EVT-DEMO-003 · 11:00</small>
              </td>
              <td>
                <b>“Drain cleaning near depot entrance…”</b>
                <small>Reported by Asha Rao · Unmatched fallback</small>
              </td>
              <td>
                <small style={{ color: "#9a4a40" }}>Unassigned scope</small>
              </td>
              <td>
                <Badge tone="warning">Civil</Badge>
              </td>
              <td>
                <Badge tone="neutral">42% Fallback</Badge>
              </td>
              <td>
                <small>0 pts</small>
              </td>
              <td>
                <button>Assign WBS →</button>
              </td>
            </tr>
            {verified && (
              <tr>
                <td>
                  <b>MPR-DEMO-001</b>
                  <small>Verified by Priya Shah</small>
                </td>
                <td>
                  <b>Fixed 3 tonnes of rebar at Pier P12</b>
                </td>
                <td>
                  <b>ACT-1.2.1</b>
                </td>
                <td>
                  <Badge tone="info">Structural</Badge>
                </td>
                <td>
                  <Badge tone="success">Verified ✓</Badge>
                </td>
                <td>
                  <b>30% → {progress}%</b>
                  <small className="positive">Written to the baseline by this verification</small>
                </td>
                <td>
                  <small style={{ color: "#16794a", fontWeight: 700 }}>Committed</small>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!verified && (
          <div className="callout">
            <span>i</span>
            <p>
              <b>1 high-confidence match is waiting in your queue.</b>
              <small>Review evidence and confirm proposed actual progress before writing to the baseline.</small>
            </p>
            <button onClick={onReview}>Review MPR-DEMO-001 now →</button>
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================================
   07 ANALYTICS
   ========================================================================= */
type LiveStatus = "loading" | "live" | "unavailable";

function describePayload(payload: unknown): string {
  if (Array.isArray(payload)) return `${payload.length} record(s)`;
  if (payload && typeof payload === "object") {
    const items = (payload as { items?: unknown }).items;
    if (Array.isArray(items)) return `${items.length} record(s)`;
    return `${Object.keys(payload as Record<string, unknown>).length} field(s)`;
  }
  return "a response";
}

function useLiveEndpoint(path: string): { status: LiveStatus; detail: string } {
  const [state, setState] = useState<{ status: LiveStatus; detail: string }>({
    status: "loading",
    detail: ""
  });

  useEffect(() => {
    let active = true;
    setState({ status: "loading", detail: "" });
    fetchProjectJson<unknown>("PRJ-METRO-001", path)
      .then((payload) => {
        if (active) setState({ status: "live", detail: describePayload(payload) });
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            status: "unavailable",
            detail: err instanceof Error ? err.message : "request failed"
          });
        }
      });
    return () => {
      active = false;
    };
  }, [path]);

  return state;
}

function LiveDataBanner({
  status,
  detail,
  endpoint,
  subject
}: {
  status: LiveStatus;
  detail: string;
  endpoint: string;
  subject: string;
}) {
  return (
    <div className="callout" data-provenance={status}>
      <span>{status === "loading" ? "…" : status === "live" ? "✓" : "!"}</span>
      <p>
        <b>
          {status === "loading"
            ? `Asking the API for live ${subject}…`
            : status === "live"
              ? `Live ${subject} served by the API`
              : `Live ${subject} is not served by this API yet`}
        </b>
        <small>
          {status === "loading"
            ? `GET /projects/{id}/${endpoint}`
            : status === "live"
              ? `${detail} returned by GET /projects/{id}/${endpoint}. The visual breakdown below is still illustrative until the published contract lands.`
              : `${detail} (GET /projects/{id}/${endpoint}). Every figure below is SYNTHETIC DEMO DATA for illustration and is not computed from verified actuals.`}
        </small>
      </p>
    </div>
  );
}

function Analytics({ verified }: { verified: boolean }) {
  const live = useLiveEndpoint("analytics");
  const [reportRows, setReportRows] = useState<number | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadVarianceCsv() {
    setDownloading(true);
    setReportError(null);
    try {
      setReportRows(await downloadReportCsv("PRJ-METRO-001", "schedule-variance"));
    } catch (err: unknown) {
      setReportRows(null);
      setReportError(err instanceof Error ? err.message : "Report download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <LiveDataBanner
        status={live.status}
        detail={live.detail}
        endpoint="analytics"
        subject="analytics"
      />
      <div className="page-intro">
        <div>
          <h2>Executive Schedule & Productivity Analytics</h2>
          <p>
            S-curves, schedule variance, delay causes, duration variance, matching confidence, and
            throughput. Figures render as synthetic demo data until the API serves this project&apos;s
            analytics, which is stated above.
          </p>
        </div>
        <div className="page-actions">
          <button className="secondary" onClick={downloadVarianceCsv} disabled={downloading}>
            {downloading ? "Downloading…" : "Download schedule variance CSV"}
          </button>
        </div>
      </div>

      {reportError ? (
        <StateMessage
          icon="!"
          title="Report could not be downloaded"
          body={`${reportError}. The report is served by the API and was not substituted with local data.`}
          action="Try again"
          onAction={downloadVarianceCsv}
        />
      ) : reportRows !== null ? (
        <div className="callout">
          <span>✓</span>
          <p>
            <b>Schedule variance report downloaded</b>
            <small>{reportRows} data row(s) served by GET /projects/PRJ-METRO-001/reports/schedule-variance.</small>
          </p>
        </div>
      ) : null}

      {/* S-Curve Full Chart Panel */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <small>EARNED VALUE S-CURVE (MAY 2026 – MAR 2027)</small>
            <h3>Planned Baseline vs Verified Actual vs Early/Late Envelope</h3>
          </div>
          <Badge tone="info">Synthetic demo data · not computed from verified actuals</Badge>
        </div>

        <div className="scurve-container">
          <FullSCurve verified={verified} />
          <div className="scurve-legend">
            <span className="scurve-legend-item">
              <i style={{ background: "#09324d", height: 4 }} /> Planned Baseline
            </span>
            <span className="scurve-legend-item">
              <i style={{ background: "#0ea5e9", height: 4 }} /> Verified Actual ({verified ? "38.6%" : "37.8%"})
            </span>
            <span className="scurve-legend-item">
              <i style={{ background: "#1682a3", borderTop: "2px dashed #1682a3", height: 0 }} /> Forecast Completion
            </span>
            <span className="scurve-legend-item">
              <i style={{ background: "#cbd6e0", height: 2 }} /> Early Dates (+10 pts)
            </span>
            <span className="scurve-legend-item">
              <i style={{ background: "#94a3b8", height: 2 }} /> Late Dates (-13 pts)
            </span>
            <span className="scurve-legend-item">
              <i style={{ background: "#c45447", width: 3, height: 12 }} /> Data Date line
            </span>
          </div>
        </div>
      </section>

      {/* Delay Causes Pareto & Discipline Burndown */}
      <div className="analytics-grid-two">
        <section className="panel" style={{ padding: "0 20px 18px" }}>
          <div className="panel-head" style={{ padding: "18px 0 12px" }}>
            <div>
              <small>DELAY REGISTER PARETO</small>
              <h3>Top Root Causes of Schedule Slip</h3>
            </div>
            <button>Detail →</button>
          </div>

          {delayCauses.map((c) => (
            <div className="pareto-row" key={c.cause}>
              <div>
                <b>{c.cause}</b>
                <small>{c.discipline} · {c.impact}</small>
              </div>
              <div className="pareto-bar">
                <i style={{ width: `${c.percent}%` }} />
              </div>
              <b>{c.percent}%</b>
              <small style={{ color: "#a44539" }}>{c.hoursLost} hrs lost</small>
            </div>
          ))}
        </section>

        <section className="panel" style={{ padding: "0 20px 18px" }}>
          <div className="panel-head" style={{ padding: "18px 0 12px" }}>
            <div>
              <small>DISCIPLINE PERFORMANCE & SPI</small>
              <h3>Schedule Performance Index</h3>
            </div>
            <button>Export →</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Discipline</th>
                <th>Actual / Plan</th>
                <th>Variance</th>
                <th>SPI</th>
              </tr>
            </thead>
            <tbody>
              {disciplineBurndown.map((d) => (
                <tr key={d.discipline}>
                  <td>
                    <b>{d.discipline}</b>
                  </td>
                  <td>
                    {d.actual}% / {d.plan}%
                  </td>
                  <td>
                    <span className={d.varianceDays < 0 ? "negative" : "positive"}>
                      {d.varianceDays} days
                    </span>
                  </td>
                  <td>
                    <Badge tone={d.spi >= 0.85 ? "success" : d.spi >= 0.7 ? "warning" : "danger"}>
                      {d.spi.toFixed(2)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Duration Variance Histogram & Confidence Distribution */}
      <div className="analytics-grid-two" style={{ marginTop: 20 }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <small>ACTIVITY DURATION VARIANCE</small>
              <h3>Baseline Estimate Adherence</h3>
            </div>
          </div>
          <div className="variance-histogram">
            {durationVarianceStats.map((st) => (
              <div className="histo-box" key={st.label}>
                <b>{st.count}</b>
                <small>{st.label}</small>
                <div style={{ fontSize: "8px", color: "#087596", marginTop: 4, fontWeight: 700 }}>
                  {st.percentage}% of tasks
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <small>MATCHING ENGINE ACCURACY</small>
              <h3>Confidence Tier Distribution (318 Events)</h3>
            </div>
          </div>
          <div style={{ padding: "10px 22px 18px" }}>
            {confidenceDistribution.map((cd) => (
              <div
                key={cd.tier}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr 50px 50px",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 0"
                }}
              >
                <b>{cd.tier}</b>
                <div className="bar">
                  <i style={{ width: `${cd.percentage}%`, background: cd.color }} />
                </div>
                <b>{cd.count}</b>
                <small>{cd.percentage}%</small>
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: "9px", color: "#617485", borderTop: "1px solid #edf1f4", paddingTop: 8 }}>
              Auto-Suggest precision: <b>96.4%</b> · Planner overrides: <b>3.6%</b>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* =========================================================================
   08 PROJECT MEMORY
   ========================================================================= */
function ProjectMemory() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const live = useLiveEndpoint("project-memory");

  const filteredHistory = useMemo(() => {
    return historicalActivities.filter((h) => {
      const matchSearch =
        !search ||
        `${h.project} ${h.activityName} ${h.rootCause} ${h.keyLesson}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return matchSearch;
    });
  }, [search]);

  return (
    <>
      <LiveDataBanner
        status={live.status}
        detail={live.detail}
        endpoint="project-memory"
        subject="institutional memory"
      />
      <div className="memory-banner">
        <div>
          <span className="demo-label" style={{ background: "rgba(255,255,255,0.15)", color: "white", borderColor: "rgba(255,255,255,0.3)" }}>
            SYNTHETIC DEMO DATA · INSTITUTIONAL MEMORY
          </span>
          <h3>Institutional Knowledge Base & Cross-Project Intelligence</h3>
          <p>
            Historical activity benchmarks, productivity patterns, and root-cause patterns extracted
            from past metro corridors to prevent repeating mistakes.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <small style={{ fontSize: "8px", letterSpacing: ".1em", color: "#a9c8de" }}>INDEXED PROJECTS</small>
          <b style={{ display: "block", fontSize: "16px", marginTop: 2 }}>12 Metros</b>
          <span style={{ fontSize: "9px", color: "#b9d3e5" }}>1,480 historical tasks</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="filter-row">
          <Badge tone="info">Knowledge Base Active</Badge>
          <span className="count-badge">{filteredHistory.length} benchmarks matched</span>

          <label className="search" style={{ width: 320 }}>
            ⌕
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search historical piers, delay causes, lessons…"
            />
          </label>
        </div>
      </div>

      {/* Similar Historical Activities Comparator */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <small>CROSS-PROJECT COMPARATOR</small>
            <h3>Similar Historical Activities vs Current Activity (Pier P12)</h3>
          </div>
          <span className="model">Semantic match: &gt;85% similarity</span>
        </div>

        <div className="memory-grid">
          {filteredHistory.map((item) => (
            <div className="memory-card" key={item.id}>
              <div className="memory-card-head">
                <div>
                  <b>{item.activityName}</b>
                  <small>{item.project}</small>
                </div>
                <Badge tone={item.varianceDays === 0 ? "success" : "warning"}>
                  {item.varianceDays === 0 ? "On schedule" : `+${item.varianceDays}d (+${item.variancePercent}%)`}
                </Badge>
              </div>

              <div className="memory-diff">
                <div>
                  <small style={{ fontSize: "7px", color: "#748897" }}>PLANNED</small>
                  <b>{item.plannedDays} days</b>
                </div>
                <div style={{ margin: "0 8px", color: "#9cb1c1" }}>→</div>
                <div>
                  <small style={{ fontSize: "7px", color: "#748897" }}>ACTUAL</small>
                  <b style={{ color: item.varianceDays > 0 ? "#b42318" : "#16794a" }}>
                    {item.actualDays} days
                  </b>
                </div>
              </div>

              <div style={{ fontSize: "9px", color: "#546b7c", marginTop: 6 }}>
                <b>Root Cause: </b>
                {item.rootCause}
              </div>

              <div className="memory-lesson">
                <b>Institutional Lesson: </b>
                {item.keyLesson}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Planned vs Actual Duration Benchmarks */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <small>HISTORICAL DURATION BENCHMARKS</small>
            <h3>Standard Planned vs Historical Mean Durations</h3>
          </div>
          <button>View confidence criteria →</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Work Category</th>
              <th>Baseline Planned Mean</th>
              <th>Historical Actual Mean</th>
              <th>Duration Variance</th>
              <th>Confidence & Sample Size</th>
            </tr>
          </thead>
          <tbody>
            {benchmarkDurations.map((b) => (
              <tr key={b.category}>
                <td>
                  <b>{b.category}</b>
                </td>
                <td>{b.plannedMeanDays.toFixed(1)} days</td>
                <td>
                  <b style={{ color: b.variancePercent > 15 ? "#b42318" : "#243a49" }}>
                    {b.historicalMeanDays.toFixed(1)} days
                  </b>
                </td>
                <td>
                  <span className={b.variancePercent > 0 ? "negative" : "positive"}>
                    +{b.variancePercent}% overrun
                  </span>
                </td>
                <td>
                  <Badge tone="info">{b.confidence}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Productivity Patterns */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <small>MEASURED FIELD PRODUCTIVITY</small>
            <h3>Standard Rates vs Observed Historical Reality</h3>
          </div>
        </div>

        <div style={{ padding: "0 0 10px" }}>
          {productivityPatterns.map((p) => (
            <div className="productivity-row" key={p.metric}>
              <b>{p.metric}</b>
              <small>Planned: {p.planned}</small>
              <b style={{ color: "#087596" }}>Actual: {p.actualHistorical}</b>
              <span className="negative">{p.variance}</span>
              <small style={{ color: "#5d7383" }}>{p.note}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* =========================================================================
   SECONDARY DESTINATIONS: AUDIT TRAIL, REPORTS, SETTINGS
   ========================================================================= */
function Audit({ verified, sequence }: { verified: boolean; sequence: number | null }) {
  const [chain, setChain] = useState<AuditChainStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);

  async function checkChain() {
    setChecking(true);
    setChainError(null);
    try {
      setChain(await fetchAuditChainStatus("PRJ-METRO-001"));
    } catch (err: unknown) {
      setChain(null);
      setChainError(err instanceof Error ? err.message : "Audit chain check failed");
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Cryptographic Audit Chain</h2>
          <p>
            Persisted, SHA-256 hash-linked records across field submissions, candidate proposals, planner
            verification, and actual updates.
          </p>
        </div>
        <button className="primary" onClick={checkChain} disabled={checking}>
          {checking ? "Recomputing chain…" : "Verify cryptographic integrity"}
        </button>
      </div>

      {chainError ? (
        <section className="panel audit-summary">
          <div className="chain-check">!</div>
          <div>
            <small>CHAIN INTEGRITY STATUS</small>
            <h3>Chain could not be verified</h3>
            <p>{chainError}</p>
          </div>
          <Badge tone="danger">Unavailable</Badge>
        </section>
      ) : chain ? (
        <section className="panel audit-summary">
          <div className="chain-check">{chain.valid ? "✓" : "✕"}</div>
          <div>
            <small>CHAIN INTEGRITY STATUS</small>
            <h3>
              {chain.valid
                ? `All ${chain.entriesChecked.toLocaleString()} records cryptographically verified`
                : `Chain failed at entry #${chain.failedSequence ?? "?"} — ${chain.reason ?? "reason not returned"}`}
            </h3>
            <p>
              {chain.entriesChecked.toLocaleString()} entries checked
              {chain.lastHash ? ` · Chain head ${chain.lastHash.slice(0, 12)}…` : " · Chain head not returned by the API"}
            </p>
          </div>
          <Badge tone={chain.valid ? "success" : "danger"}>
            {chain.valid ? "Integrity Valid" : "Integrity Failed"}
          </Badge>
        </section>
      ) : (
        <section className="panel audit-summary">
          <div className="chain-check">…</div>
          <div>
            <small>CHAIN INTEGRITY STATUS</small>
            <h3>Not checked yet</h3>
            <p>
              Recompute the persisted chain to read the server&apos;s entry count and chain head. Nothing is
              asserted here until the API answers.
            </p>
          </div>
          <Badge tone="neutral">Unknown</Badge>
        </section>
      )}

      <section className="panel audit-list">
        <div className="panel-head">
          <div>
            <small>ENTRY FROM THIS SESSION</small>
            <h3>Immutable event ledger</h3>
          </div>
          <button onClick={checkChain}>↻ Recompute chain</button>
        </div>

        {verified && sequence !== null ? (
          <AuditRow
            seq={sequence}
            action="activity.actual.updated"
            entity="ACT-1.2.1"
            actor="Priya Shah (Planner)"
            time="Just now"
            hash={chain?.lastHash ?? null}
          />
        ) : verified ? (
          <StateMessage
            icon="i"
            title="Verified, but the server returned no entry number"
            body="ACT-1.2.1 was written to the baseline, yet the verification response carried no audit number, so no entry number is shown here. Recompute the chain to read what the server actually holds."
            action="Recompute chain"
            onAction={checkChain}
          />
        ) : (
          <StateMessage
            icon="i"
            title="Nothing to show yet"
            body="No verification has been performed in this session, so this client holds no audit entry to display. The API exposes chain integrity and counts, not an entry listing, so entries written by other actors cannot be rendered here."
            action="Recompute chain"
            onAction={checkChain}
          />
        )}
      </section>
    </>
  );
}

function AuditRow({
  seq,
  action,
  entity,
  actor,
  time,
  hash
}: {
  seq: number;
  action: string;
  entity: string;
  actor: string;
  time: string;
  hash: string | null;
}) {
  return (
    <div className="audit-row">
      <span className="audit-node" />
      <b>#{seq}</b>
      <div>
        <strong>{action}</strong>
        <small>
          {entity} · {actor}
        </small>
      </div>
      <code>{hash ?? "not returned"}</code>
      <time>{time}</time>
      <button disabled>View canonical JSON →</button>
    </div>
  );
}

function Reports() {
  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Controlled Reports & Traceable Exports</h2>
          <p>Five normative reports generated directly from verified project records.</p>
        </div>
        <button className="primary">Generate report batch</button>
      </div>

      <div className="report-grid">
        {reports.map((r, i) => (
          <button className="panel report-card" key={r}>
            <span className="report-icon">
              <Icon name="doc" />
            </span>
            <div>
              <b>{r}</b>
              <small>
                {[
                  "Planned vs verified actual progress by WBS and critical path",
                  "Attributable planner decisions and cryptographic audit hashes",
                  "Confidence bands, signal contribution, and review outcomes",
                  "Open delay causes, downtime hours, and discipline ownership",
                  "Progress burndown across Civil, Structural, Track, and Electrical"
                ][i]}
              </small>
            </div>
            <span>CSV · JSON →</span>
          </button>
        ))}
      </div>
    </>
  );
}

function Settings() {
  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Project & Matcher Configuration</h2>
          <p>Matching configuration is versioned; policy changes apply only to future proposals.</p>
        </div>
        <button className="primary">Save configuration</button>
      </div>

      <div className="two-col settings">
        <section className="panel">
          <div className="panel-head">
            <div>
              <small>MATCHING POLICY</small>
              <h3>Review thresholds & Weights</h3>
            </div>
            <Badge tone="info">match-config-v1</Badge>
          </div>
          <label>
            Auto-suggest threshold <b>90%</b>
            <input type="range" min="70" max="100" defaultValue="90" />
          </label>
          <label>
            Review threshold <b>70%</b>
            <input type="range" min="50" max="89" defaultValue="70" />
          </label>
          <p>
            Proposals scoring &gt;=90% qualify for 1-click verification. Scores below 70% are routed to
            deterministic fallback. Matching proposes only; authorized planner sign-off is required to
            modify actuals.
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <small>PROJECT CONTEXT</small>
              <h3>Blue Line Metro Extension</h3>
            </div>
          </div>
          <dl>
            <dt>Project ID</dt>
            <dd>PRJ-METRO-001</dd>
            <dt>Timezone</dt>
            <dd>Asia/Kolkata (IST)</dd>
            <dt>Active Baseline</dt>
            <dd>BL-MASTER-R12</dd>
            <dt>Snapshot ID</dt>
            <dd>SNP-DEMO-001</dd>
            <dt>Data Date</dt>
            <dd>25 September 2026</dd>
            <dt>Planner Authority</dt>
            <dd>Priya Shah (Senior Planner)</dd>
          </dl>
        </section>
      </div>
    </>
  );
}

/* =========================================================================
   HELPER CHARTS & MODALS
   ========================================================================= */
function MiniSCurve({ verified }: { verified: boolean }) {
  const width = 600;
  const height = 140;
  const padX = 30;
  const padY = 20;

  const points = sCurveData.map((d, i) => {
    const x = padX + (i / (sCurveData.length - 1)) * (width - 2 * padX);
    const planY = height - padY - (d.plan / 100) * (height - 2 * padY);
    const actualY =
      d.actual !== null
        ? height -
          padY -
          ((d.isDataDate && verified ? 38.6 : d.actual) / 100) * (height - 2 * padY)
        : null;
    return { ...d, x, planY, actualY };
  });

  const planPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.planY}`).join(" ");
  const actualPoints = points.filter((p) => p.actualY !== null);
  const actualPath = actualPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.actualY}`)
    .join(" ");

  const ddPoint = points.find((p) => p.isDataDate);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="scurve-svg" style={{ height: 140 }}>
      {/* Grid lines */}
      <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#e4ebf0" strokeDasharray="3 3" />
      <line
        x1={padX}
        y1={height / 2}
        x2={width - padX}
        y2={height / 2}
        stroke="#e4ebf0"
        strokeDasharray="3 3"
      />
      <line
        x1={padX}
        y1={height - padY}
        x2={width - padX}
        y2={height - padY}
        stroke="#cbd7df"
      />

      {/* Planned Baseline Path */}
      <path d={planPath} fill="none" stroke="#102a43" strokeWidth="2.5" />

      {/* Actual Path */}
      <path d={actualPath} fill="none" stroke="#0b7899" strokeWidth="3" />

      {/* Data Date vertical red line */}
      {ddPoint && (
        <line
          x1={ddPoint.x}
          y1={padY}
          x2={ddPoint.x}
          y2={height - padY}
          stroke="#c45447"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      )}

      {/* Points */}
      {actualPoints.map((p) => (
        <circle key={p.month} cx={p.x} cy={p.actualY!} r="3.5" fill="#0b7899" stroke="white" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function FullSCurve({ verified }: { verified: boolean }) {
  const width = 800;
  const height = 220;
  const padX = 40;
  const padY = 25;

  const points = sCurveData.map((d, i) => {
    const x = padX + (i / (sCurveData.length - 1)) * (width - 2 * padX);
    const planY = height - padY - (d.plan / 100) * (height - 2 * padY);
    const earlyY = height - padY - (d.early / 100) * (height - 2 * padY);
    const lateY = height - padY - (d.late / 100) * (height - 2 * padY);
    const act = d.isDataDate && verified ? 38.6 : d.actual;
    const actualY = act !== null ? height - padY - (act / 100) * (height - 2 * padY) : null;
    const forecastY =
      d.forecast !== undefined
        ? height - padY - (d.forecast / 100) * (height - 2 * padY)
        : null;
    return { ...d, x, planY, earlyY, lateY, actualY, forecastY };
  });

  const planPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.planY}`).join(" ");
  const earlyPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.earlyY}`).join(" ");
  const latePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.lateY}`).join(" ");

  const actualPoints = points.filter((p) => p.actualY !== null);
  const actualPath = actualPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.actualY}`)
    .join(" ");

  const forecastPoints = points.filter((p) => p.forecastY !== null || p.isDataDate);
  const forecastPath = forecastPoints
    .map((p, i) => {
      const y = p.forecastY !== null ? p.forecastY : p.actualY;
      return `${i === 0 ? "M" : "L"} ${p.x} ${y}`;
    })
    .join(" ");

  const ddPoint = points.find((p) => p.isDataDate);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="scurve-svg">
      {/* Horizontal guide lines */}
      {[0, 25, 50, 75, 100].map((pct) => {
        const y = height - padY - (pct / 100) * (height - 2 * padY);
        return (
          <g key={pct}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#e4ebf0" strokeDasharray="3 3" />
            <text x={padX - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#8495a4">
              {pct}%
            </text>
          </g>
        );
      })}

      {/* Early / Late dates float envelope */}
      <path d={earlyPath} fill="none" stroke="#cbd6e0" strokeWidth="1.5" strokeDasharray="2 2" />
      <path d={latePath} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" />

      {/* Baseline Plan Curve */}
      <path d={planPath} fill="none" stroke="#09324d" strokeWidth="3" />

      {/* Forecast Path */}
      <path d={forecastPath} fill="none" stroke="#1682a3" strokeWidth="2.5" strokeDasharray="5 4" />

      {/* Verified Actual Path */}
      <path d={actualPath} fill="none" stroke="#0ea5e9" strokeWidth="3.5" />

      {/* Data Date Line */}
      {ddPoint && (
        <g>
          <line
            x1={ddPoint.x}
            y1={padY}
            x2={ddPoint.x}
            y2={height - padY}
            stroke="#c45447"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <text x={ddPoint.x} y={padY - 8} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#c45447">
            Data Date (25 Sep)
          </text>
        </g>
      )}

      {/* Actual Data Points */}
      {actualPoints.map((p) => (
        <circle key={p.month} cx={p.x} cy={p.actualY!} r="4" fill="#0ea5e9" stroke="white" strokeWidth="2" />
      ))}

      {/* Month Labels along X axis */}
      {points.map((p) => (
        <text key={p.month} x={p.x} y={height - 8} textAnchor="middle" fontSize="7.5" fill="#677a8a">
          {p.month}
        </text>
      ))}
    </svg>
  );
}

function StateMessage({
  icon,
  title,
  body,
  action,
  onAction
}: {
  icon: string;
  title: string;
  body: string;
  action: string;
  onAction?: () => void;
}) {
  return (
    <div className="state-message">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      <button className="secondary" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}

function ConfirmDialog({
  progress,
  onCancel,
  onConfirm
}: {
  progress: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <span className="modal-icon">✓</span>
        <h2 id="confirm-title">Verify {progress}% actual progress?</h2>
        <p>
          This will update <b>ACT-1.2.1 · Pier P12 reinforcement fixing</b> from 30% to {progress}%.
        </p>
        <div className="consequence">
          <b>This action updates system actuals.</b>
          <span>
            Your identity (Priya Shah), evidence reference, match rationale, and new progress value
            will be recorded in the immutable SHA-256 audit chain.
          </span>
        </div>
        <div className="modal-actions">
          <button className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary" onClick={onConfirm}>
            Confirm verified actual
          </button>
        </div>
      </div>
    </div>
  );
}
