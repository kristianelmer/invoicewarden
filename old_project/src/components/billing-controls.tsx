"use client";

import { useState } from "react";

type BillingControlsProps = {
  initialStatus: string | null;
  currentPeriodEnd: string | null;
  isActive: boolean;
  connect: {
    accountId: string | null;
    onboarded: boolean;
  };
};

type ConnectState = {
  accountId: string | null;
  onboarded: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

export function BillingControls({
  initialStatus,
  currentPeriodEnd,
  isActive,
  connect,
}: BillingControlsProps) {
  const status = initialStatus;
  const periodEnd = currentPeriodEnd;
  const [busy, setBusy] = useState<
    "checkout" | "portal" | "connect" | "connect_login" | "connect_refresh" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [connectState, setConnectState] = useState<ConnectState>({
    accountId: connect.accountId,
    onboarded: connect.onboarded,
    detailsSubmitted: connect.onboarded,
    chargesEnabled: connect.onboarded,
    payoutsEnabled: connect.onboarded,
  });

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

  async function startConnectOnboarding() {
    setBusy("connect");
    setError(null);

    const res = await fetch("/api/stripe/connect/onboarding", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.url) {
      setError(json.error || "Could not start Stripe Connect onboarding");
      setBusy(null);
      return;
    }

    window.location.href = json.url;
  }

  async function openConnectLogin() {
    setBusy("connect_login");
    setError(null);

    const res = await fetch("/api/stripe/connect/login-link", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.url) {
      setError(json.error || "Could not open Stripe Connect dashboard");
      setBusy(null);
      return;
    }

    window.location.href = json.url;
  }

  async function refreshConnectStatus() {
    setBusy("connect_refresh");
    setError(null);

    const res = await fetch("/api/stripe/connect/status", { method: "GET" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error || "Could not refresh Stripe Connect status");
      setBusy(null);
      return;
    }

    setConnectState({
      accountId: json.accountId ?? null,
      onboarded: Boolean(json.onboarded),
      detailsSubmitted: Boolean(json.detailsSubmitted),
      chargesEnabled: Boolean(json.chargesEnabled),
      payoutsEnabled: Boolean(json.payoutsEnabled),
    });

    setBusy(null);
  }

  return (
    <section className="mb-6 space-y-4">
      <div className="rounded-xl border p-4">
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

        {!isActive && status !== "trialing" ? (
          <p className="mt-2 text-sm text-gray-600">
            You’re on free mode. Subscribe to unlock paid features.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Stripe Connect</h3>
            <p className="text-sm text-gray-600">
              Connect your payout account to collect payments and route funds automatically.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Account: {connectState.accountId ?? "Not connected"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!connectState.accountId ? (
              <button
                onClick={startConnectOnboarding}
                disabled={busy !== null}
                className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy === "connect" ? "Redirecting..." : "Connect Stripe"}
              </button>
            ) : !connectState.onboarded ? (
              <button
                onClick={startConnectOnboarding}
                disabled={busy !== null}
                className="rounded border px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy === "connect" ? "Redirecting..." : "Continue onboarding"}
              </button>
            ) : (
              <button
                onClick={openConnectLogin}
                disabled={busy !== null}
                className="rounded border px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy === "connect_login" ? "Opening..." : "Open Stripe dashboard"}
              </button>
            )}
            <button
              onClick={refreshConnectStatus}
              disabled={busy !== null}
              className="rounded border px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy === "connect_refresh" ? "Refreshing..." : "Refresh status"}
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
          <p>
            Details submitted: <span className="font-medium">{connectState.detailsSubmitted ? "Yes" : "No"}</span>
          </p>
          <p>
            Charges enabled: <span className="font-medium">{connectState.chargesEnabled ? "Yes" : "No"}</span>
          </p>
          <p>
            Payouts enabled: <span className="font-medium">{connectState.payoutsEnabled ? "Yes" : "No"}</span>
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
