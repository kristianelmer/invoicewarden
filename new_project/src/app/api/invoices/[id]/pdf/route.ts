import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateUkLatePaymentClaim } from '@/core/interest-engine/uk';
import { generateProfessionalInvoicePdf } from '@/lib/pdf/invoice-pdf';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invoiceRes = await supabase
    .from('invoices')
    .select('id, customer_id, invoice_number, amount_cents, due_date, currency, created_at')
    .eq('id', id)
    .single();

  if (invoiceRes.error || !invoiceRes.data) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const customerRes = await supabase
    .from('customers')
    .select('name, email')
    .eq('id', invoiceRes.data.customer_id)
    .single();

  const customerName = customerRes.data?.name ?? 'Customer';
  const customerEmail = customerRes.data?.email ?? undefined;

  const principal = Number(invoiceRes.data.amount_cents) / 100;
  const dueDate = invoiceRes.data.due_date;
  const asOfDate = new Date().toISOString().slice(0, 10);

  const claim = calculateUkLatePaymentClaim({
    principal,
    dueDate,
    asOfDate,
    baseRatePercent: 5
  });

  const bytes = await generateProfessionalInvoicePdf({
    invoiceNumber: invoiceRes.data.invoice_number,
    issueDate: (invoiceRes.data.created_at ?? asOfDate).slice(0, 10),
    dueDate,
    currency: invoiceRes.data.currency,
    sellerName: 'InvoiceWarden Client',
    buyerName: customerName,
    buyerEmail: customerEmail,
    principal,
    interest: claim.interest,
    legalFees: claim.fixedCompensation,
    totalClaim: claim.totalClaim
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoiceRes.data.invoice_number}.pdf"`
    }
  });
}
