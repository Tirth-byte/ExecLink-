"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  CircleCheckBig,
  CircleHelp,
  Database,
  GitCompareArrows,
  LayoutDashboard,
  Search,
  Settings,
  SlidersHorizontal,
  TableProperties,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Tooltip } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notification-center";

const navGroups = [
  {
    label: "PROJECT",
    items: [{ number: "01", label: "Overview", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "EXECUTION",
    items: [
      { number: "02", label: "Live Execution", href: "/live-execution", icon: Activity },
      { number: "03", label: "Match Review", href: "/match-review", icon: GitCompareArrows },
      { number: "04", label: "Schedule Explorer", href: "/schedule-explorer", icon: TableProperties },
    ],
  },
  {
    label: "DATA",
    items: [{ number: "05", label: "Data Ingestion", href: "/data-ingestion", icon: Database }],
  },
  {
    label: "CONTROL",
    items: [
      {
        number: "06",
        label: "Verification Center",
        href: "/verification-center",
        icon: CircleCheckBig,
      },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { number: "07", label: "Analytics", href: "/analytics", icon: BarChart3 },
      { number: "08", label: "Project Memory", href: "/project-memory", icon: BookOpen },
    ],
  },
];

function BrandMark() {
  return (
    <svg className="brand-symbol" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="4" cy="10" r="2" fill="currentColor" />
      <circle cx="16" cy="5" r="2" fill="currentColor" />
      <circle cx="16" cy="15" r="2" fill="currentColor" />
      <path
        d="M6 10h3.2M10 10l4.2-4M10 10l4.2 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppShell({
  children,
  current = "Overview",
}: {
  children: React.ReactNode;
  current?: string;
}) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [utility, setUtility] = useState<"filters" | "notifications" | null>(null);
  const [notifUnreadCount, setNotifUnreadCount] = useState(3);
  const [isMac] = useState(() => {
    if (typeof window !== "undefined") {
      return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
    }
    return true;
  });

  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationsAnchorRef = useRef<HTMLDivElement>(null);
  const filtersAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!utility) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        (notificationsAnchorRef.current && notificationsAnchorRef.current.contains(target)) ||
        (filtersAnchorRef.current && filtersAnchorRef.current.contains(target))
      ) {
        return;
      }
      setUtility(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [utility]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setProjectOpen(false);
        setUtility(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BrandMark />
          </div>
          <div>
            <div className="brand-name">ExecLink</div>
            <div className="brand-kicker">Project controls</div>
          </div>
        </div>

        <div className="shell-popover-anchor">
          <button
            className="project-switcher"
            aria-label="Switch project"
            aria-expanded={projectOpen}
            onClick={() => setProjectOpen(!projectOpen)}
          >
            <span className="project-icon">
              <Building2 size={15} />
            </span>
            <span className="project-copy">
              <span className="project-name">North River Expansion</span>
              <span className="project-id">PRJ-DEMO-001</span>
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {projectOpen && (
            <div className="shell-popover project-popover">
              <p className="shell-popover-label">Current project</p>
              <strong>North River Expansion</strong>
              <span>PRJ-DEMO-001 · Only available project in demo</span>
            </div>
          )}
        </div>

        <nav className="nav-scroll" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(({ number, label, href, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={label}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`nav-item ${active ? "active" : ""}`}
                  >
                    <Icon className="nav-icon" size={15} />
                    <span>{label}</span>
                    <span className="nav-number">{number}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link href="/help" className="nav-item">
            <CircleHelp className="nav-icon" size={15} />
            <span>Help</span>
          </Link>
          <Link
            href="/settings"
            className={`nav-item ${current === "Settings" || pathname === "/settings" || pathname?.startsWith("/settings") ? "active" : ""}`}
            aria-current={current === "Settings" || pathname === "/settings" || pathname?.startsWith("/settings") ? "page" : undefined}
          >
            <Settings className="nav-icon" size={15} />
            <span>Settings</span>
          </Link>
          <div className="user-card">
            <div className="avatar">TP</div>
            <div>
              <span className="user-name">Tirth Patel</span>
              <span className="user-role">Project Controls</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar">
          <div className="breadcrumb">
            <span>North River Expansion</span>
            <span>/</span>
            <strong>{current}</strong>
          </div>

          <div className="topbar-actions">
            <button
              ref={searchTriggerRef}
              type="button"
              className="global-search"
              onClick={() => setPaletteOpen(true)}
              aria-label={`Search project (${isMac ? "⌘K" : "Ctrl+K"})`}
            >
              <Search size={14} aria-hidden="true" />
              <span className="global-search-text">Search project</span>
              <span className="key-hint">{isMac ? "⌘ K" : "Ctrl K"}</span>
            </button>

            <div className="data-date">
              <span>Data Date</span>
              <strong>26 Sep 2026</strong>
            </div>

            <div className="sync-state">
              <span className="sync-dot" />
              Synced
            </div>

            {/* View options / controls icon with viewport-safe bottom tooltip */}
            <div className="shell-popover-anchor" ref={filtersAnchorRef}>
              <Tooltip label="View options" side="bottom" align="end">
                <button
                  className="icon-button"
                  aria-label="View options"
                  aria-expanded={utility === "filters"}
                  onClick={() => setUtility(utility === "filters" ? null : "filters")}
                >
                  <SlidersHorizontal size={16} />
                </button>
              </Tooltip>
              {utility === "filters" && (
                <div
                  className="shell-popover utility-popover filters-popover"
                  role="dialog"
                  aria-label="View options"
                >
                  <div className="popover-head">
                    <strong>View Options</strong>
                    <span className="badge outline">Active Scope</span>
                  </div>
                  <div className="popover-body">
                    <div className="popover-row">
                      <span>Schedule baseline</span>
                      <strong>Rev 04 Approved</strong>
                    </div>
                    <div className="popover-row">
                      <span>Active workfronts</span>
                      <strong>All 8 disciplines</strong>
                    </div>
                    <div className="popover-row">
                      <span>Cut-off data date</span>
                      <strong>26 Sep 2026</strong>
                    </div>
                  </div>
                  <div className="popover-footer">
                    <small>Discipline and progress filters apply directly within each workspace.</small>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications icon with viewport-safe bottom tooltip */}
            <div className="shell-popover-anchor" ref={notificationsAnchorRef}>
              <Tooltip label="Notifications" side="bottom" align="end">
                <button
                  className="icon-button notif-bell-btn"
                  aria-label={
                    notifUnreadCount > 0
                      ? `Notifications (${notifUnreadCount} unread)`
                      : "Notifications"
                  }
                  aria-expanded={utility === "notifications"}
                  onClick={() => setUtility(utility === "notifications" ? null : "notifications")}
                >
                  <Bell size={16} />
                  {notifUnreadCount > 0 && (
                    <span className="notif-bell-badge" aria-hidden="true">
                      {notifUnreadCount}
                    </span>
                  )}
                </button>
              </Tooltip>
              <NotificationCenter
                isOpen={utility === "notifications"}
                onClose={() => setUtility(null)}
                anchorRef={notificationsAnchorRef}
                unreadCount={notifUnreadCount}
                onUnreadCountChange={setNotifUnreadCount}
              />
            </div>

            <ThemeToggle />
          </div>
        </header>

        <main className="main-canvas">
          <div className="canvas-inner">{children}</div>
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        triggerRef={searchTriggerRef}
      />
    </div>
  );
}
