"use client";

import { AlertTriangle, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
};

export function Button({ variant = "secondary", className = "", ...props }: ButtonProps) {
  return <button className={`button ${variant} ${className}`} {...props} />;
}

export function SearchInput({
  label = "Search",
  placeholder = "Search…",
}: {
  label?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span className="sr-only">{label}</span>
      <span className="input-wrap">
        <Search size={15} aria-hidden="true" />
        <input type="search" placeholder={placeholder} />
      </span>
    </label>
  );
}

// -------------------------------------------------------------
// STATUS BADGES (Operational state colors)
// -------------------------------------------------------------
const badgeTone: Record<string, string> = {
  Verified: "green",
  Completed: "green",
  "Auto-suggest": "blue",
  "In Progress": "blue",
  Review: "amber",
  Blocked: "red",
  Rejected: "red",
  Unmatched: "neutral",
};

export function StatusBadge({ children }: { children: string }) {
  const tone = badgeTone[children] ?? "neutral";
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}

export function ConfidenceBadge({ value }: { value: number }) {
  const tone = value >= 90 ? "blue" : value >= 70 ? "amber" : "neutral";
  return (
    <span className={`badge ${tone} confidence`} aria-label={`${value} percent confidence`}>
      {value}%
    </span>
  );
}

// -------------------------------------------------------------
// DISCIPLINE IDENTITY SYSTEM (Domain identification, NOT status)
// Subdued 5–9% tints, readable 700/800 text tones, matching dot
// -------------------------------------------------------------
export const disciplineTokens: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  Civil: {
    bg: "#f0f5ff",
    border: "#d0e1fd",
    text: "#1e40af",
    dot: "#3b82f6",
  },
  Structural: {
    bg: "#f5f3ff",
    border: "#ddd6fe",
    text: "#4338ca",
    dot: "#6366f1",
  },
  Piping: {
    bg: "#f0fdfa",
    border: "#ccfbf1",
    text: "#0f766e",
    dot: "#14b8a6",
  },
  "Static Equipment": {
    bg: "#faf5ff",
    border: "#f3e8ff",
    text: "#6b21a8",
    dot: "#9333ea",
  },
  "Rotating Equipment": {
    bg: "#eef2ff",
    border: "#e0e7ff",
    text: "#3730a3",
    dot: "#4f46e5",
  },
  Electrical: {
    bg: "#fefce8",
    border: "#fef08a",
    text: "#854d0e",
    dot: "#eab308",
  },
  Instrumentation: {
    bg: "#ecfdf5",
    border: "#a7f3d0",
    text: "#065f46",
    dot: "#10b981",
  },
  HSE: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    text: "#166534",
    dot: "#16a34a",
  },
};

const disciplineSlugMap: Record<string, string> = {
  Civil: "civil",
  Structural: "structural",
  Piping: "piping",
  "Static Equipment": "static",
  "Rotating Equipment": "rotating",
  Electrical: "electrical",
  Instrumentation: "instrumentation",
  HSE: "hse",
};

export function DisciplineBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const name = typeof children === "string" ? children : "";
  const slug = disciplineSlugMap[name];

  if (!slug) {
    return <span className={`badge outline discipline ${className}`}>{children}</span>;
  }

  return (
    <span
      className={`discipline-badge discipline-${slug} ${className}`}
      style={{
        backgroundColor: `var(--disc-${slug}-bg)`,
        borderColor: `var(--disc-${slug}-border)`,
        color: `var(--disc-${slug}-text)`,
      }}
    >
      <span className="discipline-dot" style={{ backgroundColor: `var(--disc-${slug}-dot)` }} />
      {children}
    </span>
  );
}

// -------------------------------------------------------------
// PROGRESS BAR COMPONENT (Global Progress Visualization Rule)
// -------------------------------------------------------------
export type ProgressBarProps = {
  value: number;
  planMarker?: number;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "verified" | "neutral";
  showValue?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function ProgressBar({
  value,
  planMarker,
  size = "md",
  tone = "default",
  showValue = true,
  className = "",
  ariaLabel,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const is100Verified = clampedValue === 100 && tone === "verified";

  return (
    <div className={`progress-bar-wrap size-${size} ${className}`}>
      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? `Progress: ${clampedValue}%`}
      >
        <div
          className={`progress-bar-fill ${tone} ${is100Verified ? "is-complete" : ""}`}
          style={{ width: `${clampedValue}%` }}
        />
        {planMarker !== undefined && (
          <div
            className="progress-bar-plan-marker"
            style={{ left: `${Math.min(100, Math.max(0, planMarker))}%` }}
            title={`Planned: ${planMarker}%`}
          />
        )}
      </div>
      {showValue && <span className="progress-bar-value">{clampedValue}%</span>}
    </div>
  );
}

// -------------------------------------------------------------
// UNIFORM KPI CARD (Physical Progress & Metric Modules)
// -------------------------------------------------------------
export function KpiCard({
  label,
  value,
  context,
  tone = "neutral",
  className = "",
}: {
  label: string;
  value: string;
  context: string;
  tone?: "plan" | "actual" | "variance" | "neutral";
  className?: string;
}) {
  return (
    <div className={`kpi-card tone-${tone} ${className}`}>
      <span className="kpi-label">{label}</span>
      <div className={`kpi-value kpi-val-${tone}`}>{value}</div>
      <span className="kpi-context">{context}</span>
    </div>
  );
}

export function Surface({
  children,
  variant = "standard",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "standard" | "elevated" | "subtle";
  className?: string;
}) {
  return <div className={`surface ${variant} ${className}`}>{children}</div>;
}

export function MajorPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`major-panel ${className}`}>{children}</section>;
}

