import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function toPositiveInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invoiceRes = await supabase
    .from('invoices')
    .select('id, user_id, invoice_number, amount_cents, status')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (invoiceRes.error) {
    return NextResponse.json({ error: invoiceRes.error.message }, { status: 400 });
  }

  if (!invoiceRes.data) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (invoiceRes.data.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 280) : null;
  const paidAmountCents = toPositiveInt(body?.paidAmountCents) ?? Number(invoiceRes.data.amount_cents);
  const paidAt = new Date().toISOString();

  const updateRes = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: paidAt,
      paid_amount_cents: paidAmountCents
    })
    .eq('id', invoiceRes.data.id)
    .eq('user_id', auth.user.id)
    .neq('status', 'paid')
    .select('id, status, paid_at, paid_amount_cents')
    .single();

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 400 });
  }

  const eventInsert = await supabase.from('invoice_events').insert({
    user_id: auth.user.id,
    invoice_id: invoiceRes.data.id,
    event_type: 'invoice_marked_paid_manual',
    payload: {
      reason: reason || 'Manual fallback from dashboard',
      paid_at: paidAt,
      paid_amount_cents: paidAmountCents,
      invoice_number: invoiceRes.data.invoice_number
    }
  });

  if (eventInsert.error) {
    return NextResponse.json({ error: eventInsert.error.message }, { status: 400 });
  }

  return NextResponse.json({
    data: {
      id: updateRes.data.id,
      status: updateRes.data.status,
      paidAt: updateRes.data.paid_at,
      paidAmountCents: updateRes.data.paid_amount_cents
    }
  });
}
