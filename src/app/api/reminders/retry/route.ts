import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reminderId = body?.reminder_id as string | undefined;

  if (!reminderId) {
    return NextResponse.json({ error: "Missing reminder_id" }, { status: 400 });
  }

  const { data: reminder, error: findError } = await supabase
    .from("reminders")
    .select("id,user_id,invoice_id,state")
    .eq("id", reminderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 400 });
  }

  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  if (!["failed", "skipped"].includes(reminder.state)) {
    return NextResponse.json(
      { error: `Cannot retry reminder in state '${reminder.state}'` },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("reminders")
    .update({
      state: "scheduled",
      scheduled_for: new Date().toISOString(),
      failure_reason: null,
      skip_reason: null,
    })
    .eq("id", reminder.id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await supabase.from("invoice_events").insert({
    user_id: user.id,
    invoice_id: reminder.invoice_id,
    event_type: "reminder_retry_scheduled",
    payload: { reminder_id: reminder.id },
  });

  return NextResponse.json({ ok: true });
}
