"use client";

import { AppShell } from "@/components/app-shell";
import { Button, ErrorState } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppShell><header className="page-header"><div><p className="eyebrow">Project Overview</p><h1 className="page-title">Execution Command Center</h1><p className="page-description">The latest verified overview could not be assembled.</p></div><Button variant="primary" onClick={reset}>Try again</Button></header><ErrorState /></AppShell>;
}
