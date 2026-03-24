import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { getStripeClient } from "@/lib/stripe";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
const METRICS_LOOKBACK_DAYS = 30;

function toIsoDate(seconds?: number | null) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    billing?: string;
    session_id?: string;
    connect?: string;
    payment?: string;
    invoice?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const lookbackIso = new Date(
    Date.now() - METRICS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  if (params.billing === "success" && params.session_id) {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(params.session_id, {
        expand: ["subscription"],
      });

      const sub =
        typeof session.subscription === "object" && session.subscription
          ? session.subscription
          : null;

      if (sub?.id) {
        await supabase.from("billing_subscriptions").upsert(
          {
            user_id: user.id,
            stripe_customer_id:
              typeof session.customer === "string" ? session.customer : null,
            stripe_subscription_id: sub.id,
            status: sub.status,
            price_id: sub.items.data[0]?.price?.id ?? null,
            current_period_end: toIsoDate(
              (sub as { current_period_end?: number }).current_period_end
            ),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }
    } catch {
      // webhook should still handle sync; keep dashboard usable even if this fails
    }
  }

  const [
    { data: customers },
    { data: subscription },
    { data: invoices },
    { data: events },
    { data: profile },
    { count: sentCount },
    { count: openedCount },
    { count: clickedCount },
    { count: paidCount },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,email,company,notes,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("billing_subscriptions")
      .select("status,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "id,invoice_number,currency,amount_cents,issue_date,due_date,jurisdiction,project_completed_at,services_rendered_at,contract_requested_refused,payment_url,status,paid_at,customer:customers(name,email),created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoice_events")
      .select("id,event_type,payload,created_at,invoice:invoices(invoice_number)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("profiles")
      .select("stripe_connect_account_id,stripe_connect_onboarded")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("invoice_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "payment_link_sent")
      .gte("created_at", lookbackIso),
    supabase
      .from("invoice_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "payment_link_opened")
      .gte("created_at", lookbackIso),
    supabase
      .from("invoice_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "payment_link_clicked")
      .gte("created_at", lookbackIso),
    supabase
      .from("invoice_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "payment_received")
      .gte("created_at", lookbackIso),
  ]);

  const isActive = subscription?.status
    ? ACTIVE_STATUSES.has(subscription.status)
    : false;

  const normalizedInvoices = (invoices ?? []).map((inv) => {
    const customerRaw = inv.customer as unknown;
    const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
    return {
      ...inv,
      customer: customer
        ? {
            name: (customer as { name?: string }).name ?? "Client",
            email: (customer as { email?: string }).email ?? "",
          }
        : undefined,
    };
  });

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

      {params.connect === "return" ? (
        <div className="mb-4 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          Stripe Connect onboarding returned successfully. Click &quot;Refresh status&quot; in Billing.
        </div>
      ) : null}

      {params.connect === "refresh" ? (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Stripe requested additional details. Continue onboarding in Billing.
        </div>
      ) : null}

      {params.payment === "success" ? (
        <div className="mb-4 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          Payment completed. Invoice was marked as paid automatically.
        </div>
      ) : null}

      {params.payment === "cancelled" ? (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Payment checkout was canceled.
        </div>
      ) : null}

      <DashboardTabs
        customers={customers ?? []}
        invoices={normalizedInvoices}
        events={events ?? []}
        billing={{
          initialStatus: subscription?.status ?? null,
          currentPeriodEnd: subscription?.current_period_end ?? null,
          isActive,
          connect: {
            accountId: profile?.stripe_connect_account_id ?? null,
            onboarded: Boolean(profile?.stripe_connect_onboarded),
          },
        }}
        metrics={{
          lookbackDays: METRICS_LOOKBACK_DAYS,
          sent: sentCount ?? 0,
          opened: openedCount ?? 0,
          clicked: clickedCount ?? 0,
          paid: paidCount ?? 0,
        }}
        initialTab={params.billing || params.connect ? "billing" : "invoices"}
      />
    </main>
  );
}