export function PanelHeader({
  title,
  eyebrow,
  meta,
  badge,
  action,
}: {
  title: string;
  eyebrow?: string;
  meta?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="panel-header">
      <div className="panel-header-main">
        {eyebrow && <p className="panel-header-eyebrow">{eyebrow}</p>}
        <div className="panel-header-topline">
          <h3 className="panel-header-title">{title}</h3>
          {badge}
        </div>
      </div>
      {(meta || action) && (
        <div className="panel-header-meta">
          {meta && <span>{meta}</span>}
          {action}
        </div>
      )}
    </header>
  );
}

export function InsetModule({
  children,
  focused = false,
  className = "",
}: {
  children: React.ReactNode;
  focused?: boolean;
  className?: string;
}) {
  return <div className={`inset-module ${focused ? "focused" : ""} ${className}`}>{children}</div>;
}

export function SectionHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description?: string;
  meta?: string;
}) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-copy">{description}</p>}
      </div>
      {meta && <span className="section-meta">{meta}</span>}
    </div>
  );
}

// -------------------------------------------------------------
// VIEWPORT-SAFE TOOLTIP COMPONENT
// -------------------------------------------------------------
export function Tooltip({
  label,
  side = "top",
  align = "center",
  children,
}: {
  label: string;
  side?: "top" | "bottom";
  align?: "center" | "end" | "start";
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span role="tooltip" className={`tooltip side-${side} align-${align}`}>
          {label}
        </span>
      )}
    </span>
  );
}

export function PopoverDemo() {
  const [open, setOpen] = useState(false);
  return (
    <span className="popover-wrap">
      <Button onClick={() => setOpen(!open)} aria-expanded={open}>
        Open popover
      </Button>
      {open && (
        <div className="popover" role="dialog" aria-label="Project context">
          <p className="popover-title">Project context</p>
          <p className="popover-copy">
            North River Expansion is reporting against the 26 September data date.
          </p>
        </div>
      )}
    </span>
  );
}

function useEscapeClose(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const handle = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, close]);
}

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscapeClose(open, () => setOpen(false));
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      {open && (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => e.currentTarget === e.target && setOpen(false)}
        >
          <section className="modal-shell" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header className="panel-head">
              <div>
                <h3 id={titleId} className="panel-title">
                  Confirm review action
                </h3>
                <p className="panel-copy">A focused modal pattern for consequential decisions.</p>
              </div>
              <button
                ref={closeRef}
                className="icon-button"
                aria-label="Close modal"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </header>
            <div className="panel-body">
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                This demonstration does not change project data. Production actions will include
                clear impact and audit context.
              </p>
            </div>
            <footer className="panel-footer">
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Acknowledge
              </Button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

export function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscapeClose(open, () => setOpen(false));
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open activity detail
      </Button>
      {open && (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => e.currentTarget === e.target && setOpen(false)}
        >
          <aside
            className="drawer-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className="panel-head">
              <div>
                <p className="eyebrow">Activity detail</p>
                <h3 id={titleId} className="panel-title">
                  P-110 Erection
                </h3>
                <p className="panel-copy">ACT-P110 · North River Expansion</p>
              </div>
              <button
                ref={closeRef}
                className="icon-button"
                aria-label="Close activity detail"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </header>
            <div className="panel-body">
              <div className="detail-list">
                <div className="detail-row">
                  <span className="detail-key">Activity</span>
                  <span className="detail-value">ACT-P110</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Description</span>
                  <span className="detail-value">P-110 Erection</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Discipline</span>
                  <span>
                    <DisciplineBadge>Piping</DisciplineBadge>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Confidence</span>
                  <span>
                    <ConfidenceBadge value={96} />
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Status</span>
                  <span>
                    <StatusBadge>Verified</StatusBadge>
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function SkeletonState() {
  return (
    <Surface className="state-card">
      <div className="skeleton-stack" aria-label="Loading content">
        <div className="skeleton h-32 w-55" />
        <div className="skeleton w-75" />
        <div className="skeleton" />
        <div className="skeleton w-55" />
      </div>
    </Surface>
  );
}

export function EmptyState() {
  return (
    <Surface className="state-card">
      <div className="state-icon">
        <Search size={17} />
      </div>
      <h3 className="state-title">No matches require review</h3>
      <p className="state-copy">All current execution events have been resolved.</p>
    </Surface>
  );
}

export function ErrorState() {
  return (
    <Surface className="state-card">
      <div className="state-icon error">
        <AlertTriangle size={17} />
      </div>
      <h3 className="state-title">DPR import could not continue</h3>
      <p className="state-copy">
        “Activity Description” could not be identified. Map the source column manually.
      </p>
      <Button variant="ghost" style={{ marginTop: 8 }}>
        Map columns
      </Button>
    </Surface>
  );
}
