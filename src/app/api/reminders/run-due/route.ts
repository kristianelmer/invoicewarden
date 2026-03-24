import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/email";
import { templateReminder } from "@/lib/reminders";
import {
  assessLegalExposure,
  buildEnforcementEmail,
  type Jurisdiction,
} from "@/lib/legal";

type DueReminder = {
  id: string;
  user_id: string;
  invoice_id: string;
  step_id: string;
  state: string;
  attempts: number | null;
  next_retry_at: string | null;
  invoice: {
    id: string;
    invoice_number: string;
    amount_cents: number;
    currency: string;
    due_date: string;
    jurisdiction: Jurisdiction;
    project_completed_at: string | null;
    services_rendered_at: string | null;
    contract_requested_refused: boolean;
    payment_url: string | null;
    customer: { name: string; email: string };
  };
  step: {
    subject_template: string;
    body_template: string;
  };
};

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MINUTES = 5;
const STALE_PROCESSING_MINUTES = 30;

function isTransientFailure(reason: string) {
  const text = reason.toLowerCase();

  if (text.includes("missing resend_api_key") || text.includes("missing email_from")) {
    return false;
  }

  return [
    "timeout",
    "timed out",
    "rate limit",
    "429",
    "5xx",
    "502",
    "503",
    "504",
    "econnreset",
    "enotfound",
    "network",
    "temporar",
    "socket",
  ].some((token) => text.includes(token));
}

