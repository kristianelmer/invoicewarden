import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const paidAt = new Date().toISOString();

  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase
    .from("reminders")
    .update({ state: "canceled", skip_reason: "invoice_paid" })
    .eq("invoice_id", id)
    .eq("user_id", user.id)
    .eq("state", "scheduled");

  await supabase.from("invoice_events").insert({
    user_id: user.id,
    invoice_id: id,
    event_type: "paid_marked",
    payload: { paid_at: paidAt },
  });

  return NextResponse.json({ ok: true });
}
