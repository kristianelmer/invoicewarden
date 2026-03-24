"use client";

import { useMemo, useState } from "react";
import { assessLegalExposure, formatMoney } from "@/lib/legal";

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
  jurisdiction: "UK" | "US_NY" | "US_CA";
  project_completed_at?: string | null;
  services_rendered_at?: string | null;
  contract_requested_refused?: boolean;
  payment_url?: string | null;
  status: string;
  paid_at?: string | null;
  customer?: { name: string; email: string };
};

type PaymentIntentResult = {
  payment_intent_id: string;
  amount_cents: number;
  application_fee_amount: number;
};

type CheckoutLinkResult = {
  checkout_session_id: string;
  payment_url: string;
  amount_cents: number;
  application_fee_amount: number;
};

function jurisdictionLabel(jurisdiction: Invoice["jurisdiction"]) {
  switch (jurisdiction) {
    case "UK":
      return "United Kingdom";
    case "US_NY":
      return "USA - New York";
    case "US_CA":
      return "USA - California";
  }
}

function modeBadgeClass(mode: "reminder" | "enforcement") {
  return mode === "enforcement"
    ? "border-red-300 bg-red-50 text-red-700"
    : "border-amber-300 bg-amber-50 text-amber-700";
}

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
  const [jurisdiction, setJurisdiction] = useState<"UK" | "US_NY" | "US_CA">("UK");
  const [projectCompletedAt, setProjectCompletedAt] = useState("");
  const [servicesRenderedAt, setServicesRenderedAt] = useState("");
  const [contractRequestedRefused, setContractRequestedRefused] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");

  const [creatingPaymentFor, setCreatingPaymentFor] = useState<string | null>(null);
  const [creatingCheckoutFor, setCreatingCheckoutFor] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentIntents, setPaymentIntents] = useState<Record<string, PaymentIntentResult>>({});
  const [checkoutLinks, setCheckoutLinks] = useState<Record<string, CheckoutLinkResult>>({});

  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const invoice of invoices) {
      if (invoice.status === "paid") continue;
      byCurrency.set(
        invoice.currency,
        (byCurrency.get(invoice.currency) ?? 0) + invoice.amount_cents
      );
    }
    return byCurrency;
  }, [invoices]);

  const painRows = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status !== "paid")
      .map((invoice) => {
        const legal = assessLegalExposure({
          amountCents: invoice.amount_cents,
          currency: invoice.currency,
          dueDate: invoice.due_date,
          jurisdiction: invoice.jurisdiction,
          projectCompletedAt: invoice.project_completed_at ?? null,
          servicesRenderedAt: invoice.services_rendered_at ?? null,
          contractRequestedRefused: Boolean(invoice.contract_requested_refused),
          now: new Date(),
        });

        return {
          invoice,
          legal,
          legalAdditionsCents: Math.max(0, legal.updatedTotalCents - invoice.amount_cents),
        };
      })
      .sort((a, b) => b.legal.updatedTotalCents - a.legal.updatedTotalCents);
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
      jurisdiction,
      project_completed_at: projectCompletedAt || null,
      services_rendered_at: servicesRenderedAt || null,
      contract_requested_refused: contractRequestedRefused,
      payment_url: paymentUrl || null,
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
    setProjectCompletedAt("");
    setServicesRenderedAt("");
    setContractRequestedRefused(false);
    setPaymentUrl("");
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

  async function createPaymentIntent(invoiceId: string) {
    setCreatingPaymentFor(invoiceId);
    setPaymentError(null);

    const res = await fetch("/api/enforcement/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPaymentError(json.error || "Could not create payment intent");
      setCreatingPaymentFor(null);
      return;
    }

    setPaymentIntents((prev) => ({
      ...prev,
      [invoiceId]: {
        payment_intent_id: json.payment_intent_id,
        amount_cents: json.amount_cents,
        application_fee_amount: json.application_fee_amount,
      },
    }));

    setCreatingPaymentFor(null);
  }

  async function createCheckoutLink(invoiceId: string) {
    setCreatingCheckoutFor(invoiceId);
    setPaymentError(null);

    const res = await fetch("/api/enforcement/checkout-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPaymentError(json.error || "Could not create checkout link");
      setCreatingCheckoutFor(null);
      return;
    }

    setCheckoutLinks((prev) => ({
      ...prev,
      [invoiceId]: {
        checkout_session_id: json.checkout_session_id,
        payment_url: json.payment_url,
        amount_cents: json.amount_cents,
        application_fee_amount: json.application_fee_amount,
      },
    }));

    setCreatingCheckoutFor(null);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <div className="mt-1 text-sm text-gray-600">
          {totals.size === 0 ? (
            <p>Outstanding: 0</p>
          ) : (
            <ul>
              {[...totals.entries()].map(([ccy, cents]) => (
                <li key={ccy}>Outstanding: {formatMoney(cents, ccy)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="text-base font-semibold">Pain meter</h3>
        <p className="mt-1 text-sm text-gray-600">
          Live legal exposure across unpaid invoices. Enforcement mode starts at 7+ days late.
        </p>

        {painRows.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No unpaid invoices.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {painRows.map(({ invoice, legal, legalAdditionsCents }) => (
              <li key={invoice.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">#{invoice.invoice_number}</p>
                    <p className="text-xs text-gray-600">
                      {invoice.customer?.name ?? "Unknown"} · {jurisdictionLabel(invoice.jurisdiction)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Trigger: {legal.triggerDate} · Days late: {legal.daysLate}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">Law: {legal.lawLabel}</p>
                    {legal.dailyInterestCents > 0 ? (
                      <p className="mt-1 text-xs text-red-700">
                        Daily accrual: {formatMoney(legal.dailyInterestCents, invoice.currency)} / day
                      </p>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 text-xs ${modeBadgeClass(legal.mode)}`}
                    >
                      {legal.mode === "enforcement" ? "Enforcement mode" : "Reminder mode"}
                    </span>
                    <p className="mt-2 text-xs text-gray-600">
                      Original: {formatMoney(invoice.amount_cents, invoice.currency)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Legal add-ons: {formatMoney(legalAdditionsCents, invoice.currency)}
                    </p>
                    <p className="text-sm font-semibold">
                      Updated total: {formatMoney(legal.updatedTotalCents, invoice.currency)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
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
          <select
            className="rounded border px-3 py-2"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as "UK" | "US_NY" | "US_CA")}
            required
          >
            <option value="UK">United Kingdom</option>
            <option value="US_NY">USA - New York</option>
            <option value="US_CA">USA - California</option>
          </select>

          {jurisdiction === "US_NY" ? (
            <input
              type="date"
              className="rounded border px-3 py-2"
              value={projectCompletedAt}
              onChange={(e) => setProjectCompletedAt(e.target.value)}
              placeholder="Project completed at"
            />
          ) : null}

          {jurisdiction === "US_CA" ? (
            <input
              type="date"
              className="rounded border px-3 py-2"
              value={servicesRenderedAt}
              onChange={(e) => setServicesRenderedAt(e.target.value)}
              placeholder="Services rendered at"
            />
          ) : null}

          <input
            className="rounded border px-3 py-2 md:col-span-2"
            placeholder="Payment URL (optional)"
            value={paymentUrl}
            onChange={(e) => setPaymentUrl(e.target.value)}
          />
        </div>

        {jurisdiction === "US_CA" ? (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={contractRequestedRefused}
              onChange={(e) => setContractRequestedRefused(e.target.checked)}
            />
            Written contract was requested and refused (+$1,000)
          </label>
        ) : null}

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
        {paymentError ? <p className="mt-2 text-sm text-red-600">{paymentError}</p> : null}

        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No invoices yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {invoices.map((inv) => {
              const paymentMeta = paymentIntents[inv.id];
              const checkoutMeta = checkoutLinks[inv.id];
              return (
                <li key={inv.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">#{inv.invoice_number}</p>
                    <p className="text-sm text-gray-600">
                      {inv.customer?.name ?? "Unknown"} · {(inv.amount_cents / 100).toFixed(2)} {inv.currency} · due {inv.due_date}
                    </p>
                    <p className="text-xs text-gray-500">
                      Jurisdiction: {jurisdictionLabel(inv.jurisdiction)}
                    </p>
                    <p className="text-xs text-gray-500">Status: {inv.status}</p>
                    {paymentMeta ? (
                      <p className="mt-1 text-xs text-green-700">
                        PaymentIntent: {paymentMeta.payment_intent_id} · Total {formatMoney(paymentMeta.amount_cents, inv.currency)} · Fee {formatMoney(paymentMeta.application_fee_amount, inv.currency)}
                      </p>
                    ) : null}
                    {checkoutMeta ? (
                      <p className="mt-1 text-xs text-green-700">
                        Checkout link ready · Total {formatMoney(checkoutMeta.amount_cents, inv.currency)} · Fee {formatMoney(checkoutMeta.application_fee_amount, inv.currency)}
                      </p>
                    ) : inv.payment_url ? (
                      <p className="mt-1 text-xs text-gray-600">Checkout link saved on invoice.</p>
                    ) : null}
                  </div>

                  {inv.status !== "paid" ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => markPaid(inv.id)}
                        className="rounded border px-3 py-2 text-sm"
                      >
                        Mark paid
                      </button>
                      <button
                        onClick={() => createPaymentIntent(inv.id)}
                        disabled={creatingPaymentFor === inv.id || creatingCheckoutFor === inv.id}
                        className="rounded border px-3 py-2 text-sm disabled:opacity-50"
                      >
                        {creatingPaymentFor === inv.id
                          ? "Creating payment..."
                          : "Create payment intent"}
                      </button>
                      <button
                        onClick={() => createCheckoutLink(inv.id)}
                        disabled={creatingCheckoutFor === inv.id || creatingPaymentFor === inv.id}
                        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {creatingCheckoutFor === inv.id
                          ? "Creating link..."
                          : "Create checkout link"}
                      </button>
                      {(checkoutMeta?.payment_url || inv.payment_url) ? (
                        <a
                          href={checkoutMeta?.payment_url || inv.payment_url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border px-3 py-2 text-center text-xs"
                        >
                          Open checkout link
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-sm text-green-700">Paid</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
