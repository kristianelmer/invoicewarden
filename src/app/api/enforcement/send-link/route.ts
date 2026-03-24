import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/email";
import { assessLegalExposure, formatMoney } from "@/lib/legal";
import {
  buildClickTrackingRedirectUrl,
  buildClickTrackingToken,
  buildOpenTrackingPixelUrl,
  buildOpenTrackingToken,
} from "@/lib/open-tracking";

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const openTrackingToken = buildOpenTrackingToken({
    invoiceId: invoice.id,
    userId: user.id,
  });
  const trackingPixelUrl = openTrackingToken
    ? buildOpenTrackingPixelUrl(baseUrl, openTrackingToken)
    : null;

  const clickTrackingToken = buildClickTrackingToken({
    invoiceId: invoice.id,
    userId: user.id,
    targetUrl: invoice.payment_url,
  });
  const trackedPaymentUrl = clickTrackingToken
    ? buildClickTrackingRedirectUrl(baseUrl, clickTrackingToken)
    : invoice.payment_url;

  const text = [
    `Hi ${customerName},`,
    "",
    `You can settle invoice ${invoice.invoice_number} using this secure payment link:`,
    trackedPaymentUrl,
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

  const html = [
    `<p>Hi ${customerName},</p>`,
    `<p>You can settle invoice <strong>${invoice.invoice_number}</strong> using this secure payment link:</p>`,
    `<p><a href="${trackedPaymentUrl}">${invoice.payment_url}</a></p>`,
    `<p>Updated total due: <strong>${formatMoney(legal.updatedTotalCents, invoice.currency)}</strong></p>`,
    legal.statutoryInterestCents > 0
      ? `<p>Statutory interest included: ${formatMoney(legal.statutoryInterestCents, invoice.currency)}</p>`
      : null,
    legal.fixedRecoveryFeeCents > 0
      ? `<p>Recovery fee included: ${formatMoney(legal.fixedRecoveryFeeCents, invoice.currency)}</p>`
      : null,
    `<p>If you have already paid, you can ignore this message.</p>`,
    `<p>InvoiceWarden Compliance</p>`,
    trackingPixelUrl
      ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const messageId = await sendReminderEmail({
      to: customerEmail,
      subject,
      text,
      html,
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
        tracking_enabled: Boolean(trackingPixelUrl),
        open_tracking_token_id: openTrackingToken
          ? openTrackingToken.split(".")[0]?.slice(0, 12)
          : null,
        click_tracking_enabled: Boolean(clickTrackingToken),
        click_tracking_token_id: clickTrackingToken
          ? clickTrackingToken.split(".")[0]?.slice(0, 12)
          : null,
      },
    });

    return NextResponse.json({ ok: true, email_message_id: messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send checkout link email";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
