import { SupabaseClient } from "@supabase/supabase-js";

type ReminderStep = {
  id: string;
  offset_days: number;
  subject_template: string;
  body_template: string;
};

export type InvoiceTemplateData = {
  invoice_number: string;
  amount_cents: number;
  currency: string;
  due_date: string;
  customer: { name: string; email: string };
};

type InvoiceRecord = InvoiceTemplateData & {
  id: string;
  user_id: string;
};

function addDays(dateString: string, days: number) {
  const date = new Date(dateString + "T09:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export async function ensureDefaultSequence(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: existing } = await supabase
    .from("reminder_sequences")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: sequence, error } = await supabase
    .from("reminder_sequences")
    .insert({ user_id: userId, name: "Default", is_default: true, active: true })
    .select("id")
    .single();

  if (error || !sequence) {
    throw new Error(error?.message || "Could not create default reminder sequence");
  }

  await supabase.from("reminder_steps").insert([
    {
      sequence_id: sequence.id,
      step_order: 1,
      offset_days: 3,
      subject_template: "Quick reminder: Invoice {{invoice_number}}",
      body_template:
        "Hi {{client_name}}, just a quick reminder that invoice {{invoice_number}} ({{amount}}) was due on {{due_date}}.",
      tone: "friendly",
    },
    {
      sequence_id: sequence.id,
      step_order: 2,
      offset_days: 7,
      subject_template: "Following up on invoice {{invoice_number}}",
      body_template:
        "Hi {{client_name}}, following up on invoice {{invoice_number}} ({{amount}}), now {{days_overdue}} days overdue.",
      tone: "firm",
    },
    {
      sequence_id: sequence.id,
      step_order: 3,
      offset_days: 14,
      subject_template: "Final reminder: invoice {{invoice_number}}",
      body_template:
        "Hi {{client_name}}, this is a final reminder for invoice {{invoice_number}} ({{amount}}), currently {{days_overdue}} days overdue.",
      tone: "final",
    },
  ]);

  return sequence.id;
}

export async function scheduleRemindersForInvoice(
  supabase: SupabaseClient,
  invoice: InvoiceRecord
) {
  const sequenceId = await ensureDefaultSequence(supabase, invoice.user_id);
  const { data: steps, error } = await supabase
    .from("reminder_steps")
    .select("id,offset_days,subject_template,body_template")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true });

  if (error) throw new Error(error.message);

  const payload = (steps as ReminderStep[]).map((step) => ({
    user_id: invoice.user_id,
    invoice_id: invoice.id,
    step_id: step.id,
    scheduled_for: addDays(invoice.due_date, step.offset_days),
    state: "scheduled",
  }));

  if (payload.length > 0) {
    await supabase.from("reminders").upsert(payload, { onConflict: "invoice_id,step_id" });
  }
}

export function templateReminder(
  template: string,
  invoice: InvoiceTemplateData,
  now = new Date()
) {
  const dueDate = new Date(invoice.due_date + "T00:00:00.000Z");
  const daysOverdue = Math.max(
    0,
    Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const amount = `${(invoice.amount_cents / 100).toFixed(2)} ${invoice.currency}`;

  return template
    .replaceAll("{{client_name}}", invoice.customer.name)
    .replaceAll("{{invoice_number}}", invoice.invoice_number)
    .replaceAll("{{amount}}", amount)
    .replaceAll("{{due_date}}", invoice.due_date)
    .replaceAll("{{days_overdue}}", String(daysOverdue));
}
