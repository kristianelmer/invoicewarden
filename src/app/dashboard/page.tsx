import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomersManager } from "@/components/customers-manager";
import { BillingControls } from "@/components/billing-controls";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;

  const [{ data: customers }, { data: subscription }] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,email,company,notes,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("billing_subscriptions")
      .select("status,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isActive = subscription?.status
    ? ACTIVE_STATUSES.has(subscription.status)
    : false;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">Signed in as {user.email}</p>
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="rounded border px-3 py-2 text-sm">Sign out</button>
        </form>
      </div>

      {params.billing === "success" ? (
        <div className="mb-4 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          Subscription started successfully.
        </div>
      ) : null}

      {params.billing === "cancelled" ? (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Checkout canceled. You can try again anytime.
        </div>
      ) : null}

      <BillingControls
        initialStatus={subscription?.status ?? null}
        currentPeriodEnd={subscription?.current_period_end ?? null}
        isActive={isActive}
      />

      <CustomersManager initialCustomers={customers ?? []} />
    </main>
  );
}
