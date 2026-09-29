"use client";

import { AppShell } from "@/components/app-shell";
import { MatchReviewWorkspace } from "@/components/match-review";

export default function MatchReviewPage() {
  return (
    <AppShell current="Match Review">
      <MatchReviewWorkspace />
    </AppShell>
  );
}
