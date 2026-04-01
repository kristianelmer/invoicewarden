import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('reminders')
    .select('id,invoice_id,scheduled_for,state,sent_at,skip_reason,failure_reason,created_at,invoices(invoice_number)')
    .eq('user_id', auth.user.id)
    .order('scheduled_for', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data: data ?? [] });
}
