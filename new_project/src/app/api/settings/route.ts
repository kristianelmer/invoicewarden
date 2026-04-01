import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,full_name,company_name,timezone,default_jurisdiction,reminder_subject_template,reminder_body_template'
    )
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    data: {
      fullName: data?.full_name ?? '',
      companyName: data?.company_name ?? '',
      timezone: data?.timezone ?? 'UTC',
      defaultJurisdiction: data?.default_jurisdiction ?? 'UK',
      reminderSubjectTemplate: data?.reminder_subject_template ?? '',
      reminderBodyTemplate: data?.reminder_body_template ?? ''
    }
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const payload = {
    id: auth.user.id,
    full_name: String(body.fullName ?? '').trim() || null,
    company_name: String(body.companyName ?? '').trim() || null,
    timezone: String(body.timezone ?? 'UTC').trim() || 'UTC',
    default_jurisdiction: String(body.defaultJurisdiction ?? 'UK').trim().toUpperCase(),
    reminder_subject_template: String(body.reminderSubjectTemplate ?? '').trim() || null,
    reminder_body_template: String(body.reminderBodyTemplate ?? '').trim() || null
  };

  if (!['UK', 'NY', 'CA'].includes(payload.default_jurisdiction)) {
    return NextResponse.json({ error: 'Invalid jurisdiction' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
