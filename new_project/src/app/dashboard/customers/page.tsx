import { DashboardShell } from "@/components/dashboard-shell";
import { CustomersManager } from "@/components/customers-manager";

export default function CustomersPage() {
  return (
    <DashboardShell active="Customers">
      <h1>Customers</h1>
      <p className="subtle">Create/list customers (Slice A).</p>
      <CustomersManager />
    </DashboardShell>
  );
}
