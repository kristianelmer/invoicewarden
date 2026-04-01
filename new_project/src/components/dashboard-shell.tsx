import Link from "next/link";

const items = [
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/customers", label: "Customers" },
  { href: "/dashboard/reminders", label: "Reminders" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/settings", label: "Settings" }
];

export function DashboardShell({ children, active }: { children: React.ReactNode; active: string }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h3 style={{ marginTop: 0 }}>InvoiceWarden</h3>
        <p className="subtle" style={{ marginTop: -6 }}>UK v1 (legal-interest)</p>
        <nav>
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${active === item.label ? "active" : ""}`}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
