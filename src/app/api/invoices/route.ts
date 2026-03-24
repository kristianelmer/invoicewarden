import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invoiceSchema } from "@/lib/validators";
import { scheduleRemindersForInvoice } from "@/lib/reminders";

function deriveStatus(dueDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today ? "overdue" : "due";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id,invoice_number,currency,amount_cents,issue_date,due_date,jurisdiction,project_completed_at,services_rendered_at,contract_requested_refused,payment_url,status,paid_at,notes,customer:customers(name,email),created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = invoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const status = deriveStatus(parsed.data.due_date);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({ ...parsed.data, user_id: user.id, status })
    .select(
      "id,user_id,invoice_number,currency,amount_cents,issue_date,due_date,jurisdiction,project_completed_at,services_rendered_at,contract_requested_refused,payment_url,status,notes,customer:customers(name,email)"
    )
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: error?.message || "Could not create invoice" }, { status: 400 });
  }

  const customerRaw = invoice.customer as unknown;
  const customer = Array.isArray(customerRaw)
    ? customerRaw[0]
    : customerRaw;

  await scheduleRemindersForInvoice(supabase, {
    id: invoice.id,
    user_id: invoice.user_id,
    invoice_number: invoice.invoice_number,
    amount_cents: invoice.amount_cents,
    currency: invoice.currency,
    due_date: invoice.due_date,
    customer: {
      name: (customer as { name?: string } | null)?.name ?? "Client",
      email: (customer as { email?: string } | null)?.email ?? "",
    },
  });

  await supabase.from("invoice_events").insert({
    user_id: user.id,
    invoice_id: invoice.id,
    event_type: "created",
    payload: { invoice_number: invoice.invoice_number },
  });

  return NextResponse.json({ data: invoice }, { status: 201 });
}
