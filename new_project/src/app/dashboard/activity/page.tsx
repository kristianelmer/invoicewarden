import { DashboardShell } from "@/components/dashboard-shell";

export default function ActivityPage() {
  return (
    <DashboardShell active="Activity">
      <h1>Activity</h1>
      <p className="subtle">Timeline: sent / failed / skipped / paid events.</p>
      <div className="card">Placeholder: operational event stream.</div>
    </DashboardShell>
  );
}
