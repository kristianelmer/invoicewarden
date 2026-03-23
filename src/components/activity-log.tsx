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
    default:
      return type.replaceAll("_", " ");
  }
}

function getInvoiceNumber(event: ActivityEvent) {
  const raw = event.invoice;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0]?.invoice_number ?? null;
  return raw.invoice_number ?? null;
}

export function ActivityLog({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="rounded-xl border p-4">
      <h3 className="text-base font-semibold">Recent activity</h3>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">No activity yet.</p>
      ) : (
        <ul className="mt-3 divide-y">
          {events.map((event) => {
            const invoiceNumber = getInvoiceNumber(event);
            return (
              <li key={event.id} className="py-3">
                <p className="text-sm font-medium">{prettyEventName(event.event_type)}</p>
                <p className="text-xs text-gray-600">
                  {new Date(event.created_at).toLocaleString()}
                  {invoiceNumber ? ` · #${invoiceNumber}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
