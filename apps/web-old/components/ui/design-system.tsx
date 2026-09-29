"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`ds-button ds-button--${variant} ${className}`} {...props}/>;
}

export function SearchInput({ label = "Search", ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <label className="ds-search"><span className="sr-only">{label}</span><Icon name="search" size={16}/><input type="search" {...props}/><kbd>⌘ K</kbd></label>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`ds-badge ds-badge--${tone}`}><i/>{children}</span>;
}

export function ConfidenceBadge({ value }: { value: number }) {
  const tone: Tone = value >= 85 ? "success" : value >= 60 ? "warning" : "danger";
  return <span className={`ds-confidence ds-confidence--${tone}`}><strong>{value}%</strong><span>confidence</span></span>;
}

export function DisciplineBadge({ children }: { children: ReactNode }) {
  return <span className="ds-discipline">{children}</span>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="ds-page-header"><div>{eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="ds-page-actions">{actions}</div>}</header>;
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="ds-section-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

export function FilterBar({ children, resultCount }: { children: ReactNode; resultCount?: string }) {
  return <div className="ds-filter-bar"><Icon name="filter" size={16}/>{children}{resultCount && <span className="ds-result-count">{resultCount}</span>}</div>;
}

export function EmptyState() {
  return <div className="ds-state"><span className="ds-state-icon"><Icon name="check"/></span><h3>No matches require review</h3><p>All current execution events have been resolved.</p></div>;
}

export function ErrorState() {
  return <div className="ds-state ds-state--error" role="alert"><span className="ds-state-icon"><Icon name="alert"/></span><h3>Import needs attention</h3><p>“Activity Description” could not be identified in DPR_25_SEP.xlsx.</p><Button variant="secondary">Map columns manually</Button></div>;
}

export function Skeleton() {
  return <div className="ds-skeleton" aria-label="Loading project activities" aria-busy="true"><i/><i/><i/><i/></div>;
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="ds-tooltip" tabIndex={0}>{children}<span role="tooltip">{label}</span></span>;
}

export function PopoverExample() {
  const [open, setOpen] = useState(false);
  return <div className="ds-popover-wrap"><Button variant="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>Saved view</Button>{open && <div className="ds-popover"><strong>Verification workload</strong><p>Review events requiring planner confirmation.</p><button onClick={() => setOpen(false)}>Apply view</button></div>}</div>;
}

export function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  if (!open) return null;
  return <div className="ds-overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="ds-overlay-head"><h2 id="dialog-title">{title}</h2><button ref={closeRef} className="ds-icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>{children}</div></div>;
}

export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  if (!open) return null;
  return <div className="ds-overlay ds-overlay--drawer" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><aside className="ds-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div className="ds-overlay-head"><div><span className="ds-eyebrow">ACTIVITY DETAIL</span><h2 id="drawer-title">Pier P12 reinforcement fixing</h2></div><button ref={closeRef} className="ds-icon-button" aria-label="Close drawer" onClick={onClose}><Icon name="close"/></button></div><dl className="ds-detail-list"><div><dt>Activity ID</dt><dd>ACT-1.2.1</dd></div><div><dt>Discipline</dt><dd>Civil</dd></div><div><dt>Current progress</dt><dd>45% verified</dd></div><div><dt>Responsible party</dt><dd>North River Civil JV</dd></div></dl><div className="ds-drawer-note"><strong>Latest evidence</strong><p>Reinforcement cage installation completed through chainage 12+450.</p></div></aside></div>;
}
