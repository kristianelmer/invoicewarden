import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row, error: fetchError } = await supabase
    .from('reminders')
    .select('id,state')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });

  if (row.state !== 'failed') {
    return NextResponse.json({ error: 'Only failed reminders can be retried' }, { status: 400 });
  }

  const { error } = await supabase
    .from('reminders')
    .update({ state: 'scheduled', failure_reason: null, skip_reason: null, sent_at: null })
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
