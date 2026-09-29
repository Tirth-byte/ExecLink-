import { AppShell } from "@/components/app-shell";
import { VerificationCenterWorkspace } from "@/components/verification-center";

export default function VerificationCenterPage() {
  return (
    <AppShell current="Verification Center">
      <VerificationCenterWorkspace />
    </AppShell>
  );
}
