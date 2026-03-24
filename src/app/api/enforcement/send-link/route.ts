import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assessLegalExposure, formatMoney } from "@/lib/legal";
import { getStripeClient } from "@/lib/stripe";

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
      "id,user_id,invoice_number,amount_cents,currency,issue_date,due_date,jurisdiction,project_completed_at,services_rendered_at,contract_requested_refused,payment_url,customer:customers(name,email)"
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

  const customerRaw = invoice.customer as unknown;
  const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
  const customerEmail = (customer as { email?: string } | null)?.email ?? null;
  const customerName = (customer as { name?: string } | null)?.name ?? "Client";

  if (!customerEmail) {
    return NextResponse.json({ error: "Missing customer email" }, { status: 400 });
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
  const applicationFeeAmount = Math.round((legalAddons * SUCCESS_FEE_BPS) / 10_000);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const stripe = getStripeClient();

  try {
    const stripeCustomer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      metadata: {
        userId: user.id,
        localInvoiceId: invoice.id,
      },
    });

    const stripeInvoice = await stripe.invoices.create({
      customer: stripeCustomer.id,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: false,
      currency: invoice.currency.toLowerCase(),
      metadata: {
        userId: user.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        jurisdiction: invoice.jurisdiction,
      },
      description: `Corrected invoice ${invoice.invoice_number}`,
      ...(profile?.stripe_connect_account_id
        ? {
            transfer_data: { destination: profile.stripe_connect_account_id },
            application_fee_amount: Math.min(totalAmount, applicationFeeAmount),
          }
        : {}),
    });

    const lineItems: Array<{ amount: number; description: string }> = [
      {
        amount: invoice.amount_cents,
        description: `Original invoice amount (${invoice.invoice_number})`,
      },
    ];

    if (legal.statutoryInterestCents > 0) {
      lineItems.push({
        amount: legal.statutoryInterestCents,
        description: "Statutory interest",
      });
    }

    if (legal.fixedRecoveryFeeCents > 0) {
      lineItems.push({
        amount: legal.fixedRecoveryFeeCents,
        description: "Fixed debt recovery fee",
      });
    }

    if (legal.litigationExposureCents > 0) {
      lineItems.push({
        amount: legal.litigationExposureCents,
        description: "Statutory damages component",
      });
    }

    if (legal.administrativeFineCents > 0) {
      lineItems.push({
        amount: legal.administrativeFineCents,
        description: "Administrative fine component",
      });
    }

    for (const item of lineItems) {
      await stripe.invoiceItems.create({
        customer: stripeCustomer.id,
        invoice: stripeInvoice.id,
        currency: invoice.currency.toLowerCase(),
        amount: item.amount,
        description: item.description,
      });
    }

    const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id, {
      auto_advance: true,
    });

    await stripe.invoices.sendInvoice(finalized.id);

    await supabase
      .from("invoices")
      .update({ payment_url: finalized.hosted_invoice_url })
      .eq("id", invoice.id)
      .eq("user_id", user.id);

    await supabase.from("invoice_events").insert({
      user_id: user.id,
      invoice_id: invoice.id,
      event_type: "payment_link_sent",
      payload: {
        method: "stripe_invoice",
        stripe_invoice_id: finalized.id,
        stripe_customer_id: stripeCustomer.id,
        hosted_invoice_url: finalized.hosted_invoice_url,
        invoice_pdf: finalized.invoice_pdf,
        amount_cents: legal.updatedTotalCents,
        legal_addons_cents: legalAddons,
      },
    });

    return NextResponse.json({
      ok: true,
      email_message_id: finalized.id,
      payment_url: finalized.hosted_invoice_url,
      invoice_pdf: finalized.invoice_pdf,
      amount_cents: legal.updatedTotalCents,
      note: `Stripe invoice sent for ${formatMoney(legal.updatedTotalCents, invoice.currency)}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send Stripe invoice";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
