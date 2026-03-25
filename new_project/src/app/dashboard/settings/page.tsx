import { DashboardShell } from "@/components/dashboard-shell";

export default function SettingsPage() {
  return (
    <DashboardShell active="Settings">
      <h1>Settings</h1>
      <p className="subtle">Jurisdiction, business details, templates, billing.</p>
      <div className="card">UK active. NY/CA marked coming soon.</div>
    </DashboardShell>
  );
}
