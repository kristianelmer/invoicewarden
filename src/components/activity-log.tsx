"use client";

import { useState } from "react";

type ActivityEvent = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  invoice?: { invoice_number?: string } | { invoice_number?: string }[] | null;
};

function prettyEventName(type: string) {
  switch (type) {
    case "created":
      return "Invoice created";
    case "paid_marked":
      return "Invoice marked paid";
    case "reminder_sent":
      return "Reminder sent";
    case "enforcement_notice_sent":
      return "Enforcement notice sent";
    case "reminder_failed":
      return "Reminder failed";
    case "reminder_skipped":
      return "Reminder skipped";
    case "reminder_retry_scheduled":
      return "Reminder retry scheduled";
    case "payment_intent_created":
      return "Payment intent created";
    case "payment_link_created":
      return "Checkout link created";
    case "payment_received":
      return "Payment received";
    case "payment_link_sent":
      return "Checkout link emailed";
    default:
      return type.replaceAll("_", " ");
  }
}

function badgeClass(type: string) {
  if (type === "reminder_failed") {
    return "border-red-300 bg-red-50 text-red-700";
  }
  if (type === "reminder_skipped") {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }
  if (
    type === "reminder_sent" ||
    type === "reminder_retry_scheduled" ||
    type === "enforcement_notice_sent" ||
    type === "payment_received" ||
    type === "payment_link_created" ||
    type === "payment_link_sent" ||
    type === "payment_intent_created"
  ) {
    return "border-green-300 bg-green-50 text-green-700";
  }
  return "border-gray-300 bg-gray-50 text-gray-700";
}

function getInvoiceNumber(event: ActivityEvent) {
  const raw = event.invoice;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0]?.invoice_number ?? null;
  return raw.invoice_number ?? null;
}

function getReminderId(event: ActivityEvent) {
  const value = event.payload?.reminder_id;
  return typeof value === "string" ? value : null;
}

function getFailureReason(event: ActivityEvent) {
  const value = event.payload?.reason;
  return typeof value === "string" ? value : null;
}

export function ActivityLog({ events }: { events: ActivityEvent[] }) {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retried, setRetried] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  async function retryReminder(reminderId: string) {
    setRetryingId(reminderId);
    setError(null);

    const res = await fetch("/api/reminders/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminder_id: reminderId }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error || "Could not schedule retry");
      setRetryingId(null);
      return;
    }

    setRetried((prev) => ({ ...prev, [reminderId]: true }));
    setRetryingId(null);
  }

  return (
    <section className="rounded-xl border p-4">
      <h3 className="text-base font-semibold">Recent activity</h3>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">No activity yet.</p>
      ) : (
        <ul className="mt-3 divide-y">
          {events.map((event) => {
            const invoiceNumber = getInvoiceNumber(event);
            const reminderId = getReminderId(event);
            const canRetry = event.event_type === "reminder_failed" && !!reminderId;
            const reason = getFailureReason(event);

            return (
              <li key={event.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{prettyEventName(event.event_type)}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(event.created_at).toLocaleString()}
                      {invoiceNumber ? ` · #${invoiceNumber}` : ""}
                    </p>
                    {reason ? <p className="mt-1 text-xs text-red-700">Reason: {reason}</p> : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-xs ${badgeClass(event.event_type)}`}>
                      {event.event_type}
                    </span>
                    {canRetry ? (
                      <button
                        onClick={() => retryReminder(reminderId)}
                        disabled={retryingId === reminderId || retried[reminderId]}
                        className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                      >
                        {retried[reminderId]
                          ? "Retry queued"
                          : retryingId === reminderId
                            ? "Queueing..."
                            : "Retry"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
