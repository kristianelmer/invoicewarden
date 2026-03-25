"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CollectionsMetricsProps = {
  lookbackDays: number;
  sent: number;
  opened: number;
  openedUnique: number;
  clicked: number;
  clickedUnique: number;
  paid: number;
};

function pct(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

const RANGE_OPTIONS = [7, 30, 90] as const;

export function CollectionsMetrics({
  lookbackDays,
  sent,
  opened,
  openedUnique,
  clicked,
  clickedUnique,
  paid,
}: CollectionsMetricsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateRange(days: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", String(days));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Collections metrics</h3>

        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((days) => {
            const active = days === lookbackDays;
            return (
              <button
                key={days}
                onClick={() => updateRange(days)}
                className={`rounded border px-2 py-1 text-xs ${
                  active
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {days}d
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-gray-500">Links emailed</p>
          <p className="text-xl font-semibold">{sent}</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-gray-500">Emails opened</p>
          <p className="text-xl font-semibold">{openedUnique}</p>
          <p className="text-xs text-gray-500">Unique / total: {openedUnique} / {opened}</p>
          <p className="text-xs text-gray-500">Open rate: {pct(openedUnique, sent)}</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-gray-500">Links clicked</p>
          <p className="text-xl font-semibold">{clickedUnique}</p>
          <p className="text-xs text-gray-500">Unique / total: {clickedUnique} / {clicked}</p>
          <p className="text-xs text-gray-500">Click rate: {pct(clickedUnique, sent)}</p>
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
