"use client";

type CollectionsMetricsProps = {
  lookbackDays: number;
  sent: number;
  opened: number;
  clicked: number;
  paid: number;
};

function pct(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function CollectionsMetrics({
  lookbackDays,
  sent,
  opened,
  clicked,
  paid,
}: CollectionsMetricsProps) {
  return (
    <section className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Collections metrics</h3>
        <p className="text-xs text-gray-500">Last {lookbackDays} days</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-gray-500">Links emailed</p>
          <p className="text-xl font-semibold">{sent}</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-gray-500">Emails opened</p>
          <p className="text-xl font-semibold">{opened}</p>
          <p className="text-xs text-gray-500">Open rate: {pct(opened, sent)}</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-gray-500">Links clicked</p>
          <p className="text-xl font-semibold">{clicked}</p>
          <p className="text-xs text-gray-500">Click rate: {pct(clicked, sent)}</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-gray-500">Invoices paid</p>
          <p className="text-xl font-semibold">{paid}</p>
          <p className="text-xs text-gray-500">Paid rate: {pct(paid, sent)}</p>
        </div>
      </div>
    </section>
  );
}
