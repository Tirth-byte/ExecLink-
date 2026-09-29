import { AppShell } from "@/components/app-shell";
import { DataIngestionWorkspace } from "@/components/data-ingestion";

export default function DataIngestionPage() {
  return (
    <AppShell current="Data Ingestion">
      <DataIngestionWorkspace />
    </AppShell>
  );
}
