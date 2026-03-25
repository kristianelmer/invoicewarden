import { DashboardShell } from "@/components/dashboard-shell";
import { InvoicesManager } from "@/components/invoices-manager";

export default function InvoicesPage() {
  return (
    <DashboardShell active="Invoices">
      <h1>Invoices</h1>
      <p className="subtle">Primary operational view for principal, interest, fees, and total claim.</p>
      <InvoicesManager />
    </DashboardShell>
  );
}
