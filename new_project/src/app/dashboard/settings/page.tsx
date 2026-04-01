import { DashboardShell } from "@/components/dashboard-shell";
import { SettingsManager } from "@/components/settings-manager";

export default function SettingsPage() {
  return (
    <DashboardShell active="Settings">
      <h1>Settings</h1>
      <p className="subtle">Jurisdiction, business details, templates, billing.</p>
      <SettingsManager />
    </DashboardShell>
  );
}
