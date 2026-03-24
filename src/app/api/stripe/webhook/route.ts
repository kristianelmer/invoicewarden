import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

function toIsoDate(seconds?: number | null) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

async function markInvoicePaidFromMetadata(params: {
  invoiceId?: string | null;
  userId?: string | null;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  amountReceivedCents?: number | null;
  currency?: string | null;
}) {
  const invoiceId = params.invoiceId;
  const userId = params.userId;

  if (!invoiceId || !userId) return;

  const supabaseAdmin = createAdminClient();
  const paidAt = new Date().toISOString();

  const { data: updatedRows, error: invoiceUpdateError } = await supabaseAdmin
    .from("invoices")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .neq("status", "paid")
    .select("id")
    .limit(1);

  if (invoiceUpdateError) {
    throw new Error(invoiceUpdateError.message);
  }

  // If already paid, avoid duplicate event writes.
  if (!updatedRows || updatedRows.length === 0) return;

  await supabaseAdmin
    .from("reminders")
    .update({ state: "canceled", skip_reason: "payment_received" })
    .eq("invoice_id", invoiceId)
    .eq("user_id", userId)
    .in("state", ["scheduled", "failed", "processing"]);

  await supabaseAdmin.from("invoice_events").insert({
    user_id: userId,
    invoice_id: invoiceId,
    event_type: "payment_received",
    payload: {
      paid_at: paidAt,
      payment_intent_id: params.paymentIntentId ?? null,
      checkout_session_id: params.checkoutSessionId ?? null,
      amount_received_cents: params.amountReceivedCents ?? null,
      currency: params.currency ?? null,
    },
  });
}

async function upsertFromCheckoutSession(event: Stripe.CheckoutSessionCompletedEvent) {
  const session = event.data.object;

  // Subscription checkout path
  if (session.mode === "subscription") {
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
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      stripe_subscription_id:
        subscription?.id ??
        (typeof session.subscription === "string" ? session.subscription : null),
      status: subscription?.status ?? null,
      price_id: subscription?.items.data[0]?.price?.id ?? null,
      current_period_end: toIsoDate(
        (subscription as Stripe.Subscription & { current_period_end?: number })
          ?.current_period_end
      ),
      updated_at: new Date().toISOString(),
    };

    await supabaseAdmin.from("billing_subscriptions").upsert(payload, { onConflict: "user_id" });
    return;
  }

  // One-time payment checkout path (enforcement collection)
  if (session.mode === "payment") {
    const invoiceId = session.metadata?.invoiceId ?? null;
    const userId = session.metadata?.userId ?? null;

    await markInvoicePaidFromMetadata({
      invoiceId,
      userId,
      paymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      checkoutSessionId: session.id,
      amountReceivedCents: session.amount_total ?? null,
      currency: session.currency ?? null,
    });
  }
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
      current_period_end: toIsoDate(
        (subscription as Stripe.Subscription & { current_period_end?: number })
          .current_period_end
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handlePaymentIntentSucceeded(event: Stripe.PaymentIntentSucceededEvent) {
  const paymentIntent = event.data.object;
  const invoiceId = paymentIntent.metadata?.invoiceId ?? null;
  const userId = paymentIntent.metadata?.userId ?? null;

  await markInvoicePaidFromMetadata({
    invoiceId,
    userId,
    paymentIntentId: paymentIntent.id,
    amountReceivedCents: paymentIntent.amount_received ?? paymentIntent.amount ?? null,
    currency: paymentIntent.currency ?? null,
  });
}

async function handleInvoicePaid(event: Stripe.InvoicePaidEvent) {
  const invoice = event.data.object;
  const invoiceId = invoice.metadata?.invoiceId ?? null;
  const userId = invoice.metadata?.userId ?? null;

  await markInvoicePaidFromMetadata({
    invoiceId,
    userId,
    paymentIntentId: null,
    amountReceivedCents: invoice.amount_paid ?? null,
    currency: invoice.currency ?? null,
  });
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
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

  if (event.type === "payment_intent.succeeded") {
    await handlePaymentIntentSucceeded(event as Stripe.PaymentIntentSucceededEvent);
  }

  if (event.type === "invoice.paid") {
    await handleInvoicePaid(event as Stripe.InvoicePaidEvent);
  }

  return NextResponse.json({ received: true });
}
