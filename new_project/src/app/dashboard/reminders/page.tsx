import { DashboardShell } from '@/components/dashboard-shell';
import { RemindersManager } from '@/components/reminders-manager';

export default function RemindersPage() {
  return (
    <DashboardShell active="Reminders">
      <h1>Reminders</h1>
      <p className="subtle">Track scheduled, sent, and failed reminders. Retry failed items when needed.</p>
      <RemindersManager />
    </DashboardShell>
  );
}
