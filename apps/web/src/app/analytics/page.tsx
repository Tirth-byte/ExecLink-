import { AppShell } from "@/components/app-shell";
import { AnalyticsWorkspace } from "@/components/analytics-workspace";

export const metadata = {
  title: "Analytics | ExecLink",
  description: "Analyze schedule performance, execution variance and data confidence.",
};

export default function AnalyticsPage() {
  return (
    <AppShell current="Analytics">
      <AnalyticsWorkspace />
    </AppShell>
  );
}
