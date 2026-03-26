import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

function toInt(value: string | undefined | null) {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const userId = metadata.userId;
  const invoiceId = metadata.invoiceId;

  if (!userId || !invoiceId) {
    return NextResponse.json({ received: true, ignored: 'missing_metadata' });
  }

  const supabase = createAdminClient();

  const guardInsert = await supabase
    .from('stripe_webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: {
        checkout_session_id: session.id,
        invoice_id: invoiceId,
        user_id: userId
      }
    });

  if (guardInsert.error) {
    if (guardInsert.error.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: guardInsert.error.message }, { status: 400 });
  }

  const paidAt = new Date((event.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();

  const amountTotalCents = session.amount_total ?? null;
  const principalCents = toInt(metadata.principalCents);
  const additionalRecoveryCents = toInt(metadata.additionalRecoveryCents);
  let platformFeeCents = toInt(metadata.platformFeeCents);

  let paymentIntentId: string | null =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  if (paymentIntentId && platformFeeCents === null) {
    try {
      const stripe = getStripeClient();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      platformFeeCents = paymentIntent.application_fee_amount ?? null;
    } catch {
      // fallback to metadata-only reconciliation
    }
  }

  const updateRes = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: paidAt,
      paid_amount_cents: amountTotalCents,
      additional_recovery_cents: additionalRecoveryCents,
      platform_fee_cents: platformFeeCents,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId
    })
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .neq('status', 'paid');

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 400 });
  }

  const eventInsert = await supabase.from('invoice_events').insert({
    user_id: userId,
    invoice_id: invoiceId,
    event_type: 'payment_succeeded',
    payload: {
      stripe_event_id: event.id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      amount_total_cents: amountTotalCents,
      principal_cents: principalCents,
      additional_recovery_cents: additionalRecoveryCents,
      platform_fee_cents: platformFeeCents,
      currency: session.currency,
      paid_at: paidAt
    }
  });

  if (eventInsert.error) {
    return NextResponse.json({ error: eventInsert.error.message }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
