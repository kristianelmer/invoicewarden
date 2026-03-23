import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/email";
import { templateReminder } from "@/lib/reminders";

type DueReminder = {
  id: string;
  user_id: string;
  invoice_id: string;
  step_id: string;
  state: string;
  invoice: {
    id: string;
    invoice_number: string;
    amount_cents: number;
    currency: string;
    due_date: string;
    customer: { name: string; email: string };
  };
  step: {
    subject_template: string;
    body_template: string;
  };
};

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reminders")
    .select(
      "id,user_id,invoice_id,step_id,state,invoice:invoices(id,invoice_number,amount_cents,currency,due_date,customer:customers(name,email)),step:reminder_steps(subject_template,body_template)"
    )
    .eq("state", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const reminders = (data ?? []) as unknown as DueReminder[];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    const invoice = reminder.invoice;
    const step = reminder.step;

    if (!invoice?.customer?.email) {
      skipped++;
      await supabase
        .from("reminders")
        .update({ state: "skipped", skip_reason: "missing_customer_email" })
        .eq("id", reminder.id)
        .eq("state", "scheduled");
      continue;
    }

    const subject = templateReminder(step.subject_template, invoice);
    const body = templateReminder(step.body_template, invoice);

    try {
      const messageId = await sendReminderEmail({
        to: invoice.customer.email,
        subject,
        text: body,
      });

      const { error: updateError } = await supabase
        .from("reminders")
        .update({ state: "sent", sent_at: new Date().toISOString(), email_message_id: messageId })
        .eq("id", reminder.id)
        .eq("state", "scheduled");

      if (updateError) throw new Error(updateError.message);

      await supabase.from("invoice_events").insert({
        user_id: reminder.user_id,
        invoice_id: reminder.invoice_id,
        event_type: "reminder_sent",
        payload: { reminder_id: reminder.id, email_message_id: messageId },
      });

      sent++;
    } catch (err) {
      failed++;
      await supabase
        .from("reminders")
        .update({
          state: "failed",
          failure_reason: err instanceof Error ? err.message : "send_failed",
        })
        .eq("id", reminder.id)
        .eq("state", "scheduled");
    }
  }

  return NextResponse.json({ processed: reminders.length, sent, failed, skipped });
}
