"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = { id: string; name: string };
type Invoice = {
  id: string;
  customerId: string;
  invoiceNumber: string;
  principal: number;
  dueDate: string;
  currency: string;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

function getStatus(dueDate: string) {
  const today = new Date();
  const due = new Date(dueDate + "T00:00:00Z");
  return due < today ? "Overdue" : "Due";
}

export function InvoicesManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [principal, setPrincipal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    const [cRes, iRes] = await Promise.all([
      fetch("/api/customers", { cache: "no-store" }),
      fetch("/api/invoices", { cache: "no-store" })
    ]);
    const cJson = await cRes.json();
    const iJson = await iRes.json();
    setCustomers(cJson.data ?? []);
    setInvoices(iJson.data ?? []);
    if (!customerId && cJson.data?.[0]?.id) setCustomerId(cJson.data[0].id);
  }

  useEffect(() => {
    loadAll().catch(() => setError("Could not load invoices."));
  }, []);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "Unknown";
  }, [customers]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        invoiceNumber,
        principal: Number(principal),
        dueDate,
        currency: "GBP"
      })
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? "Could not create invoice.");
      return;
    }

    setInvoiceNumber("");
    setPrincipal("");
    setDueDate("");
    await loadAll();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 8 }}>
        <strong>Create invoice</strong>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input placeholder="Invoice number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
        <input placeholder="Principal (GBP)" type="number" min="0.01" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} required />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        <button disabled={saving || customers.length === 0} type="submit">
          {saving ? "Saving..." : "Create invoice"}
        </button>
        {customers.length === 0 ? <span className="subtle">Create a customer first.</span> : null}
        {error ? <span style={{ color: "#ef4444" }}>{error}</span> : null}
      </form>

      <div className="card" style={{ overflowX: "auto" }}>
        <strong>Invoices</strong>
        {invoices.length === 0 ? (
          <p className="subtle">No invoices yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th align="left">Invoice</th>
                <th align="left">Customer</th>
                <th align="left">Due date</th>
                <th align="left">Principal</th>
                <th align="left">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td>{i.invoiceNumber}</td>
                  <td>{customerName(i.customerId)}</td>
                  <td>{i.dueDate}</td>
                  <td>{formatMoney(i.principal, i.currency)}</td>
                  <td>{getStatus(i.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
