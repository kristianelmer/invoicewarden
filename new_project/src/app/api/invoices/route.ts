import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invoiceCreateSchema } from "@/lib/validators";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("invoices")
    .select("id, customer_id, invoice_number, amount_cents, due_date, currency, status, payment_url, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const mapped = (data ?? []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    invoiceNumber: row.invoice_number,
    principal: Number(row.amount_cents) / 100,
    dueDate: row.due_date,
    currency: row.currency,
    status: row.status,
    paymentUrl: row.payment_url,
    createdAt: row.created_at
  }));

  return NextResponse.json({ data: mapped });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = invoiceCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const customerCheck = await supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customerId)
    .single();

  if (customerCheck.error || !customerCheck.data) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const dueDate = new Date(`${parsed.data.dueDate}T00:00:00Z`);
  const issueDate = new Date(dueDate);
  issueDate.setUTCDate(issueDate.getUTCDate() - 1);

  const payload = {
    customer_id: parsed.data.customerId,
    invoice_number: parsed.data.invoiceNumber.trim(),
    amount_cents: Math.round(parsed.data.principal * 100),
    issue_date: issueDate.toISOString().slice(0, 10),
    due_date: parsed.data.dueDate,
    currency: parsed.data.currency.toUpperCase()
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select("id, customer_id, invoice_number, amount_cents, due_date, currency, status, payment_url, created_at")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(
    {
      data: {
        id: data.id,
        customerId: data.customer_id,
        invoiceNumber: data.invoice_number,
        principal: Number(data.amount_cents) / 100,
        dueDate: data.due_date,
        currency: data.currency,
        status: data.status,
        paymentUrl: data.payment_url,
        createdAt: data.created_at
      }
    },
    { status: 201 }
  );
}
