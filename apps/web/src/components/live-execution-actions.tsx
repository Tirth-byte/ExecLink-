"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Download, SlidersHorizontal, UploadCloud, Check, FileSpreadsheet, FileJson, X } from "lucide-react";
import { Button } from "@/components/ui";

export function LiveExecutionActions({
  onExportCSV,
  onExportJSON,
  activeFilterCount = 0,
  onToggleFilters,
}: {
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  activeFilterCount?: number;
  onToggleFilters?: () => void;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [exportOpen]);

  const handleExport = (format: "csv" | "json") => {
    if (format === "csv" && onExportCSV) {
      onExportCSV();
    } else if (format === "json" && onExportJSON) {
      onExportJSON();
    }
    setExportedFormat(format);
    setTimeout(() => {
      setExportedFormat(null);
      setExportOpen(false);
    }, 1200);
  };

  return (
    <div className="page-actions">
      <div className="action-popover-anchor" ref={menuRef}>
        <Button
          variant="secondary"
          onClick={() => setExportOpen((prev) => !prev)}
          aria-expanded={exportOpen}
          aria-haspopup="true"
        >
          <Download size={14} />
          Export
        </Button>

        {exportOpen && (
          <div className="action-menu" role="menu">
            <div className="action-menu-head">
              <strong>Export Ledger</strong>
              <button
                className="icon-button"
                onClick={() => setExportOpen(false)}
                aria-label="Close export menu"
              >
                <X size={12} />
              </button>
            </div>
            <button
              role="menuitem"
              onClick={() => handleExport("csv")}
            >
              <FileSpreadsheet size={14} className="share-icon" />
              <div>
                <strong>Export filtered events (CSV)</strong>
                <small>Current table view with columns</small>
              </div>
              {exportedFormat === "csv" && <Check size={14} className="green-text" />}
            </button>
            <button
              role="menuitem"
              onClick={() => handleExport("json")}
            >
              <FileJson size={14} className="share-icon" />
              <div>
                <strong>Export raw payload (JSON)</strong>
                <small>Full structured records & audit</small>
              </div>
              {exportedFormat === "json" && <Check size={14} className="green-text" />}
            </button>
          </div>
        )}
      </div>

      <Button
        variant="secondary"
        onClick={onToggleFilters}
        className={activeFilterCount > 0 ? "has-active-filters" : ""}
      >
        <SlidersHorizontal size={14} />
        Filters
        {activeFilterCount > 0 && (
          <span className="filter-count-badge">{activeFilterCount}</span>
        )}
      </Button>

      <Link href="/data-ingestion" className="button primary">
        <UploadCloud size={14} />
        Import Update
      </Link>
    </div>
  );
}
