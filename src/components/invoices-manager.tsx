"use client";

import { useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  currency: string;
  amount_cents: number;
  issue_date: string;
  due_date: string;
  status: string;
  paid_at?: string | null;
  customer?: { name: string; email: string };
};

export function InvoicesManager({
  customers,
  initialInvoices,
}: {
  customers: Customer[];
  initialInvoices: Invoice[];
}) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const totals = useMemo(() => {
    const outstanding = invoices
      .filter((i) => i.status !== "paid")
      .reduce((sum, i) => sum + i.amount_cents, 0);
    return { outstanding };
  }, [invoices]);

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Amount must be positive");
      setCreating(false);
      return;
    }

    const payload = {
      customer_id: customerId,
      invoice_number: invoiceNumber,
      currency,
      amount_cents: Math.round(amountNumber * 100),
      issue_date: issueDate,
      due_date: dueDate,
    };

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(json.error?.formErrors?.[0] || json.error || "Could not create invoice");
      return;
    }

    setInvoices((prev) => [json.data, ...prev]);
    setInvoiceNumber("");
    setAmount("");
  }

  async function markPaid(id: string) {
    const res = await fetch(`/api/invoices/${id}/mark-paid`, { method: "POST" });
    if (!res.ok) return;
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? { ...inv, status: "paid", paid_at: new Date().toISOString() }
          : inv
      )
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <p className="mt-1 text-sm text-gray-600">
          Outstanding: {(totals.outstanding / 100).toFixed(2)} EUR
        </p>
      </div>

      <form onSubmit={createInvoice} className="space-y-3 rounded-xl border p-4">
        <h3 className="text-base font-semibold">Create invoice</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="rounded border px-3 py-2"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            {customers.length === 0 ? (
              <option value="">No customers yet</option>
            ) : null}
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
          <input
            className="rounded border px-3 py-2"
            placeholder="Invoice number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            required
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            required
          />
          <input
            type="date"
            className="rounded border px-3 py-2"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
          <input
            type="date"
            className="rounded border px-3 py-2"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={creating || customers.length === 0}
        >
          {creating ? "Creating..." : "Create invoice"}
        </button>
      </form>

      <div className="rounded-xl border p-4">
        <h3 className="text-base font-semibold">Recent invoices</h3>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No invoices yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">#{inv.invoice_number}</p>
                  <p className="text-sm text-gray-600">
                    {inv.customer?.name ?? "Unknown"} · {(inv.amount_cents / 100).toFixed(2)} {inv.currency} · due {inv.due_date}
                  </p>
                  <p className="text-xs text-gray-500">Status: {inv.status}</p>
                </div>
                {inv.status !== "paid" ? (
                  <button
                    onClick={() => markPaid(inv.id)}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    Mark paid
                  </button>
                ) : (
                  <span className="text-sm text-green-700">Paid</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
