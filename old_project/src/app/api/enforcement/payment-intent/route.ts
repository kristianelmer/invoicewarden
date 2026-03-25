import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { assessLegalExposure } from "@/lib/legal";

const SUCCESS_FEE_BPS = 2000; // 20%

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const invoiceId = typeof body?.invoice_id === "string" ? body.invoice_id : null;

  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id,user_id,invoice_number,amount_cents,currency,due_date,status,jurisdiction,project_completed_at,services_rendered_at,contract_requested_refused"
    )
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 400 });
  }

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (!profile?.stripe_connect_account_id) {
    return NextResponse.json(
      { error: "Connect account missing. Complete Stripe Connect onboarding first." },
      { status: 400 }
    );
  }

  const legal = assessLegalExposure({
    amountCents: invoice.amount_cents,
    currency: invoice.currency,
    dueDate: invoice.due_date,
    jurisdiction: invoice.jurisdiction,
    projectCompletedAt: invoice.project_completed_at,
    servicesRenderedAt: invoice.services_rendered_at,
    contractRequestedRefused: invoice.contract_requested_refused,
    now: new Date(),
  });

  const totalAmount = legal.updatedTotalCents;
  const legalAddons = Math.max(0, legal.updatedTotalCents - invoice.amount_cents);
  const applicationFeeAmount = Math.min(
    totalAmount,
    Math.round((legalAddons * SUCCESS_FEE_BPS) / 10_000)
  );

  const stripe = getStripeClient();

  // Example pattern requested by product:
  // stripe.paymentIntents.create({
  //   amount: 110000,
  //   currency: 'usd',
  //   application_fee_amount: 2000,
  //   transfer_data: { destination: 'acct_...' },
  // })
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: invoice.currency.toLowerCase(),
    application_fee_amount: applicationFeeAmount,
    transfer_data: {
      destination: profile.stripe_connect_account_id,
    },
    metadata: {
      userId: user.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      jurisdiction: invoice.jurisdiction,
      legalMode: legal.mode,
      legalAddonsCents: String(legalAddons),
      successFeeBps: String(SUCCESS_FEE_BPS),
    },
    description: `Invoice ${invoice.invoice_number} (with statutory adjustments)`,
  });

  await supabase.from("invoice_events").insert({
    user_id: user.id,
    invoice_id: invoice.id,
    event_type: "payment_intent_created",
    payload: {
      payment_intent_id: paymentIntent.id,
      amount_cents: totalAmount,
      application_fee_amount: applicationFeeAmount,
      legal_addons_cents: legalAddons,
      mode: legal.mode,
    },
  });

  return NextResponse.json({
    payment_intent_id: paymentIntent.id,
    client_secret: paymentIntent.client_secret,
    amount_cents: totalAmount,
    application_fee_amount: applicationFeeAmount,
  });
}
