import { AppShell } from "@/components/app-shell";
import { ProjectMemoryWorkspace } from "@/components/project-memory-workspace";

export const metadata = {
  title: "Project Memory | ExecLink",
  description: "Search verified execution history and reuse lessons from similar work.",
};

export default function ProjectMemoryPage() {
  return (
    <AppShell current="Project Memory">
      <ProjectMemoryWorkspace />
    </AppShell>
  );
}
