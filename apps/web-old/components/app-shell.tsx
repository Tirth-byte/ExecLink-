"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

import { useAuth } from "@/lib/auth";
import { useState } from "react";

export type ShellDestination = "overview" | "live" | "review" | "schedule" | "ingestion" | "verification" | "analytics" | "memory" | "settings";

const groups: { label: string; items: { id: ShellDestination; number?: string; label: string; icon: string; count?: number; requiredPermission?: string }[] }[] = [
  { label: "PROJECT", items: [{ id: "overview", number: "01", label: "Overview", icon: "grid", requiredPermission: "schedule.read" }] },
  { label: "EXECUTION", items: [
    { id: "live", number: "02", label: "Live Execution", icon: "pulse", requiredPermission: "execution.read" },
    { id: "review", number: "03", label: "Match Review", icon: "link", count: 3, requiredPermission: "match.read" },
    { id: "schedule", number: "04", label: "Schedule Explorer", icon: "calendar", requiredPermission: "schedule.read" }
  ]},
  { label: "DATA", items: [{ id: "ingestion", number: "05", label: "Data Ingestion", icon: "upload", requiredPermission: "ingestion.create" }] },
  { label: "CONTROL", items: [{ id: "verification", number: "06", label: "Verification Center", icon: "check", count: 2, requiredPermission: "match.review" }] },
  { label: "INTELLIGENCE", items: [
    { id: "analytics", number: "07", label: "Analytics", icon: "chart", requiredPermission: "analytics.read" },
    { id: "memory", number: "08", label: "Project Memory", icon: "memory", requiredPermission: "memory.read" }
  ]}
];

export function AppShell({ active, title, children, onNavigate }: { active: ShellDestination; title: string; children: ReactNode; onNavigate: (destination: ShellDestination) => void }) {
  const { user, activeProject, hasPermission, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const humanizeRole = (role: string) => role.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");

  const visibleGroups = groups.map(g => ({
    ...g,
    items: g.items.filter(i => !i.requiredPermission || hasPermission(i.requiredPermission))
  })).filter(g => g.items.length > 0);

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate("overview")} aria-label="ExecLink overview">
        <span className="brand-mark" aria-hidden="true"><i/><i/><i/></span>
        <span>ExecLink<small>CONTROL CENTER</small></span>
      </button>
      <div className="project-label">CURRENT PROJECT</div>
      <button className="project-switcher" aria-label="Switch project">
        <span className="project-avatar">{activeProject?.project_name.substring(0,2).toUpperCase()}</span>
        <span><b>{activeProject?.project_name}</b><small>{activeProject?.project_id}</small></span>
        <Icon name="chevron" size={14}/>
      </button>
      <nav aria-label="Primary navigation">
        {visibleGroups.map(group => <div className="nav-section" key={group.label}>
          <div className="nav-group">{group.label}</div>
          {group.items.map(item => <button key={item.id} className={active === item.id ? "active" : ""} aria-current={active === item.id ? "page" : undefined} onClick={() => onNavigate(item.id)}>
            <Icon name={item.icon}/><span className="nav-label"><small>{item.number}</small>{item.label}</span>{item.count ? <em>{item.count}</em> : null}
          </button>)}
        </div>)}
      </nav>
      <div className="sidebar-foot">
        <div className="utility-nav">
          <button><Icon name="help"/><span>Help</span></button>
          {hasPermission("settings.manage") && <button onClick={() => onNavigate("settings")} className={active === "settings" ? "active" : ""}><Icon name="gear"/><span>Settings</span></button>}
        </div>
        <div style={{position: 'relative'}}>
          <button className="user-menu" aria-label="Open user menu" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="avatar">{user?.name.substring(0, 2).toUpperCase() || 'U'}</span>
            <span><b>{user?.name}</b><small>{activeProject ? humanizeRole(activeProject.role) : "User"}</small></span>
            <span className="dots">•••</span>
          </button>
          {menuOpen && (
            <div className="user-dropdown" style={{position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', zIndex: 10}}>
              <div style={{padding: '8px', fontSize: '13px'}}>
                <div style={{fontWeight: 600, color: 'var(--text-primary)'}}>{user?.name}</div>
                <div style={{color: 'var(--text-secondary)'}}>{user?.email}</div>
              </div>
              <div style={{height: '1px', background: 'var(--border)', margin: '4px 0'}}></div>
              <button onClick={logout} style={{width: '100%', textAlign: 'left', padding: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px'}}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
    <main className="app-main">
      <header className="topbar">
        <div className="breadcrumb"><span>{activeProject?.project_name}</span><Icon name="chevron" size={13}/><strong>{title}</strong></div>
        <div className="header-actions">
          <button className="command" onClick={() => onNavigate("schedule")}><Icon name="search" size={16}/><span>Search project</span><kbd>⌘ K</kbd></button>
          <div className="data-date"><small>DATA DATE</small><strong>25 Sep 2026</strong></div>
          <span className="system-status"><i/>Synced</span>
          <button className="icon-button" aria-label="Notifications"><Icon name="bell" size={17}/><i/></button>
        </div>
      </header>
      <div className="content">{children}</div>
    </main>
  </div>;
}
