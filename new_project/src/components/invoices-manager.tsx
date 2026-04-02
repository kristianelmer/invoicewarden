"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Customer = { id: string; name: string };
type Invoice = {
  id: string;
  customerId: string;
  invoiceNumber: string;
  principal: number;
  dueDate: string;
  currency: string;
  status?: string;
  paymentUrl?: string | null;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowActionLoading, setRowActionLoading] = useState<Record<string, boolean>>({});

  const loadAll = useCallback(async () => {
    try {
      const [cRes, iRes] = await Promise.all([
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/invoices", { cache: "no-store" })
      ]);
      const cJson = await cRes.json();
      const iJson = await iRes.json();
      setCustomers(cJson.data ?? []);
      setInvoices(iJson.data ?? []);
      setCustomerId((prev) => prev || cJson.data?.[0]?.id || "");
    } catch {
      setError("Could not load invoices.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "Unknown";
  }, [customers]);

  async function createPaymentSession(invoiceId: string) {
    setError(null);
    setNotice(null);
    setRowActionLoading((prev) => ({ ...prev, [invoiceId]: true }));

    const res = await fetch(`/api/invoices/${invoiceId}/payment-session`, { method: "POST" });
    const json = await res.json();

    setRowActionLoading((prev) => ({ ...prev, [invoiceId]: false }));

    if (!res.ok) {
      setError(json.error ?? "Could not create payment session.");
      return;
    }

    const paymentUrl = json.paymentUrl as string | undefined;
    if (paymentUrl) {
      window.open(paymentUrl, "_blank", "noopener,noreferrer");
    }

    await loadAll();
  }

  async function copyPaymentUrl(invoice: Invoice) {
    setError(null);
    setNotice(null);

    const url = invoice.paymentUrl;
    if (!url) {
      setError("No payment URL yet. Create a payment session first.");
      return;
    }

    await navigator.clipboard.writeText(url);
    setNotice(`Copied payment link for ${invoice.invoiceNumber}.`);
  }

  async function markPaidManually(invoice: Invoice) {
    setError(null);
    setNotice(null);

    const confirmed = window.confirm(
      `Mark invoice ${invoice.invoiceNumber} as paid manually? Use this only when webhook reconciliation fails.`
    );

    if (!confirmed) {
      return;
    }

    setRowActionLoading((prev) => ({ ...prev, [invoice.id]: true }));

    const res = await fetch(`/api/invoices/${invoice.id}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "Manual fallback via dashboard invoice actions",
        paidAmountCents: Math.round(invoice.principal * 100)
      })
    });

    const json = await res.json();

    setRowActionLoading((prev) => ({ ...prev, [invoice.id]: false }));

    if (!res.ok) {
      setError(json.error ?? "Could not mark invoice as paid manually.");
      return;
    }

    setNotice(`Invoice ${invoice.invoiceNumber} marked as paid manually.`);
    await loadAll();
  }

  function openPdf(invoiceId: string) {
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank", "noopener,noreferrer");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
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
          <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th align="left">Invoice</th>
                <th align="left">Customer</th>
                <th align="left">Due date</th>
                <th align="left">Principal</th>
                <th align="left">Status</th>
                <th align="left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => {
                const status = (i.status ?? getStatus(i.dueDate)).toUpperCase();
                const isPaid = status === "PAID";

                return (
                  <tr key={i.id}>
                    <td>{i.invoiceNumber}</td>
                    <td>{customerName(i.customerId)}</td>
                    <td>{i.dueDate}</td>
                    <td>{formatMoney(i.principal, i.currency)}</td>
                    <td>{status}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => createPaymentSession(i.id)}
                          disabled={Boolean(rowActionLoading[i.id]) || isPaid}
                        >
                          {rowActionLoading[i.id] ? "Working..." : "Pay link"}
                        </button>
                        <button type="button" onClick={() => copyPaymentUrl(i)} disabled={isPaid}>
                          Copy link
                        </button>
                        <button type="button" onClick={() => openPdf(i.id)}>
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => markPaidManually(i)}
                          disabled={Boolean(rowActionLoading[i.id]) || isPaid}
                          title="Use when Stripe webhook reconciliation fails"
                        >
                          {rowActionLoading[i.id] ? "Working..." : "Mark paid (manual)"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="subtle" style={{ marginTop: 10 }}>
            Runbook hint: if a successful Stripe payment does not reconcile within ~2 minutes, check webhook delivery logs,
            then use <strong>Mark paid (manual)</strong> and verify the event in Activity.
          </p>
          {notice ? <p style={{ color: "#22c55e", marginTop: 8 }}>{notice}</p> : null}
          {error ? <p style={{ color: "#ef4444", marginTop: 8 }}>{error}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
