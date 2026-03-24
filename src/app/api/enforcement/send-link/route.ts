import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/email";
import { assessLegalExposure, formatMoney } from "@/lib/legal";

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
      "id,user_id,invoice_number,amount_cents,currency,due_date,jurisdiction,project_completed_at,services_rendered_at,contract_requested_refused,payment_url,customer:customers(name,email)"
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

  if (!invoice.payment_url) {
    return NextResponse.json(
      { error: "No checkout link found. Create checkout link first." },
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

  const subject = `Payment link: Invoice ${invoice.invoice_number} (${formatMoney(
    legal.updatedTotalCents,
    invoice.currency
  )})`;

  const text = [
    `Hi ${customerName},`,
    "",
    `You can settle invoice ${invoice.invoice_number} using this secure payment link:`, 
    invoice.payment_url,
    "",
    `Updated total due: ${formatMoney(legal.updatedTotalCents, invoice.currency)}`,
    legal.statutoryInterestCents > 0
      ? `Statutory interest included: ${formatMoney(legal.statutoryInterestCents, invoice.currency)}`
      : null,
    legal.fixedRecoveryFeeCents > 0
      ? `Recovery fee included: ${formatMoney(legal.fixedRecoveryFeeCents, invoice.currency)}`
      : null,
    "",
    "If you have already paid, you can ignore this message.",
    "",
    "InvoiceWarden Compliance",
  ]
    .filter(Boolean)
    .join("\n");

  const messageId = await sendReminderEmail({
    to: customerEmail,
    subject,
    text,
    from: process.env.ENFORCEMENT_FROM ?? "compliance@invoicewarden.app",
  });

  await supabase.from("invoice_events").insert({
    user_id: user.id,
    invoice_id: invoice.id,
    event_type: "payment_link_sent",
    payload: {
      email_message_id: messageId,
      to: customerEmail,
      payment_url: invoice.payment_url,
      amount_cents: legal.updatedTotalCents,
    },
  });

  return NextResponse.json({ ok: true, email_message_id: messageId });
}
