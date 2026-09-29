import { AppShell } from "@/components/app-shell";
import { SkeletonState } from "@/components/ui";

export default function Loading() {
  return <AppShell><header className="page-header"><div><p className="eyebrow">Project Overview</p><h1 className="page-title">Execution Command Center</h1><p className="page-description">Loading verified project controls…</p></div></header><div className="overview-loading"><SkeletonState /><SkeletonState /><SkeletonState /></div></AppShell>;
}
