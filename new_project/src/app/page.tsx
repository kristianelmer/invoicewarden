import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>InvoiceWarden</h1>
      <p className="subtle">Collect legally mandated interest on unpaid invoices.</p>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>MLP Focus</h2>
        <ol>
          <li>Create customer + invoice</li>
          <li>Calculate legal interest/fees (UK v1)</li>
          <li>Generate compliant reminders</li>
          <li>Send reliably with idempotency</li>
          <li>Reconcile payment into ledger</li>
        </ol>
        <Link href="/dashboard/invoices" style={{ color: "#9db8ff" }}>Open dashboard →</Link>
      </div>
    </main>
  );
}
