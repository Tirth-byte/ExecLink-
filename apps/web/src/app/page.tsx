import { AppShell } from "@/components/app-shell";
import { Overview } from "@/components/overview";
import { OverviewActions } from "@/components/overview-actions";

export default function Home() {
  return <AppShell><header className="page-header"><div><p className="eyebrow">Project Overview</p><h1 className="page-title">Execution Command Center</h1><p className="page-description">Verified field execution reconciled against the current project schedule, with exceptions surfaced for planner action.</p></div><OverviewActions /></header><Overview /></AppShell>;
}
