"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { LiveExecutionActions } from "@/components/live-execution-actions";
import { LiveExecutionWorkspace } from "@/components/live-execution";
import { liveExecutionFixture } from "@/data/live-execution";

export default function LiveExecutionPage() {
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Functional CSV export
  const handleExportCSV = () => {
    const headers = ["ID", "Time", "Event", "Discipline", "Asset/Tag", "Location", "Source", "Reporter", "Matched Activity", "Confidence", "Status"];
    const rows = liveExecutionFixture.events.map((e) => [
      e.id,
      e.time,
      `"${e.event.replace(/"/g, '""')}"`,
      e.discipline,
      e.assetTag,
      `"${e.location.replace(/"/g, '""')}"`,
      e.source,
      `"${e.reporter.replace(/"/g, '""')}"`,
      e.matchedActivity ? `"${e.matchedActivity.id} - ${e.matchedActivity.name.replace(/"/g, '""')}"` : "None",
      e.confidence ? `${e.confidence}%` : "—",
      e.status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `execlink-live-execution-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Functional JSON export
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(liveExecutionFixture, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `execlink-live-execution-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell current="Live Execution">
      <header className="page-header">
        <div>
          <p className="eyebrow">EXECUTION</p>
          <h1 className="page-title">Live Execution</h1>
          <p className="page-description">
            Real-time field activity reconciled against the project schedule.
          </p>
        </div>
        <LiveExecutionActions
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          activeFilterCount={activeFilterCount}
        />
      </header>

      <LiveExecutionWorkspace
        activeFilterCount={activeFilterCount}
        setActiveFilterCount={setActiveFilterCount}
      />
    </AppShell>
  );
}