function backoffMinutes(attemptNumber: number) {
  return Math.min(60, BASE_BACKOFF_MINUTES * 2 ** Math.max(0, attemptNumber - 1));
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const staleThreshold = new Date(now.getTime() - STALE_PROCESSING_MINUTES * 60_000).toISOString();
  await supabase
    .from("reminders")
    .update({ state: "scheduled", failure_reason: "processing_timeout", next_retry_at: nowIso })
    .eq("state", "processing")
    .lt("last_attempt_at", staleThreshold);

  const { data, error } = await supabase
    .from("reminders")
    .select(
      "id,user_id,invoice_id,step_id,state,attempts,next_retry_at,invoice:invoices(id,invoice_number,amount_cents,currency,due_date,jurisdiction,project_completed_at,services_rendered_at,contract_requested_refused,payment_url,customer:customers(name,email)),step:reminder_steps(subject_template,body_template)"
    )
    .eq("state", "scheduled")
    .lte("scheduled_for", nowIso)
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const reminders = (data ?? []) as unknown as DueReminder[];

  const userIds = [...new Set(reminders.map((r) => r.user_id))];
  const profileNames = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,company_name")
      .in("id", userIds);

    for (const row of profiles ?? []) {
      const label = row.full_name || row.company_name || "Freelancer";
      profileNames.set(row.id, label);
    }
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let retriesScheduled = 0;
  let enforcementSent = 0;

  for (const reminder of reminders) {
    const invoice = reminder.invoice;
    const step = reminder.step;
    const attemptNumber = (reminder.attempts ?? 0) + 1;

    const { data: claimed, error: claimError } = await supabase
      .from("reminders")
      .update({
        state: "processing",
        attempts: attemptNumber,
        last_attempt_at: nowIso,
      })
      .eq("id", reminder.id)
      .eq("state", "scheduled")
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) {
      continue;
    }

    if (!invoice?.customer?.email) {
      skipped++;
      await supabase
        .from("reminders")
        .update({ state: "skipped", skip_reason: "missing_customer_email" })
        .eq("id", reminder.id)
        .eq("state", "processing");

      await supabase.from("invoice_events").insert({
        user_id: reminder.user_id,
        invoice_id: reminder.invoice_id,
        event_type: "reminder_skipped",
        payload: { reminder_id: reminder.id, reason: "missing_customer_email" },
      });
      continue;
    }

    const legal = assessLegalExposure({
      amountCents: invoice.amount_cents,
      currency: invoice.currency,
      dueDate: invoice.due_date,
      jurisdiction: invoice.jurisdiction,
      projectCompletedAt: invoice.project_completed_at,
      servicesRenderedAt: invoice.services_rendered_at,
      contractRequestedRefused: invoice.contract_requested_refused,
      now,
    });

    const shouldEnforce = legal.mode === "enforcement";

    const defaultReminder = {
      subject: templateReminder(step.subject_template, invoice),
      text: templateReminder(step.body_template, invoice),
      from: process.env.EMAIL_FROM,
    };

    const enforcement = buildEnforcementEmail({
      invoiceNumber: invoice.invoice_number,
      clientName: invoice.customer.name || "Client",
      freelancerName: profileNames.get(reminder.user_id) ?? "Freelancer",
      paymentUrl: invoice.payment_url,
      assessment: legal,
      currency: invoice.currency,
    });

    const outbound = shouldEnforce
      ? {
          subject: enforcement.subject,
          text: enforcement.text,
          from: process.env.ENFORCEMENT_FROM ?? "billing@invoicewarden.com",
        }
      : defaultReminder;

    try {
      const messageId = await sendReminderEmail({
        to: invoice.customer.email,
        subject: outbound.subject,
        text: outbound.text,
        from: outbound.from,
      });

      const { error: updateError } = await supabase
        .from("reminders")
        .update({
          state: "sent",
          sent_at: new Date().toISOString(),
          email_message_id: messageId,
          next_retry_at: null,
          failure_reason: null,
        })
        .eq("id", reminder.id)
        .eq("state", "processing");

      if (updateError) throw new Error(updateError.message);

      await supabase.from("invoice_events").insert({
        user_id: reminder.user_id,
        invoice_id: reminder.invoice_id,
        event_type: shouldEnforce ? "enforcement_notice_sent" : "reminder_sent",
        payload: {
          reminder_id: reminder.id,
          email_message_id: messageId,
          attempt: attemptNumber,
          mode: legal.mode,
          law: legal.lawLabel,
          days_late: legal.daysLate,
          updated_total_cents: legal.updatedTotalCents,
          daily_interest_cents: legal.dailyInterestCents,
          statutory_interest_cents: legal.statutoryInterestCents,
          fixed_recovery_fee_cents: legal.fixedRecoveryFeeCents,
          litigation_exposure_cents: legal.litigationExposureCents,
          administrative_fine_cents: legal.administrativeFineCents,
        },
      });

      if (shouldEnforce) enforcementSent++;
      sent++;
    } catch (err) {
      const reason = err instanceof Error ? err.message : "send_failed";
      const transient = isTransientFailure(reason);

      if (transient && attemptNumber < MAX_ATTEMPTS) {
        retriesScheduled++;
        const retryInMinutes = backoffMinutes(attemptNumber);
        const retryAt = new Date(Date.now() + retryInMinutes * 60_000).toISOString();

        await supabase
          .from("reminders")
          .update({
            state: "scheduled",
            next_retry_at: retryAt,
            failure_reason: reason,
          })
          .eq("id", reminder.id)
          .eq("state", "processing");

        await supabase.from("invoice_events").insert({
          user_id: reminder.user_id,
          invoice_id: reminder.invoice_id,
          event_type: "reminder_retry_scheduled",
          payload: {
            reminder_id: reminder.id,
            reason,
            attempt: attemptNumber,
            retry_in_minutes: retryInMinutes,
            retry_at: retryAt,
          },
        });
      } else {
        failed++;
        await supabase
          .from("reminders")
          .update({
            state: "failed",
            failure_reason: reason,
          })
          .eq("id", reminder.id)
          .eq("state", "processing");

        await supabase.from("invoice_events").insert({
          user_id: reminder.user_id,
          invoice_id: reminder.invoice_id,
          event_type: "reminder_failed",
          payload: { reminder_id: reminder.id, reason, attempt: attemptNumber },
        });
      }
    }
  }

  return NextResponse.json({
    processed: reminders.length,
    sent,
    enforcement_sent: enforcementSent,
    failed,
    skipped,
    retries_scheduled: retriesScheduled,
  });
}
