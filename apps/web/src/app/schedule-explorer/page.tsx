"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ScheduleExplorerWorkspace } from "@/components/schedule-explorer";

function ScheduleExplorerSkeleton() {
  return (
    <div className="scr-root scr-root-loading" aria-busy="true">
      <header className="scr-head">
        <div className="scr-head-id">
          <h1 className="scr-head-title">Schedule Explorer</h1>
          <p className="scr-head-sub">North River Expansion · L6 Schedule</p>
        </div>
      </header>
      <div className="scr-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="scr-gauge scr-skeleton-block" />
        ))}
      </div>
      <div className="scr-command scr-skeleton-line" />
      <div className="scr-workspace scr-skeleton-block" />
    </div>
  );
}

export default function ScheduleExplorerPage() {
  return (
    <AppShell current="Schedule Explorer">
      <Suspense fallback={<ScheduleExplorerSkeleton />}>
        <ScheduleExplorerWorkspace />
      </Suspense>
    </AppShell>
  );
}
