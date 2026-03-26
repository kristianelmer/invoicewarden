import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { createClient } from '@/lib/supabase/server';

type ActivityRow = {
  id: string;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown> | null;
  invoices: { invoice_number: string } | null;
};

function labelForEvent(eventType: string) {
  switch (eventType) {
    case 'payment_session_created':
      return 'Payment session created';
    case 'payment_succeeded':
      return 'Payment succeeded';
    default:
      return eventType.replaceAll('_', ' ');
  }
}

function moneyFromCents(value: unknown) {
  if (typeof value !== 'number') return null;
  return `£${(value / 100).toFixed(2)}`;
}

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('invoice_events')
    .select('id, event_type, created_at, payload, invoices(invoice_number)')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as ActivityRow[];

  return (
    <DashboardShell active="Activity">
      <h1>Activity</h1>
      <p className="subtle">Timeline of payment sessions, sends, retries, and paid events.</p>

      <div className="card" style={{ marginTop: 16 }}>
        {error ? (
          <p className="subtle">Could not load activity: {error.message}</p>
        ) : rows.length === 0 ? (
          <p className="subtle">No events yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {rows.map((row) => {
              const amount = moneyFromCents(row.payload?.amount_total_cents);
              const fee = moneyFromCents(row.payload?.platform_fee_cents);
              const eventId =
                typeof row.payload?.stripe_event_id === 'string' ? row.payload.stripe_event_id : null;
              const checkoutSessionId =
                typeof row.payload?.stripe_checkout_session_id === 'string'
                  ? row.payload.stripe_checkout_session_id
                  : null;
              return (
                <li key={row.id} style={{ border: '1px solid #2a2a2a', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong>{labelForEvent(row.event_type)}</strong>
                    <span className="subtle">{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                  <div className="subtle" style={{ marginTop: 6 }}>
                    Invoice: {row.invoices?.invoice_number ?? '—'}
                    {amount ? ` · Amount: ${amount}` : ''}
                    {fee ? ` · Platform fee: ${fee}` : ''}
                  </div>
                  {(eventId || checkoutSessionId) && (
                    <div className="subtle" style={{ marginTop: 4, fontSize: 12 }}>
                      {eventId ? `Stripe event: ${eventId}` : ''}
                      {eventId && checkoutSessionId ? ' · ' : ''}
                      {checkoutSessionId ? `Checkout session: ${checkoutSessionId}` : ''}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
