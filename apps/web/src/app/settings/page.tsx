import { AppShell } from "@/components/app-shell";
import { SettingsWorkspace } from "@/components/settings-workspace";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const rawTab = resolvedParams?.tab;
  const validTabs = ["project", "matching", "datasources", "users", "demo"] as const;
  const initialTab = validTabs.includes(rawTab as any) ? (rawTab as any) : "project";

  return (
    <AppShell current="Settings">
      <SettingsWorkspace initialTab={initialTab} />
    </AppShell>
  );
}
