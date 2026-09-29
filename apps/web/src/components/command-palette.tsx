"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  CircleCheckBig,
  Compass,
  Database,
  FileSpreadsheet,
  FileText,
  FolderTree,
  GitCompareArrows,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Search,
  TableProperties,
  X,
} from "lucide-react";
import {
  type SearchResultItem,
  type SearchGroup,
  executeGlobalSearch,
  RECENT_ITEMS,
  QUICK_ACTIONS,
  NAVIGATION_ITEMS,
} from "@/data/global-search";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function CommandPalette({ isOpen, onClose, triggerRef }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMac] = useState(() => {
    if (typeof window !== "undefined") {
      return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
    }
    return true;
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Compute search results or default sections
  const { groups, flatItems } = useMemo(() => {
    const q = query.trim();
    let computedGroups: SearchGroup[] = [];

    if (!q) {
      computedGroups = [
        {
          type: "activity",
          title: "RECENT",
          count: RECENT_ITEMS.length,
          items: RECENT_ITEMS,
        },
        {
          type: "command",
          title: "QUICK ACTIONS",
          count: QUICK_ACTIONS.length,
          items: QUICK_ACTIONS,
        },
        {
          type: "navigation",
          title: "NAVIGATION",
          count: NAVIGATION_ITEMS.length,
          items: NAVIGATION_ITEMS,
        },
      ];
    } else {
      computedGroups = executeGlobalSearch(q);
    }

    const flattened: SearchResultItem[] = [];
    for (const g of computedGroups) {
      for (const item of g.items) {
        flattened.push(item);
      }
    }

    return { groups: computedGroups, flatItems: flattened };
  }, [query]);

  // Handle opening and scroll locking without setState in effect
  useEffect(() => {
    if (!isOpen) return;

    // Lock page background scrolling without moving scroll position
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus input immediately
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen) return;
    const activeEl = itemRefs.current.get(selectedIndex);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen]);

  // Close and reset
  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  // Navigate to item and close
  const handleSelectItem = useCallback(
    (item: SearchResultItem) => {
      setQuery("");
      setSelectedIndex(0);
      onClose();
      if (item.url) {
        router.push(item.url);
      }
      if (triggerRef?.current) {
        triggerRef.current.focus();
      }
    },
    [onClose, router, triggerRef]
  );

  // Keyboard controls
  // Keyboard controls
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        if (triggerRef?.current) {
          triggerRef.current.focus();
        }
        return;
      }

      if (flatItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatItems[selectedIndex];
        if (selected) {
          handleSelectItem(selected);
        }
      }
    },
    [flatItems, selectedIndex, handleSelectItem, handleClose, triggerRef]
  );

  if (!isOpen) return null;

  // Render appropriate entity icon
  const renderItemIcon = (item: SearchResultItem) => {
    switch (item.type) {
      case "activity":
        return <Layers size={14} className="cmd-icon-activity" aria-hidden="true" />;
      case "event":
        return <Activity size={14} className="cmd-icon-event" aria-hidden="true" />;
      case "wbs":
        return <FolderTree size={14} className="cmd-icon-wbs" aria-hidden="true" />;
      case "evidence":
        if (item.title.endsWith(".xlsx")) {
          return <FileSpreadsheet size={14} className="cmd-icon-evidence" aria-hidden="true" />;
        }
        if (item.title.endsWith(".jpg") || item.title.endsWith(".png")) {
          return <ImageIcon size={14} className="cmd-icon-evidence" aria-hidden="true" />;
        }
        return <FileText size={14} className="cmd-icon-evidence" aria-hidden="true" />;
      case "memory":
        return <BookOpen size={14} className="cmd-icon-memory" aria-hidden="true" />;
      case "navigation":
        switch (item.title) {
          case "Overview":
            return <LayoutDashboard size={14} className="cmd-icon-nav" aria-hidden="true" />;
          case "Live Execution":
            return <Activity size={14} className="cmd-icon-nav" aria-hidden="true" />;
          case "Match Review":
            return <GitCompareArrows size={14} className="cmd-icon-nav" aria-hidden="true" />;
          case "Schedule Explorer":
            return <TableProperties size={14} className="cmd-icon-nav" aria-hidden="true" />;
          case "Data Ingestion":
            return <Database size={14} className="cmd-icon-nav" aria-hidden="true" />;
          case "Verification Center":
            return <CircleCheckBig size={14} className="cmd-icon-nav" aria-hidden="true" />;
          case "Analytics":
            return <BarChart3 size={14} className="cmd-icon-nav" aria-hidden="true" />;
          case "Project Memory":
            return <BookOpen size={14} className="cmd-icon-nav" aria-hidden="true" />;
          default:
            return <Compass size={14} className="cmd-icon-nav" aria-hidden="true" />;
        }
      case "command":
        switch (item.id) {
          case "CMD-IMPORT":
            return <Database size={14} className="cmd-icon-cmd" aria-hidden="true" />;
          case "CMD-QUEUE":
            return <CircleCheckBig size={14} className="cmd-icon-cmd" aria-hidden="true" />;
          case "CMD-SCHEDULE":
            return <TableProperties size={14} className="cmd-icon-cmd" aria-hidden="true" />;
          case "CMD-LIVE":
            return <Activity size={14} className="cmd-icon-cmd" aria-hidden="true" />;
          case "CMD-MEMORY":
            return <BookOpen size={14} className="cmd-icon-cmd" aria-hidden="true" />;
          default:
            return <Compass size={14} className="cmd-icon-cmd" aria-hidden="true" />;
        }
      default:
        return <Compass size={14} className="cmd-icon-default" aria-hidden="true" />;
    }
  };

  let globalItemIndex = -1;

  return (
    <div
      className="cmd-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={handleClose}
    >
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="cmd-search-bar">
          <Search size={16} className="cmd-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search activities, events, evidence, WBS..."
            aria-label="Search activities, events, evidence, WBS..."
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="cmd-results-list"
            aria-activedescendant={
              flatItems[selectedIndex] ? `cmd-item-${flatItems[selectedIndex].id}` : undefined
            }
          />
          {query ? (
            <button
              type="button"
              className="cmd-clear-btn"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="cmd-kbd-hint">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          )}
        </div>

        {/* Results List */}
        <div id="cmd-results-list" ref={listRef} className="cmd-list" role="listbox">
          {groups.length > 0 ? (
            groups.map((group) => (
              <div key={group.title} className="cmd-group">
                <div className="cmd-group-header">
                  <span className="cmd-group-title">{group.title}</span>
                  <span className="cmd-group-count">{group.count}</span>
                </div>

                <div className="cmd-group-items">
                  {group.items.map((item) => {
                    globalItemIndex++;
                    const itemIndex = globalItemIndex;
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        id={`cmd-item-${item.id}`}
                        ref={(el) => {
                          if (el) itemRefs.current.set(itemIndex, el);
                          else itemRefs.current.delete(itemIndex);
                        }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`cmd-item ${isSelected ? "cmd-item-active" : ""}`}
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                      >
                        <div className="cmd-item-left">
                          <span className="cmd-item-icon-box">{renderItemIcon(item)}</span>
                          <div className="cmd-item-text">
                            <span className="cmd-item-title">{item.title}</span>
                            <span className="cmd-item-subtitle">{item.subtitle}</span>
                          </div>
                        </div>

                        <div className="cmd-item-right">
                          {item.badge && (
                            <span
                              className={`cmd-item-badge ${
                                item.badge === "Action"
                                  ? "badge-action"
                                  : item.status === "Blocked"
                                  ? "badge-blocked"
                                  : item.status === "Verified" || item.badge.includes("Match")
                                  ? "badge-verified"
                                  : ""
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {isSelected && <span className="cmd-select-hint">↵</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            /* No Results Empty State */
            <div className="cmd-empty-state">
              <p className="cmd-empty-title">No results for &ldquo;{query}&rdquo;</p>
              <p className="cmd-empty-desc">
                Try an activity ID (e.g. <code>ACT-P110</code>), asset tag (<code>P-110</code>),
                discipline (<code>Piping</code>), or event description.
              </p>
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="cmd-footer">
          <div className="cmd-shortcuts">
            <span className="cmd-shortcut-item">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="cmd-shortcut-divider">·</span>
            <span className="cmd-shortcut-item">
              <kbd>↵</kbd>
              <span>Select</span>
            </span>
            <span className="cmd-shortcut-divider">·</span>
            <span className="cmd-shortcut-item">
              <kbd>esc</kbd>
              <span>Close</span>
            </span>
          </div>

          <div className="cmd-footer-meta">
            {query.trim() ? (
              <span>
                {flatItems.length} {flatItems.length === 1 ? "result" : "results"}
              </span>
            ) : (
              <span>ExecLink Navigation</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
