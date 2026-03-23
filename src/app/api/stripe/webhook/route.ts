import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

function toIsoDate(seconds?: number | null) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

async function upsertFromCheckoutSession(event: Stripe.CheckoutSessionCompletedEvent) {
  const session = event.data.object;
  const userId = session.client_reference_id || session.metadata?.userId;

  if (!userId) return;

  const stripe = getStripeClient();
  const supabaseAdmin = createAdminClient();

  let subscription: Stripe.Subscription | null = null;
  if (typeof session.subscription === "string") {
    subscription = await stripe.subscriptions.retrieve(session.subscription);
  }

  const payload = {
    user_id: userId,
    stripe_customer_id:
      typeof session.customer === "string" ? session.customer : null,
    stripe_subscription_id: subscription?.id ??
      (typeof session.subscription === "string" ? session.subscription : null),
    status: subscription?.status ?? null,
    price_id: subscription?.items.data[0]?.price?.id ?? null,
    current_period_end: toIsoDate((subscription as Stripe.Subscription & { current_period_end?: number })?.current_period_end),
    updated_at: new Date().toISOString(),
  };

  await supabaseAdmin
    .from("billing_subscriptions")
    .upsert(payload, { onConflict: "user_id" });
}

async function updateFromSubscriptionEvent(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const supabaseAdmin = createAdminClient();

  await supabaseAdmin
    .from("billing_subscriptions")
    .update({
      stripe_customer_id:
        typeof subscription.customer === "string" ? subscription.customer : null,
      status: subscription.status,
      price_id: subscription.items.data[0]?.price?.id ?? null,
      current_period_end: toIsoDate((subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await upsertFromCheckoutSession(event as Stripe.CheckoutSessionCompletedEvent);
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await updateFromSubscriptionEvent(event);
  }

  return NextResponse.json({ received: true });
}
