import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe';
import { calculateUkLatePaymentClaim } from '@/core/interest-engine/uk';

const PLATFORM_FEE_PERCENT = 0.2;

function poundsToCents(value: number) {
  return Math.round(value * 100);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invoiceRes = await supabase
    .from('invoices')
    .select('id, user_id, customer_id, invoice_number, principal, due_date, currency, status')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (invoiceRes.error) {
    return NextResponse.json({ error: invoiceRes.error.message }, { status: 400 });
  }

  if (!invoiceRes.data) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (invoiceRes.data.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
  }

  const profileRes = await supabase
    .from('profiles')
    .select('stripe_connect_account_id, stripe_connect_onboarded')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (profileRes.error) {
    return NextResponse.json({ error: profileRes.error.message }, { status: 400 });
  }

  const connectAccount = profileRes.data?.stripe_connect_account_id ?? null;
  const onboarded = Boolean(profileRes.data?.stripe_connect_onboarded);

  if (!connectAccount || !onboarded) {
    return NextResponse.json(
      { error: 'Stripe Connect account missing or not fully onboarded.' },
      { status: 400 }
    );
  }

  const principal = Number(invoiceRes.data.principal);
  const claim = calculateUkLatePaymentClaim({
    principal,
    dueDate: invoiceRes.data.due_date,
    asOfDate: new Date().toISOString().slice(0, 10),
    baseRatePercent: 5
  });

  const additionalRecovery = claim.additionalRecovery;
  const platformFee = Math.round(additionalRecovery * PLATFORM_FEE_PERCENT * 100) / 100;

  const totalAmountCents = poundsToCents(claim.totalClaim);
  const platformFeeCents = poundsToCents(platformFee);
  const additionalRecoveryCents = poundsToCents(additionalRecovery);

  const stripe = getStripeClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${baseUrl}/dashboard/invoices?payment=success&invoice=${invoiceRes.data.id}`,
    cancel_url: `${baseUrl}/dashboard/invoices?payment=cancelled&invoice=${invoiceRes.data.id}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: invoiceRes.data.currency.toLowerCase(),
          unit_amount: totalAmountCents,
          product_data: {
            name: `Invoice ${invoiceRes.data.invoice_number}`,
            description: 'Includes principal + legal late-payment recovery'
          }
        }
      }
    ],
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: connectAccount
      },
      metadata: {
        userId: auth.user.id,
        invoiceId: invoiceRes.data.id,
        invoiceNumber: invoiceRes.data.invoice_number,
        principalCents: String(poundsToCents(principal)),
        additionalRecoveryCents: String(additionalRecoveryCents),
        platformFeeCents: String(platformFeeCents),
        platformFeePercent: String(PLATFORM_FEE_PERCENT)
      }
    },
    metadata: {
      userId: auth.user.id,
      invoiceId: invoiceRes.data.id,
      invoiceNumber: invoiceRes.data.invoice_number,
      principalCents: String(poundsToCents(principal)),
      additionalRecoveryCents: String(additionalRecoveryCents),
      platformFeeCents: String(platformFeeCents),
      platformFeePercent: String(PLATFORM_FEE_PERCENT)
    }
  });

  await supabase
    .from('invoices')
    .update({
      payment_url: session.url,
      stripe_checkout_session_id: session.id
    })
    .eq('id', invoiceRes.data.id)
    .eq('user_id', auth.user.id);

  await supabase.from('invoice_events').insert({
    user_id: auth.user.id,
    invoice_id: invoiceRes.data.id,
    event_type: 'payment_session_created',
    payload: {
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      amount_cents: totalAmountCents,
      principal_cents: poundsToCents(principal),
      additional_recovery_cents: additionalRecoveryCents,
      platform_fee_cents: platformFeeCents
    }
  });

  return NextResponse.json({
    checkoutSessionId: session.id,
    paymentUrl: session.url,
    amountCents: totalAmountCents,
    additionalRecoveryCents,
    platformFeeCents
  });
}
