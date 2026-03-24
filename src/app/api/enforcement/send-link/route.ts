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
import { buildCorrectedInvoicePdf } from "@/lib/corrected-invoice-pdf";

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

  const subject = `Corrected invoice ${invoice.invoice_number} from InvoiceWarden`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const lowDeliverabilityMode = ["1", "true", "yes", "on"].includes(
    (process.env.LOW_DELIVERABILITY_MODE || "").toLowerCase()
  );

  const openTrackingToken = lowDeliverabilityMode
    ? null
    : buildOpenTrackingToken({
        invoiceId: invoice.id,
        userId: user.id,
      });
  const trackingPixelUrl = openTrackingToken
    ? buildOpenTrackingPixelUrl(baseUrl, openTrackingToken)
    : null;

  const clickTrackingToken = lowDeliverabilityMode
    ? null
    : buildClickTrackingToken({
        invoiceId: invoice.id,
        userId: user.id,
        targetUrl: invoice.payment_url,
      });
  const trackedPaymentUrl = clickTrackingToken
    ? buildClickTrackingRedirectUrl(baseUrl, clickTrackingToken)
    : invoice.payment_url;

  const senderName = "InvoiceWarden Billing";
  const senderEmail = process.env.ENFORCEMENT_FROM ?? "billing@invoicewarden.com";
  const fromHeader = `${senderName} <${senderEmail}>`;
  const replyTo = process.env.BILLING_REPLY_TO || senderEmail;

  const pdfBytes = await buildCorrectedInvoicePdf({
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    customerName,
    customerEmail,
    jurisdiction: invoice.jurisdiction,
    originalAmountCents: invoice.amount_cents,
    currency: invoice.currency,
    assessment: legal,
    paymentUrl: invoice.payment_url,
    senderName,
    senderEmail,
  });

  const text = [
    `Hi ${customerName},`,
    "",
    `Please find attached your corrected invoice notice for invoice ${invoice.invoice_number}.`,
    "",
    `Updated total due: ${formatMoney(legal.updatedTotalCents, invoice.currency)}`,
    `Secure payment link: ${trackedPaymentUrl}`,
    "",
    "If payment has already been made, please ignore this message.",
    "",
    `${senderName}`,
    replyTo,
  ].join("\n");

  const html = [
    `<p>Hi ${customerName},</p>`,
    `<p>Please find attached your corrected invoice notice for invoice <strong>${invoice.invoice_number}</strong>.</p>`,
    `<p>Updated total due: <strong>${formatMoney(legal.updatedTotalCents, invoice.currency)}</strong></p>`,
    `<p>Secure payment link: <a href="${trackedPaymentUrl}">${invoice.payment_url}</a></p>`,
    `<p>If payment has already been made, please ignore this message.</p>`,
    `<p>${senderName}<br/>${replyTo}</p>`,
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
      from: fromHeader,
      replyTo,
      attachments: [
        {
          filename: `corrected-invoice-${invoice.invoice_number}.pdf`,
          content: Buffer.from(pdfBytes).toString("base64"),
          contentType: "application/pdf",
        },
      ],
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
        sender: fromHeader,
        reply_to: replyTo,
        attachment_filename: `corrected-invoice-${invoice.invoice_number}.pdf`,
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
