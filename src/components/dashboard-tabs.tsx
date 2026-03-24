"use client";

import { useMemo, useState } from "react";
import { BillingControls } from "@/components/billing-controls";
import { InvoicesManager } from "@/components/invoices-manager";
import { ActivityLog } from "@/components/activity-log";
import { CustomersManager } from "@/components/customers-manager";

type Customer = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  notes?: string | null;
  created_at: string;
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

type ActivityEvent = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  invoice?: { invoice_number?: string } | { invoice_number?: string }[] | null;
};

type TabKey = "invoices" | "activity" | "customers" | "billing";

export function DashboardTabs({
  customers,
  invoices,
  events,
  billing,
  initialTab,
}: {
  customers: Customer[];
  invoices: Invoice[];
  events: ActivityEvent[];
  billing: {
    initialStatus: string | null;
    currentPeriodEnd: string | null;
    isActive: boolean;
    connect: {
      accountId: string | null;
      onboarded: boolean;
    };
  };
  initialTab?: TabKey;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? "invoices");

  const customerLite = useMemo(
    () => customers.map((c) => ({ id: c.id, name: c.name, email: c.email })),
    [customers]
  );

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "invoices", label: "Invoices", count: invoices.length },
    { key: "activity", label: "Activity", count: events.length },
    { key: "customers", label: "Customers", count: customers.length },
    { key: "billing", label: "Billing" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border p-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" ? ` (${tab.count})` : ""}
            </button>
          );
        })}
      </div>

      {activeTab === "invoices" ? (
        <InvoicesManager customers={customerLite} initialInvoices={invoices} />
      ) : null}

      {activeTab === "activity" ? <ActivityLog events={events} /> : null}

      {activeTab === "customers" ? (
        <CustomersManager initialCustomers={customers} />
      ) : null}

      {activeTab === "billing" ? (
        <BillingControls
          initialStatus={billing.initialStatus}
          currentPeriodEnd={billing.currentPeriodEnd}
          isActive={billing.isActive}
          connect={billing.connect}
        />
      ) : null}
    </section>
  );
}
