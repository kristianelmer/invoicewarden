import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAYABLE_STATUSES = new Set(["draft", "sent", "due", "overdue"]);

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

  const { data: invoice, error: findError } = await supabase
    .from("invoices")
    .select("id,status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 400 });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  if (invoice.status === "paid") {
    return NextResponse.json({ ok: true, already_paid: true });
  }

  if (!PAYABLE_STATUSES.has(invoice.status)) {
    return NextResponse.json(
      { error: `Cannot mark invoice as paid from status '${invoice.status}'` },
      { status: 400 }
    );
  }

  const paidAt = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", invoice.status)
    .select("id")
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  if (!updated) {
    // race-safe idempotency: someone else updated first
    return NextResponse.json({ ok: true, already_paid: true });
  }

  await supabase
    .from("reminders")
    .update({ state: "canceled", skip_reason: "invoice_paid" })
    .eq("invoice_id", id)
    .eq("user_id", user.id)
    .in("state", ["scheduled", "failed", "processing"]);

  await supabase.from("invoice_events").insert({
    user_id: user.id,
    invoice_id: id,
    event_type: "paid_marked",
    payload: { paid_at: paidAt },
  });

  return NextResponse.json({ ok: true });
}
