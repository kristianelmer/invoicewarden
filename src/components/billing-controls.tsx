"use client";

import { useState } from "react";

type BillingControlsProps = {
  initialStatus: string | null;
  currentPeriodEnd: string | null;
  isActive: boolean;
};

export function BillingControls({
  initialStatus,
  currentPeriodEnd,
  isActive,
}: BillingControlsProps) {
  const status = initialStatus;
  const periodEnd = currentPeriodEnd;
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy("checkout");
    setError(null);

    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const json = await res.json();

    if (!res.ok || !json.url) {
      setError(json.error || "Could not start checkout");
      setBusy(null);
      return;
    }

    window.location.href = json.url;
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);

    const res = await fetch("/api/billing/portal", { method: "POST" });
    const json = await res.json();

    if (!res.ok || !json.url) {
      setError(json.error || "Could not open billing portal");
      setBusy(null);
      return;
    }

    window.location.href = json.url;
  }

  return (
    <section className="mb-6 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-gray-600">
            Status: <span className="font-medium">{status ?? "not started"}</span>
            {periodEnd ? ` · Renews: ${new Date(periodEnd).toLocaleDateString()}` : ""}
          </p>
        </div>

        <div className="flex gap-2">
          {!isActive ? (
            <button
              onClick={startCheckout}
              disabled={busy !== null}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy === "checkout" ? "Redirecting..." : "Start subscription"}
            </button>
          ) : (
            <button
              onClick={openPortal}
              disabled={busy !== null}
              className="rounded border px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy === "portal" ? "Opening..." : "Manage billing"}
            </button>
          )}
        </div>
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {!isActive && status !== "trialing" ? (
        <p className="mt-2 text-sm text-gray-600">
          You’re on free mode. Subscribe to unlock paid features.
        </p>
      ) : null}

      {isActive && status !== initialStatus ? (
        <p className="mt-2 text-sm text-green-700">Billing status updated: {status}</p>
      ) : null}
    </section>
  );
}
